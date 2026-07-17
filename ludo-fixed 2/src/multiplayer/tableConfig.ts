/**
 * Fixed table configuration for multiplayer lobby
 * 6 rooms × 4 tables × 2 modes = 48 simultaneous games
 */

export interface TableConfig {
  id: string;
  name: string;
  emoji: string;
  from: string;
  to: string;
  border: string;
  textDark: string;
}

export const TABLES: TableConfig[] = [
  { id: 'alpha', name: 'Alpha', emoji: '🔥', from: '#fda4af', to: '#f43f5e', border: '#be123c', textDark: '#881337' },
  { id: 'blaze', name: 'Blaze', emoji: '⚡', from: '#fde68a', to: '#f59e0b', border: '#d97706', textDark: '#78350f' },
  { id: 'storm', name: 'Storm', emoji: '🌪️', from: '#bfdbfe', to: '#3b82f6', border: '#2563eb', textDark: '#1e3a8a' },
  { id: 'nova',  name: 'Nova',  emoji: '💫', from: '#bbf7d0', to: '#22c55e', border: '#16a34a', textDark: '#14532d' },
  { id: 'titan', name: 'Titan', emoji: '🏔️', from: '#e9d5ff', to: '#a855f7', border: '#9333ea', textDark: '#581c87' },
  { id: 'viper', name: 'Viper', emoji: '🐍', from: '#fed7aa', to: '#f97316', border: '#ea580c', textDark: '#7c2d12' },
];

export const TABLES_PER_MODE = 4; // 4 tables per 2P and 4 tables per 4P per room

export const PLAYER_COLORS = ['red', 'green', 'blue', 'yellow'] as const;

export type TableMode = '2P' | '4P';

export interface TablePlayer {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: string;
  joinedAt: number;
  connected: boolean;
}

export interface TableSlot {
  tableNum: number; // 1-4
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  players: TablePlayer[];
  gameId: string | null;
  countdownStartedAt: number | null;
  lockedAt: number | null;
}

export interface TableDoc {
  id: string;
  name: string;
  emoji: string;
  slots2P: TableSlot[]; // array of 4
  slots4P: TableSlot[]; // array of 4
}

export const makeEmptySlot = (tableNum: number): TableSlot => ({
  tableNum,
  status: 'waiting',
  players: [],
  gameId: null,
  countdownStartedAt: null,
  lockedAt: null,
});

export const EMPTY_SLOTS_2P: TableSlot[] = [1, 2, 3, 4].map(makeEmptySlot);
export const EMPTY_SLOTS_4P: TableSlot[] = [1, 2, 3, 4].map(makeEmptySlot);

export const COUNTDOWN_SECONDS = 5;
export const DISCONNECT_TIMEOUT_SECONDS = 60;
export const TABLE_RESET_DELAY_SECONDS = 30;
export const MAX_GAME_DURATION_MS = 90 * 60 * 1000;
export const MAX_COUNTDOWN_MS = 30 * 1000;
