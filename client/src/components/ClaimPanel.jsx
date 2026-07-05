import { useState } from 'react';
import { useCountdown } from '../multiplayer/useCountdown.js';

function activeClaims(round) {
  return [...round.claims].filter((c) => !c.eliminated).sort((a, b) => a.moveCount - b.moveCount);
}

export default function ClaimPanel({ round, youId, localMoveCount, onDeclare, onSubmit }) {
  const [input, setInput] = useState('');
  const [claimError, setClaimError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const countdownSeconds = useCountdown(round.phase === 'countdown' ? round.countdownEndsAt : null);
  const graceSeconds = useCountdown(round.phase === 'proving' ? round.graceEndsAt : null);

  const claims = activeClaims(round);
  const leader = claims[0] ?? null;
  const youAreProver = round.phase === 'proving' && round.provingPlayerId === youId;

  const handleDeclare = async (e) => {
    e.preventDefault();
    const moveCount = Number.parseInt(input, 10);
    if (!Number.isInteger(moveCount) || moveCount < 1) {
      setClaimError('Enter a positive number of moves');
      return;
    }
    const result = await onDeclare(moveCount);
    if (!result.ok) {
      setClaimError(result.error);
    } else {
      setClaimError(null);
      setInput('');
    }
  };

  const handleSubmit = async () => {
    const result = await onSubmit();
    if (!result.ok) setSubmitError(result.error);
  };

  if (round.phase === 'resolved') {
    return (
      <div className="claim-panel">
        <h2>Round result</h2>
        {round.result ? (
          <p className="claim-panel__result" role="status">
            <strong>{round.result.name}</strong> solved it in {round.result.moveCount} moves!
          </p>
        ) : (
          <p className="claim-panel__result" role="status">No one solved it in time.</p>
        )}
      </div>
    );
  }

  return (
    <div className="claim-panel">
      <h2>Claims</h2>

      {claims.length === 0 && <p className="claim-panel__empty">No claims yet — be the first to call it.</p>}
      {claims.length > 0 && (
        <ol className="claim-panel__list">
          {claims.map((c) => (
            <li key={c.playerId} className={c.playerId === leader.playerId ? 'claim-panel__item--leader' : ''}>
              {c.name}: <span className="mono">{c.moveCount}</span> moves
            </li>
          ))}
        </ol>
      )}

      {round.phase === 'countdown' && (
        <p className="claim-panel__timer mono">Timer: {countdownSeconds}s</p>
      )}

      {round.phase === 'proving' && (
        <p className="claim-panel__timer mono">
          <span role="status">{round.provingPlayerId === youId ? 'Your turn to prove it!' : 'Demonstrating…'}</span>{' '}
          {graceSeconds}s
        </p>
      )}

      {youAreProver ? (
        <div className="claim-panel__submit">
          <p>Submit your current move sequence ({localMoveCount} moves) before time runs out.</p>
          <button type="button" onClick={handleSubmit}>Submit Solution</button>
          {submitError && <p className="claim-panel__error" role="alert">{submitError}</p>}
        </div>
      ) : (
        round.phase !== 'proving' && (
          <form onSubmit={handleDeclare} className="claim-panel__form">
            <label htmlFor="claim-move-count" className="visually-hidden">Number of moves you can solve it in</label>
            <input
              id="claim-move-count"
              type="number"
              min="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={leader ? `< ${leader.moveCount}` : 'e.g. 5'}
            />
            <button type="submit">I can solve it!</button>
          </form>
        )
      )}
      {claimError && <p className="claim-panel__error" role="alert">{claimError}</p>}
    </div>
  );
}
