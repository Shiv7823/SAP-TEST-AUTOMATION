import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

from db.models import DocumentUploadResponse
from services.parser import extract_text

router = APIRouter(tags=["Requirement Document Upload"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_requirement_document(
    file: UploadFile = File(..., description="DOCX, PDF, or text requirement document"),
):
    """
    Accepts DOCX or PDF requirement document,
    saves the file to backend/data/uploads/,
    extracts and returns text content with document metadata.
    """
    filename = file.filename or "requirement_document"
    ext = Path(filename).suffix.lower()

    if ext not in [".docx", ".pdf", ".txt", ".md", ".markdown"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a .docx, .pdf, or .txt requirement document.",
        )

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract text from document
    text = extract_text(content_bytes, filename)

    # Generate unique ID and save to data/uploads
    doc_id = uuid.uuid4().hex[:12]
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # Clean filename to prevent traversal issues
    safe_name = Path(filename).name
    save_path = UPLOAD_DIR / f"{doc_id}_{safe_name}"
    save_path.write_bytes(content_bytes)

    # Determine file type string
    if ext == ".docx":
        file_type = "docx"
    elif ext == ".pdf":
        file_type = "pdf"
    else:
        file_type = "text"

    return DocumentUploadResponse(
        doc_id=doc_id,
        filename=filename,
        file_type=file_type,
        text=text,
        character_count=len(text),
        message="Requirement document uploaded and parsed successfully",
    )
