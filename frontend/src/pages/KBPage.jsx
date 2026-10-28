import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import KBUploadCard from '../components/KBUploadCard';

export default function KBPage({ onBackToPipeline, requirementDoc }) {
  const [kbs, setKbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  const fetchKbs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/kb/list');
      if (!response.ok) {
        throw new Error(`Failed to load KBs (status ${response.status})`);
      }
      const data = await response.json();
      setKbs(data);
    } catch (err) {
      setError(err.message || 'Error fetching knowledge bases.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete knowledge base: "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/kb/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete KB');
      }
      setKbs(kbs.filter(k => k.id !== id));
      setNotification(`Deleted "${name}" successfully.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError(err.message || 'Error deleting knowledge base.');
    }
  };

  const handleUploadSuccess = (newKb) => {
    setShowUploadModal(false);
    setNotification(`Successfully added "${newKb.name}" to SQLite Knowledge Base!`);
    setTimeout(() => setNotification(null), 3500);
    fetchKbs();
  };

  const filteredKbs = kbs.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.file_type && k.file_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            {onBackToPipeline && (
              <button 
                type="button"
                onClick={onBackToPipeline}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a' }}>
              SAP Knowledge Bases
            </h1>
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
              {kbs.length} indexed
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#475569' }}>
            Domain knowledge, business rules, and technical manuals used to filter context for test generation.
          </p>
        </div>

        <button 
          type="button"
          onClick={() => setShowUploadModal(true)} 
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Upload Knowledge Base</span>
        </button>
      </div>

      {notification && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#065f46',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

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
          marginBottom: '1.25rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Modal / Card */}
      {showUploadModal && (
        <div style={{ marginBottom: '1.5rem' }}>
          <KBUploadCard 
            onUploadSuccess={handleUploadSuccess} 
            onClose={() => setShowUploadModal(false)} 
          />
        </div>
      )}

      {/* Search & List */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search knowledge bases by name or type..."
              className="inline-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '2.25rem',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {filteredKbs.length} of {kbs.length} entries in SQLite
          </div>
        </div>

        {/* KB Table */}
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading knowledge bases from SQLite...
          </div>
        ) : filteredKbs.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#64748b'
            }}>
              <Database size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
              No Knowledge Bases Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {searchTerm ? 'No results matched your search query.' : 'Upload SAP domain manuals or rules to help the AI generate tailored test cases.'}
            </p>
            {!showUploadModal && (
              <button type="button" onClick={() => setShowUploadModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                <Plus size={15} />
                <span>Upload First Knowledge Base</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '0.65rem 0.85rem' }}>ID</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Title / Name</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>File Type</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Uploaded Date</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKbs.map((kb) => (
                  <tr 
                    key={kb.id} 
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      #{kb.id}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="#475569" />
                        <span>{kb.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {kb.file_type ? kb.file_type.toUpperCase() : 'TEXT'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#64748b', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{kb.uploaded_at ? kb.uploaded_at.substring(0, 19).replace('T', ' ') : 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(kb.id, kb.name)}
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        title="Delete from SQLite"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
