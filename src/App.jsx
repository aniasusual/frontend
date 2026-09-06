import { useState, useEffect, useRef } from 'react';
import WelcomeView from './components/WelcomeView';
import WorkspaceView from './components/WorkspaceView';
import { API_BASE_URL, WS_BASE_URL } from './config';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome' | 'workspace'
  const [activeProject, setActiveProject] = useState(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [lastChangeTimestamp, setLastChangeTimestamp] = useState(0);

  // Hardware & Model States
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('lowkey_selected_model') || 'qwen2.5-coder:7b'
  );

  const wsRef = useRef(null);

  // Fetch System Specs and Models
  const fetchModelsAndHardware = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/models-and-hardware`);
      if (response.ok) {
        const data = await response.json();
        setHardwareInfo(data.hardware);
        setModels(data.models || []);

        // Validate or set default selected model
        if (data.models && data.models.length > 0) {
          const savedModel = localStorage.getItem('lowkey_selected_model');
          const isSavedValid = data.models.some((m) => m.id === savedModel && m.installed);
          if (!isSavedValid) {
            const defaultModel =
              data.models.find((m) => m.id === data.active_model && m.installed) ||
              data.models.find((m) => m.installed) ||
              data.models[0];
            if (defaultModel) {
              setSelectedModel(defaultModel.id);
              localStorage.setItem('lowkey_selected_model', defaultModel.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch hardware and models:', err);
    }
  };

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('lowkey_selected_model', modelId);
  };

  useEffect(() => {
    fetchModelsAndHardware();

    // Initialize WebSocket connection
    wsRef.current = new WebSocket(WS_BASE_URL);

    wsRef.current.onopen = () => setIsConnected(true);
    wsRef.current.onclose = () => {
      setIsConnected(false);
      setIsAgentRunning(false);
    };
    wsRef.current.onerror = () => {
      setIsConnected(false);
      setIsAgentRunning(false);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const timestamp = new Date().toISOString();

        // Handle Command Approval Request
        if (data.type === 'command_approval_request') {
          setPendingApproval(data);
          return;
        }

        // Handle Preview Events
        if (data.type === 'preview_ready') {
          setPreviewData({
            port: data.port,
            url: data.url,
            backend_port: data.backend_port,
            backend_url: data.backend_url,
          });
          return;
        }
        if (data.type === 'preview_stopped') {
          setPreviewData(null);
          return;
        }

        // Handle File Changed Events from Agent Tool Execution
        if (data.type === 'file_changed') {
          setLastChangeTimestamp(Date.now());
          return;
        }

        if (data.type === 'project_opened') {
          if (data.project && data.project.port) {
            setPreviewData({
              port: data.project.port,
              url: `http://localhost:${data.project.port}`,
            });
          } else {
            setPreviewData(null);
          }
        }

        // Handle Rehydrating Persistent Chat History from Backend
        if (data.type === 'chat_history_loaded') {
          const loaded = Array.isArray(data.messages) ? data.messages : [];
          // Ensure past tool executions and thoughts start collapsed
          const collapsed = loaded.map((m) =>
            m.type === 'tool_call' || m.type === 'tool_result' || m.type === 'thinking'
              ? { ...m, collapsed: true }
              : m
          );
          setMessages((prev) => {
            if (prev.length === 0) {
              return collapsed;
            }
            if (loaded.length === 0) {
              return prev;
            }
            // Preserve any in-flight active messages in prev that aren't in the loaded history yet
            const activeInFlight = prev.filter(
              (pMsg) =>
                !loaded.some(
                  (lMsg) =>
                    lMsg.content === pMsg.content &&
                    (lMsg.role === pMsg.role || lMsg.type === pMsg.type)
                )
            );
            return [...collapsed, ...activeInFlight];
          });
          return;
        }

        // Handle Real-Time LLM Debug Inspection Payload

        if (data.type === 'llm_debug' && data.debug) {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            // Attach debug to the user message of this turn if needed
            const lastUserIdx = updated.map((m) => m.role === 'user' || m.type === 'user').lastIndexOf(true);
            if (lastUserIdx >= 0 && (!updated[lastUserIdx].debug || data.target === 'user')) {
              updated[lastUserIdx] = { ...updated[lastUserIdx], debug: data.debug };
            }
            // Also attach to the most recent assistant or tool message in progress
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && lastIdx !== lastUserIdx) {
              updated[lastIdx] = { ...updated[lastIdx], debug: data.debug };
            }
            return updated;
          });
          return;
        }

        const isTerminalStatus =
          data.type === 'status' &&
          (data.content === 'Done' ||
            data.content?.startsWith('Error') ||

            data.content?.startsWith('Harness Error') ||
            data.content?.startsWith('Ollama Error') ||
            data.content?.startsWith('Stopped'));

        if (isTerminalStatus) {
          setIsAgentRunning(false);
          if (data.content === 'Done') {
            setLastChangeTimestamp(Date.now());
          }
        }

        setMessages((prev) => {
          // Auto-collapse tool/thinking blocks when execution completes or errors out
          if (isTerminalStatus) {
            const collapsedPrev = prev.map((msg) =>
              msg.type === 'tool_call' || msg.type === 'tool_result' || msg.type === 'thinking'
                ? { ...msg, collapsed: true }
                : msg
            );
            if (data.content === 'Done') {
              return collapsedPrev;
            }
            return [...collapsedPrev, { ...data, timestamp }];
          }

          // If it's a streaming token or thinking, try to append to the last message
          if (data.type === 'token' || data.type === 'thinking') {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === data.type) {
              const newLastMsg = { ...lastMsg, content: lastMsg.content + data.content };
              return [...prev.slice(0, -1), newLastMsg];
            }
            // If starting a brand-new token message and it's pure whitespace, don't create an empty bubble
            if (data.type === 'token' && !data.content.trim()) {
              return prev;
            }
          }
          // Otherwise, just add as a new message with a timestamp
          return [...prev, { ...data, timestamp }];
        });
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleSendMessage = (prompt) => {
    if (!prompt) return;

    setIsAgentRunning(true);

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: prompt, timestamp: new Date().toISOString() },
    ]);

    if (wsRef.current && isConnected) {
      wsRef.current.send(
        JSON.stringify({
          prompt: prompt,
          harness: 'CodingHarness',
          model: selectedModel,
        })
      );
    }
  };

  const handleOpenProject = (projectInfo) => {
    setActiveProject(projectInfo);
    setCurrentView('workspace');

    if (wsRef.current && isConnected) {
      wsRef.current.send(
        JSON.stringify({
          action: 'open_project',
          name: projectInfo.name,
        })
      );
    }
  };

  const handleCreateProject = async (prompt, projectName) => {
    try {
      setIsTransitioning(true);
      setIsAgentRunning(true);

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, template: 'node_react' }),
      });
      const data = await response.json();

      // Wait for animation
      setTimeout(() => {
        handleOpenProject(data);
        handleSendMessage(prompt);
        setIsTransitioning(false);
      }, 500);
    } catch (err) {
      console.error('Failed to create project', err);
      alert('Failed to create project.');
      setIsAgentRunning(false);
      setIsTransitioning(false);
    }
  };


  const handleGoToBrowser = () => {
    setCurrentView('welcome');
    setActiveProject(null);
    setPreviewData(null);
    setMessages([]);
    // Instruct backend to close active project
    if (wsRef.current && isConnected) {
      wsRef.current.send(
        JSON.stringify({
          action: 'close_project',
        })
      );
    }
  };

  const handleApproveCommand = (requestId) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(
        JSON.stringify({
          action: 'command_approval',
          request_id: requestId,
          approved: true,
        })
      );
    }
    setPendingApproval(null);
  };

  const handleDenyCommand = (requestId) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(
        JSON.stringify({
          action: 'command_approval',
          request_id: requestId,
          approved: false,
        })
      );
    }
    setPendingApproval(null);
  };

  const handleStopPreview = () => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({ action: 'stop_preview' }));
    }
    setPreviewData(null);
  };

  return (
    <div className="app-container">
      {currentView === 'welcome' && (
        <WelcomeView
          onSubmit={handleCreateProject}
          onOpenProject={handleOpenProject}
          isTransitioning={isTransitioning}
          hardwareInfo={hardwareInfo}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onRefreshModels={fetchModelsAndHardware}
        />
      )}

      {currentView === 'workspace' && (
        <WorkspaceView
          messages={messages}
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          isAgentRunning={isAgentRunning}
          previewData={previewData}
          lastChangeTimestamp={lastChangeTimestamp}
          onStopPreview={handleStopPreview}
          onGoBack={handleGoToBrowser}
          projectName={activeProject?.name}
          pendingApproval={pendingApproval}
          onApproveCommand={handleApproveCommand}
          onDenyCommand={handleDenyCommand}
          hardwareInfo={hardwareInfo}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onRefreshModels={fetchModelsAndHardware}
        />
      )}
    </div>
  );
}

export default App;

