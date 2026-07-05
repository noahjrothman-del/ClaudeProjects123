import { useState } from 'react';

export default function Lobby({ onCreate, onJoin, error, connected }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await onCreate(name.trim());
    setBusy(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setBusy(true);
    await onJoin(code.trim(), name.trim());
    setBusy(false);
  };

  return (
    <div className="lobby">
      <p className="lobby__status mono">{connected ? 'Connected to server' : 'Connecting…'}</p>

      <label className="lobby__field">
        <span>Your name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ada"
          maxLength={20}
        />
      </label>

      <div className="lobby__actions">
        <form onSubmit={handleCreate} className="lobby__card">
          <h2>Create a room</h2>
          <p>Start a new game and invite friends with a room code.</p>
          <button type="submit" disabled={!name.trim() || busy || !connected}>
            Create room
          </button>
        </form>

        <form onSubmit={handleJoin} className="lobby__card">
          <h2>Join a room</h2>
          <p>Enter the room code a friend shared with you.</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={4}
            className="mono lobby__code-input"
          />
          <button type="submit" disabled={!name.trim() || !code.trim() || busy || !connected}>
            Join room
          </button>
        </form>
      </div>

      {error && <p className="lobby__error" role="alert">{error}</p>}
    </div>
  );
}
