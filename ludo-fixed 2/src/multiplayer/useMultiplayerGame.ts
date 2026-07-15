/**
 * useMultiplayerGame — React hook that syncs Firestore game state
 * with the existing local game engine.
 *
 * Strategy:
 *  - Local player actions → write to Firestore → all clients update
 *  - Firestore listener → updates local React state
 *  - Non-active players are blocked from rolling/moving
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Token, PlayerColor } from '../types';
import {
  MultiplayerGameState,
  MultiplayerPlayer,
  writeDiceRoll,
  writeTokenMove,
  markGameStarted,
  markGameFinished,
  updatePlayerConnection,
  knockOutPlayer,
  resetTableSlot,
  clearUserCurrentGame,
} from './gameSync';
import { TableMode, DISCONNECT_TIMEOUT_SECONDS, TABLE_RESET_DELAY_SECONDS } from './tableConfig';

interface UseMultiplayerGameOptions {
  gameId: string;
  tableId: string;
  mode: TableMode;
  myUid: string;
  myColor: PlayerColor;
  onGameEnd: (winners: PlayerColor[]) => void;
}

interface MultiplayerGameHook {
  // Game state from Firestore
  gameState: MultiplayerGameState | null;
  isMyTurn: boolean;
  isConnected: boolean;
  disconnectingPlayer: MultiplayerPlayer | null;
  disconnectSecondsLeft: number;
  // Actions
  rollDice: () => Promise<void>;
  makeMove: (tokenId: string, newTokens: Token[], nextColor: PlayerColor, winners: PlayerColor[], consecutiveSixes: number, hasRolled: boolean) => Promise<void>;
  leaveGame: () => Promise<void>;
}

export const useMultiplayerGame = (
  options: UseMultiplayerGameOptions | null
): MultiplayerGameHook => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [disconnectingPlayer, setDisconnectingPlayer] = useState<MultiplayerPlayer | null>(null);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState(0);
  const gameId = options?.gameId || '';
  const tableId = options?.tableId || '';
  const mode = options?.mode || '4P';
  const myUid = options?.myUid || '';
  const myColor = options?.myColor || 'red';
  const onGameEnd = options?.onGameEnd || (() => {});

  // Return empty state if no options provided
  const isActive = !!options;
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Listen to game state from Firestore
  useEffect(() => {
    if (!gameId || !isActive) return;

    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as MultiplayerGameState;
      setGameState(state);

      // Check for disconnecting players
      const disconnected = state.players.find(
        p => !p.connected && !p.knockedOut && p.disconnectedAt
      );

      if (disconnected && disconnected.uid !== myUid) {
        setDisconnectingPlayer(disconnected);

        // Start countdown
        if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - disconnected.disconnectedAt!) / 1000);
          const remaining = Math.max(0, DISCONNECT_TIMEOUT_SECONDS - elapsed);
          setDisconnectSecondsLeft(remaining);

          if (remaining === 0) {
            clearInterval(disconnectTimerRef.current!);
            setDisconnectingPlayer(null);
            // Knock out the disconnected player
            const gs = gameStateRef.current;
            if (!gs) return;

            const activePlayers = gs.players.filter(p => !p.knockedOut && p.uid !== disconnected.uid);

            // 2P special case — remaining player wins
            if (activePlayers.length <= 1) {
              const winner = activePlayers[0];
              if (winner) {
                markGameFinished(gameId, [winner.color as PlayerColor], gs.players)
                  .then(() => {
                    setTimeout(() => resetTableSlot(tableId, mode), TABLE_RESET_DELAY_SECONDS * 1000);
                    onGameEnd([winner.color as PlayerColor]);
                  });
              }
            } else {
              knockOutPlayer(
                gameId,
                disconnected.uid,
                disconnected.color as PlayerColor,
                gs.players,
                gs.tokens,
                gs.activePlayerColor,
                gs.matchWinners,
              );
            }
          }
        }, 1000);
      } else {
        // Clear disconnect timer if player reconnected
        if (!disconnected) {
          setDisconnectingPlayer(null);
          if (disconnectTimerRef.current) {
            clearInterval(disconnectTimerRef.current);
          }
        }
      }

      // Game finished
      if (state.status === 'finished') {
        onGameEnd(state.matchWinners);
        clearUserCurrentGame(myUid);
        setTimeout(() => resetTableSlot(tableId, mode), TABLE_RESET_DELAY_SECONDS * 1000);
      }

      // Game countdown finished — mark as started.
      // Also arm a local timer as a fallback: onSnapshot only fires when the
      // doc changes, so if nothing else writes to it we'd otherwise never
      // re-check elapsed time and the game would stay stuck in 'countdown'.
      if (state.status === 'countdown' && state.countdownStartedAt) {
        const elapsed = (Date.now() - state.countdownStartedAt) / 1000;
        if (elapsed >= 5) {
          markGameStarted(gameId);
        } else if (!countdownTimerRef.current) {
          const remainingMs = (5 - elapsed) * 1000;
          countdownTimerRef.current = setTimeout(() => {
            countdownTimerRef.current = null;
            markGameStarted(gameId);
          }, remainingMs);
        }
      } else if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    });

    return () => {
      unsub();
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [gameId]);

  // Set up presence detection — mark disconnected on page close
  useEffect(() => {
    if (!gameId || !gameState || !isActive) return;

    const handleOnline = async () => {
      setIsConnected(true);
      const gs = gameStateRef.current;
      if (!gs) return;
      await updatePlayerConnection(gameId, myUid, true, gs.players);
    };

    const handleOffline = async () => {
      setIsConnected(false);
      const gs = gameStateRef.current;
      if (!gs) return;
      await updatePlayerConnection(gameId, myUid, false, gs.players);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [gameId, myUid, gameState]);

  // Is it my turn?
  const isMyTurn = gameState?.activePlayerColor === myColor &&
    gameState?.status === 'playing';

  // Roll dice — write to Firestore
  const rollDice = useCallback(async () => {
    if (!isMyTurn || !gameState || gameState.hasRolled) return;

    const rolled = Math.floor(Math.random() * 6) + 1;
    let newConsecutiveSixes = gameState.consecutiveSixes;

    // Triple 6 — pass turn
    if (rolled === 6 && newConsecutiveSixes >= 2) {
      newConsecutiveSixes = 0;
      // Pass to next player
      const activePlayers = gameState.players.filter(p => !p.knockedOut);
      const myIdx = activePlayers.findIndex(p => p.color === myColor);
      const nextIdx = (myIdx + 1) % activePlayers.length;
      const nextColor = activePlayers[nextIdx].color as PlayerColor;

      await updateDoc(doc(db, 'games', gameId), {
        diceValue: rolled,
        hasRolled: false,
        consecutiveSixes: 0,
        activePlayerColor: nextColor,
        updatedAt: Date.now(),
      });
      return;
    }

    if (rolled === 6) newConsecutiveSixes += 1;
    else newConsecutiveSixes = 0;

    await writeDiceRoll(gameId, rolled, newConsecutiveSixes);
  }, [isMyTurn, gameState, myColor, gameId]);

  // Make move — write resulting board state to Firestore
  const makeMove = useCallback(async (
    tokenId: string,
    newTokens: Token[],
    nextColor: PlayerColor,
    winners: PlayerColor[],
    consecutiveSixes: number,
    hasRolled: boolean,
  ) => {
    if (!gameState) return;

    // Check if game is over
    if (winners.length >= gameState.players.filter(p => !p.knockedOut).length - 1) {
      const updatedPlayers = gameState.players.map((p, i) => ({
        ...p,
        finishedPosition: winners.indexOf(p.color as PlayerColor) >= 0
          ? winners.indexOf(p.color as PlayerColor) + 1 : null,
      }));
      await markGameFinished(gameId, winners, updatedPlayers);
    } else {
      await writeTokenMove(gameId, newTokens, nextColor, winners, consecutiveSixes, hasRolled);
    }
  }, [gameState, gameId]);

  // Leave game
  const leaveGame = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs) return;
    await updatePlayerConnection(gameId, myUid, false, gs.players);
    await clearUserCurrentGame(myUid);
  }, [gameId, myUid]);

  return {
    gameState,
    isMyTurn,
    isConnected,
    disconnectingPlayer,
    disconnectSecondsLeft,
    rollDice,
    makeMove,
    leaveGame,
  };
};
