import Board from './components/Board.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';
import MoveHistoryPanel from './components/MoveHistoryPanel.jsx';
import HintPanel from './components/HintPanel.jsx';
import { usePracticeGame } from './game/usePracticeGame.js';
import { useArrowKeyMovement } from './hooks/useArrowKeyMovement.js';

export default function PracticeApp() {
  const game = usePracticeGame();

  useArrowKeyMovement(game.move);

  const handleDragRobot = (color, direction) => {
    game.selectRobot(color);
    game.moveRobot(color, direction);
  };

  return (
    <>
      <div className="mode-toolbar">
        <span className="app-header__subtitle mono">practice mode</span>
        <button type="button" className="app-header__new" onClick={game.newPuzzle}>
          New Puzzle
        </button>
      </div>

      <main className="app-main">
        <div className="app-board-col">
          {game.solved && (
            <div className="solved-banner" role="status">
              Solved in {game.moveCount} move{game.moveCount === 1 ? '' : 's'}!
            </div>
          )}
          <div className="target-callout mono">
            Get the <span className={`swatch swatch--${game.target.color}`} /> {game.target.color} robot to the marked cell
          </div>
          <Board
            board={game.board}
            target={game.target}
            robots={game.robots}
            trails={game.trails}
            selectedRobot={game.selectedRobot}
            onSelectRobot={game.selectRobot}
            onDragRobot={handleDragRobot}
          />
          <ControlsPanel selectedRobot={game.selectedRobot} onMove={game.move} />
        </div>

        <aside className="app-sidebar">
          <HintPanel
            hint={game.hint}
            onRequest={game.requestHint}
            onClose={game.closeHint}
            onPlay={game.hintPlay}
            onPause={game.hintPause}
            onStepForward={game.hintStepForward}
            onStepBack={game.hintStepBack}
          />
          <MoveHistoryPanel
            history={game.history}
            moveCount={game.moveCount}
            onUndo={game.undo}
            onReset={game.reset}
          />
        </aside>
      </main>
    </>
  );
}
