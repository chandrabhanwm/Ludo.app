/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty } from './types';
import { PlayerColor } from '../types';
import { aiConfigManager } from './config';

/**
 * Interface representing a tournament opponent loaded from storage
 */
export interface TournamentOpponent {
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  rating: number;
  avatar: string;
}

/**
 * Map tournament difficulty string to internal AIDifficulty enum
 */
export function mapTournamentDifficulty(diffStr?: string): AIDifficulty {
  if (!diffStr) return AIDifficulty.MEDIUM;
  
  const normalized = diffStr.trim().toLowerCase();
  if (normalized === 'easy') {
    return AIDifficulty.EASY;
  }
  if (normalized === 'hard') {
    return AIDifficulty.HARD;
  }
  return AIDifficulty.MEDIUM;
}

/**
 * Module responsible for evaluating current tournament conditions and
 * dynamically assigning difficulties to AI players
 */
export class TournamentAIAssigner {
  /**
   * Scans localStorage and assigns correct AI difficulty levels
   * to all computer colors based on active tournament modes
   */
  public static assignAIDifficulties(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    // 1. Check if we are in the Monthly Championship tournament
    const isWeeklyTourneyActive = localStorage.getItem('ludo_tourney_match_active') === 'true';
    if (isWeeklyTourneyActive) {
      const opponentJson = localStorage.getItem('ludo_tourney_current_opponent');
      if (opponentJson) {
        try {
          const opponent: TournamentOpponent = JSON.parse(opponentJson);
          const mappedDifficulty = mapTournamentDifficulty(opponent.difficulty);
          
          // Green player is the active tournament opponent
          aiConfigManager.setDifficultyForColor('green', mappedDifficulty);
          
          // Assign random/medium difficulties for other computer players (yellow and blue)
          aiConfigManager.setDifficultyForColor('yellow', AIDifficulty.MEDIUM);
          aiConfigManager.setDifficultyForColor('blue', AIDifficulty.MEDIUM);
          return;
        } catch (e) {
          console.error('[AI Assignment] Error parsing monthly tournament opponent:', e);
        }
      }
    }

    // 2. Check if we are in the standard Quick Tournament
    const isQuickTourneyActive = localStorage.getItem('ludo_tournament_match_active') === 'true';
    if (isQuickTourneyActive) {
      const currentRoundStr = localStorage.getItem('ludo_tournament_round') || '1';
      const round = parseInt(currentRoundStr, 10);

      if (round === 1) {
        // Quarters: easier difficulty
        aiConfigManager.setDifficultyForColor('green', AIDifficulty.EASY);
        aiConfigManager.setDifficultyForColor('yellow', AIDifficulty.EASY);
        aiConfigManager.setDifficultyForColor('blue', AIDifficulty.EASY);
      } else if (round === 2) {
        // Semis: medium difficulty
        aiConfigManager.setDifficultyForColor('green', AIDifficulty.MEDIUM);
        aiConfigManager.setDifficultyForColor('yellow', AIDifficulty.MEDIUM);
        aiConfigManager.setDifficultyForColor('blue', AIDifficulty.MEDIUM);
      } else {
        // Finals or later: hard difficulty
        aiConfigManager.setDifficultyForColor('green', AIDifficulty.HARD);
        aiConfigManager.setDifficultyForColor('yellow', AIDifficulty.HARD);
        aiConfigManager.setDifficultyForColor('blue', AIDifficulty.HARD);
      }
      return;
    }

    // 3. Fallback to default game configuration difficulties
    const storedDifficulty = localStorage.getItem('ludo_ai_difficulty');
    if (storedDifficulty) {
      const mappedDifficulty = mapTournamentDifficulty(storedDifficulty);
      aiConfigManager.setDifficultyForColor('green', mappedDifficulty);
      aiConfigManager.setDifficultyForColor('yellow', mappedDifficulty);
      aiConfigManager.setDifficultyForColor('blue', mappedDifficulty);
    } else {
      aiConfigManager.setDifficultyForColor('green', AIDifficulty.MEDIUM);
      aiConfigManager.setDifficultyForColor('yellow', AIDifficulty.HARD);
      aiConfigManager.setDifficultyForColor('blue', AIDifficulty.MEDIUM);
    }
  }
}
