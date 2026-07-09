import Lobby from './components/Lobby.jsx';
import RoomLobby from './components/RoomLobby.jsx';
import MultiplayerRound from './components/MultiplayerRound.jsx';
import { useMultiplayerRoom } from './multiplayer/useMultiplayerRoom.js';

export default function MultiplayerApp() {
  const {
    connected,
    rejoining,
    room,
    error,
    you,
    createRoom,
    joinRoom,
    startRound,
    declareClaim,
    submitSolution,
    leaveRoom,
  } = useMultiplayerRoom();

  if (rejoining) {
    return <p className="lobby__status mono">Reconnecting to your room…</p>;
  }

  if (!room) {
    return <Lobby onCreate={createRoom} onJoin={joinRoom} error={error} connected={connected} />;
  }

  return (
    <div>
      <div className="mp-room-bar" data-board-seed={room.boardSeed}>
        <span className="mono">
          Room <strong>{room.code}</strong> · playing as <strong>{you.name}</strong>
        </span>
        <button type="button" onClick={leaveRoom}>Leave room</button>
      </div>

      {room.round ? (
        <MultiplayerRound
          room={room}
          you={you}
          declareClaim={declareClaim}
          submitSolution={submitSolution}
          startRound={startRound}
        />
      ) : (
        <RoomLobby room={room} youId={you.id} isHost={room.hostId === you.id} onStartRound={startRound} />
      )}
    </div>
  );
}
