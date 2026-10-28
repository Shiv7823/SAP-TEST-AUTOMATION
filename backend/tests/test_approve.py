import json
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

SAMPLE_TEST_CASES = [
    {
        "id": "TC-001",
        "title": "Create Sales Order with PR00",
        "related_component": "SAP SD Pricing",
        "type": "positive",
        "preconditions": "Customer master 1000 active",
        "steps": ["VA01", "Enter order type OR", "Save"],
        "expected_result": "Order saved with PR00",
        "status": "pending",
    },
    {
        "id": "TC-002",
        "title": "Missing Customer PO Number",
        "related_component": "SAP SD Order Management",
        "type": "negative",
        "preconditions": "PO field mandatory",
        "steps": ["Leave PO blank", "Click save"],
        "expected_result": "Validation error raised",
        "status": "pending",
    },
    {
        "id": "TC-003",
        "title": "Credit Check Boundary Limit",
        "related_component": "SAP SD Credit Check",
        "type": "boundary",
        "preconditions": "Credit limit 50,000 EUR",
        "steps": ["Submit order at 50,000 EUR"],
        "expected_result": "Order processed without block",
        "status": "pending",
    },
]


def test_approve_and_download_success():
    payload = {
        "project_name": "SAP Sales Automation Project",
        "requirement_id": "REQ-SD-101",
        "test_cases": SAMPLE_TEST_CASES,
    }

    response = client.post("/approve", json=payload)
    assert response.status_code == 200, response.text
    assert "attachment; filename=\"sap_test_cases_" in response.headers.get("content-disposition", "")
    assert "application/json" in response.headers.get("content-type", "")

    data = json.loads(response.text)
    assert data["project"] == "SAP Sales Automation Project"
    assert data["requirement_id"] == "REQ-SD-101"
    assert data["total_test_cases"] == 3
    assert data["coverage_summary"] == {
        "positive": 1,
        "negative": 1,
        "boundary": 1,
    }
    assert len(data["test_cases"]) == 3
    for tc in data["test_cases"]:
        assert tc["status"] == "approved"


def test_approve_empty_list_fails():
    payload = {
        "project_name": "Empty Project",
        "test_cases": [],
    }

    response = client.post("/approve", json=payload)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
