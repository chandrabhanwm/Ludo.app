/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDecisionInput, AIDecisionResult, AIDecisionStrategy, AIDifficulty } from './types';
import { PlayerColor, Token } from '../types';
import { PLAYER_PATHS, OUTER_TRACK, isSafeCell, getTokenCoordinates } from '../components/Board';
import { TournamentHardStrength } from './hardStrength';

/**
 * Common base or utility function to select a random legal move
 */
export function selectRandomMove(validMoves: string[]): AIDecisionResult {
  if (validMoves.length === 0) {
    throw new Error('Cannot select a move when no valid moves are available.');
  }
  const randomIndex = Math.floor(Math.random() * validMoves.length);
  return {
    tokenId: validMoves[randomIndex],
  };
}

let cacheTokensRef: Token[] | null = null;
let cachePlayerColor: PlayerColor | null = null;

let cacheOurCompleted = 0;
let cacheMaxPos = -1;
let cacheActiveOpponents: { playerColor: PlayerColor; position: number; trackIdx: number }[] = [];
let cacheOpponentBlockades: Record<number, boolean> = {};

function rebuildCache(tokens: Token[], playerColor: PlayerColor, getTrackIndex: (color: PlayerColor, pos: number) => number) {
  cacheTokensRef = tokens;
  cachePlayerColor = playerColor;

  // 1. Completed count of our tokens at position 56
  cacheOurCompleted = tokens.filter(t => t.playerColor === playerColor && t.position === 56).length;

  // 2. Active positions of our tokens to find leading position (maxPos)
  const activePositions: number[] = [];
  tokens.forEach(t => {
    if (t.playerColor === playerColor && t.position !== 'yard' && t.position < 56) {
      activePositions.push(t.position as number);
    }
  });
  cacheMaxPos = activePositions.length > 0 ? Math.max(...activePositions) : -1;

  // 3. Active opponents on track
  cacheActiveOpponents = [];
  const opponentCountsByTrackIdx: Record<number, Record<string, number>> = {};

  tokens.forEach(t => {
    if (t.playerColor === playerColor || t.position === 'yard' || t.position >= 51) return;
    const posNum = t.position as number;
    const trackIdx = getTrackIndex(t.playerColor, posNum);
    cacheActiveOpponents.push({
      playerColor: t.playerColor,
      position: posNum,
      trackIdx
    });

    if (!opponentCountsByTrackIdx[trackIdx]) {
      opponentCountsByTrackIdx[trackIdx] = {};
    }
    opponentCountsByTrackIdx[trackIdx][t.playerColor] = (opponentCountsByTrackIdx[trackIdx][t.playerColor] || 0) + 1;
  });

  // 4. Opponent blockades
  cacheOpponentBlockades = {};
  Object.entries(opponentCountsByTrackIdx).forEach(([trackIdxStr, colorsMap]) => {
    const trackIdx = parseInt(trackIdxStr, 10);
    const hasBlockade = Object.values(colorsMap).some(count => count >= 2);
    if (hasBlockade) {
      cacheOpponentBlockades[trackIdx] = true;
    }
  });
}

/**
 * Evaluates a specific valid move and assigns a numeric score based on tactical and strategic value.
 * Higher scores represent more favorable moves.
 */
export function evaluateMove(
  tokenId: string,
  diceValue: number,
  playerColor: PlayerColor,
  tokens: Token[],
  difficulty?: AIDifficulty
): number {
  const token = tokens.find(t => t.id === tokenId);
  if (!token) return 0;

  let score = 0;

  // Master tactical scaling based on TournamentHardStrength (only for HARD difficulty)
  let mCapture = 1.0;
  let mEscapeDanger = 1.0;
  let mDangerAvoidance = 1.0;
  let mBlockade = 1.0;
  let mSafeSquare = 1.0;
  let mProgress = 1.0;
  let mBreakSafe = 1.0;
  let mHomeStretch = 1.0;
  let mWinGame = 1.0;

  if (difficulty === AIDifficulty.HARD) {
    const dt = (TournamentHardStrength - 100) / 100;
    mCapture = 1.0 + 2.5 * dt;
    mEscapeDanger = 1.0 + 2.0 * dt;
    mDangerAvoidance = 1.0 + 1.2 * dt; // Kept reasonable to prevent timidity
    mBlockade = 1.0 + 1.5 * dt;
    mSafeSquare = 1.0 + 1.0 * dt;
    mProgress = 1.0 + 0.5 * dt;        // Increase progress slightly to maintain forward momentum
    mBreakSafe = 1.0 + 2.0 * dt;
    mHomeStretch = 1.0 + 1.2 * dt;
    mWinGame = 1.0 + 0.5 * dt;
  }

  // Determine positions
  const startPos = token.position;
  const isYard = startPos === 'yard';
  const startPosNum = isYard ? -1 : (startPos as number);
  const nextPos = isYard ? 0 : startPosNum + diceValue;

  // If nextPos exceeds the goal (56), this is invalid but getValidTokenMoves should already prevent it.
  if (nextPos > 56) return -9999;

  // Helper track index function to get circular track index (0-51)
  const getTrackIndex = (color: PlayerColor, pos: number): number => {
    return (PLAYER_PATHS[color].startIndex + pos) % 52;
  };

  // Rebuild board parsing cache if tokens array reference or active color changed
  if (tokens !== cacheTokensRef || playerColor !== cachePlayerColor) {
    rebuildCache(tokens, playerColor, getTrackIndex);
  }

  const SAFE_TRACK_INDICES = [1, 9, 14, 22, 27, 35, 40, 48];

  // Safety checks using track indices (completely avoiding coordinate lookups)
  const isCurrentSafe = isYard || (startPosNum >= 51) || SAFE_TRACK_INDICES.includes(getTrackIndex(playerColor, startPosNum));
  const isNextSafe = (nextPos >= 51) || SAFE_TRACK_INDICES.includes(getTrackIndex(playerColor, nextPos));

  // --- SCORE FACTOR 1: Winning the game ---
  if (nextPos === 56) {
    if (cacheOurCompleted === 3) {
      score += 100000 * mWinGame; // Win the game (Ultimate Priority)
    } else {
      // --- SCORE FACTOR 2: Reach Home ---
      score += 20000 * mWinGame; // Reach Home (Very High)
    }
  }

  // --- SCORE FACTOR 6: Entering/Progressing inside home stretch ---
  if (!isYard && startPosNum < 51 && nextPos >= 51 && nextPos < 56) {
    score += 2000 * mHomeStretch; // Enter Home Stretch (Medium)
  }
  // Progress inside safe home stretch
  if (!isYard && startPosNum >= 51 && nextPos < 56) {
    score += (nextPos - startPosNum) * 50 * mHomeStretch; // Home stretch progress
  }

  // --- SCORE FACTOR 3: Capturing an opponent ---
  if (nextPos < 51) {
    const ourNextTrackIdx = getTrackIndex(playerColor, nextPos);
    // Find opponents on our destination from precomputed cache
    const opponentsOnDestCount = cacheActiveOpponents.filter(op => op.trackIdx === ourNextTrackIdx).length;

    if (opponentsOnDestCount > 0) {
      if (!SAFE_TRACK_INDICES.includes(ourNextTrackIdx)) {
        // If stacking/blocks are formed, opponent is protected from capture.
        if (opponentsOnDestCount < 2) {
          score += 8000 * mCapture; // Capture an opponent (High)
        }
      }
    }
  }

  // --- SCORE FACTOR 4: Escaping danger ---
  let currentlyInDanger = false;
  const ourCurrentTrackIdx = !isYard && startPosNum < 51 ? getTrackIndex(playerColor, startPosNum) : -1;
  if (!isYard && startPosNum < 51 && !SAFE_TRACK_INDICES.includes(ourCurrentTrackIdx)) {
    // Check if any active opponent is behind us within rolling range (1 to 6 steps) using cache
    const anyOpponentCanCapture = cacheActiveOpponents.some(op => {
      const dist = (ourCurrentTrackIdx - op.trackIdx + 52) % 52;
      return dist >= 1 && dist <= 6;
    });
    
    if (anyOpponentCanCapture) {
      currentlyInDanger = true;
    }
  }

  let nextInDanger = false;
  const ourNextTrackIdx = nextPos < 51 ? getTrackIndex(playerColor, nextPos) : -1;
  if (nextPos < 51 && !SAFE_TRACK_INDICES.includes(ourNextTrackIdx)) {
    // Check if any active opponent is behind our destination cell within rolling range (1 to 6 steps) using cache
    const anyOpponentCanCaptureNext = cacheActiveOpponents.some(op => {
      const dist = (ourNextTrackIdx - op.trackIdx + 52) % 52;
      return dist >= 1 && dist <= 6;
    });
    
    if (anyOpponentCanCaptureNext) {
      nextInDanger = true;
    }
  }

  if (currentlyInDanger && !nextInDanger) {
    score += 5000 * mEscapeDanger; // Escape immediate danger (High)
  }

  // --- SCORE FACTOR 5: Landing on a safe square ---
  if (isNextSafe) {
    score += 1200 * mSafeSquare; // Land on a Safe Square (Medium)
  }

  // --- SCORE FACTOR 8: Bringing a new token out of Yard ---
  if (isYard) {
    score += 1000 * mSafeSquare; // Bring a new token out of Yard (Medium)
  }

  // --- SCORE FACTOR 11: Advance the leading token ---
  if (!isYard && startPosNum === cacheMaxPos) {
    score += (150 + startPosNum * 0.5) * mProgress; // Advance the leading token (Low)
  }

  // --- SCORE FACTOR 9: Creating a blockade (stacking with own token) ---
  if (nextPos < 51) {
    const ourTokensOnDest = tokens.filter(t => {
      if (t.id === token.id || t.playerColor !== playerColor || t.position === 'yard' || t.position >= 51) return false;
      return t.position === nextPos;
    });
    if (ourTokensOnDest.length > 0) {
      score += 500 * mBlockade; // Create a Blockade (Low-Medium)
    }
  }

  // --- SCORE FACTOR 10: Breaking/Bypassing an opponent blockade ---
  if (!isYard && startPosNum < 51) {
    const ourCurrentTrackIdxVal = ourCurrentTrackIdx;
    const ourNextTrackIdxVal = ourNextTrackIdx;

    // Check if our move bypasses an opponent blockade
    Object.keys(cacheOpponentBlockades).forEach(trackIdxStr => {
      const blockadeTrackIdx = parseInt(trackIdxStr, 10);
      const distToBlockade = (blockadeTrackIdx - ourCurrentTrackIdxVal + 52) % 52;
      if (distToBlockade >= 1 && distToBlockade <= 12) {
        const nextDistToBlockade = ourNextTrackIdxVal !== -1 ? (blockadeTrackIdx - ourNextTrackIdxVal + 52) % 52 : 0;
        const passed = nextPos >= 51 || (nextDistToBlockade > distToBlockade || nextDistToBlockade === 0);
        if (passed) {
          score += 300 * mBlockade; // Break/bypass opponent blockade (Low-Medium)
        }
      }
    });
  }

  // --- SCORE FACTOR 5 (Danger Penalty): Moving into immediate danger ---
  if (nextInDanger) {
    score += -4000 * mDangerAvoidance; // Avoid moving into danger (Strong Negative)
  }

  // --- SCORE FACTOR 11 (Break Safe Penalty): Breaking your own safe formation unnecessarily ---
  const isStackedCurrently = tokens.some(t => {
    if (t.id === token.id || t.playerColor !== playerColor || t.position === 'yard' || t.position >= 51) return false;
    return t.position === startPosNum;
  });

  const isCurrentSafeFormation = isCurrentSafe || isStackedCurrently;
  
  const isNextStacked = tokens.some(t => {
    if (t.id === token.id || t.playerColor !== playerColor || t.position === 'yard' || t.position >= 51) return false;
    return t.position === nextPos;
  });
  const isNextSafeFormation = isNextSafe || isNextStacked;

  if (isCurrentSafeFormation && !isNextSafeFormation) {
    score += -300 * mBreakSafe; // Break own safe formation unnecessarily (Low-Medium Penalty)
  }

  // --- SCORE FACTOR 12: General forward progress ---
  if (!isYard) {
    score += startPosNum * 2 * mProgress; // General forward progress (Low)
  }

  return score;
}

/**
 * Core function that ranks moves, scores them, and makes a selection based on difficulty distributions.
 */
function selectScoredMove(input: AIDecisionInput, probabilityBest: number, probabilitySecond: number): AIDecisionResult {
  const scoredMoves = input.validMoves.map(tokenId => {
    const score = evaluateMove(tokenId, input.diceValue, input.playerColor, input.tokens, input.difficulty);
    return { tokenId, score };
  });

  // Sort descending by score
  scoredMoves.sort((a, b) => b.score - a.score);

  if (scoredMoves.length === 0) {
    throw new Error('Cannot select a move when no valid moves are available.');
  }

  if (scoredMoves.length === 1) {
    return { tokenId: scoredMoves[0].tokenId };
  }

  const r = Math.random();
  if (r < probabilityBest) {
    return { tokenId: scoredMoves[0].tokenId };
  } else if (r < probabilityBest + probabilitySecond) {
    return { tokenId: scoredMoves[1].tokenId };
  } else {
    // Choose random from all moves
    const randomIndex = Math.floor(Math.random() * scoredMoves.length);
    return { tokenId: scoredMoves[randomIndex].tokenId };
  }
}

/**
 * Easy AI Strategy:
 * Choose the best move approximately 65% of the time.
 * Choose the second-best move approximately 20% of the time.
 * Choose a random legal move approximately 15% of the time.
 */
export class EasyStrategy implements AIDecisionStrategy {
  public chooseMove(input: AIDecisionInput): AIDecisionResult {
    return selectScoredMove(input, 0.65, 0.20);
  }
}

/**
 * Medium AI Strategy:
 * Choose the best move approximately 90% of the time.
 * Choose the second-best move approximately 10% of the time.
 */
export class MediumStrategy implements AIDecisionStrategy {
  public chooseMove(input: AIDecisionInput): AIDecisionResult {
    return selectScoredMove(input, 0.90, 0.10);
  }
}

/**
 * Hard AI Strategy:
 * Always choose the highest-scoring move.
 */
export class HardStrategy implements AIDecisionStrategy {
  public chooseMove(input: AIDecisionInput): AIDecisionResult {
    return selectScoredMove(input, 1.0, 0.0);
  }
}

/**
 * Factory function to retrieve the appropriate strategy for a given difficulty
 */
export function getStrategyForDifficulty(difficulty: AIDifficulty): AIDecisionStrategy {
  switch (difficulty) {
    case AIDifficulty.EASY:
      return new EasyStrategy();
    case AIDifficulty.MEDIUM:
      return new MediumStrategy();
    case AIDifficulty.HARD:
      return new HardStrategy();
    default:
      return new EasyStrategy();
  }
}
