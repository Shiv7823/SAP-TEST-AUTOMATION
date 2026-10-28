import json
import os
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import warnings

# Suppress deprecation FutureWarning from google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from fastapi import HTTPException

# Load environment
load_dotenv()

# Primary model: gemini-2.5-flash
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CANDIDATE_MODELS = [
    PRIMARY_MODEL,
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


def format_gemini_error(exc: Any) -> str:
    """Formats Gemini API errors into concise, human-readable messages."""
    msg = str(exc) if exc else "Unknown error"
    if "free tier is not available" in msg.lower() or "billing" in msg.lower():
        return (
            "403 Gemini free tier not available for this Google project. "
            "Please link billing at https://aistudio.google.com/billing or use an eligible API key."
        )
    if "is no longer available" in msg.lower():
        return "404 Model no longer available. Google recommends gemini-3.8-flash."
    if "https://" in msg:
        msg = re.sub(r"https://\S+", "[API endpoint]", msg)
    return msg[:200]


def get_google_api_key() -> str:
    """Reads GOOGLE_API_KEY from environment."""
    key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY environment variable is not configured. Please add it to .env.",
        )
    return key


def clean_json_response(raw_text: str) -> str:
    """Extracts clean JSON text from LLM response, stripping code fences if present."""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # If no code fence, attempt to find first [ and last ]
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1].strip()

    return text


def build_prompt(requirement_text: str, kb_texts: List[Dict[str, Any]]) -> str:
    """Constructs the prompt adhering strictly to zero hallucination and required scenario types."""
    kb_section = ""
    if kb_texts:
        kb_blocks = []
        for kb in kb_texts:
            kb_name = kb.get("name", "Knowledge Base")
            kb_content = kb.get("content", "").strip()
            kb_blocks.append(f"--- Knowledge Base: {kb_name} ---\n{kb_content}")
        kb_section = "\n\n".join(kb_blocks)
    else:
        kb_section = "No additional Knowledge Bases provided. Generate test cases strictly from the requirement document."

    prompt = f"""You are an expert SAP Test Case Generator Agent.

CRITICAL INSTRUCTIONS - MANDATORY COMPLIANCE:
1. ONLY USE INFORMATION PRESENT IN THE PROVIDED REQUIREMENT DOCUMENT AND KB TEXTS, DO NOT INVENT OR ASSUME ANY INFORMATION.
2. No hallucinated data anywhere — if requirement doc or KB does not contain a field or component name, mark it "not found", never invent values.
3. Generate structured test cases covering:
   - Positive scenarios (happy path)
   - Negative scenarios (invalid input, unauthorized access, error handling)
   - Boundary scenarios (edge values, limits, empty/mandatory fields)

JSON OUTPUT FORMAT SPECIFICATION:
Return ONLY a valid JSON array of test cases. Do not include any surrounding markdown text or explanations outside the JSON array.
Each test case object MUST have these exact fields:
[
  {{
    "id": "TC-001",
    "title": "Concise test case title",
    "related_component": "SAP module/component or 'not found'",
    "type": "positive" | "negative" | "boundary",
    "preconditions": "Preconditions required or 'not found'",
    "steps": [
      "Step 1 description",
      "Step 2 description"
    ],
    "expected_result": "Exact expected outcome",
    "status": "pending"
  }}
]

--- REQUIREMENT DOCUMENT ---
{requirement_text}

--- RELEVANT KNOWLEDGE BASE TEXTS ---
{kb_section}
"""
    return prompt


# In-memory set to track cancelled requests
CANCELLED_REQUESTS = set()

def cancel_generation(requirement_id: str):
    """Flags a requirement_id as cancelled by user."""
    if requirement_id:
        CANCELLED_REQUESTS.add(str(requirement_id).strip())

def is_generation_cancelled(requirement_id: Optional[str]) -> bool:
    """Checks whether a requirement_id has been cancelled."""
    if requirement_id and str(requirement_id).strip() in CANCELLED_REQUESTS:
        return True
    return False

def clear_cancellation(requirement_id: Optional[str]):
    """Removes requirement_id from cancelled set once handled."""
    if requirement_id:
        clean_id = str(requirement_id).strip()
        CANCELLED_REQUESTS.discard(clean_id)


def generate_test_cases(
    requirement_text: str,
    relevant_kbs: List[Dict[str, Any]],
    requirement_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Calls Gemini API to generate structured test cases.
    Falls back across available flash models if a model is deprecated/unavailable.
    Checks cancellation status before and after execution.
    """
    if is_generation_cancelled(requirement_id):
        clear_cancellation(requirement_id)
        raise HTTPException(status_code=499, detail="LLM execution was stopped by user.")

    api_key = get_google_api_key()
    genai.configure(api_key=api_key, transport="rest")


    prompt = build_prompt(requirement_text, relevant_kbs)

    last_error = None
    response_text = None

    # Deduplicate candidate models
    seen_models = set()
    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m not in seen_models:
            seen_models.add(m)
            models_to_try.append(m)

    for model_name in models_to_try:
        # Check if user clicked Stop before/during attempt
        if is_generation_cancelled(requirement_id):
            clear_cancellation(requirement_id)
            raise HTTPException(status_code=499, detail="LLM execution was stopped by user.")

        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                ),
            )
            if response and response.text:
                response_text = response.text
                break
        except Exception as exc:
            last_error = f"{model_name}: {format_gemini_error(exc)}"
            continue

    # Final check before parsing
    if is_generation_cancelled(requirement_id):
        clear_cancellation(requirement_id)
        raise HTTPException(status_code=499, detail="LLM execution was stopped by user.")

    if not response_text:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini test case generation failed across candidate models: {last_error}",
        )


    # Parse JSON
    try:
        clean_json = clean_json_response(response_text)
        test_cases_raw = json.loads(clean_json)
        if not isinstance(test_cases_raw, list):
            raise ValueError("Expected a JSON array of test cases.")
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse test cases from Gemini response: {str(e)}. Raw text: {response_text[:300]}",
        )

    # Validate and normalize
    validated_cases = []
    for i, tc in enumerate(test_cases_raw):
        case_id = tc.get("id") or f"TC-{str(i + 1).zfill(3)}"
        title = tc.get("title") or f"Test Case {i + 1}"
        rel_comp = tc.get("related_component") or "not found"
        tc_type = str(tc.get("type", "positive")).lower()
        if tc_type not in ["positive", "negative", "boundary"]:
            tc_type = "positive"
        preconditions = tc.get("preconditions") or "not found"
        steps = tc.get("steps") if isinstance(tc.get("steps"), list) else [str(tc.get("steps", "Execute scenario"))]
        expected = tc.get("expected_result") or "System processes request correctly"

        validated_cases.append({
            "id": case_id,
            "title": title,
            "related_component": rel_comp,
            "type": tc_type,
            "preconditions": preconditions,
            "steps": steps,
            "expected_result": expected,
            "status": "pending",
        })

    return validated_cases
