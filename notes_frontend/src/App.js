import React, { useState, useEffect } from 'react';
import './App.css';

// Util for API URL (assumes backend runs at port 3001, adjust if needed)
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function fetchNotes(setNotes, setLoading, setError) {
  setLoading(true);
  fetch(`${API_URL}/notes`)
    .then(res => res.json())
    .then(data => {
      setNotes(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch(() => {
      setError('Failed to fetch notes.');
      setLoading(false);
    });
}

function createNoteRequest(title, content, onSuccess, onError) {
  fetch(`${API_URL}/notes`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title, content}),
  })
    .then(res => res.json())
    .then(onSuccess)
    .catch(() => onError && onError('Failed to create note.'));
}

function updateNoteRequest(id, title, content, onSuccess, onError) {
  fetch(`${API_URL}/notes/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title, content}),
  })
    .then(res => res.json())
    .then(onSuccess)
    .catch(() => onError && onError('Failed to update note.'));
}

function deleteNoteRequest(id, onSuccess, onError) {
  fetch(`${API_URL}/notes/${id}`, {
    method: 'DELETE'
  })
    .then(res => (res.status === 204 ? onSuccess() : onError && onError('Failed to delete note.')))
    .catch(() => onError && onError('Failed to delete note.'));
}

const colorVars = {
  accent: '#ffca28',
  primary: '#1976d2',
  secondary: '#424242'
};

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState({title: '', content: ''});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');

  // Initial fetch and border color CSS var override
  useEffect(() => {
    fetchNotes(setNotes, setLoading, setError);
    document.documentElement.style.setProperty('--border-color', '#e9ecef');
    document.documentElement.style.setProperty('--notemaster-accent', colorVars.accent);
    document.documentElement.style.setProperty('--notemaster-primary', colorVars.primary);
    document.documentElement.style.setProperty('--notemaster-secondary', colorVars.secondary);
  }, []);

  // Theme toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Responsive sidebar
  useEffect(() => {
    function handleResize() {
      setSidebarOpen(window.innerWidth > 768);
    }
    window.addEventListener('resize', handleResize);
    if (window.innerWidth <= 768) setSidebarOpen(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function selectNote(id) {
    const note = notes.find(n => n.id === id);
    setSelectedNoteId(id);
    setEditingNote(note ? {title: note.title, content: note.content} : {title: '', content: ''});
    setEditorOpen(true);
  }

  // PUBLIC_INTERFACE
  function handleCreateNote() {
    setEditingNote({title: '', content: ''});
    setSelectedNoteId(null);
    setEditorOpen(true);
  }

  // PUBLIC_INTERFACE
  function handleSaveNote(e) {
    e.preventDefault();
    if (!editingNote.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (selectedNoteId) {
      updateNoteRequest(
        selectedNoteId,
        editingNote.title, editingNote.content,
        (data) => {
          setNotes(notes.map(n => n.id === selectedNoteId ? data : n));
          setEditorOpen(false);
          setError('');
        }, setError
      );
    } else {
      createNoteRequest(
        editingNote.title, editingNote.content,
        (data) => {
          setNotes([data, ...notes]);
          setSelectedNoteId(data.id);
          setEditorOpen(false);
          setError('');
        },
        setError
      );
    }
  }

  // PUBLIC_INTERFACE
  function handleDeleteNote() {
    if (!selectedNoteId) return;
    if (!window.confirm('Delete this note?')) return;
    deleteNoteRequest(
      selectedNoteId,
      () => {
        setNotes(notes.filter(n => n.id !== selectedNoteId));
        setSelectedNoteId(null);
        setEditorOpen(false);
        setEditingNote({title: '', content: ''});
        setError('');
      },
      setError
    );
  }

  // PUBLIC_INTERFACE
  function handleCancelEdit() {
    setEditorOpen(false);
    setError('');
  }

  // PUBLIC_INTERFACE
  function handleSidebarToggle() {
    setSidebarOpen(!sidebarOpen);
  }

  return (
    <div className="notemaster-app">
      <nav className="navbar" style={{
        background: colorVars.primary,
        color: '#fff',
        borderBottom: `2px solid var(--notemaster-accent)`
      }}>
        <button className="sidebar-toggle" onClick={handleSidebarToggle} aria-label="Toggle sidebar">
          ☰
        </button>
        <div className="navbar-title" style={{
          fontWeight: 600,
          letterSpacing: '1.5px'
        }}>
          Notemaster
        </div>
        <button 
          className="theme-toggle" 
          onClick={()=>setTheme(theme==='light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </nav>
      <div className="main-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <button 
              className="btn-accent" 
              onClick={handleCreateNote}
              style={{width:'100%'}}
            >+ New Note</button>
          </div>
          <div className="note-list">
            {loading ? (
              <div className="notes-empty">Loading...</div>
            ) : notes.length === 0 ? (
              <div className="notes-empty">No notes</div>
            ) : (
              notes.map(note => (
                <div 
                  className={`note-list-item${note.id === selectedNoteId ? ' selected' : ''}`} 
                  key={note.id}
                  onClick={()=>selectNote(note.id)}
                >
                  <div className="note-title">{note.title || <em>[Untitled]</em>}</div>
                  <div className="note-snippet">
                    {note.content.slice(0, 40)}{note.content.length > 40 ? '…' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
        <main className="note-main" tabIndex={-1}>
          {(editorOpen || selectedNoteId) ? (
            <div className="editor-container">
              <form className="note-editor" onSubmit={handleSaveNote}>
                <input 
                  className="note-title-input"
                  type="text"
                  placeholder="Note Title"
                  value={editingNote.title}
                  autoFocus
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                  maxLength={100}
                  required
                  style={{borderBottom: `2px solid var(--notemaster-accent)`}}
                />
                <textarea
                  className="note-content-input"
                  placeholder="Start typing your note here..."
                  value={editingNote.content}
                  onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                  rows={10}
                  maxLength={5000}
                  required={false}
                />
                {error && <div className="error-msg">{error}</div>}
                <div className="editor-controls">
                  <button
                    className="btn-primary"
                    type="submit"
                    style={{background: colorVars.primary, color: '#fff'}}
                  >
                    Save
                  </button>
                  {selectedNoteId && (
                    <button
                      className="btn-delete"
                      type="button"
                      style={{background: colorVars.secondary, color: '#fff'}}
                      onClick={handleDeleteNote}
                    >Delete</button>
                  )}
                  <button
                    className="btn-outline"
                    type="button"
                    onClick={handleCancelEdit}
                  >Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="welcome-msg">
              <h2>Welcome to Notemaster</h2>
              <p>Select a note or create a new one to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
