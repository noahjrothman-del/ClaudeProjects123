import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket.js';
import { clearSession, loadSession, saveSession } from './session.js';

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

// Manages the lobby/room/round lifecycle over Socket.IO: create/join, the
// live room state pushed by the server, and automatic rejoin (on first load
// and after any reconnect) using credentials cached in sessionStorage.
export function useMultiplayerRoom() {
  const socketRef = useRef(null);
  if (!socketRef.current) socketRef.current = getSocket();
  const socket = socketRef.current;

  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [playerName, setPlayerName] = useState(() => loadSession()?.name || '');
  const [rejoining, setRejoining] = useState(false);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
      const session = loadSession();
      if (session) {
        setRejoining(true);
        socket.emit('room:rejoin', session, (res) => {
          setRejoining(false);
          if (res.ok) {
            setRoom(res.room);
            setError(null);
          } else {
            clearSession();
          }
        });
      }
    }
    function handleDisconnect() {
      setConnected(false);
    }
    function handleRoomUpdate(nextRoom) {
      setRoom((prev) => (prev && prev.code !== nextRoom.code ? prev : nextRoom));
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:update', handleRoomUpdate);
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:update', handleRoomUpdate);
    };
  }, [socket]);

  const createRoom = useCallback(async (name) => {
    setError(null);
    const res = await emitWithAck(socket, 'room:create', { name });
    if (res.ok) {
      setRoom(res.room);
      setPlayerName(name);
      saveSession(res.room.code, name);
    } else {
      setError(res.error);
    }
    return res;
  }, [socket]);

  const joinRoom = useCallback(async (code, name) => {
    setError(null);
    const res = await emitWithAck(socket, 'room:join', { code, name });
    if (res.ok) {
      setRoom(res.room);
      setPlayerName(name);
      saveSession(res.room.code, name);
    } else {
      setError(res.error);
    }
    return res;
  }, [socket]);

  const startRound = useCallback(() => emitWithAck(socket, 'round:start', {}), [socket]);

  const declareClaim = useCallback(
    (moveCount) => emitWithAck(socket, 'claim:declare', { moveCount }),
    [socket]
  );

  const submitSolution = useCallback(
    (moves) => emitWithAck(socket, 'claim:submit', { moves }),
    [socket]
  );

  const leaveRoom = useCallback(() => {
    clearSession();
    setRoom(null);
  }, []);

  return {
    connected,
    rejoining,
    room,
    error,
    you: { id: socket.id, name: playerName },
    createRoom,
    joinRoom,
    startRound,
    declareClaim,
    submitSolution,
    leaveRoom,
  };
}
