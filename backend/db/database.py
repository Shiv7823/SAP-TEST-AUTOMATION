import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional

# Database path in backend data directory
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "knowledge_bases.db"


def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row factory enabled."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initializes the SQLite database schema for knowledge_bases table."""
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_bases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    file_type TEXT,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
    finally:
        conn.close()


def insert_kb(name: str, content: str, file_type: str) -> int:
    """Inserts a new knowledge base record and returns its ID."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                """
                INSERT INTO knowledge_bases (name, content, file_type)
                VALUES (?, ?, ?)
                """,
                (name, content, file_type),
            )
            return cursor.lastrowid
    finally:
        conn.close()


def list_kbs() -> List[Dict[str, Any]]:
    """Returns all knowledge base records (excluding heavy content for listing)."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, name, file_type, uploaded_at
            FROM knowledge_bases
            ORDER BY id DESC
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_kb_by_id(kb_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single knowledge base by ID including full content."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, name, content, file_type, uploaded_at
            FROM knowledge_bases
            WHERE id = ?
            """,
            (kb_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_kbs_with_content() -> List[Dict[str, Any]]:
    """Retrieves all knowledge bases with full text content (used by relevance decision step)."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, name, content, file_type, uploaded_at
            FROM knowledge_bases
            ORDER BY id ASC
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def delete_kb(kb_id: int) -> bool:
    """Deletes a knowledge base record by ID. Returns True if deleted."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                "DELETE FROM knowledge_bases WHERE id = ?",
                (kb_id,),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()
