import { useState, useEffect } from 'react';
import './PreviewPanel.css';

export default function PreviewPanel({ previewData, onStopPreview }) {
  // Add a key to force iframe reload when URL changes
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    if (previewData) {
      setFrameKey(k => k + 1);
    }
  }, [previewData]);

  if (!previewData) {
    return (
      <div className="preview-panel preview-panel--empty">
        <div className="preview-panel__empty-content">
          <div className="preview-panel__empty-icon">🌐</div>
          <h3>No Preview Running</h3>
          <p>Ask the agent to start a dev server (e.g. "Run the app") to see the preview here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <div className="preview-panel__controls-left">
          <div className="preview-panel__dots">
            <div className="preview-panel__dot preview-panel__dot--close" />
            <div className="preview-panel__dot preview-panel__dot--minimize" />
            <div className="preview-panel__dot preview-panel__dot--maximize" />
          </div>
          <div className="preview-panel__status">
            🟢 Running on port {previewData.port}
          </div>
        </div>
        
        <div className="preview-panel__url-container">
          <div className="preview-panel__url">{previewData.url}</div>
        </div>
        
        <div className="preview-panel__controls-right">
          <button className="preview-panel__btn preview-panel__btn--refresh" onClick={() => setFrameKey(k => k + 1)} title="Reload frame">
            🔄
          </button>
          <button className="preview-panel__btn preview-panel__btn--stop" onClick={onStopPreview} title="Stop Server">
            ⏹
          </button>
        </div>
      </div>

      <iframe
        key={frameKey}
        src={previewData.url}
        className="preview-panel__frame"
        title="App Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
