/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerColor, Token } from '../types';

/**
 * AI Difficulty Levels
 */
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/**
 * Interface representing the configuration for the AI system
 */
export interface AIConfiguration {
  rollDelayMs: number;
  moveDelayMs: number;
  defaultDifficulty: AIDifficulty;
  difficulties: Record<PlayerColor, AIDifficulty>;
}

/**
 * Input parameters required for an AI strategy to make a move decision
 */
export interface AIDecisionInput {
  playerColor: PlayerColor;
  diceValue: number;
  validMoves: string[];
  tokens: Token[];
  difficulty: AIDifficulty;
}

/**
 * Output result representing the AI's decision
 */
export interface AIDecisionResult {
  tokenId: string; // The selected token ID to move
}

/**
 * AI Decision Interface defining how different strategies evaluate moves
 */
export interface AIDecisionStrategy {
  chooseMove(input: AIDecisionInput): AIDecisionResult;
}
