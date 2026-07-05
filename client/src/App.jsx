import { useEffect } from 'react';
import Board from './components/Board.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';
import MoveHistoryPanel from './components/MoveHistoryPanel.jsx';
import HintPanel from './components/HintPanel.jsx';
import { usePracticeGame } from './game/usePracticeGame.js';

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export default function App() {
  const game = usePracticeGame();

  useEffect(() => {
    const handleKeyDown = (event) => {
      const direction = KEY_TO_DIRECTION[event.key];
      if (!direction) return;
      event.preventDefault();
      game.move(direction);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.move]);

  const handleDragRobot = (color, direction) => {
    game.selectRobot(color);
    game.moveRobot(color, direction);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>RICOCHET ROBOTS</h1>
        <span className="app-header__subtitle mono">practice mode</span>
        <button type="button" className="app-header__new" onClick={game.newPuzzle}>
          New Puzzle
        </button>
      </header>

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
    </div>
  );
}
