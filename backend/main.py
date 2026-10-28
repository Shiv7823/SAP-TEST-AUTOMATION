import os
import warnings

# Suppress deprecation FutureWarning across all imported modules (e.g. google.generativeai)
warnings.filterwarnings("ignore", category=FutureWarning)

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from db.database import init_db
from routes.kb import router as kb_router
from routes.upload import router as upload_router
from routes.generate import router as generate_router
from routes.approve import router as approve_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema on startup
    init_db()
    yield

app = FastAPI(
    title="SAP Test Case Generator API",
    description="Backend API for SAP Test Case Generation with Gemini 2.5 Flash",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup for flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(kb_router)
app.include_router(upload_router)
app.include_router(generate_router)
app.include_router(approve_router)




@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "SAP Test Case Generator"}

# Single-port support: Mount static files from frontend build directory if present
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
