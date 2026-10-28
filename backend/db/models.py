from typing import Optional, List
from pydantic import BaseModel, Field


class KBCreateResponse(BaseModel):
    kb_id: int = Field(..., description="Unique ID of the uploaded Knowledge Base")
    name: str = Field(..., description="Name or title of the Knowledge Base")
    message: str = "Knowledge base uploaded successfully"


class KBListItem(BaseModel):
    id: int
    name: str
    file_type: Optional[str] = None
    uploaded_at: Optional[str] = None


class KBListResponse(BaseModel):
    knowledge_bases: List[KBListItem]
    total: int


class KBDeleteResponse(BaseModel):
    kb_id: int
    message: str


class DocumentUploadResponse(BaseModel):
    doc_id: str = Field(..., description="Unique ID generated for this uploaded document")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File format (docx, pdf, txt, etc.)")
    text: str = Field(..., description="Extracted plain text content")
    character_count: int = Field(..., description="Length of extracted text in characters")
    message: str = "Requirement document uploaded and parsed successfully"


class RelevantKBItem(BaseModel):
    id: int
    name: str
    file_type: Optional[str] = None
    snippet: Optional[str] = None


class RelevanceDecisionRequest(BaseModel):
    requirement_id: Optional[str] = Field(None, description="Uploaded requirement document ID")
    requirement_text: Optional[str] = Field(None, description="Direct requirement text if ID not provided")


class RelevanceDecisionResponse(BaseModel):
    status: str = Field(..., description="'success' or 'no_relevant_kbs'")
    relevant_kbs: List[RelevantKBItem] = Field(default_factory=list)
    decision_model_used: str = "gemini-2.5-flash"
    total_kbs_evaluated: int = 0
    message: Optional[str] = None


# Backwards compatibility aliases
LayaDecisionRequest = RelevanceDecisionRequest
LayaDecisionResponse = RelevanceDecisionResponse


class TestCaseModel(BaseModel):
    id: str = Field(..., description="Test case ID (e.g. TC-001)")
    title: str = Field(..., description="Concise test case title")
    related_component: str = Field(..., description="SAP module or component, or 'not found'")
    type: str = Field(..., description="'positive' | 'negative' | 'boundary'")
    preconditions: str = Field(..., description="Pre-test conditions or 'not found'")
    steps: List[str] = Field(..., description="Ordered list of execution steps")
    expected_result: str = Field(..., description="Expected system outcome")
    status: str = Field(default="pending", description="'pending' | 'approved'")


class GenerateRequest(BaseModel):
    requirement_id: Optional[str] = Field(None, description="Uploaded requirement ID")
    requirement_text: Optional[str] = Field(None, description="Direct text of requirement")
    relevant_kb_ids: Optional[List[int]] = Field(None, description="Optional pre-selected KB IDs from relevance step")
    proceed_without_kbs: bool = Field(False, description="Option A: proceed with requirement document alone")


class GenerateResponse(BaseModel):
    test_cases: List[TestCaseModel] = Field(default_factory=list)
    relevant_kbs_used: List[RelevantKBItem] = Field(default_factory=list)
    decision_model_used: str = "gemini-2.5-flash"
    status: str = Field(..., description="'success' | 'no_relevant_kbs'")
    message: Optional[str] = None


class ApproveRequest(BaseModel):
    test_cases: List[TestCaseModel] = Field(..., description="Final edited test cases approved by human")
    project_name: Optional[str] = "SAP Test Automation"
    requirement_id: Optional[str] = None




