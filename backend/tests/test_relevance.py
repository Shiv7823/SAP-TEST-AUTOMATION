import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import patch, MagicMock

from main import app
from services.relevance import get_relevant_kbs
from db.database import init_db, insert_kb, delete_kb

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_relevance_no_kbs_fallback():
    """When no KBs are passed, status must be no_relevant_kbs without calling API."""
    result = get_relevant_kbs(
        requirement_text="SAP Billing Requirement",
        all_kbs=[],
    )
    assert result["status"] == "no_relevant_kbs"
    assert len(result["relevant_kbs"]) == 0
    assert result["total_kbs_evaluated"] == 0
    assert result["decision_model_used"] == "gemini-2.5-flash"

def test_relevance_filter_with_relevant_kbs():
    """Tests successful filtering when Gemini 2.5 Flash marks 1 KB as relevant."""
    kbs = [
        {"id": 101, "name": "SAP Pricing KB", "content": "PR00 base pricing rule", "file_type": "docx"},
        {"id": 102, "name": "SAP HR Payroll KB", "content": "Payroll employee tax deduction", "file_type": "docx"},
    ]

    mock_resp = MagicMock()
    mock_resp.text = '```json\n["101"]\n```'

    with patch("services.relevance.genai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        mock_instance.generate_content.return_value = mock_resp

        result = get_relevant_kbs(
            requirement_text="Need pricing calculation with PR00 and net value.",
            all_kbs=kbs,
        )

    assert result["status"] == "success"
    assert len(result["relevant_kbs"]) == 1
    assert result["relevant_kbs"][0]["id"] == 101
    assert result["relevant_kbs"][0]["name"] == "SAP Pricing KB"
    assert result["total_kbs_evaluated"] == 2
    assert result["decision_model_used"] == "gemini-2.5-flash"

def test_relevance_zero_relevant_kbs_fallback():
    """Tests zero relevant KBs triggers 'no_relevant_kbs' status for Option A/B prompt."""
    kbs = [
        {"id": 201, "name": "SAP Plant Maintenance KB", "content": "Equipment calibration schedules", "file_type": "pdf"},
    ]

    mock_resp = MagicMock()
    mock_resp.text = "[]"

    with patch("services.relevance.genai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        mock_instance.generate_content.return_value = mock_resp

        result = get_relevant_kbs(
            requirement_text="SD Customer sales order billing document flow.",
            all_kbs=kbs,
        )

    assert result["status"] == "no_relevant_kbs"
    assert len(result["relevant_kbs"]) == 0
    assert result["decision_model_used"] == "gemini-2.5-flash"
    assert "zero relevant" in result["message"].lower()

def test_relevance_api_error_handling():
    """Tests that Gemini API failures raise explicit HTTPException(502) with required message."""
    kbs = [{"id": 301, "name": "Any KB", "content": "Content", "file_type": "docx"}]

    with patch("services.relevance.genai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        mock_instance.generate_content.side_effect = RuntimeError("API quota exhausted")

        with pytest.raises(HTTPException) as exc_info:
            get_relevant_kbs(requirement_text="Sample req", all_kbs=kbs)

        assert exc_info.value.status_code == 502
        assert "relevance filtering failed, please try again" in exc_info.value.detail.lower()

def test_api_evaluate_kbs_endpoint():
    """Tests POST /generate/evaluate-kbs API route."""
    kb_id = insert_kb("SAP Sales Shipping Rules", "Outbound deliveries require storage location 0001", "docx")
    try:
        mock_resp = MagicMock()
        mock_resp.text = f'["{kb_id}"]'

        with patch("services.relevance.genai.GenerativeModel") as mock_model_cls:
            mock_instance = mock_model_cls.return_value
            mock_instance.generate_content.return_value = mock_resp

            payload = {
                "requirement_text": "Delivery creation and outbound shipment for customer order."
            }
            res = client.post("/generate/evaluate-kbs", json=payload)
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["status"] == "success"
            assert data["decision_model_used"] == "gemini-2.5-flash"
            assert any(item["id"] == kb_id for item in data["relevant_kbs"])
    finally:
        delete_kb(kb_id)
