/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Token, PlayerColor } from '../types';
import { AIDecisionInput, AIDecisionResult, AIDifficulty } from './types';
import { aiConfigManager } from './config';
import { getStrategyForDifficulty } from './difficulty';
import { TournamentAIAssigner } from './tournament';

/**
 * AI Engine module responsible for managing AI player state, evaluating turns,
 * and selecting actions based on configured difficulty strategies.
 */
export class AIEngine {
  /**
   * Helper to verify if the active player is an AI (computer)
   */
  public static isAITurn(activePlayer: Player | null | undefined): boolean {
    return activePlayer !== null && activePlayer !== undefined && activePlayer.type === 'computer';
  }

  /**
   * Triggers difficulty sync under tournament setups, then returns assigned difficulty for a color
   */
  public static getDifficulty(color: PlayerColor): AIDifficulty {
    // Ensure tournament difficulties are updated based on current local storage state
    TournamentAIAssigner.assignAIDifficulties();
    return aiConfigManager.getDifficultyForColor(color);
  }

  /**
   * Evaluates and chooses which token to move based on the assigned difficulty strategy.
   * Note: Currently all difficulty strategies are placeholders that fall back to a random
   * legal move, preserving existing gameplay exactly while laying the foundation for future work.
   */
  public static selectTokenMove(
    playerColor: PlayerColor,
    diceValue: number,
    validMoves: string[],
    tokens: Token[]
  ): AIDecisionResult {
    if (validMoves.length === 0) {
      throw new Error(`[AI Engine] Cannot select a move: No valid moves available for color ${playerColor}`);
    }

    // 1. Retrieve the difficulty level assigned to this player
    const difficulty = this.getDifficulty(playerColor);

    // 2. Prepare the standard decision input
    const decisionInput: AIDecisionInput = {
      playerColor,
      diceValue,
      validMoves,
      tokens,
      difficulty,
    };

    // 3. Resolve the appropriate difficulty strategy
    const strategy = getStrategyForDifficulty(difficulty);

    // 4. Select the move using the strategy
    const result = strategy.chooseMove(decisionInput);

    return result;
  }
}
