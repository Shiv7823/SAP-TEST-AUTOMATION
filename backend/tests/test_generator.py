import json
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from main import app
from services.generator import build_prompt, clean_json_response, generate_test_cases

client = TestClient(app)

MOCK_RAW_LLM_OUTPUT = """
Here are the generated test cases:
```json
[
  {
    "id": "TC-001",
    "title": "Standard Sales Order Creation with PR00 Price",
    "related_component": "SAP SD Pricing",
    "type": "positive",
    "preconditions": "Customer master 1000 and material 200 exist.",
    "steps": [
      "Open transaction VA01",
      "Enter order type OR and sales area 1000/10/00",
      "Add line item 10 with material 200 and quantity 5",
      "Verify PR00 condition is active and calculate net value",
      "Save sales order"
    ],
    "expected_result": "Sales order saved with document number generated and PR00 applied.",
    "status": "pending"
  },
  {
    "id": "TC-002",
    "title": "Order Creation without Customer PO",
    "related_component": "SAP SD Order Management",
    "type": "negative",
    "preconditions": "Customer PO field configured as mandatory.",
    "steps": [
      "Open transaction VA01",
      "Leave PO number field blank",
      "Attempt to save the sales order"
    ],
    "expected_result": "Error message displayed: 'Purchase Order number is mandatory'. Order not saved.",
    "status": "pending"
  },
  {
    "id": "TC-003",
    "title": "Credit Check Threshold Boundary Value",
    "related_component": "SAP SD Credit Management",
    "type": "boundary",
    "preconditions": "Credit limit is set at 50,000 EUR.",
    "steps": [
      "Create order with total value exactly 50,000 EUR",
      "Check order header credit status",
      "Create order with total value 50,001 EUR",
      "Check credit block"
    ],
    "expected_result": "Order at 50,000 EUR proceeds unblocked; order at 50,001 EUR is placed on credit block.",
    "status": "pending"
  }
]
```
"""


def test_build_prompt_contains_mandatory_instructions():
    req_text = "Customer master requires tax classification 1."
    kbs = [{"name": "Tax Rules", "content": "Tax jurisdiction code required for US."}]

    prompt = build_prompt(req_text, kbs)

    # Check non-negotiable instructions
    assert "only use information present in the provided requirement document and kb texts" in prompt.lower()
    assert "do not invent or assume any information" in prompt.lower()
    assert "no hallucinated data anywhere" in prompt.lower()
    assert "positive scenarios" in prompt.lower()
    assert "negative scenarios" in prompt.lower()
    assert "boundary scenarios" in prompt.lower()
    assert "Tax Rules" in prompt
    assert "Customer master requires tax classification 1." in prompt


def test_clean_json_response_with_fences():
    cleaned = clean_json_response(MOCK_RAW_LLM_OUTPUT)
    data = json.loads(cleaned)
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]["id"] == "TC-001"
    assert data[0]["type"] == "positive"
    assert data[1]["type"] == "negative"
    assert data[2]["type"] == "boundary"


def test_generate_test_cases_mocked():
    with patch("services.generator.genai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        mock_response = mock_instance.generate_content.return_value
        mock_response.text = MOCK_RAW_LLM_OUTPUT

        cases = generate_test_cases(
            requirement_text="Sample requirement for SD pricing.",
            relevant_kbs=[{"name": "Pricing KB", "content": "PR00 rules"}],
        )

        assert len(cases) == 3
        for tc in cases:
            assert "id" in tc
            assert "title" in tc
            assert "related_component" in tc
            assert tc["type"] in ["positive", "negative", "boundary"]
            assert "preconditions" in tc
            assert isinstance(tc["steps"], list)
            assert "expected_result" in tc
            assert tc["status"] == "pending"


def test_api_generate_endpoint_option_a():
    """Tests POST /generate with Option A (proceed_without_kbs: true)."""
    with patch("services.generator.generate_test_cases") as mock_gen:
        mock_gen.return_value = [
            {
                "id": "TC-001",
                "title": "Standalone Requirement Test",
                "related_component": "SAP SD",
                "type": "positive",
                "preconditions": "not found",
                "steps": ["Step 1"],
                "expected_result": "Processed correctly",
                "status": "pending",
            }
        ]

        payload = {
            "requirement_text": "Customer order creation without pricing conditions.",
            "proceed_without_kbs": True,
        }
        res = client.post("/generate", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert len(data["test_cases"]) == 1
        assert len(data["relevant_kbs_used"]) == 0
        assert data["decision_model_used"] == "gemini-2.5-flash"


def test_api_generate_stop_endpoint():
    """Tests POST /generate/stop registers cancellation."""
    from services.generator import is_generation_cancelled, clear_cancellation

    res = client.post("/generate/stop", json={"requirement_id": "REQ-CANCEL-99"})
    assert res.status_code == 200
    assert res.json()["status"] == "stopped"

    assert is_generation_cancelled("REQ-CANCEL-99") is True
    clear_cancellation("REQ-CANCEL-99")
    assert is_generation_cancelled("REQ-CANCEL-99") is False


def test_generate_test_cases_aborts_when_cancelled():
    """Tests generate_test_cases raises HTTPException 499 when cancelled."""
    from services.generator import cancel_generation
    from fastapi import HTTPException

    cancel_generation("REQ-STOP-TEST")
    with pytest.raises(HTTPException) as exc_info:
        generate_test_cases(
            requirement_text="Sample requirement",
            relevant_kbs=[],
            requirement_id="REQ-STOP-TEST",
        )
    assert exc_info.value.status_code == 499
    assert "stopped by user" in exc_info.value.detail.lower()

