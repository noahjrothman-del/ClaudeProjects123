import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_MAX_NODES = 150000;

// Wraps a persistent solver Web Worker so solve() calls never block the UI
// thread, even on a hard puzzle that walks close to the node cap.
export function useSolver() {
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const nextRequestIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('./solverWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { requestId, result } = event.data;
      const resolve = pendingRef.current.get(requestId);
      if (resolve) {
        pendingRef.current.delete(requestId);
        resolve(result);
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  return useCallback((board, robots, targetColor, target, maxNodes = DEFAULT_MAX_NODES) => {
    return new Promise((resolve) => {
      const requestId = ++nextRequestIdRef.current;
      pendingRef.current.set(requestId, resolve);
      workerRef.current.postMessage({ requestId, board, robots, targetColor, target, maxNodes });
    });
  }, []);
}
