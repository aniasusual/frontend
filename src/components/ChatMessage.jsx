import { useState, useEffect } from 'react';
import LlmDebugModal from './LlmDebugModal';
import { isSubagentTool, getSubagentDisplayName } from './subagentUtils';
import './ChatMessage.css';

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CodeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const LoaderIcon = () => (
  <svg className="chat-msg__loader" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10"></path>
  </svg>
);

const ChevronIcon = ({ expanded }) => (
  <svg
    className={`chat-msg__chevron ${expanded ? 'chat-msg__chevron--expanded' : ''}`}
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ToolIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>
);

const FileIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const AgentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
  </svg>
);

const MessageFooter = ({ timestamp, contentToCopy, debug, onOpenDebug }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (contentToCopy) {
      const text = typeof contentToCopy === 'string' ? contentToCopy : JSON.stringify(contentToCopy, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDebugClick = (e) => {
    e.stopPropagation();
    if (onOpenDebug) {
      onOpenDebug();
    }
  };

  const timeValue = timestamp ? new Date(timestamp) : new Date();
  const timeString = timeValue.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-msg__footer">
      <span className="chat-msg__time">{timeString}</span>
      {debug && (
        <button
          className="chat-msg__debug-btn"
          onClick={handleDebugClick}
          title="Inspect exact LLM Prompt & Response payload"
        >
          <CodeIcon />
          <span>Debug</span>
        </button>
      )}
      {contentToCopy && (
        <button className="chat-msg__copy" onClick={handleCopy} title="Copy text">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}
    </div>
  );
};

/**
 * ChatMessage — Renders a single chat message bubble with Notion minimalism and LLM payload debugging.
 */
export default function ChatMessage({ message, isActive, onOpenSubagent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  useEffect(() => {
    if (message.collapsed) {
      setIsExpanded(false);
    }
  }, [message.collapsed]);

  const toggleExpand = () => setIsExpanded(prev => !prev);
  const openDebug = () => setIsDebugOpen(true);

  const renderBubble = () => {
    // User message
    if (message.role === 'user' || message.type === 'user') {
      return (
        <div className="chat-msg chat-msg--user">
          <div className="chat-msg__box chat-msg__box--user">
            <div className="chat-msg__content">{message.content}</div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={message.content}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    // Status message
    if (message.type === 'status') {
      return <div className="chat-msg chat-msg--status">{message.content}</div>;
    }

    // Tool call
    if (message.type === 'tool_call') {
      const isSubagent = isSubagentTool(message.name);
      const isRunning = isActive && !message.collapsed;
      const isSubagentRunning = isSubagent && isActive && isRunning && (
        message.subagentStatus === 'running' ||
        (message.subagentStatus !== 'completed' && message.subagentStatus !== 'failed' && message.subagentStatus !== 'interrupted')
      );
      const isSubagentFinished = isSubagent && !isSubagentRunning;
      const argsStr = message.arguments
        ? (typeof message.arguments === 'string' ? message.arguments : JSON.stringify(message.arguments, null, 2))
        : '';
      // Extract file targets for friendly display
      let fileList = [];
      if (message.name === 'write_files') {
        if (Array.isArray(message.arguments)) {
          fileList = message.arguments.map(f => f?.file_path).filter(Boolean);
        } else if (message.arguments?.files && Array.isArray(message.arguments.files)) {
          fileList = message.arguments.files.map(f => f?.file_path).filter(Boolean);
        }
      } else if ((message.name === 'write_file' || message.name === 'read_file' || message.name === 'edit_file') && message.arguments?.file_path) {
        fileList = [message.arguments.file_path];
      }

      const handleClick = (e) => {
        if (isSubagent && onOpenSubagent) {
          e?.stopPropagation?.();
          onOpenSubagent(message);
        } else {
          toggleExpand();
        }
      };

      const subagentLabel = isSubagent ? getSubagentDisplayName(message.name, message.arguments) : message.name;

      return (
        <div className={`chat-msg chat-msg--tool_call ${isSubagent ? 'chat-msg--subagent-card' : ''}`}>
          <div className="chat-msg__assistant-row">
            <div className="chat-msg__assistant-icon">
              <AgentIcon />
            </div>
            <div className="chat-msg__content" style={{ flex: 1, minWidth: 0 }}>
              <div
                className="chat-msg__box"
                onClick={isSubagent ? handleClick : undefined}
                style={isSubagent ? { cursor: 'pointer' } : undefined}
              >
                <div
                  className="chat-msg__header"
                  onClick={!isSubagent ? handleClick : undefined}
                  style={{ cursor: 'pointer' }}
                  title={isSubagent ? 'Click to open subagent panel' : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <ToolIcon />
                    <span style={{ fontWeight: isSubagent ? 500 : 400 }}>{subagentLabel}</span>
                    {fileList.length > 0 && (
                      <div className="chat-msg__file-badges">
                        {fileList.map((fp, i) => (
                          <span key={i} className="chat-msg__file-badge">
                            <FileIcon /> {fp}
                          </span>
                        ))}
                      </div>
                    )}
                    {message.name === 'search_web' && message.arguments?.query && (
                      <div className="chat-msg__file-badges">
                        <span className="chat-msg__file-badge">
                          <SearchIcon /> {message.arguments.query}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {isRunning ? <LoaderIcon /> : <ChevronIcon expanded={isExpanded} />}
                    </span>
                  </div>
                </div>
                {isSubagent && (
                  <div
                    className="chat-msg__subagent-preview"
                    style={{
                      padding: '6px 12px 8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '12px',
                    }}
                  >
                    {isSubagentFinished ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-tertiary, rgba(255, 255, 255, 0.45))',
                          fontSize: '12px',
                        }}
                      >
                        <span>{message.subagentStatus === 'failed' ? 'Subagent failed' : 'Subagent finished'}</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-secondary, rgba(255, 255, 255, 0.75))',
                            fontSize: '12px',
                          }}
                        >
                          <span>Active subagent running...</span>
                        </div>
                        {message.subagentEvents && message.subagentEvents.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              marginTop: '2px',
                            }}
                          >
                            {message.subagentEvents.slice(-4).map((evt, idx) => {
                              let lineText = '';
                              if (evt.event === 'thought' && evt.content) {
                                lineText = `💭 ${evt.content.replace(/\s+/g, ' ').trim()}`;
                              } else if (evt.event === 'tool_call') {
                                const argsPreview = evt.arguments ? JSON.stringify(evt.arguments) : '';
                                lineText = `🔧 ${evt.tool}${argsPreview ? `(${argsPreview})` : ''}`;
                              } else if (evt.event === 'tool_executed') {
                                const shortRes = typeof evt.result === 'string' ? evt.result.replace(/\s+/g, ' ').trim() : JSON.stringify(evt.result || '');
                                lineText = `✓ ${evt.tool || 'action'}: ${shortRes}`;
                              } else if (evt.event === 'finish') {
                                lineText = `🏁 Concluded (${evt.status || 'completed'})`;
                              }
                              if (!lineText) return null;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    fontSize: '11px',
                                    color: 'rgba(255, 255, 255, 0.45)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.4',
                                  }}
                                  title={lineText}
                                >
                                  {lineText}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!isSubagent && isExpanded && argsStr && <pre className="chat-msg__details">{argsStr}</pre>}
              </div>
            </div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={argsStr}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    // Tool result
    if (message.type === 'tool_result') {
      const isSubagent = isSubagentTool(message.name);
      const resultStr = typeof message.result === 'string' ? message.result : JSON.stringify(message.result, null, 2);
      const subagentLabel = isSubagent ? getSubagentDisplayName(message.name, message.arguments) : message.name;

      const handleClick = (e) => {
        if (isSubagent && onOpenSubagent) {
          e?.stopPropagation?.();
          onOpenSubagent(message);
        } else {
          toggleExpand();
        }
      };

      return (
        <div className={`chat-msg chat-msg--tool_result ${isSubagent ? 'chat-msg--subagent-result' : ''}`}>
          <div className="chat-msg__assistant-row">
            <div className="chat-msg__assistant-icon">
              <AgentIcon />
            </div>
            <div className="chat-msg__content" style={{ flex: 1, minWidth: 0 }}>
              <div
                className="chat-msg__box"
                onClick={isSubagent ? handleClick : undefined}
                style={isSubagent ? { cursor: 'pointer' } : undefined}
              >
                <div
                  className="chat-msg__header"
                  onClick={!isSubagent ? handleClick : undefined}
                  style={{ cursor: 'pointer' }}
                  title={isSubagent ? 'Click to open subagent panel' : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <CheckIcon />
                    <span style={{ fontWeight: isSubagent ? 500 : 400 }}>
                      {isSubagent ? `${subagentLabel} Completed` : message.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <ChevronIcon expanded={isExpanded} />
                    </span>
                  </div>
                </div>
                {isExpanded && resultStr && <pre className="chat-msg__details">{resultStr}</pre>}
              </div>
            </div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={resultStr}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    // Assistant response / token
    if (message.type === 'token' || message.role === 'assistant' || message.type === 'assistant') {
      return (
        <div className="chat-msg chat-msg--assistant">
          <div className="chat-msg__assistant-row">
            <div className="chat-msg__assistant-icon">
              <AgentIcon />
            </div>
            <div className="chat-msg__content">{message.content}</div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={message.content}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    // Thinking content
    if (message.type === 'thinking') {
      const isThinking = isActive && !message.collapsed;
      return (
        <div className="chat-msg chat-msg--thinking">
          <div className="chat-msg__assistant-row">
            <div className="chat-msg__assistant-icon">
              <AgentIcon />
            </div>
            <div className="chat-msg__content" style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-msg__box chat-msg__box--thinking">
                <div className="chat-msg__header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isThinking ? 'Thinking...' : 'Thought'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {isThinking ? <LoaderIcon /> : <ChevronIcon expanded={isExpanded} />}
                  </span>
                </div>
                {(isExpanded || isThinking) && (
                  <div className="chat-msg__thinking-content">
                    {message.content}
                  </div>
                )}
              </div>
            </div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={message.content}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    // Fallback for untyped content if it exists
    if (message.content) {
      return (
        <div className="chat-msg chat-msg--user">
          <div className="chat-msg__box chat-msg__box--user">
            <div className="chat-msg__content">{message.content}</div>
          </div>
          <MessageFooter
            timestamp={message.timestamp}
            contentToCopy={message.content}
            debug={message.debug}
            onOpenDebug={openDebug}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderBubble()}
      {message.debug && (
        <LlmDebugModal
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          debugData={message.debug}
        />
      )}
    </>
  );
}
