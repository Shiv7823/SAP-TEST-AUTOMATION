import React, { useState } from 'react';
import { 
  CheckCircle, 
  CheckSquare, 
  Filter, 
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Loader2
} from 'lucide-react';
import TestCaseCard from '../components/TestCaseCard';

export default function ReviewPage({ 
  testCases, 
  setTestCases, 
  relevantKbsUsed, 
  onApprovalComplete,
  onGoToUpload,
  onGoToGenerate
}) {
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [filterType, setFilterType] = useState('all'); // 'all' | 'positive' | 'negative' | 'boundary'
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState(null);

  // If no test cases exist yet, show clean empty state
  if (!testCases || testCases.length === 0) {
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
            <CheckSquare size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            No Test Cases Generated Yet
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            Upload a requirement document and run generation to review, edit, and approve test cases here.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onGoToUpload && (
              <button onClick={onGoToUpload} className="btn btn-secondary">
                <ArrowLeft size={16} />
                <span>Upload Document</span>
              </button>
            )}
            {onGoToGenerate && (
              <button onClick={onGoToGenerate} className="btn btn-primary">
                <span>Go to Generate</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Toggle single test case review
  const handleToggleReview = (id) => {
    const next = new Set(reviewedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setReviewedIds(next);
  };

  // Select all as reviewed
  const handleSelectAll = () => {
    if (reviewedIds.size === testCases.length) {
      setReviewedIds(new Set());
    } else {
      setReviewedIds(new Set(testCases.map(tc => tc.id)));
    }
  };

  // Update a test case inline
  const handleUpdateTestCase = (updated) => {
    setTestCases(testCases.map(tc => tc.id === updated.id ? updated : tc));
  };

  // Delete a test case
  const handleDeleteTestCase = (id) => {
    if (window.confirm(`Delete test case ${id}?`)) {
      setTestCases(testCases.filter(tc => tc.id !== id));
      const next = new Set(reviewedIds);
      next.delete(id);
      setReviewedIds(next);
    }
  };

  // Filter test cases
  const displayedCases = testCases.filter(tc => {
    if (filterType === 'all') return true;
    return tc.type === filterType;
  });

  // Coverage statistics
  const totalCases = testCases.length;
  const positiveCases = testCases.filter(tc => tc.type === 'positive').length;
  const negativeCases = testCases.filter(tc => tc.type === 'negative').length;
  const boundaryCases = testCases.filter(tc => tc.type === 'boundary').length;
  const reviewedCount = reviewedIds.size;
  const allReviewed = totalCases > 0 && reviewedCount === totalCases;

  // Approve & Download Handler
  const handleApprove = async () => {
    if (!allReviewed) return;

    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch('/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'SAP Test Automation',
          test_cases: testCases,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Approval failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const exportJson = JSON.parse(await blob.text());

      // Trigger automatic local browser download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `sap_test_cases_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Transition to Download Page
      onApprovalComplete(exportJson);
    } catch (err) {
      setError(err.message || 'Failed to approve test cases.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Header and Summary stats */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <div style={{ display: 'inline-block', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                Step 4 of 5
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a' }}>
                Review Generated Test Cases
              </h1>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#475569' }}>
              Edit titles, components, steps, or expected results inline. Check off each test case to verify human review before approving.
            </p>
          </div>

          <button
            onClick={handleApprove}
            disabled={!allReviewed || isApproving}
            className="btn btn-primary"
            style={{ padding: '0.7rem 1.6rem' }}
          >
            {isApproving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating JSON...</span>
              </>
            ) : (
              <>
                <FileCheck2 size={16} />
                <span>{allReviewed ? 'Approve & Download JSON' : `Approve (${totalCases - reviewedCount} unreviewed)`}</span>
              </>
            )}
          </button>
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
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Coverage Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Cases
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
              {totalCases}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center', borderColor: '#a7f3d0' }}>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>
              Positive
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
              {positiveCases}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center', borderColor: '#fecaca' }}>
            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>
              Negative
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: '0.2rem' }}>
              {negativeCases}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center', borderColor: '#fde68a' }}>
            <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>
              Boundary
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: '0.2rem' }}>
              {boundaryCases}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center', borderColor: allReviewed ? '#a7f3d0' : '#e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Reviewed
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: allReviewed ? '#059669' : '#0f172a', marginTop: '0.2rem' }}>
              {reviewedCount} / {totalCases}
            </div>
          </div>
        </div>

        {/* Toolbar: Filters and Select All */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#64748b" />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.4rem', fontWeight: 600 }}>
              FILTER:
            </span>
            {[
              { id: 'all', label: `All (${totalCases})` },
              { id: 'positive', label: `Positive (${positiveCases})` },
              { id: 'negative', label: `Negative (${negativeCases})` },
              { id: 'boundary', label: `Boundary (${boundaryCases})` },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`btn ${filterType === f.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSelectAll}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          >
            <CheckSquare size={13} />
            <span>{reviewedIds.size === totalCases ? 'Uncheck All' : 'Mark All as Reviewed'}</span>
          </button>
        </div>
      </div>

      {/* Test cases list */}
      <div>
        {displayedCases.map(tc => (
          <TestCaseCard
            key={tc.id}
            testCase={tc}
            isReviewed={reviewedIds.has(tc.id)}
            onToggleReview={handleToggleReview}
            onUpdate={handleUpdateTestCase}
            onDelete={handleDeleteTestCase}
          />
        ))}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: '1.25rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        marginTop: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: allReviewed ? '#059669' : '#d97706',
          }} />
          <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
            {allReviewed 
              ? 'All test cases reviewed! Ready for final QA approval.' 
              : `${totalCases - reviewedCount} test cases remaining for review before approval.`}
          </span>
        </div>

        <button
          onClick={handleApprove}
          disabled={!allReviewed || isApproving}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.6rem' }}
        >
          {isApproving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Generating JSON...</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              <span>Approve & Download JSON</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
