import { useState, useEffect } from 'react';
import './ChatMessage.css';

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const LoaderIcon = () => (
  <svg className="chat-msg__loader" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10"></path>
  </svg>
);

const ChevronIcon = ({ expanded }) => (
  <svg 
    className={`chat-msg__chevron ${expanded ? 'chat-msg__chevron--expanded' : ''}`}
    width="14" 
    height="14" 
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

const AgentIcon = () => (
  <svg className="chat-msg__agent-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="12" rx="2"></rect>
    <path d="M12 9V5"></path>
    <path d="M10 2h4"></path>
    <circle cx="9" cy="15" r="1.5" fill="currentColor"></circle>
    <circle cx="15" cy="15" r="1.5" fill="currentColor"></circle>
    <path d="M10 19h4"></path>
  </svg>
);

const MessageFooter = ({ timestamp, contentToCopy }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e) => {
    e.stopPropagation(); // prevent expanding/collapsing if clicked inside a header
    if (contentToCopy) {
      const text = typeof contentToCopy === 'string' ? contentToCopy : JSON.stringify(contentToCopy, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const timeValue = timestamp ? new Date(timestamp) : new Date();
  const timeString = timeValue.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="chat-msg__footer">
      <span className="chat-msg__time">{timeString}</span>
      {contentToCopy && (
        <button className="chat-msg__copy" onClick={handleCopy} title="Copy">
          {copied ? '✓' : <CopyIcon />}
        </button>
      )}
    </div>
  );
};

/**
 * ChatMessage — Renders a single chat message bubble.
 * Styled based on its type: user, status, tool_call, tool_result, token, thinking.
 */
export default function ChatMessage({ message, isActive }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (message.collapsed) {
      setIsExpanded(false);
    }
  }, [message.collapsed]);

  const toggleExpand = () => setIsExpanded(prev => !prev);

  // User message
  if (message.role === 'user' || message.type === 'user') {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-msg__box chat-msg__box--user">
          <div className="chat-msg__content">{message.content}</div>
        </div>
        <MessageFooter timestamp={message.timestamp} contentToCopy={message.content} />
      </div>
    );
  }

  // Status message
  if (message.type === 'status') {
    return <div className="chat-msg chat-msg--status">{message.content}</div>;
  }

  // Tool call
  if (message.type === 'tool_call') {
    const isRunning = isActive && !message.collapsed;
    const argsStr = message.arguments 
      ? (typeof message.arguments === 'string' ? message.arguments : JSON.stringify(message.arguments, null, 2))
      : '';
      
    return (
      <div className="chat-msg chat-msg--tool_call">
        <div className="chat-msg__assistant-row">
          <div className="chat-msg__assistant-icon">
            <AgentIcon />
          </div>
          <div className="chat-msg__content" style={{ flex: 1, minWidth: 0 }}>
            <div className="chat-msg__box">
              <div className="chat-msg__header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>⚙ {message.name}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {isRunning ? <LoaderIcon /> : <ChevronIcon expanded={isExpanded} />}
                </span>
              </div>
              {isExpanded && argsStr && <pre className="chat-msg__details">{argsStr}</pre>}
            </div>
          </div>
        </div>
        <MessageFooter timestamp={message.timestamp} contentToCopy={argsStr} />
      </div>
    );
  }

  // Tool result
  if (message.type === 'tool_result') {
    const resultStr = typeof message.result === 'string' ? message.result : JSON.stringify(message.result, null, 2);
    return (
      <div className="chat-msg chat-msg--tool_result">
        <div className="chat-msg__assistant-row">
          <div className="chat-msg__assistant-icon">
            <AgentIcon />
          </div>
          <div className="chat-msg__content" style={{ flex: 1, minWidth: 0 }}>
            <div className="chat-msg__box">
              <div className="chat-msg__header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ {message.name} result:</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <ChevronIcon expanded={isExpanded} />
                </span>
              </div>
              {isExpanded && resultStr && <pre className="chat-msg__details">{resultStr}</pre>}
            </div>
          </div>
        </div>
        <MessageFooter timestamp={message.timestamp} contentToCopy={resultStr} />
      </div>
    );
  }

  // Assistant response / token
  if (message.type === 'token') {
    return (
      <div className="chat-msg chat-msg--assistant">
        <div className="chat-msg__assistant-row">
          <div className="chat-msg__assistant-icon">
            <AgentIcon />
          </div>
          <div className="chat-msg__content">{message.content}</div>
        </div>
        <MessageFooter timestamp={message.timestamp} contentToCopy={message.content} />
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
        <MessageFooter timestamp={message.timestamp} contentToCopy={message.content} />
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
        <MessageFooter timestamp={message.timestamp} contentToCopy={message.content} />
      </div>
    );
  }

  return null;
}
