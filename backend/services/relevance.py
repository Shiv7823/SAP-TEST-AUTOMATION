import json
import logging
import os
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import warnings

# Suppress deprecation FutureWarning from google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from fastapi import HTTPException

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Primary model: gemini-2.5-flash as specified
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
    """Retrieves GOOGLE_API_KEY from environment."""
    key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY environment variable is not configured. Please add it to .env.",
        )
    return key


def clean_json_array(raw_text: str) -> str:
    """Extracts a clean JSON array from LLM response text, stripping markdown code fences."""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1].strip()

    return text


def get_relevant_kbs(
    requirement_text: str,
    all_kbs: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Evaluates requirement document text against all stored knowledge bases
    using Gemini 2.5 Flash. Returns only the relevant KB objects.
    If zero relevant KBs found, returns status: 'no_relevant_kbs'.
    """
    if not all_kbs:
        return {
            "status": "no_relevant_kbs",
            "relevant_kbs": [],
            "decision_model_used": "gemini-2.5-flash",
            "total_kbs_evaluated": 0,
            "message": "No knowledge bases exist in the database.",
        }

    api_key = get_google_api_key()
    genai.configure(api_key=api_key, transport="rest")

    # Format all KBs with id, name, and content
    formatted_kbs = []
    for kb in all_kbs:
        kb_id = kb.get("id")
        kb_name = kb.get("name", f"KB-{kb_id}")
        # Truncate content preview to prevent unbounded prompt size while retaining rich context
        kb_content = (kb.get("content") or "").strip()
        formatted_kbs.append(
            f"--- KB ID: {kb_id} ---\nName: {kb_name}\nContent:\n{kb_content[:2500]}\n"
        )
    formatted_kbs_text = "\n".join(formatted_kbs)

    prompt = f"""You are a relevance filtering assistant.

You will be given a requirement document and a list of knowledge base 
documents. Your job is to return ONLY the knowledge base documents 
that are relevant and useful for generating test cases for the 
given requirement document.

Return your answer as a JSON array of relevant KB ids only.
Example: ["1", "3", "5"]
If none are relevant return an empty array: []

Do not explain your answer. Return JSON only.

Requirement Document:
{requirement_text[:4000]}

Knowledge Base Documents:
{formatted_kbs_text}
"""

    response_text = None
    last_error = None

    # Deduplicate models
    seen = set()
    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m not in seen:
            seen.add(m)
            models_to_try.append(m)

    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.0,
                ),
            )
            if response and response.text:
                response_text = response.text.strip()
                break
        except Exception as exc:
            last_error = exc
            clean_err = format_gemini_error(exc)
            logger.warning(f"Relevance filtering attempt failed with {model_name}: {clean_err}")
            continue

    if not response_text:
        formatted_err = format_gemini_error(last_error)
        logger.error(f"Relevance filtering failed across candidate models: {formatted_err}")
        raise HTTPException(
            status_code=502,
            detail=f"Relevance filtering failed, please try again: {formatted_err}",
        )

    # Parse JSON array of IDs
    try:
        clean_json = clean_json_array(response_text)
        relevant_ids_raw = json.loads(clean_json)
        if not isinstance(relevant_ids_raw, list):
            relevant_ids_raw = []
    except Exception as exc:
        logger.warning(f"Failed to parse JSON array from Gemini relevance response: {exc}. Response text: {response_text[:300]}")
        relevant_ids_raw = []

    # Map matched IDs to full KB objects
    target_ids = {str(item).strip() for item in relevant_ids_raw if item is not None}
    relevant_kbs = []
    for kb in all_kbs:
        if str(kb.get("id")).strip() in target_ids:
            relevant_kbs.append({
                "id": kb["id"],
                "name": kb.get("name", f"KB-{kb['id']}"),
                "file_type": kb.get("file_type"),
                "content": kb.get("content", ""),
                "snippet": (kb.get("content") or "")[:300],
            })

    if relevant_kbs:
        return {
            "status": "success",
            "relevant_kbs": relevant_kbs,
            "decision_model_used": "gemini-2.5-flash",
            "total_kbs_evaluated": len(all_kbs),
            "message": f"Identified {len(relevant_kbs)} relevant knowledge base(s).",
        }
    else:
        return {
            "status": "no_relevant_kbs",
            "relevant_kbs": [],
            "decision_model_used": "gemini-2.5-flash",
            "total_kbs_evaluated": len(all_kbs),
            "message": "Zero relevant knowledge bases found.",
        }


# Backwards compatibility alias
filter_relevant_kbs = get_relevant_kbs
