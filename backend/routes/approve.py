import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Response

from db.models import ApproveRequest

router = APIRouter(tags=["Approval & Download"])


@router.post("/approve")
def approve_and_download_test_cases(request: ApproveRequest):
    """
    Step 6 Approval Step:
    1. Receives final edited test cases reviewed by human.
    2. Validates non-empty list.
    3. Marks each test case status as 'approved'.
    4. Computes coverage summary (positive, negative, boundary).
    5. Returns structured JSON file with 'Content-Disposition: attachment' for direct browser download.
    """
    if not request.test_cases:
        raise HTTPException(
            status_code=400,
            detail="Cannot approve an empty list of test cases.",
        )

    approved_cases = []
    positive_count = 0
    negative_count = 0
    boundary_count = 0

    for tc in request.test_cases:
        tc_dict = tc.model_dump()
        tc_dict["status"] = "approved"

        tc_type = tc_dict.get("type", "positive").lower()
        if tc_type == "positive":
            positive_count += 1
        elif tc_type == "negative":
            negative_count += 1
        elif tc_type == "boundary":
            boundary_count += 1

        approved_cases.append(tc_dict)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    export_payload = {
        "project": request.project_name or "SAP Test Automation",
        "requirement_id": request.requirement_id or "not_specified",
        "approved_at": now_iso,
        "total_test_cases": len(approved_cases),
        "coverage_summary": {
            "positive": positive_count,
            "negative": negative_count,
            "boundary": boundary_count,
        },
        "test_cases": approved_cases,
    }

    json_content = json.dumps(export_payload, indent=2, ensure_ascii=False)

    filename = f"sap_test_cases_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"

    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
