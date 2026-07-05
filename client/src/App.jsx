import { useState } from 'react';
import PracticeApp from './PracticeApp.jsx';
import MultiplayerApp from './MultiplayerApp.jsx';
import { hasStoredSession } from './multiplayer/session.js';

export default function App() {
  // A page refresh resets all React state, but a multiplayer session persists
  // server-side and in sessionStorage — land back on that tab instead of
  // silently dropping the reconnecting player onto Practice.
  const [mode, setMode] = useState(() => (hasStoredSession() ? 'multiplayer' : 'practice'));

  return (
    <div className="app">
      <header className="app-header">
        <h1>RICOCHET ROBOTS</h1>
        <nav className="mode-tabs" role="tablist" aria-label="Game mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'practice'}
            className={`mode-tabs__btn${mode === 'practice' ? ' mode-tabs__btn--active' : ''}`}
            onClick={() => setMode('practice')}
          >
            Practice
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'multiplayer'}
            className={`mode-tabs__btn${mode === 'multiplayer' ? ' mode-tabs__btn--active' : ''}`}
            onClick={() => setMode('multiplayer')}
          >
            Play with Friends
          </button>
        </nav>
      </header>

      {mode === 'practice' ? <PracticeApp /> : <MultiplayerApp />}
    </div>
  );
}
