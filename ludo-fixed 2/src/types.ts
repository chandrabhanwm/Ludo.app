/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type PlayerType = 'human' | 'computer' | 'online' | 'none';
export type DiceState = 'idle' | 'rolling' | 'rolled';
export type GameStatus = 'login' | 'menu' | 'playing' | 'paused' | 'gameover' | 'stats';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  type: PlayerType;
  avatar: string; // Emoji or URL
  isWinner: boolean;
  finishedPosition?: number; // 1st, 2nd, 3rd, 4th
}

export interface Token {
  id: string; // e.g., "red-0"
  playerColor: PlayerColor;
  idInColor: number; // 0, 1, 2, 3
  position: 'yard' | number; // 'yard' or 0 to 56 (56 is goal)
}

export interface GameRules {
  sixToExit: boolean;
  rollAgainOnSix: boolean;
  rollAgainOnCapture: boolean;
  rollAgainOnHome: boolean;
  stackingEnabled: boolean;
}

export interface GameLog {
  id: string;
  timestamp: string;
  message: string;
  color?: PlayerColor;
}

export interface GameHistoryEntry {
  id: string;
  date: string;
  players: { name: string; color: PlayerColor; type: PlayerType; rank?: number }[];
  rules: GameRules;
  durationSeconds: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalRolls: number;
  totalSixes: number;
  totalCaptures: number;
  totalCaptured: number;
  totalTokensFinished: number;
  highestRollStreak: number; // consecutive 6s
}

export interface BoardCoordinate {
  row: number;
  col: number;
}
