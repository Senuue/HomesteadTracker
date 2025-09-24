import React, { useState } from 'react';
import { ChickenProvider } from './contexts/ChickenContext';
import ChickenDashboard from './components/ChickenDashboard';
import ChickenList from './components/ChickenList';
import ChickenForm from './components/ChickenForm';
import FeedLogModal from './components/FeedLogModal';
import TagManagerModal from './components/TagManagerModal';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingChickenId, setEditingChickenId] = useState(null);
  const [showFeedLogs, setShowFeedLogs] = useState(false);
  const [feedLogsChickenId, setFeedLogsChickenId] = useState(null);
  const [showTagManager, setShowTagManager] = useState(false);

  const handleAddChicken = () => {
    setEditingChickenId(null);
    setShowForm(true);
  };

  const handleEditChicken = (chickenId) => {
    setEditingChickenId(chickenId);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingChickenId(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingChickenId(null);
    // Optionally switch to list view after adding/editing
    if (activeTab === 'dashboard') {
      // Stay on dashboard to see updated stats
    }
  };

  return (
    <ChickenProvider>
      <div className="app">
        <header className="app-header">
          <h1>🐔 Homestead Tracker</h1>
          <p>Track your chicken expenses and performance</p>
        </header>

        <nav className="app-nav">
          <button 
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Chicken Batches
          </button>
        </nav>

        <main className="app-main">
          {activeTab === 'dashboard' && <ChickenDashboard />}
          {activeTab === 'list' && (
            <ChickenList 
              onEdit={handleEditChicken}
              onAdd={handleAddChicken}
              onOpenFeedLogs={(id) => {
                setFeedLogsChickenId(id);
                setShowFeedLogs(true);
              }}
              onOpenTagManager={() => setShowTagManager(true)}
            />
          )}
        </main>

        {showForm && (
          <ChickenForm
            chickenId={editingChickenId}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        )}

        {showFeedLogs && feedLogsChickenId && (
          <FeedLogModal
            chickenId={feedLogsChickenId}
            onClose={() => {
              setShowFeedLogs(false);
              setFeedLogsChickenId(null);
            }}
          />
        )}

        {showTagManager && (
          <TagManagerModal
            onClose={() => setShowTagManager(false)}
          />
        )}
      </div>
    </ChickenProvider>
  );
}

export default App
