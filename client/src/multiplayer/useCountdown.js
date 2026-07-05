import { useEffect, useState } from 'react';

// Ticks down from a server-provided end timestamp. Reading the clock instead
// of trusting a duration keeps every client's countdown in sync regardless
// of when their view happened to mount.
export function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(() => computeSeconds(endsAt));

  useEffect(() => {
    setSecondsLeft(computeSeconds(endsAt));
    if (!endsAt) return undefined;
    const interval = setInterval(() => setSecondsLeft(computeSeconds(endsAt)), 200);
    return () => clearInterval(interval);
  }, [endsAt]);

  return secondsLeft;
}

function computeSeconds(endsAt) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}
