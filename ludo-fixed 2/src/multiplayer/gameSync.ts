/**
 * Multiplayer Firestore operations
 * 6 rooms × 4 tables × 2 modes = 48 simultaneous games
 */

import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, runTransaction, Unsubscribe,
  FieldValue,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Token, PlayerColor } from '../types';
import {
  TABLES, TABLES_PER_MODE, TableSlot, TableDoc,
  makeEmptySlot, EMPTY_SLOTS_2P, EMPTY_SLOTS_4P,
  PLAYER_COLORS, TableMode, TablePlayer,
  COUNTDOWN_SECONDS, TABLE_RESET_DELAY_SECONDS,
} from './tableConfig';

// ── Initialize all 6 tables ───────────────────────────────────────
export const initializeTables = async (): Promise<void> => {
  for (const table of TABLES) {
    const ref = doc(db, 'tables', table.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: table.id,
        name: table.name,
        emoji: table.emoji,
        slots2P: EMPTY_SLOTS_2P,
        slots4P: EMPTY_SLOTS_4P,
        createdAt: serverTimestamp(),
      });
    } else {
      // Migrate old structure (single slot → array of 4)
      const data = snap.data();
      if (!Array.isArray(data.slots2P)) {
        await updateDoc(ref, {
          slots2P: EMPTY_SLOTS_2P,
          slots4P: EMPTY_SLOTS_4P,
        });
      }
    }
  }
};

// ── Join a table — finds first available slot ─────────────────────
export const joinTable = async (
  tableId: string,
  mode: TableMode,
  uid: string,
  displayName: string,
  photoURL: string | null,
  preferredTableNum?: number, // 1-4, optional
): Promise<{ success: boolean; color?: string; tableNum?: number; error?: string }> => {
  const tableRef = doc(db, 'tables', tableId);
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';
  const maxPlayers = mode === '2P' ? 2 : 4;

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(tableRef);
      if (!snap.exists()) return { success: false, error: 'Table not found' };

      const data = snap.data() as TableDoc;
      const slots: TableSlot[] = Array.isArray(data[slotKey])
        ? data[slotKey]
        : EMPTY_SLOTS_2P;

      // Check if already in any slot
      for (const slot of slots) {
        if (slot.players?.some(p => p.uid === uid)) {
          return { success: false, error: 'Already in a table' };
        }
      }

      // Find slot to join: preferred first, then first available
      let targetSlot: TableSlot | null = null;
      let targetIdx = -1;

      if (preferredTableNum) {
        const idx = slots.findIndex(s => s.tableNum === preferredTableNum);
        const s = slots[idx];
        if (s && s.status === 'waiting' && (s.players?.length || 0) < maxPlayers) {
          targetSlot = s;
          targetIdx = idx;
        }
      }

      if (!targetSlot) {
        // Find first slot with space
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          if (s.status === 'waiting' && (s.players?.length || 0) < maxPlayers) {
            targetSlot = s;
            targetIdx = i;
            break;
          }
        }
      }

      if (!targetSlot || targetIdx < 0) {
        return { success: false, error: 'All tables are full' };
      }

      // Assign color
      const usedColors = targetSlot.players?.map(p => p.color) || [];
      const color = PLAYER_COLORS.find(c => !usedColors.includes(c));
      if (!color) return { success: false, error: 'No color available' };

      const newPlayer: TablePlayer = {
        uid, displayName,
        photoURL: photoURL || null,
        color,
        joinedAt: Date.now(),
        connected: true,
      };

      const updatedPlayers = [...(targetSlot.players || []), newPlayer];
      const isFull = updatedPlayers.length === maxPlayers;

      const updatedSlot: TableSlot = {
        ...targetSlot,
        players: updatedPlayers,
        status: isFull ? 'countdown' : 'waiting',
        countdownStartedAt: isFull ? Date.now() : null,
        lockedAt: isFull ? Date.now() : null,
      };

      const updatedSlots = slots.map((s, i) => i === targetIdx ? updatedSlot : s);
      tx.update(tableRef, { [slotKey]: updatedSlots });

      return { success: true, color, tableNum: targetSlot.tableNum };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// ── Leave a specific table slot ───────────────────────────────────
export const leaveTable = async (
  tableId: string,
  mode: TableMode,
  uid: string,
  tableNum: number,
): Promise<void> => {
  const tableRef = doc(db, 'tables', tableId);
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tableRef);
    if (!snap.exists()) return;
    const data = snap.data() as TableDoc;
    const slots: TableSlot[] = Array.isArray(data[slotKey]) ? data[slotKey] : [];
    const idx = slots.findIndex(s => s.tableNum === tableNum);
    if (idx < 0) return;
    const slot = slots[idx];
    if (slot.status !== 'waiting') return;
    const updatedSlots = slots.map((s, i) =>
      i === idx ? { ...s, players: s.players.filter(p => p.uid !== uid) } : s
    );
    tx.update(tableRef, { [slotKey]: updatedSlots });
  });
};

// ── Listen to all tables (lobby) ──────────────────────────────────
export const listenToTables = (
  callback: (tables: Record<string, TableDoc>) => void
): Unsubscribe => {
  const state: Record<string, TableDoc> = {};
  const unsubs: Unsubscribe[] = [];

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

// ── Listen to single table ────────────────────────────────────────
export const listenToTable = (
  tableId: string,
  callback: (data: TableDoc) => void
): Unsubscribe => {
  return onSnapshot(doc(db, 'tables', tableId), (snap) => {
    if (snap.exists()) callback(snap.data() as TableDoc);
  });
};

// ── Game state types ──────────────────────────────────────────────
export interface MultiplayerGameState {
  tableId: string;
  tableNum: number;
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
  tableNum: number,
  mode: TableMode,
  players: MultiplayerPlayer[],
  initialTokens: Token[],
): Promise<void> => {
  await setDoc(doc(db, 'games', gameId), {
    tableId, tableNum, mode,
    status: 'countdown',
    players,
    tokens: initialTokens,
    activePlayerColor: players[0].color,
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

// ── Listen to game ────────────────────────────────────────────────
export const listenToGame = (
  gameId: string,
  callback: (state: MultiplayerGameState) => void
): Unsubscribe => {
  return onSnapshot(doc(db, 'games', gameId), (snap) => {
    if (snap.exists()) callback(snap.data() as MultiplayerGameState);
  });
};

// ── Write dice roll ───────────────────────────────────────────────
export const writeDiceRoll = async (
  gameId: string,
  value: number,
  consecutiveSixes: number,
): Promise<void> => {
  await setDoc(doc(db, 'games', gameId), {
    diceValue: value,
    hasRolled: true,
    consecutiveSixes,
    updatedAt: Date.now(),
  }, { merge: true });
};

// ── Write token move ──────────────────────────────────────────────
export const writeTokenMove = async (
  gameId: string,
  tokens: Token[],
  nextPlayerColor: PlayerColor,
  matchWinners: PlayerColor[],
  consecutiveSixes: number,
  hasRolled: boolean,
): Promise<void> => {
  await setDoc(doc(db, 'games', gameId), {
    tokens,
    activePlayerColor: nextPlayerColor,
    matchWinners,
    consecutiveSixes,
    hasRolled,
    diceValue: 0,
    updatedAt: Date.now(),
  }, { merge: true });
};

// ── Mark game started ─────────────────────────────────────────────
export const markGameStarted = async (gameId: string): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'playing',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });
};

// ── Mark game finished ────────────────────────────────────────────
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

// ── Update player connection ──────────────────────────────────────
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
  await setDoc(doc(db, 'games', gameId), {
    players: updated,
    updatedAt: Date.now(),
  }, { merge: true });
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
  const cleanedTokens = tokens.filter(t => t.playerColor !== color);
  const updatedPlayers = players.map(p =>
    p.uid === uid ? { ...p, knockedOut: true, connected: false } : p
  );
  const activePlayers = updatedPlayers.filter(p => !p.knockedOut);
  let nextColor = activePlayerColor;
  if (activePlayerColor === color && activePlayers.length > 0) {
    const currentIdx = activePlayers.findIndex(p => p.color === color);
    const nextIdx = (Math.max(0, currentIdx) + 1) % activePlayers.length;
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

// ── Reset a specific table slot ───────────────────────────────────
export const resetTableSlot = async (
  tableId: string,
  mode: TableMode,
  tableNum: number,
): Promise<void> => {
  const slotKey = mode === '2P' ? 'slots2P' : 'slots4P';
  const tableRef = doc(db, 'tables', tableId);
  const snap = await getDoc(tableRef);
  if (!snap.exists()) return;
  const data = snap.data() as TableDoc;
  const slots: TableSlot[] = Array.isArray(data[slotKey]) ? data[slotKey] : [];
  const updatedSlots = slots.map(s =>
    s.tableNum === tableNum ? makeEmptySlot(tableNum) : s
  );
  await updateDoc(tableRef, { [slotKey]: updatedSlots });
};

// ── Save user current game ────────────────────────────────────────
export const saveUserCurrentGame = async (
  uid: string,
  gameId: string,
  tableId: string,
  tableNum: number,
  color: string,
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'session', 'currentGame'),
    { gameId, tableId, tableNum, color, joinedAt: Date.now() },
    { merge: true }
  );
};

// ── Clear user current game ───────────────────────────────────────
export const clearUserCurrentGame = async (uid: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'session', 'currentGame'),
    { gameId: null, tableId: null, tableNum: null, color: null },
    { merge: true }
  );
};

// ── Get user active game (rejoin) ─────────────────────────────────
export const getUserCurrentGame = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid, 'session', 'currentGame'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.gameId ? data : null;
};

// ── isSlotStale ───────────────────────────────────────────────────
const isSlotStale = (slot: TableSlot): boolean => {
  if (!slot || slot.status === 'waiting') return false;
  const now = Date.now();
  const lockedAt = slot.lockedAt || slot.countdownStartedAt || 0;
  if (slot.status === 'countdown') return (now - lockedAt) > 30_000;
  if (slot.status === 'playing' || slot.status === 'finished') return (now - lockedAt) > 90 * 60_000;
  return false;
};

// ── Reset stale slots across all tables ───────────────────────────
export const resetStaleSlots = async (): Promise<void> => {
  for (const table of TABLES) {
    try {
      const ref = doc(db, 'tables', table.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const data = snap.data() as TableDoc;
      const updates: Record<string, any> = {};

      for (const slotKey of ['slots2P', 'slots4P'] as const) {
        const slots: TableSlot[] = Array.isArray(data[slotKey]) ? data[slotKey] : [];
        const updatedSlots = slots.map(s => isSlotStale(s) ? makeEmptySlot(s.tableNum) : s);
        const changed = updatedSlots.some((s, i) => s !== slots[i]);
        if (changed) updates[slotKey] = updatedSlots;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(ref, updates);
      }
    } catch (e) {
      // non-critical
    }
  }
};
