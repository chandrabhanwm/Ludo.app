/**
 * Multiplayer Firestore operations
 * Tables, game state, presence
 */

import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, runTransaction, deleteField,
  collection, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Token, Player, PlayerColor } from '../types';
import {
  TABLES, TableSlot, TableDoc, EMPTY_SLOT,
  PLAYER_COLORS, TableMode, TablePlayer,
  COUNTDOWN_SECONDS,
} from './tableConfig';

// ── Initialize all 6 tables in Firestore (run once) ──────────────
export const initializeTables = async (): Promise<void> => {
  for (const table of TABLES) {
    const ref = doc(db, 'tables', table.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: table.id,
        name: table.name,
        emoji: table.emoji,
        slots2P: EMPTY_SLOT,
        slots4P: EMPTY_SLOT,
        createdAt: serverTimestamp(),
      });
    }
  }
};

// ── Join a table slot ─────────────────────────────────────────────
export const joinTable = async (
  tableId: string,
  mode: TableMode,
  uid: string,
  displayName: string,
  photoURL: string | null,
): Promise<{ success: boolean; color?: string; error?: string }> => {
  const tableRef = doc(db, 'tables', tableId);
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';
  const maxPlayers = mode === '2P' ? 2 : 4;

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(tableRef);
      if (!snap.exists()) return { success: false, error: 'Table not found' };

      const data = snap.data() as TableDoc;
      const slot: TableSlot = data[slotKey] || EMPTY_SLOT;

      // Check if already in this slot
      if (slot.players.some(p => p.uid === uid)) {
        return { success: false, error: 'Already in this table' };
      }

      // Check if slot is available
      if (slot.status !== 'waiting') {
        return { success: false, error: 'Table is locked' };
      }

      if (slot.players.length >= maxPlayers) {
        return { success: false, error: 'Table is full' };
      }

      // Assign next available color
      const usedColors = slot.players.map(p => p.color);
      const color = PLAYER_COLORS.find(c => !usedColors.includes(c));
      if (!color) return { success: false, error: 'No color available' };

      const newPlayer: TablePlayer = {
        uid, displayName,
        photoURL: photoURL || null,
        color,
        joinedAt: Date.now(),
        connected: true,
      };

      const updatedPlayers = [...slot.players, newPlayer];
      const isFull = updatedPlayers.length === maxPlayers;

      const updatedSlot: TableSlot = {
        ...slot,
        players: updatedPlayers,
        status: isFull ? 'countdown' : 'waiting',
        countdownStartedAt: isFull ? Date.now() : null,
        lockedAt: isFull ? Date.now() : null,
      };

      tx.update(tableRef, { [slotKey]: updatedSlot });
      return { success: true, color };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// ── Leave a table slot ────────────────────────────────────────────
export const leaveTable = async (
  tableId: string,
  mode: TableMode,
  uid: string,
): Promise<void> => {
  const tableRef = doc(db, 'tables', tableId);
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) return;

    const data = snap.data() as TableDoc;
    const slot: TableSlot = data[slotKey] || EMPTY_SLOT;

    // Only allow leave if waiting
    if (slot.status !== 'waiting') return;

    const updatedPlayers = slot.players.filter(p => p.uid !== uid);
    tx.update(tableRef, {
      [slotKey]: { ...slot, players: updatedPlayers },
    });
  });
};

// ── Listen to all tables (lobby) ──────────────────────────────────
export const listenToTables = (
  callback: (tables: Record<string, TableDoc>) => void
): Unsubscribe => {
  const unsubs: Unsubscribe[] = [];
  const state: Record<string, TableDoc> = {};

  for (const table of TABLES) {
    const ref = doc(db, 'tables', table.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        state[table.id] = snap.data() as TableDoc;
        callback({ ...state });
      }
    });
    unsubs.push(unsub);
  }

  return () => unsubs.forEach(u => u());
};

// ── Listen to a single table ──────────────────────────────────────
export const listenToTable = (
  tableId: string,
  callback: (data: TableDoc) => void
): Unsubscribe => {
  const ref = doc(db, 'tables', tableId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data() as TableDoc);
  });
};

// ── Game state types ──────────────────────────────────────────────
export interface MultiplayerGameState {
  tableId: string;
  mode: TableMode;
  status: 'countdown' | 'playing' | 'finished';
  players: MultiplayerPlayer[];
  tokens: Token[];
  activePlayerColor: PlayerColor;
  diceValue: number;
  hasRolled: boolean;
  consecutiveSixes: number;
  matchWinners: PlayerColor[];
  countdownStartedAt: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
}

export interface MultiplayerPlayer {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: PlayerColor;
  connected: boolean;
  knockedOut: boolean;
  disconnectedAt: number | null;
  finishedPosition: number | null;
}

// ── Create game document ──────────────────────────────────────────
export const createGame = async (
  gameId: string,
  tableId: string,
  mode: TableMode,
  players: MultiplayerPlayer[],
  initialTokens: Token[],
): Promise<void> => {
  const firstPlayer = players[0].color;
  await setDoc(doc(db, 'games', gameId), {
    tableId,
    mode,
    status: 'countdown',
    players,
    tokens: initialTokens,
    activePlayerColor: firstPlayer,
    diceValue: 0,
    hasRolled: false,
    consecutiveSixes: 0,
    matchWinners: [],
    countdownStartedAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    updatedAt: Date.now(),
  } as MultiplayerGameState);
};

// ── Listen to game state ──────────────────────────────────────────
export const listenToGame = (
  gameId: string,
  callback: (state: MultiplayerGameState) => void
): Unsubscribe => {
  return onSnapshot(doc(db, 'games', gameId), (snap) => {
    if (snap.exists()) callback(snap.data() as MultiplayerGameState);
  });
};

// ── Write dice roll result ────────────────────────────────────────
export const writeDiceRoll = async (
  gameId: string,
  value: number,
  consecutiveSixes: number,
): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    diceValue: value,
    hasRolled: true,
    consecutiveSixes,
    updatedAt: Date.now(),
  });
};

// ── Write token move (full board state after move) ────────────────
export const writeTokenMove = async (
  gameId: string,
  tokens: Token[],
  nextPlayerColor: PlayerColor,
  matchWinners: PlayerColor[],
  consecutiveSixes: number,
  hasRolled: boolean,
): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    tokens,
    activePlayerColor: nextPlayerColor,
    matchWinners,
    consecutiveSixes,
    hasRolled,
    diceValue: hasRolled ? undefined : 0,
    updatedAt: Date.now(),
  });
};

// ── Mark game as started ──────────────────────────────────────────
export const markGameStarted = async (gameId: string): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'playing',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });
};

// ── Mark game as finished ─────────────────────────────────────────
export const markGameFinished = async (
  gameId: string,
  matchWinners: PlayerColor[],
  players: MultiplayerPlayer[],
): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'finished',
    matchWinners,
    players,
    finishedAt: Date.now(),
    updatedAt: Date.now(),
  });
};

// ── Update player connection status ──────────────────────────────
export const updatePlayerConnection = async (
  gameId: string,
  uid: string,
  connected: boolean,
  players: MultiplayerPlayer[],
): Promise<void> => {
  const updated = players.map(p =>
    p.uid === uid
      ? { ...p, connected, disconnectedAt: connected ? null : Date.now() }
      : p
  );
  await updateDoc(doc(db, 'games', gameId), {
    players: updated,
    updatedAt: Date.now(),
  });
};

// ── Knock out a player ────────────────────────────────────────────
export const knockOutPlayer = async (
  gameId: string,
  uid: string,
  color: PlayerColor,
  players: MultiplayerPlayer[],
  tokens: Token[],
  activePlayerColor: PlayerColor,
  matchWinners: PlayerColor[],
): Promise<void> => {
  // Remove their tokens from board
  const cleanedTokens = tokens.map(t =>
    t.playerColor === color
      ? { ...t, position: 'knocked' as any }
      : t
  );

  // Mark as knocked out
  const updatedPlayers = players.map(p =>
    p.uid === uid ? { ...p, knockedOut: true, connected: false } : p
  );

  // Skip to next valid player if it was their turn
  let nextColor = activePlayerColor;
  if (activePlayerColor === color) {
    const activePlayers = updatedPlayers.filter(p => !p.knockedOut);
    const currentIdx = activePlayers.findIndex(p => p.color === color);
    const nextIdx = (currentIdx + 1) % activePlayers.length;
    nextColor = activePlayers[nextIdx]?.color || activePlayers[0].color;
  }

  await updateDoc(doc(db, 'games', gameId), {
    players: updatedPlayers,
    tokens: cleanedTokens,
    activePlayerColor: nextColor,
    hasRolled: false,
    diceValue: 0,
    matchWinners,
    updatedAt: Date.now(),
  });
};

// ── Reset table slot after game ───────────────────────────────────
export const resetTableSlot = async (
  tableId: string,
  mode: TableMode,
): Promise<void> => {
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';
  await updateDoc(doc(db, 'tables', tableId), {
    [slotKey]: EMPTY_SLOT,
  });
};

// ── Save current game ref to user doc ────────────────────────────
export const saveUserCurrentGame = async (
  uid: string,
  gameId: string,
  tableId: string,
  color: string,
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'session', 'currentGame'),
    { gameId, tableId, color, joinedAt: Date.now() },
    { merge: true }
  );
};

// ── Clear current game ref from user doc ──────────────────────────
export const clearUserCurrentGame = async (uid: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'session', 'currentGame'),
    { gameId: null, tableId: null, color: null },
    { merge: true }
  );
};

// ── Get user's active game (for rejoin) ───────────────────────────
export const getUserCurrentGame = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid, 'session', 'currentGame'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.gameId ? data : null;
};

// ── isSlotStale — checks if a slot should be auto-reset ─────────
const isSlotStale = (slot: TableSlot): boolean => {
  if (!slot || slot.status === 'waiting') return false;

  const now = Date.now();
  const lockedAt = slot.lockedAt || slot.countdownStartedAt || 0;

  // Countdown stuck for > 30 seconds → stale
  if (slot.status === 'countdown') {
    return (now - lockedAt) > 30_000;
  }

  // Playing for > 90 minutes → stale
  if (slot.status === 'playing' || slot.status === 'finished') {
    return (now - lockedAt) > 90 * 60_000;
  }

  return false;
};

// ── resetStaleSlots — called on lobby open ────────────────────────
// Automatically resets any stuck slots based on time
export const resetStaleSlots = async (): Promise<void> => {
  const { TABLES, EMPTY_SLOT } = await import('./tableConfig');
  const { db } = await import('../firebase/config');
  const { doc, getDoc, updateDoc } = await import('firebase/firestore');

  for (const table of TABLES) {
    try {
      const ref = doc(db, 'tables', table.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;

      const data = snap.data();
      const updates: Record<string, any> = {};

      for (const slotKey of ['slots2P', 'slots4P']) {
        const slot = data[slotKey] as TableSlot;
        if (isSlotStale(slot)) {
          updates[slotKey] = EMPTY_SLOT;
          console.log(`Auto-reset stale slot: ${table.id}/${slotKey}`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(ref, updates);
      }
    } catch (e) {
      // Non-critical — ignore individual table failures
    }
  }
};
