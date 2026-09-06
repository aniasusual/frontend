import React, { useState, useEffect } from 'react';
import './LlmDebugModal.css';

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CloseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

function JsonTreeNode({ name, value, isLast = true, depth = 0, globalExpand }) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;

  // Top level fields (depth < 2) start expanded; deeper nodes start collapsed
  const [isCollapsed, setIsCollapsed] = useState(() => depth >= 2);

  useEffect(() => {
    if (globalExpand) {
      setIsCollapsed(!globalExpand.expand);
    }
  }, [globalExpand]);

  const renderKey = () => {
    if (name === undefined) return null;
    return (
      <span className="json-key">
        {typeof name === 'number' ? name : `"${name}"`}:{' '}
      </span>
    );
  };

  if (value === null) {
    return (
      <div className="json-line">
        {renderKey()}
        <span className="json-null">null</span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="json-line">
        {renderKey()}
        <span className="json-boolean">{String(value)}</span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="json-line">
        {renderKey()}
        <span className="json-number">{value}</span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="json-line">
        {renderKey()}
        <span className="json-string">{JSON.stringify(value)}</span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  if (isArray) {
    if (value.length === 0) {
      return (
        <div className="json-line">
          {renderKey()}
          <span className="json-bracket">[]</span>
          {!isLast && <span className="json-comma">,</span>}
        </div>
      );
    }

    return (
      <div className="json-node">
        <div className="json-line json-line--expandable">
          <button
            type="button"
            className="json-toggle"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand array' : 'Collapse array'}
          >
            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
          </button>
          {renderKey()}
          <span className="json-bracket">[</span>
          {isCollapsed && (
            <>
              <button
                type="button"
                className="json-collapsed-summary"
                onClick={() => setIsCollapsed(false)}
              >
                {value.length} {value.length === 1 ? 'item' : 'items'}
              </button>
              <span className="json-bracket">]</span>
              {!isLast && <span className="json-comma">,</span>}
            </>
          )}
        </div>

        {!isCollapsed && (
          <>
            <div className="json-children">
              {value.map((item, idx) => (
                <JsonTreeNode
                  key={idx}
                  name={idx}
                  value={item}
                  isLast={idx === value.length - 1}
                  depth={depth + 1}
                  globalExpand={globalExpand}
                />
              ))}
            </div>
            <div className="json-line json-line--closing">
              <span className="json-bracket">]</span>
              {!isLast && <span className="json-comma">,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  if (isObject) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div className="json-line">
          {renderKey()}
          <span className="json-bracket">&#123;&#125;</span>
          {!isLast && <span className="json-comma">,</span>}
        </div>
      );
    }

    return (
      <div className="json-node">
        <div className="json-line json-line--expandable">
          <button
            type="button"
            className="json-toggle"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand object' : 'Collapse object'}
          >
            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
          </button>
          {renderKey()}
          <span className="json-bracket">&#123;</span>
          {isCollapsed && (
            <>
              <button
                type="button"
                className="json-collapsed-summary"
                onClick={() => setIsCollapsed(false)}
              >
                {keys.length} {keys.length === 1 ? 'key' : 'keys'}
              </button>
              <span className="json-bracket">&#125;</span>
              {!isLast && <span className="json-comma">,</span>}
            </>
          )}
        </div>

        {!isCollapsed && (
          <>
            <div className="json-children">
              {keys.map((key, idx) => (
                <JsonTreeNode
                  key={key}
                  name={key}
                  value={value[key]}
                  isLast={idx === keys.length - 1}
                  depth={depth + 1}
                  globalExpand={globalExpand}
                />
              ))}
            </div>
            <div className="json-line json-line--closing">
              <span className="json-bracket">&#125;</span>
              {!isLast && <span className="json-comma">,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="json-line">
      {renderKey()}
      <span>{String(value)}</span>
      {!isLast && <span className="json-comma">,</span>}
    </div>
  );
}

export default function LlmDebugModal({ isOpen, onClose, debugData }) {
  const [copied, setCopied] = useState(false);
  const [globalExpand, setGlobalExpand] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !debugData) return null;

  let parsedData = debugData;
  let jsonString = '';

  if (typeof debugData === 'string') {
    jsonString = debugData;
    try {
      parsedData = JSON.parse(debugData);
    } catch {
      parsedData = debugData;
    }
  } else {
    try {
      jsonString = JSON.stringify(debugData, null, 2);
    } catch {
      jsonString = String(debugData);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExpandAll = () => {
    setGlobalExpand({ id: Date.now(), expand: true });
  };

  const handleCollapseAll = () => {
    setGlobalExpand({ id: Date.now(), expand: false });
  };

  return (
    <div className="llm-debug-overlay" onClick={onClose}>
      <div className="llm-debug-modal" onClick={(e) => e.stopPropagation()}>
        <div className="llm-debug-header">
          <div className="llm-debug-header__left">
            <span className="llm-debug-title">Debug JSON Tree</span>
          </div>
          <div className="llm-debug-header__actions">
            <button
              type="button"
              className="llm-debug-btn"
              onClick={handleExpandAll}
              title="Expand all nodes"
            >
              Expand All
            </button>
            <button
              type="button"
              className="llm-debug-btn"
              onClick={handleCollapseAll}
              title="Collapse all nodes"
            >
              Collapse All
            </button>
            <button
              type="button"
              className="llm-debug-btn"
              onClick={handleCopy}
              title="Copy raw JSON"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              className="llm-debug-btn llm-debug-btn--close"
              onClick={onClose}
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="llm-debug-body">
          <div className="json-tree-container">
            {typeof parsedData === 'object' && parsedData !== null ? (
              <JsonTreeNode
                value={parsedData}
                isLast={true}
                depth={0}
                globalExpand={globalExpand}
              />
            ) : (
              <pre className="json-raw-fallback">{jsonString}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
