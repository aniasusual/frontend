import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import CommandApproval from './CommandApproval';
import './ChatPanel.css';

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

export default function ChatPanel({ messages, onSendMessage, isConnected, isAgentRunning, pendingApproval, onApproveCommand, onDenyCommand }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isUserScrolledRef = useRef(false);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Check if the user has scrolled up away from the bottom (margin of 50px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    isUserScrolledRef.current = !isAtBottom;
  };

  const scrollToBottom = () => {
    if (!isUserScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    onSendMessage(input);
    setInput('');
    
    // Force scroll down when the user sends a message
    isUserScrolledRef.current = false;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <div className="chat-panel__status">
          <div className={`chat-panel__status-dot ${isConnected ? 'chat-panel__status-dot--connected' : ''}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div 
        className="chat-panel__messages" 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {messages?.map((msg, i) => (
          <ChatMessage 
            key={i} 
            message={msg} 
            isActive={isAgentRunning && i === messages.length - 1} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <CommandApproval 
        request={pendingApproval} 
        onApprove={onApproveCommand} 
        onDeny={onDenyCommand} 
      />

      <form className="chat-panel__input-area" onSubmit={handleSubmit}>
        <div className="chat-panel__input-wrapper">
          {isConnected && (
            <div className="chat-panel__agent-status">
              {isAgentRunning ? "Agent is running..." : "Agent is waiting for human response"}
            </div>
          )}
          <textarea
            className="chat-panel__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Describe a change..." : "Connecting..."}
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="chat-panel__send"
            disabled={!input.trim() || !isConnected}
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
