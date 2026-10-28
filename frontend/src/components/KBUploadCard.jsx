import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

export default function KBUploadCard({ onUploadSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.docx', '.pdf', '.md', '.markdown', '.txt'].includes(ext)) {
      setError(`Unsupported file type: ${ext}. Please select a .docx, .pdf, or .md file.`);
      return;
    }
    setError(null);
    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (name.trim()) {
      formData.append('name', name.trim());
    }

    try {
      const response = await fetch('/kb/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
      setFile(null);
      setName('');
    } catch (err) {
      setError(err.message || 'Failed to upload Knowledge Base.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative' }}>
      {onClose && (
        <button 
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      )}

      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>
        Add Knowledge Base (KB)
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem' }}>
        Upload SAP configuration manuals, pricing rules, shipping conditions, or architecture guidelines (DOCX, PDF, Markdown).
      </p>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Dropzone */}
        <div 
          className={`dropzone ${isDragging ? 'drag-active' : ''}`}
          style={{ padding: '2rem 1.5rem', marginBottom: '1.25rem' }}
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
            accept=".docx,.pdf,.md,.markdown,.txt"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}>
              <UploadCloud size={22} />
            </div>
            {file ? (
              <div>
                <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.9rem' }}>
                  Selected: {file.name}
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  ({(file.size / 1024).toFixed(1)} KB) - Click to replace
                </span>
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                  Click to choose file or drag & drop here
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Supports DOCX, PDF, and Markdown
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KB Title / Name input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
            Knowledge Base Title (Optional):
          </label>
          <input 
            type="text"
            className="inline-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SAP SD Pricing & Condition Rules"
            style={{ 
              padding: '0.55rem 0.85rem', 
              fontSize: '0.875rem' 
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Indexing in SQLite...</span>
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                <span>Save to Knowledge Base</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
