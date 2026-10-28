import os
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException

from db.database import get_all_kbs_with_content
from db.models import (
    RelevanceDecisionRequest,
    RelevanceDecisionResponse,
    RelevantKBItem,
    GenerateRequest,
    GenerateResponse,
)
from services.relevance import get_relevant_kbs
from services.parser import extract_text


router = APIRouter(tags=["Test Case Generation & Relevance Filtering"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


def get_requirement_text(requirement_id: Optional[str], direct_text: Optional[str]) -> str:
    """Helper to retrieve requirement text either from uploaded file or direct text."""
    if direct_text and direct_text.strip():
        return direct_text.strip()

    if requirement_id and requirement_id.strip():
        req_id = requirement_id.strip()
        matched_files = list(UPLOAD_DIR.glob(f"{req_id}_*"))
        if not matched_files:
            raise HTTPException(
                status_code=404,
                detail=f"Requirement document with ID '{req_id}' not found in data/uploads.",
            )
        target_file = matched_files[0]
        content_bytes = target_file.read_bytes()
        return extract_text(content_bytes, target_file.name)

    raise HTTPException(
        status_code=400,
        detail="Either 'requirement_id' or 'requirement_text' must be provided.",
    )


@router.post("/generate/evaluate-kbs", response_model=RelevanceDecisionResponse)
def evaluate_knowledge_bases(request: RelevanceDecisionRequest):
    """
    Step 3 Decision Step:
    Retrieves requirement text and all knowledge bases from SQLite,
    evaluates relevance using Gemini 2.5 Flash, and returns only relevant KBs.
    If zero relevant KBs found, returns status: 'no_relevant_kbs'
    for frontend to offer Option A / Option B.
    """
    req_text = get_requirement_text(request.requirement_id, request.requirement_text)
    all_kbs = get_all_kbs_with_content()

    decision = get_relevant_kbs(requirement_text=req_text, all_kbs=all_kbs)

    relevant_items = [
        RelevantKBItem(
            id=item["id"],
            name=item["name"],
            file_type=item.get("file_type"),
            snippet=item.get("snippet"),
        )
        for item in decision.get("relevant_kbs", [])
    ]

    return RelevanceDecisionResponse(
        status=decision["status"],
        relevant_kbs=relevant_items,
        decision_model_used="gemini-2.5-flash",
        total_kbs_evaluated=decision.get("total_kbs_evaluated", len(all_kbs)),
        message=decision.get("message"),
    )


@router.post("/generate", response_model=GenerateResponse)
def generate_sap_test_cases(request: GenerateRequest):
    """
    Step 4 Test Case Generation Step:
    1. Reads requirement text from uploaded doc or direct string.
    2. Determines relevant KBs:
       - If proceed_without_kbs is True -> proceeds with empty KBs (Option A).
       - If relevant_kb_ids provided -> loads matching KBs from SQLite.
       - Else -> filters relevance with Gemini 2.5 Flash first; if zero relevant KBs, returns status: 'no_relevant_kbs'.
    3. Invokes Gemini 2.5 Flash.
    4. Returns structured positive, negative, and boundary test cases.
    """
    req_text = get_requirement_text(request.requirement_id, request.requirement_text)
    relevant_kbs_to_use = []

    if request.proceed_without_kbs:
        # Option A: Human chose to proceed with requirement document alone
        relevant_kbs_to_use = []
    elif request.relevant_kb_ids is not None:
        # User/frontend provided specific relevant KB IDs
        from db.database import get_kb_by_id
        for kb_id in request.relevant_kb_ids:
            kb_rec = get_kb_by_id(kb_id)
            if kb_rec:
                relevant_kbs_to_use.append(kb_rec)
    else:
        # Run relevance filtering directly
        all_kbs = get_all_kbs_with_content()
        rel_res = get_relevant_kbs(requirement_text=req_text, all_kbs=all_kbs)
        
        if rel_res["status"] == "no_relevant_kbs":
            return GenerateResponse(
                test_cases=[],
                relevant_kbs_used=[],
                decision_model_used="gemini-2.5-flash",
                status="no_relevant_kbs",
                message="Zero relevant knowledge bases found. Please choose Option A (proceed anyway) or Option B (abort/upload new KBs).",
            )
        
        # Load full content for relevant KBs
        rel_ids = {item["id"] for item in rel_res.get("relevant_kbs", [])}
        relevant_kbs_to_use = [kb for kb in all_kbs if kb["id"] in rel_ids]

    # Generate test cases using Gemini 2.5 Flash
    from services.generator import generate_test_cases
    generated = generate_test_cases(
        requirement_text=req_text,
        relevant_kbs=relevant_kbs_to_use,
        requirement_id=request.requirement_id,
    )

    relevant_kb_items = [
        RelevantKBItem(
            id=kb["id"],
            name=kb["name"],
            file_type=kb.get("file_type"),
            snippet=(kb.get("content") or "")[:200],
        )
        for kb in relevant_kbs_to_use
    ]

    return GenerateResponse(
        test_cases=generated,
        relevant_kbs_used=relevant_kb_items,
        decision_model_used="gemini-2.5-flash",
        status="success",
        message=f"Successfully generated {len(generated)} structured test cases.",
    )


@router.post("/generate/stop")
def stop_generation(payload: dict):
    """
    Stops LLM execution for a given requirement_id.
    """
    req_id = payload.get("requirement_id")
    if req_id:
        from services.generator import cancel_generation
        cancel_generation(req_id)
    return {"status": "stopped", "message": f"Stop signal received for requirement {req_id}"}


