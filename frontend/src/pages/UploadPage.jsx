import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Database
} from 'lucide-react';

export default function UploadPage({ requirementDoc, setRequirementDoc, onProceed, onGoToKBs }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.docx', '.pdf', '.txt', '.md'].includes(ext)) {
      setError(`Unsupported file type: ${ext}. Please upload a DOCX or PDF requirement document.`);
      return;
    }

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setRequirementDoc(data);
    } catch (err) {
      setError(err.message || 'Failed to upload and parse requirement document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      {/* Clean header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
          Step 1 of 5
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
          Upload Requirement Document
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.5 }}>
          Upload your functional specification in DOCX or PDF format. The system will extract text, match relevant knowledge bases, and generate test cases.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Area */}
      {!requirementDoc ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div 
            className={`dropzone ${isDragging ? 'drag-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              accept=".docx,.pdf,.txt,.md"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}>
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>

              {isUploading ? (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.2rem' }}>
                    Reading and extracting document...
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Parsing tables and text content
                  </p>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                    Click to select file or drag and drop here
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Supports Word (.docx) and PDF (.pdf) documents
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Need to check or add SAP rules first?
            </span>
            <button onClick={onGoToKBs} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <Database size={14} />
              <span>Manage Knowledge Bases</span>
            </button>
          </div>
        </div>
      ) : (
        /* Document Preview Card */
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a'
              }}>
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                  {requirementDoc.filename}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                    {requirementDoc.file_type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {requirementDoc.character_count?.toLocaleString()} characters
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setRequirementDoc(null)} 
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Replace Document
            </button>
          </div>

          {/* Extracted Text Preview Box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Extracted Document Content
            </div>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              maxHeight: '300px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.825rem',
              lineHeight: 1.5,
              color: '#334155',
              whiteSpace: 'pre-wrap',
            }}>
              {requirementDoc.text}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              onClick={onGoToKBs}
              className="btn btn-secondary"
            >
              <Database size={15} />
              <span>Knowledge Bases</span>
            </button>

            <button 
              onClick={onProceed} 
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.4rem' }}
            >
              <span>Proceed to Generate</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
