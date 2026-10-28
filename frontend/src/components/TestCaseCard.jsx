import React, { useState } from 'react';
import { Check, Edit3, Trash2 } from 'lucide-react';

export default function TestCaseCard({ testCase, isReviewed, onToggleReview, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);

  // Type badge color
  const typeBadgeClass = 
    testCase.type === 'positive' ? 'badge-positive' :
    testCase.type === 'negative' ? 'badge-negative' : 'badge-boundary';

  const handleFieldChange = (field, value) => {
    onUpdate({ ...testCase, [field]: value });
  };

  const handleStepsChange = (e) => {
    const lines = e.target.value.split('\n').filter(line => line.trim().length > 0);
    onUpdate({ ...testCase, steps: lines });
  };

  return (
    <div className={`test-card ${isReviewed ? 'reviewed' : ''}`}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="checkbox"
            className="checkbox-custom"
            checked={isReviewed}
            onChange={() => onToggleReview(testCase.id)}
            title="Mark as reviewed"
          />
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            fontSize: '0.875rem', 
            color: '#0f172a'
          }}>
            {testCase.id}
          </span>
          <span className={`badge ${typeBadgeClass}`}>
            {testCase.type}
          </span>
          {isReviewed && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
              <Check size={13} /> Reviewed
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            title={isEditing ? 'Done editing' : 'Edit fields inline'}
          >
            <Edit3 size={12} />
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(testCase.id)}
              className="btn btn-danger"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
              title="Delete test case"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '0.75rem' }}>
        {isEditing ? (
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
              Test Case Title:
            </label>
            <input
              type="text"
              className="inline-input"
              value={testCase.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              style={{ fontWeight: 600, fontSize: '0.95rem' }}
            />
          </div>
        ) : (
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
            {testCase.title}
          </h3>
        )}
      </div>

      {/* Meta grid: Related Component & Preconditions */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0.85rem', 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0',
        padding: '0.65rem 0.85rem', 
        borderRadius: 'var(--radius-sm)',
        marginBottom: '0.75rem'
      }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Related Component:
          </span>
          {isEditing ? (
            <input
              type="text"
              className="inline-input"
              value={testCase.related_component || ''}
              onChange={(e) => handleFieldChange('related_component', e.target.value)}
              style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}
            />
          ) : (
            <div style={{ fontSize: '0.825rem', color: '#1e293b', marginTop: '0.15rem', fontWeight: 500 }}>
              {testCase.related_component || 'N/A'}
            </div>
          )}
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Preconditions:
          </span>
          {isEditing ? (
            <input
              type="text"
              className="inline-input"
              value={testCase.preconditions || ''}
              onChange={(e) => handleFieldChange('preconditions', e.target.value)}
              style={{ fontSize: '0.825rem', marginTop: '0.2rem' }}
            />
          ) : (
            <div style={{ fontSize: '0.825rem', color: '#1e293b', marginTop: '0.15rem', fontWeight: 500 }}>
              {testCase.preconditions || 'None'}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
          Execution Steps:
        </span>
        {isEditing ? (
          <textarea
            className="inline-input"
            rows={Math.max(3, (testCase.steps || []).length)}
            value={(testCase.steps || []).join('\n')}
            onChange={handleStepsChange}
            placeholder="One step per line..."
            style={{ 
              fontSize: '0.825rem', 
              fontFamily: 'var(--font-mono)', 
              padding: '0.45rem'
            }}
          />
        ) : (
          <ol style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#334155', lineHeight: 1.6 }}>
            {(testCase.steps || []).map((step, idx) => (
              <li key={idx} style={{ marginBottom: '0.15rem' }}>{step}</li>
            ))}
          </ol>
        )}
      </div>

      {/* Expected Result */}
      <div>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
          Expected Result:
        </span>
        {isEditing ? (
          <textarea
            className="inline-input"
            rows={2}
            value={testCase.expected_result || ''}
            onChange={(e) => handleFieldChange('expected_result', e.target.value)}
            style={{ 
              fontSize: '0.825rem', 
              padding: '0.45rem'
            }}
          />
        ) : (
          <div style={{ 
            fontSize: '0.825rem', 
            color: '#065f46', 
            background: '#ecfdf5', 
            padding: '0.5rem 0.75rem', 
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid #059669'
          }}>
            {testCase.expected_result}
          </div>
        )}
      </div>
    </div>
  );
}
