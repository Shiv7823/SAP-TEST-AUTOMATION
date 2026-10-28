import React from 'react';
import { 
  FileText, 
  Database, 
  Cpu, 
  CheckSquare, 
  Download, 
  Check, 
  Layers
} from 'lucide-react';

export default function Navbar({ currentStep, setCurrentStep, requirementDoc, testCases, approvedData }) {
  const steps = [
    { id: 'upload', label: '1. Upload Doc', icon: FileText, done: !!requirementDoc },
    { id: 'kb', label: '2. Manage KBs', icon: Database, done: false },
    { id: 'generate', label: '3. Generate', icon: Cpu, done: testCases && testCases.length > 0 },
    { id: 'review', label: '4. Review', icon: CheckSquare, done: !!approvedData },
    { id: 'download', label: '5. Download', icon: Download, done: !!approvedData },
  ];

  return (
    <nav className="nav-container">
      {/* Brand logo */}
      <button 
        type="button"
        onClick={() => setCurrentStep('upload')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        <div style={{
          background: '#0f172a',
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Layers size={18} color="#ffffff" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              SAP
            </span>
            <span style={{ fontWeight: 500, fontSize: '0.95rem', color: '#475569' }}>
              Test Generator
            </span>
          </div>
        </div>
      </button>

      {/* Stepper Nav - ALL TABS FREELY CLICKABLE */}
      <div className="pipeline-stepper">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isDone = s.done && !isActive;

          return (
            <React.Fragment key={s.id}>
              <button 
                type="button"
                className={`step-item ${isActive ? 'active' : isDone ? 'done' : ''}`}
                onClick={() => setCurrentStep(s.id)}
                title={`Switch to ${s.label}`}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                <div className="step-circle">
                  {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </div>
                <span>{s.label}</span>
              </button>
              {idx < steps.length - 1 && <div className="step-divider" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button 
          type="button"
          className={`btn ${currentStep === 'kb' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setCurrentStep('kb')}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          <Database size={14} />
          <span>Knowledge Bases</span>
        </button>
      </div>
    </nav>
  );
}
