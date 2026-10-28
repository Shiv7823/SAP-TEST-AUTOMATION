import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Database, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Square,
  StopCircle,
  RefreshCw
} from 'lucide-react';

export default function GeneratePage({ 
  requirementDoc, 
  onTestCasesGenerated, 
  onAbortToKBs, 
  onBackToUpload 
}) {
  const [phase, setPhase] = useState('evaluating_relevance'); // 'evaluating_relevance' | 'relevance_results' | 'no_relevant_prompt' | 'generating_gemini' | 'stopped' | 'error'
  const [relevanceResult, setRelevanceResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingText, setLoadingText] = useState('Finding relevant Knowledge Bases using Gemini 2.5 Flash...');

  const abortControllerRef = useRef(null);

  // Run Relevance Evaluation on mount when requirementDoc is present
  useEffect(() => {
    if (!requirementDoc) return;
    runRelevanceEvaluation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [requirementDoc]);

  const handleStopExecution = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      await fetch('/generate/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement_id: requirementDoc?.doc_id,
        }),
      });
    } catch (_) {}

    setPhase('stopped');
  };

  const runRelevanceEvaluation = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPhase('evaluating_relevance');
    setErrorMsg(null);
    setLoadingText('Evaluating Knowledge Bases using Gemini 2.5 Flash...');

    try {
      const response = await fetch('/generate/evaluate-kbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          requirement_id: requirementDoc.doc_id,
          requirement_text: requirementDoc.text,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Relevance evaluation failed with status ${response.status}`);
      }

      const data = await response.json();
      setRelevanceResult(data);

      if (data.status === 'no_relevant_kbs' || (data.relevant_kbs || []).length === 0) {
        setPhase('no_relevant_prompt');
      } else {
        setPhase('relevance_results');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('stopped');
        return;
      }
      setErrorMsg(err.message || 'Relevance filtering failed.');
      setPhase('error');
    }
  };

  const runGeminiGeneration = async (proceedWithoutKbs = false) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPhase('generating_gemini');
    setErrorMsg(null);
    setLoadingText('Generating structured test cases using Gemini 2.5 Flash...');

    try {
      const relevantKbIds = proceedWithoutKbs 
        ? [] 
        : (relevanceResult?.relevant_kbs || []).map(k => k.id);

      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          requirement_id: requirementDoc.doc_id,
          requirement_text: requirementDoc.text,
          relevant_kb_ids: relevantKbIds,
          proceed_without_kbs: proceedWithoutKbs,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Generation failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success' && data.test_cases) {
        onTestCasesGenerated(data.test_cases, data.relevant_kbs_used || []);
      } else if (data.status === 'no_relevant_kbs') {
        setPhase('no_relevant_prompt');
      } else {
        throw new Error(data.message || 'Unknown response from generator.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('stopped');
        return;
      }
      setErrorMsg(err.message || 'Test case generation failed.');
      setPhase('error');
    }
  };

  // If no requirement doc has been uploaded yet, show clear empty state
  if (!requirementDoc) {
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
            <FileText size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            No Requirement Document Uploaded
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            Please upload your functional specification (DOCX or PDF) to start the test generation pipeline.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={onBackToUpload} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
              <ArrowLeft size={16} />
              <span>Go to Upload Document</span>
            </button>
            <button onClick={onAbortToKBs} className="btn btn-secondary">
              <Database size={16} />
              <span>Manage Knowledge Bases</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
          Step 3 of 5
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
          Test Case Generation
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#475569' }}>
          Document: <span style={{ color: '#0f172a', fontWeight: 600 }}>{requirementDoc.filename}</span>
        </p>
      </div>

      {/* PHASE 1: Loading with STOP BUTTON */}
      {(phase === 'evaluating_relevance' || phase === 'generating_gemini') && (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#0f172a'
          }}>
            <Loader2 size={32} className="animate-spin" />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            {loadingText}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>
            {phase === 'evaluating_relevance' 
              ? 'Gemini 2.5 Flash evaluates relevance across your stored knowledge bases.' 
              : 'Synthesizing positive, negative, and boundary test cases strictly from provided inputs.'}
          </p>

          <div style={{ 
            marginTop: '2rem', 
            height: '4px', 
            background: '#e2e8f0', 
            borderRadius: '2px', 
            maxWidth: '300px', 
            margin: '2rem auto 0',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: '#0f172a',
              width: '60%',
              borderRadius: '2px'
            }} />
          </div>

          {/* STOP BUTTON */}
          <div style={{ marginTop: '2.5rem' }}>
            <button 
              onClick={handleStopExecution} 
              className="btn btn-danger"
              style={{ padding: '0.6rem 1.4rem' }}
              title="Immediately cancel in-flight LLM execution"
            >
              <Square size={15} />
              <span>Stop Execution</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE: Execution Stopped by User */}
      {phase === 'stopped' && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#fecaca' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#dc2626'
          }}>
            <StopCircle size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Generation Cancelled
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#475569', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            Execution was stopped. No partial test cases were saved. You can restart generation, review knowledge bases, or return to upload.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={onBackToUpload} className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Upload</span>
            </button>
            <button onClick={onAbortToKBs} className="btn btn-secondary">
              <Database size={16} />
              <span>Manage KBs</span>
            </button>
            <button 
              onClick={() => runGeminiGeneration(false)} 
              className="btn btn-primary"
            >
              <RefreshCw size={16} />
              <span>Restart Generation</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: Results with Relevant KBs */}
      {phase === 'relevance_results' && relevanceResult && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
                Gemini 2.5 Flash Selected {relevanceResult.relevant_kbs.length} Relevant Knowledge Base(s)
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Evaluated against {relevanceResult.total_kbs_evaluated} knowledge bases in SQLite database
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {relevanceResult.relevant_kbs.map(kb => (
                <div key={kb.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <Database size={18} color="#059669" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                        {kb.name}
                      </span>
                      <span className="badge badge-positive" style={{ fontSize: '0.65rem' }}>
                        Relevant
                      </span>
                    </div>
                    {kb.snippet && (
                      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                        "{kb.snippet}..."
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
            <button onClick={runRelevanceEvaluation} className="btn btn-secondary">
              Re-evaluate Relevance
            </button>
            <button 
              onClick={() => runGeminiGeneration(false)} 
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem' }}
            >
              <span>Generate Test Cases</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: Zero Relevant KBs -> Option A vs Option B dialog */}
      {phase === 'no_relevant_prompt' && (
        <div className="glass-panel" style={{ padding: '2rem', borderColor: '#fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
                Zero Relevant Knowledge Bases Found
              </h2>
              <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                {relevanceResult?.message || 'Gemini evaluated your requirement and found no matching domain KBs in SQLite.'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Please select how you would like to proceed:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Option A Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '0.65rem' }}>
                  Option A
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Proceed with Document Alone
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  The agent will generate test cases strictly using the requirement document alone, without additional KB context.
                </p>
              </div>
              <button 
                onClick={() => runGeminiGeneration(true)} 
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <span>Proceed with Doc Alone</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Option B Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '0.65rem' }}>
                  Option B
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Abort & Upload KBs
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Return to the Knowledge Base page to upload relevant SAP manuals, pricing tables, or shipping rules.
                </p>
              </div>
              <button 
                onClick={onAbortToKBs} 
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                <Database size={15} />
                <span>Upload Knowledge Bases</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error View */}
      {phase === 'error' && (
        <div className="glass-panel" style={{ padding: '2rem', borderColor: '#fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
            <AlertTriangle size={22} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              Pipeline Processing Error
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#991b1b', background: '#fef2f2', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)' }}>
            {errorMsg}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={onBackToUpload} className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Upload</span>
            </button>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button type="button" onClick={runRelevanceEvaluation} className="btn btn-secondary">
                Retry Filter
              </button>
              <button 
                type="button" 
                onClick={() => runGeminiGeneration(true)} 
                className="btn btn-primary"
                title="Generate test cases using document alone without KBs"
              >
                <span>Proceed with Doc Alone</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
