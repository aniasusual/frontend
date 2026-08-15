import { useState, useEffect } from 'react';
import './WelcomeView.css';

/**
 * WelcomeView — Landing page with an abstract art gallery grid,
 * a floating glass prompt card in the center, and a list of existing projects.
 */
export default function WelcomeView({ onSubmit, onOpenProject, isExiting, isTransitioning }) {
  const [prompt, setPrompt] = useState('');
  const [isNaming, setIsNaming] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (e, name) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/projects/${name}`, { method: 'DELETE' });
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const handleOpenInFinder = async (e, name) => {
    e.stopPropagation();
    try {
      await fetch(`http://127.0.0.1:8000/api/projects/${name}/open-in-finder`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to open project in finder', err);
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    const value = prompt.trim();
    if (!value) return;

    setIsNaming(true);
    setIsGeneratingName(true);

    try {
      const words = value.split(' ').slice(0, 4).join('-');
      const response = await fetch(`http://127.0.0.1:8000/api/projects/suggest-name?base=${encodeURIComponent(words)}`);
      const data = await response.json();
      setProjectName(data.suggested_name);
    } catch (err) {
      console.error('Failed to get suggested name', err);
      setProjectName('new-project');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    onSubmit(prompt, projectName.trim());
  };

  const exiting = isExiting || isTransitioning;

  return (
    <div className={`welcome ${exiting ? 'welcome--exiting' : ''}`}>

      <div className="welcome__content">
        {!isNaming ? (
          <>
            <h1 className="welcome__title">What do you want to build?</h1>
            <p className="welcome__subtitle">
              Describe your app and lowkey will bring it to life.
            </p>

            <form className="welcome__form" onSubmit={handleInitialSubmit}>
              <textarea
                className="welcome__input"
                placeholder="A habit tracker with streaks and analytics..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInitialSubmit(e);
                  }
                }}
                autoFocus
                spellCheck={false}
              />
              <div className="welcome__actions">
                <button
                  type="submit"
                  className="welcome__submit"
                  disabled={!prompt.trim()}
                >
                  Start building
                </button>
              </div>
            </form>

            {!isLoadingProjects && projects.length > 0 && (
              <div className="welcome__projects-list">
                <h3 className="welcome__projects-title">Recent Projects</h3>
                <div className="welcome__projects-scroll-container">
                  {projects.map(project => (
                    <div 
                      key={project.name} 
                      className="welcome__project-item"
                      onClick={() => onOpenProject(project)}
                    >
                      <div className="welcome__project-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <div className="welcome__project-info">
                        <div className="welcome__project-name">{project.name}</div>
                        <div className="welcome__project-meta">
                          {project.status === 'running' ? (
                            <span className="welcome__project-status--active">Running</span>
                          ) : (
                            <span className="welcome__project-status">Stopped</span>
                          )}
                          <span className="welcome__project-date">
                            {new Date(project.last_opened).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="welcome__project-actions">
                        <button 
                          className="welcome__project-btn" 
                          onClick={(e) => handleOpenInFinder(e, project.name)}
                          title="Open in Folder"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </button>
                        <button 
                          className="welcome__project-btn welcome__project-btn--danger" 
                          onClick={(e) => handleDeleteProject(e, project.name)}
                          title="Delete Project"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="welcome__title">Name your project</h1>
            <p className="welcome__subtitle">
              We generated a unique name for your project workspace. You can edit it if you want.
            </p>

            <form className="welcome__form" onSubmit={handleFinalSubmit}>
              <div className="welcome__name-wrapper">
                <input
                  type="text"
                  className="welcome__name-input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isGeneratingName}
                  autoFocus
                />
                {isGeneratingName && <span className="welcome__name-loading">Generating...</span>}
              </div>
              
              <div className="welcome__actions">
                <button 
                  type="button" 
                  className="welcome__cancel" 
                  onClick={() => setIsNaming(false)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="welcome__submit"
                  disabled={isGeneratingName || !projectName.trim()}
                >
                  Create Project
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
