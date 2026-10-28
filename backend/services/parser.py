import io
from pathlib import Path
from typing import Union
import docx
import pypdf
from fastapi import HTTPException


def extract_text_from_docx(content_bytes: bytes) -> str:
    """Extracts plain text and formatted tables from a DOCX byte buffer."""
    try:
        doc = docx.Document(io.BytesIO(content_bytes))
        parts = []

        for element in doc.element.body:
            # Check for paragraph
            if element.tag.endswith('p'):
                para = docx.text.paragraph.Paragraph(element, doc)
                text = para.text.strip()
                if text:
                    parts.append(text)
            # Check for table
            elif element.tag.endswith('tbl'):
                table = docx.table.Table(element, doc)
                table_lines = []
                for row in table.rows:
                    row_cells = [c.text.strip().replace("\n", " ") for c in row.cells]
                    if any(row_cells):
                        table_lines.append(" | ".join(row_cells))
                if table_lines:
                    parts.append("\n".join(table_lines))

        return "\n\n".join(parts)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse DOCX document: {str(e)}",
        )


def extract_text_from_pdf(content_bytes: bytes) -> str:
    """Extracts text from a PDF byte buffer using pypdf."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(content_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            stripped = page_text.strip()
            if stripped:
                pages_text.append(stripped)

        if not pages_text:
            raise HTTPException(
                status_code=422,
                detail="PDF appears to be empty or contains only non-extractable scanned images.",
            )

        return "\n\n".join(pages_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse PDF document: {str(e)}",
        )


def extract_text(content_bytes: bytes, filename: str) -> str:
    """
    Extracts text from a file based on its extension (.docx, .pdf, .md, .markdown, .txt).
    """
    ext = Path(filename).suffix.lower()

    if ext == ".docx":
        text = extract_text_from_docx(content_bytes)
    elif ext == ".pdf":
        text = extract_text_from_pdf(content_bytes)
    elif ext in [".md", ".markdown", ".txt"]:
        try:
            text = content_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to decode text file: {e}")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: .docx, .pdf, .md, .markdown, .txt",
        )

    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(
            status_code=422,
            detail=f"File '{filename}' contains no readable text content.",
        )

    return clean_text
