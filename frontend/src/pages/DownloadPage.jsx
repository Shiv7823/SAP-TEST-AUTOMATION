import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  Copy, 
  Check, 
  FileText, 
  ArrowLeft
} from 'lucide-react';

export default function DownloadPage({ approvedData, onStartNew, onGoToReview }) {
  const [copied, setCopied] = useState(false);

  // If no approved data yet, show clean empty state
  if (!approvedData) {
    return (
      <div style={{ maxWidth: '760px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#475569'
          }}>
            <Download size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            No Approved Test Cases Yet
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            Review and approve your generated test cases to view and download the final JSON test suite.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onGoToReview && (
              <button onClick={onGoToReview} className="btn btn-secondary">
                <ArrowLeft size={16} />
                <span>Go to Review</span>
              </button>
            )}
            <button onClick={onStartNew} className="btn btn-primary">
              <RefreshCw size={16} />
              <span>Start from Upload</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const jsonString = JSON.stringify(approvedData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadAgain = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sap_test_cases_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const summary = approvedData?.coverage_summary || {
    positive: (approvedData?.test_cases || []).filter(t => t.type === 'positive').length,
    negative: (approvedData?.test_cases || []).filter(t => t.type === 'negative').length,
    boundary: (approvedData?.test_cases || []).filter(t => t.type === 'boundary').length,
  };

  return (
    <div style={{ maxWidth: '920px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: '#059669'
        }}>
          <CheckCircle2 size={36} />
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
          Test Cases Approved & Downloaded
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#475569', maxWidth: '560px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
          Your reviewed SAP test cases have been packaged into structured JSON and downloaded to your machine.
        </p>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', maxWidth: '640px', margin: '0 auto 1.75rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Approved</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>{approvedData?.total_test_cases || (approvedData?.test_cases || []).length}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #a7f3d0', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', fontWeight: 600 }}>Positive</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669', marginTop: '0.15rem' }}>{summary.positive}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 600 }}>Negative</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626', marginTop: '0.15rem' }}>{summary.negative}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 600 }}>Boundary</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706', marginTop: '0.15rem' }}>{summary.boundary}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <button type="button" onClick={handleDownloadAgain} className="btn btn-secondary">
            <Download size={15} />
            <span>Download JSON Again</span>
          </button>
          <button type="button" onClick={onStartNew} className="btn btn-primary">
            <RefreshCw size={15} />
            <span>Start New Requirement</span>
          </button>
        </div>
      </div>

      {/* JSON Viewer Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="#0f172a" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              Final JSON File Content
            </h3>
          </div>
          <button type="button" onClick={handleCopy} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            {copied ? (
              <>
                <Check size={13} color="#059669" />
                <span style={{ color: '#059669' }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          maxHeight: '360px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: '#1e293b',
          lineHeight: 1.55,
          whiteSpace: 'pre'
        }}>
          {jsonString}
        </div>
      </div>
    </div>
  );
}
