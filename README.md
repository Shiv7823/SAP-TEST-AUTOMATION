# SAP Test Case Generator

An AI-driven enterprise web application where a developer uploads an SAP requirement document (DOCX or PDF), the system dynamically filters relevant SAP Knowledge Bases using **Gemini 2.5 Flash**, and generates structured test cases (Positive, Negative, Boundary) using **Gemini 2.5 Flash**. A human-in-the-loop reviews, edits, and checks off test cases inline before approving and automatically downloading the verified JSON test suite.

---

## Architecture & System Flow

```
[Developer Uploads DOCX/PDF]
            │
            ▼
[FastAPI Parser extracts text]
            │
            ▼
[Gemini 2.5 Flash Relevance Filter] ─── Evaluates all KBs in SQLite
            │
    ┌───────┴───────────────────────┐
    │ Relevant KBs Found            │ Zero Relevant KBs
    ▼                               ▼
[Gemini 2.5 Flash Generator Agent]  [Human Choice Dialog]
(Zero Hallucination Constraint)     Option A: Proceed with requirement alone
    │                               Option B: Abort & Upload new KBs
    ▼
[Interactive Review Checklist]
- Inline editing (Title, Steps, Components, Expected Results)
- Human checks off each test case
    │
    ▼
[Approve & Download Endpoint] ─── Automatically downloads sap_test_cases.json
```

---

## Single-Port Operation (Frontend + Backend on Port 8000)

The React + Vite frontend is pre-compiled directly into `backend/static/`. FastAPI serves the API endpoints and the single-page application from the exact same port:

### 1. Environment Configuration
Create or verify `.env` in `sap-test-generator/backend/.env`:
```env
GOOGLE_API_KEY=your_google_api_key_here
```

### 2. Run the Application
From the `backend` directory:
```bash
# Activate virtual environment
.venv\Scripts\activate

# Start server on port 8000
uvicorn main:app --host 127.0.0.1 --port 8000
```
Open your browser to:
👉 **`http://localhost:8000`**

Both the complete React web interface and all REST API endpoints run together on **`http://localhost:8000`**.

---

## Development & Rebuilding

### Rebuild Frontend (Optional)
If you modify frontend files in `frontend/src/`:
```bash
cd frontend
npm run build
```
This re-bundles the UI directly into `backend/static/`.

### Run Automated Tests
```bash
cd backend
.venv\Scripts\pytest tests/ -v
```
All automated unit, API, relevance filtering, generator, approval, and end-to-end pipeline tests will run.

---

## Project Structure
```
sap-test-generator/
├── backend/
│   ├── main.py                  # FastAPI app & single-port static mounting
│   ├── routes/
│   │   ├── upload.py            # POST /upload requirement document
│   │   ├── kb.py                # POST /kb/upload, GET /kb/list, DELETE /kb/{id}
│   │   ├── generate.py          # POST /generate/evaluate-kbs, POST /generate
│   │   └── approve.py           # POST /approve & automatic JSON download
│   ├── services/
│   │   ├── parser.py            # DOCX (.docx) and PDF (.pdf) text extractor
│   │   ├── relevance.py         # Gemini 2.5 Flash relevance filtering service
│   │   └── generator.py         # Gemini 2.5 Flash test case generator
│   ├── db/
│   │   ├── database.py          # SQLite database connection & schema
│   │   └── models.py            # Pydantic schemas
│   ├── static/                  # Built frontend assets served by FastAPI
│   ├── data/                    # Temporary document storage & knowledge_bases.db
│   ├── tests/                   # 22 automated pytest test suites
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Pipeline progress indicator
│   │   │   ├── TestCaseCard.jsx # Inline editable checklist card
│   │   │   └── KBUploadCard.jsx # Drag-and-drop KB uploader
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx   # Step 1: Upload requirement doc
│   │   │   ├── KBPage.jsx       # Step 2: Manage knowledge bases
│   │   │   ├── GeneratePage.jsx # Step 3 & 4: Relevance + Generation pipeline
│   │   │   ├── ReviewPage.jsx   # Step 5: Checklist review & edit
│   │   │   └── DownloadPage.jsx # Step 6: Confirmation & download
│   │   ├── App.jsx              # Main state container & router
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Clean white enterprise design system
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```
