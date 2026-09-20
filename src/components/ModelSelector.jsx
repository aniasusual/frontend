import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import './ModelSelector.css';

/**
 * ModelSelector — Minimalist Notion-style model management modal with search,
 * filtering, download progress, custom pull, and deletion.
 */
export default function ModelSelector({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  hardwareInfo,
  models = [],
  onRefreshModels,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'installed' | 'optimal'
  const [searchQuery, setSearchQuery] = useState('');
  const [pullingModel, setPullingModel] = useState(null);
  const [pullProgress, setPullProgress] = useState({ percent: 0, status: '', completed: 0, total: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (!isOpen) return null;

  const installedCount = models.filter((m) => m.installed).length;
  const optimalCount = models.filter((m) => m.compatibility === 'optimal').length;

  const filteredModels = models.filter((m) => {
    // 1. Tab filter
    if (filter === 'installed' && !m.installed) return false;
    if (filter === 'optimal' && m.compatibility !== 'optimal') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchId = m.id?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchParam = m.param_size?.toLowerCase().includes(q);
      const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q));
      const matchCompat = m.compatibility_label?.toLowerCase().includes(q);
      return matchName || matchId || matchDesc || matchParam || matchTags || matchCompat;
    }
    return true;
  });

  const handleSelect = (modelId) => {
    onSelectModel(modelId);
    onClose();
  };

  const handlePullModel = async (e, modelId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const cleanId = modelId.trim();
    if (!cleanId) return;

    setPullingModel(cleanId);
    setPullProgress({ percent: 0, status: 'Starting...', completed: 0, total: 0 });
    setActionError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cleanId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start download: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.status === 'error') {
                throw new Error(data.error || 'Download failed');
              }
              setPullProgress({
                percent: data.percent || 0,
                status: data.status || 'Downloading...',
                completed: data.completed || 0,
                total: data.total || 0,
              });

              if (data.done || data.status === 'success') {
                setPullingModel(null);
                if (onRefreshModels) onRefreshModels();
                onSelectModel(cleanId);
              }
            } catch (err) {
              console.error('Error parsing SSE line:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Pull error:', err);
      setActionError(`Download error: ${err.message}`);
      setPullingModel(null);
    } finally {
      if (onRefreshModels) onRefreshModels();
    }
  };

  const handleDeleteModel = async (e, modelId) => {
    e.stopPropagation();
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/models/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      setDeleteConfirm(null);
      if (onRefreshModels) onRefreshModels();
      if (selectedModel === modelId) {
        const nextInstalled = models.find((m) => m.installed && m.id !== modelId);
        if (nextInstalled) {
          onSelectModel(nextInstalled.id);
        } else {
          onSelectModel('qwen2.5-coder:14b');
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(`Delete error: ${err.message}`);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="notion-modal__backdrop" onClick={onClose}>
      <div className="notion-modal__window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-modal__header">
          <div className="notion-modal__header-info">
            <div className="notion-modal__title-row">
              <h2 className="notion-modal__title">Models</h2>
              {hardwareInfo && (
                <span className="notion-modal__hw-label">
                  {hardwareInfo.chip_name} · {hardwareInfo.total_ram_gb} GB{' '}
                  {hardwareInfo.is_apple_silicon ? 'Unified Memory' : 'RAM'}
                </span>
              )}
            </div>
          </div>
          <button className="notion-modal__close-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="notion-modal__search-bar">
          <svg className="notion-modal__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="notion-modal__search-input"
            placeholder="Search models (e.g. qwen, deepseek, 14b, 30b)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className="notion-modal__search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Action / Error Banner */}
        {actionError && (
          <div className="notion-modal__error-banner">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        {/* Segmented Filter Tabs */}
        <div className="notion-modal__tabs">
          <button
            className={`notion-modal__tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All <span className="notion-modal__tab-count">{models.length}</span>
          </button>
          <button
            className={`notion-modal__tab ${filter === 'installed' ? 'active' : ''}`}
            onClick={() => setFilter('installed')}
          >
            Installed <span className="notion-modal__tab-count">{installedCount}</span>
          </button>
          <button
            className={`notion-modal__tab ${filter === 'optimal' ? 'active' : ''}`}
            onClick={() => setFilter('optimal')}
          >
            Optimal <span className="notion-modal__tab-count">{optimalCount}</span>
          </button>
        </div>

        {/* Model Rows */}
        <div className="notion-modal__list">
          {filteredModels.length > 0 ? (
            filteredModels.map((model) => {
              const isSelected = selectedModel === model.id;
              const isDownloading = pullingModel === model.id;
              const isConfirmingDelete = deleteConfirm === model.id;

              return (
                <div
                  key={model.id}
                  className={`notion-model-row ${isSelected ? 'notion-model-row--selected' : ''} ${
                    !model.can_run && !model.installed ? 'notion-model-row--heavy' : ''
                  }`}
                  onClick={() => model.installed && handleSelect(model.id)}
                >
                  <div className="notion-model-row__main">
                    <div className="notion-model-row__title-group">
                      <span className="notion-model-row__name">{model.name}</span>
                      <span className="notion-model-row__param">{model.param_size}</span>
                      {model.installed && (
                        <span className="notion-model-row__installed-tag">Installed</span>
                      )}
                      <span className={`notion-model-row__badge notion-model-row__badge--${model.compatibility}`}>
                        {model.compatibility_label}
                      </span>
                    </div>

                    <p className="notion-model-row__desc">{model.description}</p>

                    <div className="notion-model-row__meta">
                      <span>{model.required_ram_gb} GB RAM</span>
                      <span>·</span>
                      <span>{model.context_length} ctx</span>
                      <span>·</span>
                      <span className="notion-model-row__reason">{model.compatibility_reason}</span>
                    </div>

                    {isDownloading && (
                      <div className="notion-model-row__progress-box">
                        <div className="notion-model-row__progress-header">
                          <span>{pullProgress.status}</span>
                          <span>{pullProgress.percent}%</span>
                        </div>
                        <div className="notion-model-row__progress-track">
                          <div
                            className="notion-model-row__progress-bar"
                            style={{ width: `${Math.min(100, Math.max(3, pullProgress.percent))}%` }}
                          />
                        </div>
                        {pullProgress.total > 0 && (
                          <span className="notion-model-row__progress-sub">
                            {formatBytes(pullProgress.completed)} / {formatBytes(pullProgress.total)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="notion-model-row__actions">
                    {model.installed ? (
                      <>
                        {isSelected ? (
                          <div className="notion-model-row__active-indicator">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Active</span>
                          </div>
                        ) : (
                          <button
                            className="notion-btn notion-btn--secondary"
                            onClick={() => handleSelect(model.id)}
                          >
                            Select
                          </button>
                        )}

                        {/* Delete */}
                        {isConfirmingDelete ? (
                          <div className="notion-model-row__delete-confirm">
                            <span>Delete?</span>
                            <button
                              className="notion-btn notion-btn--danger-sm"
                              onClick={(e) => handleDeleteModel(e, model.id)}
                            >
                              Yes
                            </button>
                            <button
                              className="notion-btn notion-btn--ghost-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="notion-btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(model.id);
                            }}
                            title="Delete model"
                            aria-label="Delete model"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {isDownloading ? (
                          <span className="notion-model-row__downloading-text">Downloading...</span>
                        ) : (
                          <button
                            className="notion-btn notion-btn--secondary"
                            onClick={(e) => handlePullModel(e, model.id)}
                            title={!model.can_run ? `Requires ${model.required_ram_gb} GB RAM (may utilize swap memory on this machine)` : undefined}
                          >
                            Download
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="notion-modal__empty-state">
              <span className="notion-modal__empty-text">
                No matching models found for "{searchQuery}".
              </span>
              {searchQuery.trim() && (
                <div className="notion-modal__custom-pull-box">
                  <p className="notion-modal__custom-pull-sub">
                    You can download any custom tag from Ollama directly:
                  </p>
                  <button
                    className="notion-btn notion-btn--secondary"
                    onClick={(e) => handlePullModel(e, searchQuery.trim())}
                  >
                    Download "{searchQuery.trim()}" from Ollama
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notion-modal__footer">
          <span className="notion-modal__footer-text">
            Runs locally via Ollama · Private & offline
          </span>
        </div>
      </div>
    </div>
  );
}
