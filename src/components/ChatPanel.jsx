import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import CommandApproval from './CommandApproval';
import ModelSelector from './ModelSelector';
import './ChatPanel.css';

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

export default function ChatPanel({
  messages,
  onSendMessage,
  isConnected,
  isAgentRunning,
  pendingApproval,
  onApproveCommand,
  onDenyCommand,
  models = [],
  selectedModel,
  hardwareInfo,
  onSelectModel,
  onRefreshModels,
}) {
  const [input, setInput] = useState('');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isUserScrolledRef = useRef(false);

  const currentModelObj = models.find((m) => m.id === selectedModel) || {
    name: selectedModel || 'qwen2.5-coder:7b',
    compatibility_label: 'Optimal',
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    isUserScrolledRef.current = !isAtBottom;
  };

  const scrollToBottom = () => {
    if (!isUserScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    isUserScrolledRef.current = false;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Determine whether the agent has started streaming any content (tokens, thinking, tool calls)
  // for the current user request.
  const lastUserIndex = messages && messages.length > 0
    ? messages.map((m) => m.role === 'user' || m.type === 'user').lastIndexOf(true)
    : -1;
  const messagesAfterUser = lastUserIndex >= 0 ? messages.slice(lastUserIndex + 1) : messages || [];
  const hasStreamingStarted = messagesAfterUser.some(
    (m) => m.type === 'token' || m.type === 'thinking' || m.type === 'tool_call' || m.type === 'tool_result'
  );
  const showLoader = isAgentRunning && !hasStreamingStarted;

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

        {/* Loader in chat area when agent is working and response has not started streaming yet */}
        {showLoader && (
          <div className="chat-msg chat-msg--assistant chat-msg--loading-stream">
            <div className="chat-msg__assistant-row">
              <div className="chat-msg__assistant-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <line x1="9" y1="1" x2="9" y2="4"></line>
                  <line x1="15" y1="1" x2="15" y2="4"></line>
                  <line x1="9" y1="20" x2="9" y2="23"></line>
                  <line x1="15" y1="20" x2="15" y2="23"></line>
                </svg>
              </div>
              <div className="chat-msg__loading-box">
                <div className="chat-msg__pulse-dots">
                  <span className="chat-msg__dot"></span>
                  <span className="chat-msg__dot"></span>
                  <span className="chat-msg__dot"></span>
                </div>
                <span className="chat-msg__loading-text">Working on your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


      <CommandApproval
        request={pendingApproval}
        onApprove={onApproveCommand}
        onDeny={onDenyCommand}
      />

      <form className="chat-panel__input-area" onSubmit={handleSubmit}>
        {isConnected && (
          <div
            className={`chat-panel__agent-status ${isAgentRunning
                ? 'chat-panel__agent-status--running'
                : 'chat-panel__agent-status--idle'
              }`}
          >
            <span className="chat-panel__agent-status-label">
              {isAgentRunning
                ? 'Agent is generating...'
                : 'Agent is awaiting human response'}
            </span>
          </div>
        )}

        <div className="chat-panel__input-wrapper">
          <textarea
            className="chat-panel__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Describe a change...' : 'Connecting...'}
            disabled={!isConnected}
          />

          {/* Model Selector trigger positioned directly below the textarea */}
          <div className="chat-panel__input-footer">
            <button
              type="button"
              className="chat-panel__model-pill"
              onClick={() => setIsModelSelectorOpen(true)}
              title="Change active model"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
              </svg>
              <span className="chat-panel__model-name">
                {currentModelObj.name || selectedModel}
              </span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <button
              type="submit"
              className="chat-panel__send"
              disabled={!input.trim() || !isConnected}
              title="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </form>

      {/* Model Selector Modal */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        hardwareInfo={hardwareInfo}
        models={models}
        onRefreshModels={onRefreshModels}
      />
    </div>
  );
}
