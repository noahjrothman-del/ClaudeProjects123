export default function Scoreboard({ players, hostId, youId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="scoreboard">
      <h2>Scoreboard</h2>
      <ol className="scoreboard__list">
        {sorted.map((p) => (
          <li key={p.id} className={`scoreboard__item${p.connected ? '' : ' scoreboard__item--offline'}`}>
            <span className="scoreboard__name">
              {p.name}
              {p.id === hostId && <span className="scoreboard__badge">HOST</span>}
              {p.id === youId && <span className="scoreboard__badge scoreboard__badge--you">YOU</span>}
              {!p.connected && <span className="scoreboard__offline-dot" title="Disconnected" />}
            </span>
            <span className="mono scoreboard__score">{p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
