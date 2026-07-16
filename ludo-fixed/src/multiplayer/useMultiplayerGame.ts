/**
 * useMultiplayerGame — syncs Firestore game state with local board
 * Fully audited and fixed version
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Token, PlayerColor } from '../types';
import {
  MultiplayerGameState, MultiplayerPlayer,
  writeDiceRoll, writeTokenMove,
  markGameStarted, markGameFinished,
  updatePlayerConnection, knockOutPlayer,
  resetTableSlot, clearUserCurrentGame,
} from './gameSync';
import { TableMode, DISCONNECT_TIMEOUT_SECONDS, TABLE_RESET_DELAY_SECONDS } from './tableConfig';

interface UseMultiplayerGameOptions {
  gameId: string;
  tableId: string;
  tableNum: number;
  mode: TableMode;
  myUid: string;
  myColor: PlayerColor;
  onGameEnd: (winners: PlayerColor[]) => void;
  initialGameState?: any; // seed state before Firestore listener fires
}

interface MultiplayerGameHook {
  gameState: MultiplayerGameState | null;
  isMyTurn: boolean;
  isConnected: boolean;
  disconnectingPlayer: MultiplayerPlayer | null;
  disconnectSecondsLeft: number;
  rollDice: () => Promise<void>;
  makeMove: (tokenId: string, newTokens: Token[], nextColor: PlayerColor, winners: PlayerColor[], consecutiveSixes: number, hasRolled: boolean) => Promise<void>;
  leaveGame: () => Promise<void>;
}

export const useMultiplayerGame = (
  options: UseMultiplayerGameOptions | null
): MultiplayerGameHook => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(
    options?.initialGameState || null
  );
  const [isConnected, setIsConnected] = useState(true);
  const [disconnectingPlayer, setDisconnectingPlayer] = useState<MultiplayerPlayer | null>(null);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState(0);

  // All values from options — re-read on every render (no stale closure issues)
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const isActive = !!options;

  // Refs — survive re-renders without causing effect re-runs
  const gameStateRef = useRef<MultiplayerGameState | null>(options?.initialGameState || null);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectingPlayerRef = useRef<MultiplayerPlayer | null>(null); // FIX 4
  const gameStartedRef = useRef<boolean>(false);
  const gameEndedRef = useRef<boolean>(false);
  const prevGameIdRef = useRef<string>('');

  // Keep refs in sync with state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { disconnectingPlayerRef.current = disconnectingPlayer; }, [disconnectingPlayer]);

  // FIX 2: Reset refs when gameId changes (new game)
  const gameId = options?.gameId || '';
  useEffect(() => {
    if (gameId && gameId !== prevGameIdRef.current) {
      prevGameIdRef.current = gameId;
      gameStartedRef.current = false;
      gameEndedRef.current = false;
      disconnectingPlayerRef.current = null;
      setDisconnectingPlayer(null);
      setDisconnectSecondsLeft(0);
      setGameState(null);
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    }
  }, [gameId]);

  // Firestore listener
  useEffect(() => {
    if (!gameId || !isActive) return;

    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as MultiplayerGameState;
      setGameState(state);

      const opts = optionsRef.current;
      if (!opts) return;
      const { myUid, myColor, tableId, tableNum, mode, onGameEnd } = opts;

      // ── Disconnect detection ──────────────────────────────────
      if (state.status !== 'finished') {
        const disconnected = state.players.find(
          p => !p.connected && !p.knockedOut && p.disconnectedAt
        );

        if (disconnected && disconnected.uid !== myUid) {
          // FIX 4: use ref not closure to check current state
          const alreadyTracking = disconnectingPlayerRef.current?.uid === disconnected.uid;
          if (!alreadyTracking) {
            setDisconnectingPlayer(disconnected);
            if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);

            disconnectTimerRef.current = setInterval(() => {
              const elapsed = Math.floor((Date.now() - disconnected.disconnectedAt!) / 1000);
              const remaining = Math.max(0, DISCONNECT_TIMEOUT_SECONDS - elapsed);
              setDisconnectSecondsLeft(remaining);

              if (remaining === 0) {
                clearInterval(disconnectTimerRef.current!);
                disconnectTimerRef.current = null;
                setDisconnectingPlayer(null);
                disconnectingPlayerRef.current = null;

                const gs = gameStateRef.current;
                if (!gs || gameEndedRef.current) return;

                const activePlayers = gs.players.filter(p => !p.knockedOut && p.uid !== disconnected.uid);

                if (activePlayers.length <= 1) {
                  const winner = activePlayers[0];
                  if (winner && !gameEndedRef.current) {
                    gameEndedRef.current = true;
                    markGameFinished(gameId, [winner.color as PlayerColor], gs.players)
                      .then(() => {
                        setTimeout(() => resetTableSlot(tableId, mode, tableNum), TABLE_RESET_DELAY_SECONDS * 1000);
                        setTimeout(() => onGameEnd([winner.color as PlayerColor]), 300);
                      });
                  }
                } else {
                  knockOutPlayer(
                    gameId, disconnected.uid,
                    disconnected.color as PlayerColor,
                    gs.players, gs.tokens,
                    gs.activePlayerColor, gs.matchWinners,
                  );
                }
              }
            }, 1000);
          }
        } else if (!disconnected) {
          // Player reconnected — clear timer
          if (disconnectingPlayerRef.current !== null) {
            setDisconnectingPlayer(null);
            disconnectingPlayerRef.current = null;
            setDisconnectSecondsLeft(0);
            if (disconnectTimerRef.current) {
              clearInterval(disconnectTimerRef.current);
              disconnectTimerRef.current = null;
            }
          }
        }
      }

      // ── Game finished ─────────────────────────────────────────
      if (state.status === 'finished' && !gameEndedRef.current) {
        gameEndedRef.current = true;
        // Clear all disconnect UI
        setDisconnectingPlayer(null);
        disconnectingPlayerRef.current = null;
        setDisconnectSecondsLeft(0);
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        clearUserCurrentGame(myUid);
        setTimeout(() => resetTableSlot(tableId, mode, tableNum), TABLE_RESET_DELAY_SECONDS * 1000);
        // FIX 3: use onGameEnd from optionsRef (always fresh)
        setTimeout(() => optionsRef.current?.onGameEnd(state.matchWinners), 400);
      }

      // ── Mark game started ─────────────────────────────────────
      if (state.status === 'countdown' && state.countdownStartedAt && !gameStartedRef.current) {
        const elapsed = (Date.now() - state.countdownStartedAt) / 1000;
        if (elapsed >= 5) {
          gameStartedRef.current = true;
          markGameStarted(gameId).catch(() => { gameStartedRef.current = false; });
        }
      }
    });

    return () => {
      unsub();
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
    };
  }, [gameId, isActive]);

  // ── Presence detection ────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !isActive) return;
    const myUid = optionsRef.current?.myUid || '';

    const markConnected = async (connected: boolean) => {
      const gs = gameStateRef.current;
      if (!gs || gs.status === 'finished') return;
      setIsConnected(connected);
      try {
        await updatePlayerConnection(gameId, myUid, connected, gs.players);
      } catch {}
    };

    const handleOnline = () => markConnected(true);
    const handleOffline = () => markConnected(false);
    const handleUnload = () => markConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleUnload);
    markConnected(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleUnload);
      markConnected(false);
    };
  }, [gameId, isActive]);

  // ── isMyTurn ──────────────────────────────────────────────────
  const myColor = options?.myColor || 'red';
  const isMyTurn = gameState?.activePlayerColor === myColor &&
    (gameState?.status === 'playing' || gameState?.status === 'countdown') &&
    !gameState?.hasRolled;

  // ── rollDice ──────────────────────────────────────────────────
  const rollDice = useCallback(async () => {
    const gs = gameStateRef.current;
    const opts = optionsRef.current;
    if (!gs || !opts) return;
    // Re-check isMyTurn from current state (not closure)
    if (gs.activePlayerColor !== opts.myColor) return;
    if (gs.hasRolled) return;
    if (gs.status !== 'playing' && gs.status !== 'countdown') return;

    const rolled = Math.floor(Math.random() * 6) + 1;
    let newConsecutiveSixes = gs.consecutiveSixes || 0;

    // Triple 6 — pass turn
    if (rolled === 6 && newConsecutiveSixes >= 2) {
      const activePlayers = gs.players.filter(p => !p.knockedOut);
      const myIdx = activePlayers.findIndex(p => p.color === opts.myColor);
      const nextIdx = (myIdx + 1) % activePlayers.length;
      const nextColor = activePlayers[nextIdx]?.color || activePlayers[0].color;
      await updateDoc(doc(db, 'games', gameId), {
        diceValue: rolled, hasRolled: false,
        consecutiveSixes: 0, activePlayerColor: nextColor,
        updatedAt: Date.now(),
      });
      return;
    }

    if (rolled === 6) newConsecutiveSixes += 1;
    else newConsecutiveSixes = 0;

    await writeDiceRoll(gameId, rolled, newConsecutiveSixes);
  }, [gameId]);

  // ── makeMove ──────────────────────────────────────────────────
  const makeMove = useCallback(async (
    tokenId: string,
    newTokens: Token[],
    nextColor: PlayerColor,
    winners: PlayerColor[],
    consecutiveSixes: number,
    hasRolled: boolean,
  ) => {
    const gs = gameStateRef.current;
    if (!gs || gameEndedRef.current) return;

    const activePlayers = gs.players.filter(p => !p.knockedOut);
    const isGameOver = winners.length >= activePlayers.length - 1;

    if (isGameOver && !gameEndedRef.current) {
      gameEndedRef.current = true;
      const updatedPlayers = gs.players.map(p => ({
        ...p,
        finishedPosition: winners.indexOf(p.color as PlayerColor) >= 0
          ? winners.indexOf(p.color as PlayerColor) + 1 : null,
      }));
      await markGameFinished(gameId, winners, updatedPlayers);
    } else {
      await writeTokenMove(gameId, newTokens, nextColor, winners, consecutiveSixes, hasRolled);
    }
  }, [gameId]);

  // ── leaveGame ─────────────────────────────────────────────────
  const leaveGame = useCallback(async () => {
    const gs = gameStateRef.current;
    const opts = optionsRef.current;
    if (!gs || !opts) return;
    await updatePlayerConnection(gameId, opts.myUid, false, gs.players);
    await clearUserCurrentGame(opts.myUid);
  }, [gameId]);

  return {
    gameState, isMyTurn, isConnected,
    disconnectingPlayer, disconnectSecondsLeft,
    rollDice, makeMove, leaveGame,
  };
};
