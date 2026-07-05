import Board from './Board.jsx';
import ControlsPanel from './ControlsPanel.jsx';
import MoveHistoryPanel from './MoveHistoryPanel.jsx';
import ClaimPanel from './ClaimPanel.jsx';
import Scoreboard from './Scoreboard.jsx';
import { useRoundBoard } from '../multiplayer/useRoundBoard.js';
import { useArrowKeyMovement } from '../hooks/useArrowKeyMovement.js';

function noop() {}

export default function MultiplayerRound({ room, you, declareClaim, submitSolution, startRound }) {
  const round = room.round;
  const game = useRoundBoard(room.layoutIndex, round);
  const isHost = room.hostId === you.id;

  // Freeze private input while everyone's watching the synced solution replay.
  useArrowKeyMovement(game.isReplaying ? noop : game.move);

  if (!game.robots) return null;

  const handleSubmit = () => {
    const moves = game.history.map(({ color, direction }) => ({ color, direction }));
    return submitSolution(moves);
  };

  return (
    <div className="mp-round">
      <div className="mp-round__board-col">
        <div className="target-callout mono">
          Round {round.roundNumber} — get the <span className={`swatch swatch--${round.target.color}`} /> {round.target.color} robot to the marked cell
        </div>
        <Board
          board={game.board}
          target={round.target}
          robots={game.robots}
          trails={game.trails}
          selectedRobot={game.isReplaying ? null : game.selectedRobot}
          onSelectRobot={game.isReplaying ? noop : game.selectRobot}
          onDragRobot={game.isReplaying ? noop : (color, direction) => {
            game.selectRobot(color);
            game.moveRobot(color, direction);
          }}
        />
        <ControlsPanel
          selectedRobot={game.isReplaying ? null : game.selectedRobot}
          onMove={game.isReplaying ? noop : game.move}
        />
      </div>

      <aside className="app-sidebar">
        <ClaimPanel
          round={round}
          youId={you.id}
          localMoveCount={game.history.length}
          onDeclare={declareClaim}
          onSubmit={handleSubmit}
        />
        {round.phase === 'resolved' && isHost && (
          <button type="button" className="app-header__new" onClick={startRound}>
            Next Round
          </button>
        )}
        <Scoreboard players={room.players} hostId={room.hostId} youId={you.id} />
        <MoveHistoryPanel
          history={game.history}
          moveCount={game.history.length}
          onUndo={game.undo}
          onReset={game.reset}
        />
      </aside>
    </div>
  );
}
