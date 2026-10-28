from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from db.database import insert_kb, list_kbs, get_kb_by_id, delete_kb
from db.models import KBCreateResponse, KBListItem, KBListResponse, KBDeleteResponse
from services.parser import extract_text

router = APIRouter(prefix="/kb", tags=["Knowledge Base Management"])


@router.post("/upload", response_model=KBCreateResponse)
async def upload_knowledge_base(
    file: UploadFile = File(..., description="DOCX, PDF, or Markdown file containing knowledge base rules"),
    name: Optional[str] = Form(None, description="Optional custom name or title for this Knowledge Base"),
):
    """
    Accepts DOCX, PDF, or markdown file + name.
    Extracts text and stores directly in SQLite database.
    """
    filename = file.filename or "unknown_kb"
    ext = Path(filename).suffix.lower()

    if ext in [".docx"]:
        file_type = "docx"
    elif ext in [".pdf"]:
        file_type = "pdf"
    elif ext in [".md", ".markdown", ".txt"]:
        file_type = "markdown"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: .docx, .pdf, .md, .markdown, .txt",
        )

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract full text
    extracted_text = extract_text(content_bytes, filename)

    # Determine final KB name
    kb_name = name.strip() if name and name.strip() else Path(filename).stem

    # Store in SQLite database
    kb_id = insert_kb(name=kb_name, content=extracted_text, file_type=file_type)

    return KBCreateResponse(
        kb_id=kb_id,
        name=kb_name,
        message="Knowledge base uploaded and indexed successfully in SQLite.",
    )


@router.get("/list", response_model=List[KBListItem])
def list_knowledge_bases():
    """
    Returns all Knowledge Bases stored in SQLite: id, name, file_type, uploaded_at.
    """
    records = list_kbs()
    return [KBListItem(**rec) for rec in records]


@router.delete("/{kb_id}", response_model=KBDeleteResponse)
def delete_knowledge_base(kb_id: int):
    """
    Deletes a Knowledge Base record from SQLite by ID.
    """
    existing = get_kb_by_id(kb_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Knowledge base with ID {kb_id} not found.",
        )

    success = delete_kb(kb_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete knowledge base from database.")

    return KBDeleteResponse(
        kb_id=kb_id,
        message=f"Knowledge base '{existing['name']}' (ID {kb_id}) deleted successfully.",
    )
