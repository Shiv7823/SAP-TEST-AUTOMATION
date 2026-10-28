import io
import docx
import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from main import app
from routes.upload import UPLOAD_DIR

client = TestClient(app)

SAMPLE_PDF_BYTES = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 44 >> stream
BT
/F1 12 Tf
100 700 Td
(SAP MM Requirement) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000362 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
439
%%EOF"""


def test_upload_docx_requirement():
    # 1. Create a DOCX requirement doc
    doc = docx.Document()
    doc.add_heading("Functional Requirement: SAP SD Order Creation", level=1)
    doc.add_paragraph("Customer PO number is mandatory. Credit check must trigger when order value > 50000 EUR.")
    bio = io.BytesIO()
    doc.save(bio)
    docx_bytes = bio.getvalue()

    # 2. Upload via POST /upload
    files = {
        "file": ("sd_order_requirement.docx", io.BytesIO(docx_bytes), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    response = client.post("/upload", files=files)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "doc_id" in data
    assert data["filename"] == "sd_order_requirement.docx"
    assert data["file_type"] == "docx"
    assert "Credit check must trigger" in data["text"]
    assert data["character_count"] > 20

    # 3. Verify file was saved in UPLOAD_DIR
    saved_files = list(UPLOAD_DIR.glob(f"{data['doc_id']}_*"))
    assert len(saved_files) == 1
    assert saved_files[0].exists()


def test_upload_pdf_requirement():
    files = {
        "file": ("mm_requirement.pdf", io.BytesIO(SAMPLE_PDF_BYTES), "application/pdf")
    }
    response = client.post("/upload", files=files)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["filename"] == "mm_requirement.pdf"
    assert data["file_type"] == "pdf"
    assert "SAP MM Requirement" in data["text"]


def test_upload_unsupported_file():
    files = {
        "file": ("script.exe", io.BytesIO(b"binary executable"), "application/octet-stream")
    }
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_empty_file():
    files = {
        "file": ("empty.docx", io.BytesIO(b""), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
