import Scoreboard from './Scoreboard.jsx';

export default function RoomLobby({ room, youId, isHost, onStartRound }) {
  return (
    <div className="room-lobby">
      <div className="room-lobby__code-card">
        <span className="mono room-lobby__code-label">ROOM CODE</span>
        <span className="mono room-lobby__code">{room.code}</span>
        <p>Share this code so friends can join.</p>
      </div>

      <Scoreboard players={room.players} hostId={room.hostId} youId={youId} />

      {isHost ? (
        <button type="button" className="room-lobby__start" onClick={onStartRound}>
          Start Round
        </button>
      ) : (
        <p className="room-lobby__waiting mono">Waiting for the host to start a round…</p>
      )}
    </div>
  );
}
