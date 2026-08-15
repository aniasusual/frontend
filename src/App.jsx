import { useState, useEffect, useRef } from 'react'
import WelcomeView from './components/WelcomeView'
import WorkspaceView from './components/WorkspaceView'
import CommandApproval from './components/CommandApproval'
import './index.css'

function App() {
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome' | 'workspace'
  const [activeProject, setActiveProject] = useState(null);
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket('ws://127.0.0.1:8000/ws');

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
          setPreviewData({ port: data.port, url: data.url });
          return;
        }
        if (data.type === 'preview_stopped') {
          setPreviewData(null);
          return;
        }
        
        if (data.type === 'project_opened') {
          if (data.project && data.project.port) {
            setPreviewData({ port: data.project.port, url: `http://localhost:${data.project.port}` });
          } else {
            setPreviewData(null);
          }
        }

        const isTerminalStatus = data.type === 'status' && (
          data.content === 'Done' ||
          data.content?.startsWith('Error') ||
          data.content?.startsWith('Harness Error') ||
          data.content?.startsWith('Ollama Error') ||
          data.content?.startsWith('Stopped')
        );

        if (isTerminalStatus) {
          setIsAgentRunning(false);
        }
        
        setMessages(prev => {
          // Auto-collapse tool/thinking blocks when execution completes or errors out
          if (isTerminalStatus) {
            const collapsedPrev = prev.map(msg => 
              (msg.type === 'tool_call' || msg.type === 'tool_result' || msg.type === 'thinking') 
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
          }
          // Otherwise, just add as a new message with a timestamp
          return [...prev, { ...data, timestamp }];
        });
      } catch (e) {
        console.error("Failed to parse websocket message", e);
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
    setMessages(prev => [...prev, { role: 'user', content: prompt, timestamp: new Date().toISOString() }]);

    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        prompt: prompt,
        harness: 'CodingHarness'
      }));
    }
  };

  const handleOpenProject = (projectInfo) => {
    setActiveProject(projectInfo);
    setCurrentView('workspace');
    
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'open_project',
        name: projectInfo.name
      }));
    }
  };

  const handleCreateProject = async (prompt, projectName) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName })
      });
      const data = await response.json();
      
      setIsTransitioning(true);
      
      // Wait for animation
      setTimeout(() => {
        handleOpenProject(data);
        handleSendMessage(prompt);
        setIsTransitioning(false);
      }, 500);

    } catch (err) {
      console.error('Failed to create project', err);
      alert('Failed to create project.');
    }
  };

  const handleGoToBrowser = () => {
    setCurrentView('welcome');
    setActiveProject(null);
    setPreviewData(null);
    setMessages([]);
    // Instruct backend to close active project
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'close_project'
      }));
    }
  };

  const handleApproveCommand = (requestId) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'command_approval',
        request_id: requestId,
        approved: true
      }));
    }
    setPendingApproval(null);
  };

  const handleDenyCommand = (requestId) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'command_approval',
        request_id: requestId,
        approved: false
      }));
    }
    setPendingApproval(null);
  };

  const handleStopPreview = () => {
    handleSendMessage("Please stop the background dev server.");
  };

  return (
    <div className="app-container">
      {currentView === 'welcome' && (
        <WelcomeView
          onSubmit={handleCreateProject}
          onOpenProject={handleOpenProject}
          isTransitioning={isTransitioning}
        />
      )}

      {currentView === 'workspace' && (
        <WorkspaceView
          messages={messages}
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          isAgentRunning={isAgentRunning}
          previewData={previewData}
          onStopPreview={handleStopPreview}
          onGoBack={handleGoToBrowser}
          projectName={activeProject?.name}
          pendingApproval={pendingApproval}
          onApproveCommand={handleApproveCommand}
          onDenyCommand={handleDenyCommand}
        />
      )}
    </div>
  )
}

export default App
