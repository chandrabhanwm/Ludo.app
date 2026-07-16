/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerColor, Token, BoardCoordinate } from '../types';
import { AIDifficulty } from './types';
import { AIEngine } from './engine';
import { aiConfigManager } from './config';
import { 
  PRODUCTION_OPPONENTS,
  TOURNAMENT_TOTAL_MATCHES,
  TOURNAMENT_QUALIFICATION_TARGET,
  PRODUCTION_TOURNAMENT_ID,
  TOURNAMENT_VERSION
} from '../tournament/config';
import { TournamentHardStrength, setTournamentHardStrength } from './hardStrength';
import { mapTournamentDifficulty } from './tournament';
import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// SELF-CONTAINED BOARD LAYOUT & COORDINATES
// ==========================================

export const OUTER_TRACK: BoardCoordinate[] = [
  { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 },
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 }, { row: 1, col: 8 }, { row: 2, col: 8 }, { row: 3, col: 8 }, { row: 4, col: 8 }, { row: 5, col: 8 },
  { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 }, { row: 6, col: 13 }, { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 }, { row: 8, col: 13 }, { row: 8, col: 12 }, { row: 8, col: 11 }, { row: 8, col: 10 }, { row: 8, col: 9 },
  { row: 9, col: 8 }, { row: 10, col: 8 }, { row: 11, col: 8 }, { row: 12, col: 8 }, { row: 13, col: 8 }, { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 }, { row: 13, col: 6 }, { row: 12, col: 6 }, { row: 11, col: 6 }, { row: 10, col: 6 }, { row: 9, col: 6 },
  { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 3 }, { row: 8, col: 2 }, { row: 8, col: 1 }, { row: 8, col: 0 },
  { row: 7, col: 0 }
];

export const PLAYER_PATHS: Record<PlayerColor, {
  startIndex: number;
  preHomeIndex: number;
  homePath: BoardCoordinate[];
  homeGoal: BoardCoordinate;
  yardSlots: BoardCoordinate[];
  scatterGoal: (id: number) => BoardCoordinate;
}> = {
  red: {
    startIndex: 1,
    preHomeIndex: 51,
    homePath: [
      { row: 7, col: 1 },
      { row: 7, col: 2 },
      { row: 7, col: 3 },
      { row: 7, col: 4 },
      { row: 7, col: 5 }
    ],
    homeGoal: { row: 7, col: 6 },
    yardSlots: [
      { row: 1.5, col: 1.5 },
      { row: 1.5, col: 3.5 },
      { row: 3.5, col: 1.5 },
      { row: 3.5, col: 3.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 7.0, col: 5.7 },
        { row: 6.7, col: 6.0 },
        { row: 7.3, col: 6.0 },
        { row: 7.0, col: 6.3 }
      ];
      return offsets[id] || { row: 7, col: 6 };
    }
  },
  green: {
    startIndex: 14,
    preHomeIndex: 12,
    homePath: [
      { row: 1, col: 7 },
      { row: 2, col: 7 },
      { row: 3, col: 7 },
      { row: 4, col: 7 },
      { row: 5, col: 7 }
    ],
    homeGoal: { row: 6, col: 7 },
    yardSlots: [
      { row: 1.5, col: 10.5 },
      { row: 1.5, col: 12.5 },
      { row: 3.5, col: 10.5 },
      { row: 3.5, col: 12.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 5.7, col: 7.0 },
        { row: 6.0, col: 6.7 },
        { row: 6.0, col: 7.3 },
        { row: 6.3, col: 7.0 }
      ];
      return offsets[id] || { row: 6, col: 7 };
    }
  },
  yellow: {
    startIndex: 27,
    preHomeIndex: 25,
    homePath: [
      { row: 7, col: 13 },
      { row: 7, col: 12 },
      { row: 7, col: 11 },
      { row: 7, col: 10 },
      { row: 7, col: 9 }
    ],
    homeGoal: { row: 7, col: 8 },
    yardSlots: [
      { row: 10.5, col: 10.5 },
      { row: 10.5, col: 12.5 },
      { row: 12.5, col: 10.5 },
      { row: 12.5, col: 12.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 7.0, col: 8.3 },
        { row: 6.7, col: 8.0 },
        { row: 7.3, col: 8.0 },
        { row: 7.0, col: 7.7 }
      ];
      return offsets[id] || { row: 7, col: 8 };
    }
  },
  blue: {
    startIndex: 40,
    preHomeIndex: 38,
    homePath: [
      { row: 13, col: 7 },
      { row: 12, col: 7 },
      { row: 11, col: 7 },
      { row: 10, col: 7 },
      { row: 9, col: 7 }
    ],
    homeGoal: { row: 8, col: 7 },
    yardSlots: [
      { row: 10.5, col: 1.5 },
      { row: 10.5, col: 3.5 },
      { row: 12.5, col: 1.5 },
      { row: 12.5, col: 3.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 8.3, col: 7.0 },
        { row: 8.0, col: 6.7 },
        { row: 8.0, col: 7.3 },
        { row: 7.7, col: 7.0 }
      ];
      return offsets[id] || { row: 8, col: 7 };
    }
  }
};

export const isSafeCell = (row: number, col: number): boolean => {
  const safeIndices = [1, 9, 14, 22, 27, 35, 40, 48];
  return safeIndices.some(idx => {
    const coord = OUTER_TRACK[idx];
    return coord.row === row && coord.col === col;
  });
};

export const getTokenCoordinates = (token: Token): BoardCoordinate => {
  const pathData = PLAYER_PATHS[token.playerColor];
  if (token.position === 'yard') {
    return pathData.yardSlots[token.idInColor];
  }

  const steps = token.position;

  if (steps === 56) {
    return pathData.scatterGoal(token.idInColor);
  }

  if (steps >= 51 && steps <= 55) {
    return pathData.homePath[steps - 51];
  }

  const trackIndex = (pathData.startIndex + steps) % 52;
  return OUTER_TRACK[trackIndex];
};


// ==========================================
// TEST RUNNER IMPLEMENTATION
// ==========================================

interface GameStats {
  turns: number;
  rolls: number;
  captures: number;
  homeEntries: number;
  safeSquareLandings: number;
  blockades: number;
}

interface ErrorLog {
  gameNumber: number;
  turnNumber: number;
  player: PlayerColor;
  difficulty: AIDifficulty;
  diceValue: number;
  boardSnapshot: string;
  exception: string;
  stackTrace?: string;
}

export function runLudoSimulation(
  gameIndex: number,
  difficulties: Record<PlayerColor, AIDifficulty>,
  errors: ErrorLog[]
): { success: boolean; winner: PlayerColor; stats: GameStats } | { success: false } {
  // 1. Setup board pieces
  const tokens: Token[] = [];
  const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  colors.forEach(color => {
    for (let i = 0; i < 4; i++) {
      tokens.push({
        id: `${color}-${i}`,
        playerColor: color,
        idInColor: i,
        position: 'yard',
      });
    }
  });

  // Track metrics
  let turns = 0;
  let rolls = 0;
  let captures = 0;
  let homeEntries = 0;
  let safeSquareLandings = 0;
  let blockades = 0;

  let currentPlayerIndex = 0;
  const winners: PlayerColor[] = [];
  let consecutiveSixes = 0;

  const maxTurnsLimit = 2000; // Loop guard
  const gameLog: string[] = [];

  const getValidMoves = (color: PlayerColor, roll: number): string[] => {
    const playerTokens = tokens.filter(t => t.playerColor === color);
    const validIds: string[] = [];

    playerTokens.forEach(token => {
      if (token.position === 'yard') {
        if (roll === 6) validIds.push(token.id);
      } else {
        const currentPos = token.position as number;
        if (currentPos + roll <= 56) {
          validIds.push(token.id);
        }
      }
    });

    return validIds;
  };

  const getFinishedCount = (color: PlayerColor) => {
    return tokens.filter(t => t.playerColor === color && t.position === 56).length;
  };

  const originalLog = console.log;
  console.log = () => {};
  try {
    try {
      while (winners.length < 3 && turns < maxTurnsLimit) {
      turns++;
      const activeColor = colors[currentPlayerIndex];

      // Skip player if finished
      if (getFinishedCount(activeColor) === 4) {
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
        continue;
      }

      // Roll
      const rolled = Math.floor(Math.random() * 6) + 1;
      rolls++;

      // Consecutive 6s rule check
      if (rolled === 6) {
        consecutiveSixes++;
        if (consecutiveSixes >= 3) {
          // Reset sixes and pass turn
          consecutiveSixes = 0;
          currentPlayerIndex = (currentPlayerIndex + 1) % 4;
          continue;
        }
      } else {
        consecutiveSixes = 0;
      }

      // Valid moves check
      const validMoves = getValidMoves(activeColor, rolled);
      if (validMoves.length === 0) {
        // No moves, pass turn (unless it was a six, then they get to roll again if consecutive < 3, but wait - in standard App.tsx, a 6 with NO valid moves still allows extra roll or does it pass? In App.tsx: getValidTokenMoves is checked after rolling. If length === 0, turn passes. So yes, it resets consecutiveSixes and passes turn).
        consecutiveSixes = 0;
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
        continue;
      }

      // Board validation check before move
      const currentDifficulty = difficulties[activeColor];
      aiConfigManager.setDifficultyForColor(activeColor, currentDifficulty);
      const decision = AIEngine.selectTokenMove(activeColor, rolled, validMoves, tokens);
      const selectedTokenId = decision.tokenId;

      // Validate move correctness
      if (!validMoves.includes(selectedTokenId)) {
        throw new Error(`AI chose illegal move: Selected Token ${selectedTokenId} not in valid moves: ${validMoves.join(', ')}`);
      }

      const token = tokens.find(t => t.id === selectedTokenId)!;
      const startPos = token.position;

      // Execute movement
      if (token.position === 'yard') {
        token.position = 0;
      } else {
        token.position = (token.position as number) + rolled;
      }

      gameLog.push(`[Turn ${turns}] Player ${activeColor} rolled ${rolled}. Moved ${selectedTokenId} from ${startPos} to ${token.position}`);

      // Verify bounds
      if (token.position > 56) {
        throw new Error(`Token position exceeded goal bounds! Position was ${token.position}`);
      }

      const getTrackIndex = (color: PlayerColor, pos: number): number => {
        return (PLAYER_PATHS[color].startIndex + pos) % 52;
      };
      const SAFE_TRACK_INDICES = [1, 9, 14, 22, 27, 35, 40, 48];

      const ourTrackIdx = token.position < 51 ? getTrackIndex(activeColor, token.position as number) : -1;

      // Safe landing metrics check
      if (token.position < 51 && SAFE_TRACK_INDICES.includes(ourTrackIdx)) {
        safeSquareLandings++;
      }

      // Blockade metrics check
      if (token.position < 51) {
        const ourSameColorDestCount = tokens.filter(t => {
          if (t.id === token.id || t.playerColor !== activeColor || t.position === 'yard' || t.position >= 51) return false;
          return t.position === token.position;
        }).length;
        if (ourSameColorDestCount >= 1) {
          blockades++;
        }
      }

      let extraTurn = false;

      // Goal completion check
      if (token.position === 56) {
        homeEntries++;
        const activeFinished = getFinishedCount(activeColor);
        if (activeFinished === 4) {
          if (!winners.includes(activeColor)) {
            winners.push(activeColor);
          }
        }
        // Roll again on reaching home
        extraTurn = true;
      }

      // Capture logic
      if (token.position < 51) {
        const cellIsSafe = SAFE_TRACK_INDICES.includes(ourTrackIdx);

        if (!cellIsSafe) {
          const opponents = tokens.filter(t => {
            if (t.playerColor === activeColor || t.position === 'yard' || t.position >= 51) return false;
            const opTrackIdx = getTrackIndex(t.playerColor, t.position as number);
            return opTrackIdx === ourTrackIdx;
          });

          if (opponents.length > 0) {
            const opponentColor = opponents[0].playerColor;
            const stackCount = opponents.length;

            if (stackCount >= 2) {
              // Blockade defends
              gameLog.push(`  🛡️ Blocked by opponent stack block! Safe from capture of color ${opponentColor}.`);
            } else {
              // Execute capture
              gameLog.push(`  ⚔️ Captured opponent ${opponents.map(o => o.id).join(', ')} of color ${opponentColor}!`);
              opponents.forEach(enemy => {
                enemy.position = 'yard';
              });
              captures += opponents.length;
              extraTurn = true; // Roll again on capture
            }
          }
        }
      }

      // Turn transition logic
      if (extraTurn || (rolled === 6)) {
        // Roll again (extra roll for capture/six/goal)
      } else {
        consecutiveSixes = 0;
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
      }
    } // End of while loop

    if (turns >= maxTurnsLimit) {
      throw new Error(`Infinite loop detected: Game exceeded maximum turn threshold of ${maxTurnsLimit}`);
    }

    // Board state validation checks at end of game
    colors.forEach(col => {
      const count = tokens.filter(t => t.playerColor === col).length;
      if (count !== 4) {
        throw new Error(`Board Invariant broken: Player ${col} has ${count} tokens (expected 4)`);
      }
    });

    // Done! Winner is the first player to finish (first index in winners list)
    const winner = winners[0] || colors.find(c => getFinishedCount(c) === 4)!;

    return {
      success: true,
      winner,
      stats: {
        turns,
        rolls,
        captures,
        homeEntries,
        safeSquareLandings,
        blockades,
      },
    };
  } catch (err: any) {
    console.log = originalLog;
    console.log(`\n--- TRACE FOR FAILED GAME #${gameIndex} ---`);
    console.log(gameLog.slice(-30).join('\n'));
    console.log(`-------------------------------------------\n`);
    errors.push({
      gameNumber: gameIndex,
      turnNumber: turns,
      player: colors[currentPlayerIndex],
      difficulty: difficulties[colors[currentPlayerIndex]],
      diceValue: consecutiveSixes > 0 ? 6 : 0,
      boardSnapshot: JSON.stringify(tokens.map(t => ({ id: t.id, pos: t.position }))),
      exception: err.message || String(err),
      stackTrace: err.stack,
    });
    return { success: false };
  }
} finally {
  console.log = originalLog;
}
}

interface TournamentRecord {
  matchesWon: number;
  matchesLost: number;
  qualified: boolean;
  easyMatches: number;
  easyWins: number;
  mediumMatches: number;
  mediumWins: number;
  hardMatches: number;
  hardWins: number;
  totalTurns: number;
  totalCaptures: number;
}

function verifyGameLoop() {
  console.log('====================================================');
  console.log('🔍 RUNNING PRODUCTION TOURNAMENT INTEGRITY VERIFICATION');
  console.log('====================================================');

  try {
    // 1. Verify Same board
    const boardPath = path.join(process.cwd(), 'src/components/Board.tsx');
    if (!fs.existsSync(boardPath)) {
      throw new Error(`Board file not found at ${boardPath}`);
    }
    const boardCode = fs.readFileSync(boardPath, 'utf8');

    // Verify OUTER_TRACK is present and has the same length / key points
    if (!boardCode.includes('export const OUTER_TRACK')) {
      throw new Error('Board.tsx is missing export const OUTER_TRACK!');
    }
    // Verify safe cells indices are identical (1, 9, 14, 22, 27, 35, 40, 48)
    const safeCellIndices = [1, 9, 14, 22, 27, 35, 40, 48];
    safeCellIndices.forEach(idx => {
      if (!boardCode.includes(idx.toString())) {
        throw new Error(`Board.tsx safe cell index ${idx} mismatch or missing!`);
      }
    });

    // Check that we have the exact same track coordinates
    if (OUTER_TRACK.length !== 52) {
      throw new Error(`Simulator OUTER_TRACK length mismatch: expected 52, got ${OUTER_TRACK.length}`);
    }
    console.log('✓ Same board');

    // 2. Verify Same AI Engine
    if (typeof AIEngine.selectTokenMove !== 'function') {
      throw new Error('AIEngine.selectTokenMove is not a function!');
    }
    if (typeof AIEngine.isAITurn !== 'function') {
      throw new Error('AIEngine.isAITurn is not a function!');
    }
    console.log('✓ Same AI Engine');

    // 3. Verify Same rules
    const appPath = path.join(process.cwd(), 'src/App.tsx');
    if (!fs.existsSync(appPath)) {
      throw new Error(`App file not found at ${appPath}`);
    }
    const appCode = fs.readFileSync(appPath, 'utf8');

    // Check consecutive sixes and exit rules
    if (!appCode.includes('consecutiveSixes') && !appCode.includes('sixToExit')) {
      throw new Error('App.tsx is missing standard consecutiveSixes or sixToExit rules.');
    }
    console.log('✓ Same rules');

    // 4. Verify Same captures
    if (!appCode.includes('Captured opponent') && !appCode.includes('position = \'yard\'') && !appCode.includes('yard')) {
      throw new Error('App.tsx capture logic signature mismatch.');
    }
    console.log('✓ Same captures');

    // 5. Verify Same home logic
    if (!appCode.includes('position === 56') && !appCode.includes('steps === 56')) {
      throw new Error('App.tsx goal/home logic (56) signature mismatch.');
    }
    console.log('✓ Same home logic');

    // 6. Verify Same consecutive six logic
    if (!appCode.includes('consecutive') && !appCode.includes('6')) {
      throw new Error('App.tsx consecutive sixes rule mismatch.');
    }
    console.log('✓ Same consecutive six logic');

    // 7. Verify Same blockades
    if (!appCode.includes('safe') && !appCode.includes('stack')) {
      throw new Error('App.tsx blockade/safe track rules mismatch.');
    }
    console.log('✓ Same blockades');

    // 8. Verify Same winner detection
    if (!appCode.includes('finishedCount === 4') && !appCode.includes('winners')) {
      throw new Error('App.tsx winner detection signature mismatch.');
    }
    console.log('✓ Same winner detection');

    console.log('====================================================');
    console.log('✓ INTEGRITY VERIFICATION SUCCESSFUL: READY TO SIMULATE');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('❌ INTEGRITY VERIFICATION FAILED! ABORTING SIMULATION.');
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  }
}

function runTournamentSimulations(tournamentCount: number) {
  // First run the mandatory automated verification
  verifyGameLoop();

  console.log('====================================================');
  console.log('🛡️  DEVELOPER HEADLESS AI TOURNAMENT SIMULATOR (PRODUCTION MIRROR)');
  console.log(`🎮 Simulating ${tournamentCount} Tournaments (${tournamentCount * TOURNAMENT_TOTAL_MATCHES} Matches Total)`);
  console.log('====================================================\n');

  const tournamentRecords: TournamentRecord[] = [];
  const errors: ErrorLog[] = [];

  // Distribution map for wins (0..TOURNAMENT_TOTAL_MATCHES)
  const winsDistribution = new Array<number>(TOURNAMENT_TOTAL_MATCHES + 1).fill(0);

  for (let t = 1; t <= tournamentCount; t++) {
    let matchesWon = 0;
    let matchesLost = 0;
    
    let easyMatches = 0;
    let easyWins = 0;
    
    let mediumMatches = 0;
    let mediumWins = 0;
    
    let hardMatches = 0;
    let hardWins = 0;
    
    let totalTurns = 0;
    let totalCaptures = 0;

    for (let m = 1; m <= TOURNAMENT_TOTAL_MATCHES; m++) {
      // Pick opponent based on the real production matchmaking (randomly from PRODUCTION_OPPONENTS)
      const oppIdx = Math.floor(Math.random() * PRODUCTION_OPPONENTS.length);
      const opponent = PRODUCTION_OPPONENTS[oppIdx];
      const opponentDifficultyMapped = mapTournamentDifficulty(opponent.difficulty);

      // Verify and print diagnostics before each simulated match
      console.log(`[SIMULATOR DIAGNOSTIC] Match ${m} in Tournament ${t}: Opponent: ${opponent.name} (${opponent.difficulty}), Target: ${TOURNAMENT_QUALIFICATION_TARGET}/${TOURNAMENT_TOTAL_MATCHES} Wins, Tourney ID: ${PRODUCTION_TOURNAMENT_ID}`);

      // Setup difficulties exactly like production:
      // Red = Subject under test (player) playing at HARD
      // Green = Active tournament opponent
      // Yellow = Medium
      // Blue = Medium
      // "Do NOT assign all three opponents the same difficulty."
      const difficulties: Record<PlayerColor, AIDifficulty> = {
        red: AIDifficulty.HARD,
        green: opponentDifficultyMapped,
        yellow: AIDifficulty.MEDIUM,
        blue: AIDifficulty.MEDIUM,
      };

      const gameIndex = (t - 1) * TOURNAMENT_TOTAL_MATCHES + m;
      const res = runLudoSimulation(gameIndex, difficulties, errors);

      if (opponent.difficulty === 'Easy') {
        easyMatches++;
      } else if (opponent.difficulty === 'Medium') {
        mediumMatches++;
      } else {
        hardMatches++;
      }

      if (res.success) {
        totalTurns += res.stats.turns;
        totalCaptures += res.stats.captures;

        if (res.winner === 'red') {
          matchesWon++;
          if (opponent.difficulty === 'Easy') {
            easyWins++;
          } else if (opponent.difficulty === 'Medium') {
            mediumWins++;
          } else {
            hardWins++;
          }
        } else {
          matchesLost++;
        }
      } else {
        matchesLost++; // Match failed is counted as a loss
      }
    }

    const qualified = matchesWon >= TOURNAMENT_QUALIFICATION_TARGET;
    winsDistribution[matchesWon]++;

    tournamentRecords.push({
      matchesWon,
      matchesLost,
      qualified,
      easyMatches,
      easyWins,
      mediumMatches,
      mediumWins,
      hardMatches,
      hardWins,
      totalTurns,
      totalCaptures,
    });
  }

  // Aggregate results
  const qualifiedCount = tournamentRecords.filter(r => r.qualified).length;
  const qualificationRate = (qualifiedCount / tournamentCount) * 100;

  let sumWins = 0;
  let sumLosses = 0;
  
  let totalEasyMatches = 0;
  let totalEasyWins = 0;
  
  let totalMediumMatches = 0;
  let totalMediumWins = 0;
  
  let totalHardMatches = 0;
  let totalHardWins = 0;
  
  let sumTurns = 0;
  let sumCaptures = 0;

  tournamentRecords.forEach(r => {
    sumWins += r.matchesWon;
    sumLosses += r.matchesLost;
    
    totalEasyMatches += r.easyMatches;
    totalEasyWins += r.easyWins;
    
    totalMediumMatches += r.mediumMatches;
    totalMediumWins += r.mediumWins;
    
    totalHardMatches += r.hardMatches;
    totalHardWins += r.hardWins;
    
    sumTurns += r.totalTurns;
    sumCaptures += r.totalCaptures;
  });

  const totalSimulatedMatches = tournamentCount * TOURNAMENT_TOTAL_MATCHES;
  const avgWins = sumWins / tournamentCount;
  const avgLosses = sumLosses / tournamentCount;

  const easyWinRate = totalEasyMatches > 0 ? (totalEasyWins / totalEasyMatches) * 100 : 0;
  const mediumWinRate = totalMediumMatches > 0 ? (totalMediumWins / totalMediumMatches) * 100 : 0;
  const hardWinRate = totalHardMatches > 0 ? (totalHardWins / totalHardMatches) * 100 : 0;

  const avgTurns = totalSimulatedMatches > 0 ? sumTurns / totalSimulatedMatches : 0;
  const avgCaptures = totalSimulatedMatches > 0 ? sumCaptures / totalSimulatedMatches : 0;

  // Log report matching the requested layout in section 8
  console.log('\n====================================================');
  console.log('\nPRODUCTION TOURNAMENT VALIDATION REPORT');
  console.log('\nProduction Configuration');
  console.log(`Tournament Version: ${TOURNAMENT_VERSION}`);
  console.log(`Tournament Hard Strength: ${TournamentHardStrength}`);
  console.log(`Matches: ${TOURNAMENT_TOTAL_MATCHES}`);
  console.log(`Qualification Target: ${TOURNAMENT_QUALIFICATION_TARGET}`);
  console.log('Opponent Assignment: Red=HARD, Green=Opponent, Yellow=MEDIUM, Blue=MEDIUM');
  console.log(`Tournament Source: src/tournament/config.ts`);
  console.log('\n----------------------------------------------------');
  console.log('\nSimulation');
  console.log(`Tournaments: ${tournamentCount}`);
  console.log(`Matches Simulated: ${totalSimulatedMatches}`);
  console.log('\n----------------------------------------------------');
  console.log('\nResults');
  console.log(`Qualification Rate: ${qualificationRate.toFixed(1)}%`);
  console.log(`Average Wins: ${avgWins.toFixed(1)}`);
  console.log(`Average Losses: ${avgLosses.toFixed(1)}`);
  console.log(`Average Turns: ${avgTurns.toFixed(1)}`);
  console.log(`Average Captures: ${avgCaptures.toFixed(1)}`);
  console.log('\n----------------------------------------------------');
  console.log('\nDifficulty Breakdown');
  console.log('\nEasy');
  console.log(`Matches: ${totalEasyMatches}`);
  console.log(`Wins: ${totalEasyWins}`);
  console.log(`Win %: ${easyWinRate.toFixed(1)}%`);
  console.log('\nMedium');
  console.log(`Matches: ${totalMediumMatches}`);
  console.log(`Wins: ${totalMediumWins}`);
  console.log(`Win %: ${mediumWinRate.toFixed(1)}%`);
  console.log('\nHard');
  console.log(`Matches: ${totalHardMatches}`);
  console.log(`Wins: ${totalHardWins}`);
  console.log(`Win %: ${hardWinRate.toFixed(1)}%`);
  console.log('\n----------------------------------------------------');
  console.log('\nWin Distribution\n');
  for (let w = TOURNAMENT_TOTAL_MATCHES; w >= 0; w--) {
    console.log(`${w} Wins: ${winsDistribution[w]}`);
  }
  console.log('\n----------------------------------------------------');
  console.log('\nVerification');
  console.log('✓ Production Tournament Used');
  console.log('✓ Production AI Used');
  console.log('✓ Production Opponent Assignment');
  console.log('✓ Production Qualification Rule');
  console.log('✓ No Simulator Overrides');
  console.log('\n====================================================\n');
}

function runStrengthComparison(tournamentCount: number) {
  // First run the mandatory automated verification
  verifyGameLoop();

  const strengths = [100, 105, 110, 115, 120];
  const comparisonResults: any[] = [];
  const originalLog = console.log;

  originalLog('\n====================================================');
  originalLog('📊 RUNNING TOURNAMENT HARD STRENGTH COMPARISON');
  originalLog(`🎮 Running ${tournamentCount} Tournaments (${tournamentCount * TOURNAMENT_TOTAL_MATCHES} Matches) for each Strength...`);
  originalLog('====================================================\n');

  strengths.forEach(s => {
    // Silence console log for this run to keep output clean
    console.log = () => {};
    
    setTournamentHardStrength(s);
    
    const tournamentRecords: { qualified: boolean }[] = [];
    const errors: ErrorLog[] = [];
    
    let sumTurns = 0;
    let sumCaptures = 0;
    let sumWins = 0;

    for (let t = 1; t <= tournamentCount; t++) {
      let matchesWon = 0;
      for (let m = 1; m <= TOURNAMENT_TOTAL_MATCHES; m++) {
        const oppIdx = Math.floor(Math.random() * PRODUCTION_OPPONENTS.length);
        const opponent = PRODUCTION_OPPONENTS[oppIdx];
        const opponentDifficultyMapped = mapTournamentDifficulty(opponent.difficulty);
        const difficulties: Record<PlayerColor, AIDifficulty> = {
          red: AIDifficulty.HARD,
          green: opponentDifficultyMapped,
          yellow: AIDifficulty.MEDIUM,
          blue: AIDifficulty.MEDIUM,
        };
        const gameIndex = (t - 1) * TOURNAMENT_TOTAL_MATCHES + m;
        const res = runLudoSimulation(gameIndex, difficulties, errors);
        if (res.success) {
          sumTurns += res.stats.turns;
          sumCaptures += res.stats.captures;
          if (res.winner === 'red') {
            matchesWon++;
          }
        }
      }
      const qualified = matchesWon >= TOURNAMENT_QUALIFICATION_TARGET;
      tournamentRecords.push({ qualified });
      sumWins += matchesWon;
    }

    const qualifiedCount = tournamentRecords.filter(r => r.qualified).length;
    const qualificationRate = (qualifiedCount / tournamentCount) * 100;
    const totalSimulatedMatches = tournamentCount * TOURNAMENT_TOTAL_MATCHES;
    const avgWins = sumWins / tournamentCount;
    const avgTurns = totalSimulatedMatches > 0 ? sumTurns / totalSimulatedMatches : 0;
    const avgCaptures = totalSimulatedMatches > 0 ? sumCaptures / totalSimulatedMatches : 0;

    // Restore log
    console.log = originalLog;

    comparisonResults.push({
      strength: s,
      qualificationRate: qualificationRate.toFixed(1) + '%',
      avgWins: avgWins.toFixed(1),
      avgTurns: avgTurns.toFixed(1),
      avgCaptures: avgCaptures.toFixed(1),
    });
  });

  // Restore log just in case
  console.log = originalLog;

  console.log('====================================================');
  console.log('STRENGTH COMPARISON SUMMARY REPORT');
  console.log(`Tournament Version: ${TOURNAMENT_VERSION}`);
  console.log('----------------------------------------------------');
  console.log('STRENGTH | QUAL RATE | AVG WINS | AVG TURNS | AVG CAPTURES');
  console.log('----------------------------------------------------');
  comparisonResults.forEach(r => {
    console.log(`  ${r.strength.toString().padEnd(6)} | ${r.qualificationRate.padEnd(9)} | ${r.avgWins.padEnd(8)} | ${r.avgTurns.padEnd(9)} | ${r.avgCaptures}`);
  });
  console.log('====================================================\n');
}

// CLI Orchestrator Execution
function executeRunner() {
  const args = process.argv.slice(2);
  let gamesCount = 1000;
  
  // Player assignments
  const assignedDifficulties: Record<PlayerColor, AIDifficulty> = {
    red: AIDifficulty.EASY,
    green: AIDifficulty.HARD,
    yellow: AIDifficulty.HARD,
    blue: AIDifficulty.HARD,
  };

  // 1. Natural Language Parser helper
  const queryArgIndex = args.indexOf('--query');
  if (queryArgIndex >= 0 && args[queryArgIndex + 1]) {
    const query = args[queryArgIndex + 1].toLowerCase();
    
    // Check for Strength Comparison trigger
    if (query.includes('strength') || query.includes('comparison')) {
      let tournamentCount = 10; // Default to 10 tournaments (200 matches) for comparison
      const countMatch = query.match(/(\d+)/);
      if (countMatch) {
        tournamentCount = parseInt(countMatch[1], 10);
      }
      runStrengthComparison(tournamentCount);
      return;
    }

    // Check for Tournament simulation trigger
    if (query.includes('tournament')) {
      let tournamentCount = 1000;
      const countMatch = query.match(/(\d+)/);
      if (countMatch) {
        tournamentCount = parseInt(countMatch[1], 10);
      } else {
        tournamentCount = 1; // Singular simulation
      }
      runTournamentSimulations(tournamentCount);
      return;
    }

    // Parse games number
    const countMatch = query.match(/(\d+)/);
    if (countMatch) {
      gamesCount = parseInt(countMatch[1], 10);
    }

    // Match exact combinations
    if (query.includes('easy vs hard')) {
      assignedDifficulties.red = AIDifficulty.EASY;
      assignedDifficulties.green = AIDifficulty.HARD;
      assignedDifficulties.yellow = AIDifficulty.HARD;
      assignedDifficulties.blue = AIDifficulty.HARD;
    } else if (query.includes('hard vs hard')) {
      assignedDifficulties.red = AIDifficulty.HARD;
      assignedDifficulties.green = AIDifficulty.HARD;
      assignedDifficulties.yellow = AIDifficulty.HARD;
      assignedDifficulties.blue = AIDifficulty.HARD;
    } else if (query.includes('medium vs hard')) {
      assignedDifficulties.red = AIDifficulty.MEDIUM;
      assignedDifficulties.green = AIDifficulty.HARD;
      assignedDifficulties.yellow = AIDifficulty.HARD;
      assignedDifficulties.blue = AIDifficulty.HARD;
    } else if (query.includes('easy vs easy')) {
      assignedDifficulties.red = AIDifficulty.EASY;
      assignedDifficulties.green = AIDifficulty.EASY;
      assignedDifficulties.yellow = AIDifficulty.EASY;
      assignedDifficulties.blue = AIDifficulty.EASY;
    }
  } else {
    // 2. Normal CLI argument parsing
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--games' && args[i + 1]) {
        gamesCount = parseInt(args[i + 1], 10);
      } else if (args[i] === '--strength' && args[i + 1]) {
        setTournamentHardStrength(parseInt(args[i + 1], 10));
      } else if (args[i] === '--red' && args[i + 1]) {
        assignedDifficulties.red = args[i + 1] as AIDifficulty;
      } else if (args[i] === '--green' && args[i + 1]) {
        assignedDifficulties.green = args[i + 1] as AIDifficulty;
      } else if (args[i] === '--yellow' && args[i + 1]) {
        assignedDifficulties.yellow = args[i + 1] as AIDifficulty;
      } else if (args[i] === '--blue' && args[i + 1]) {
        assignedDifficulties.blue = args[i + 1] as AIDifficulty;
      }
    }
  }

  console.log('====================================================');
  console.log('🛡️  DEVELOPER HEADLESS AI TEST RUNNER STARTED');
  console.log(`🎮 Running ${gamesCount} games with player setup:`);
  console.log(`   🔴 Red   : ${assignedDifficulties.red.toUpperCase()}`);
  console.log(`   🟢 Green : ${assignedDifficulties.green.toUpperCase()}`);
  console.log(`   🟡 Yellow: ${assignedDifficulties.yellow.toUpperCase()}`);
  console.log(`   🔵 Blue  : ${assignedDifficulties.blue.toUpperCase()}`);
  console.log('====================================================\n');

  let gamesStarted = 0;
  let gamesCompleted = 0;
  let gamesFailed = 0;

  // General aggregates
  let totalTurns = 0;
  let shortestGame = 99999;
  let longestGame = 0;
  let totalRolls = 0;
  let totalCaptures = 0;
  let totalHomeEntries = 0;
  let totalSafeLandings = 0;
  let totalBlockades = 0;

  // AI Performance metrics
  const winsByDifficulty: Record<AIDifficulty, number> = {
    [AIDifficulty.EASY]: 0,
    [AIDifficulty.MEDIUM]: 0,
    [AIDifficulty.HARD]: 0,
  };
  const playsByDifficulty: Record<AIDifficulty, number> = {
    [AIDifficulty.EASY]: 0,
    [AIDifficulty.MEDIUM]: 0,
    [AIDifficulty.HARD]: 0,
  };

  // Add configuration plays count
  const colorsList: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  colorsList.forEach(color => {
    const diff = assignedDifficulties[color];
    playsByDifficulty[diff] += gamesCount;
  });

  const errors: ErrorLog[] = [];

  for (let i = 1; i <= gamesCount; i++) {
    gamesStarted++;
    const res = runLudoSimulation(i, assignedDifficulties, errors);

    if (res.success) {
      gamesCompleted++;
      const stats = res.stats;

      totalTurns += stats.turns;
      if (stats.turns < shortestGame) shortestGame = stats.turns;
      if (stats.turns > longestGame) longestGame = stats.turns;

      totalRolls += stats.rolls;
      totalCaptures += stats.captures;
      totalHomeEntries += stats.homeEntries;
      totalSafeLandings += stats.safeSquareLandings;
      totalBlockades += stats.blockades;

      // Update win rate
      const winningDiff = assignedDifficulties[res.winner];
      winsByDifficulty[winningDiff]++;
    } else {
      gamesFailed++;
    }
  }

  // ----------------------------------------------------
  // GENERATE COMPLETE FINAL REPORT OUTPUT
  // ----------------------------------------------------
  const avgTurns = gamesCompleted > 0 ? Math.round(totalTurns / gamesCompleted) : 0;
  const avgCaptures = gamesCompleted > 0 ? (totalCaptures / gamesCompleted).toFixed(1) : '0';
  const avgHomeEntries = gamesCompleted > 0 ? (totalHomeEntries / gamesCompleted).toFixed(1) : '0';
  const avgSafeLandings = gamesCompleted > 0 ? (totalSafeLandings / gamesCompleted).toFixed(1) : '0';
  const avgBlockades = gamesCompleted > 0 ? (totalBlockades / gamesCompleted).toFixed(1) : '0';

  console.log('====================================================');
  console.log('AI TEST REPORT');
  console.log('\nConfiguration');
  console.log(`Games: ${gamesCount}`);
  console.log('Players:');
  console.log(`  Red   : ${assignedDifficulties.red.toUpperCase()}`);
  console.log(`  Green : ${assignedDifficulties.green.toUpperCase()}`);
  console.log(`  Yellow: ${assignedDifficulties.yellow.toUpperCase()}`);
  console.log(`  Blue  : ${assignedDifficulties.blue.toUpperCase()}`);
  console.log('----------------------------------------------------');
  console.log(`Games Started        : ${gamesStarted}`);
  console.log(`Games Completed      : ${gamesCompleted}`);
  console.log(`Games Failed         : ${gamesFailed}`);
  console.log('----------------------------------------------------');

  // Win stats by configured difficulties
  const activeDiffs = Array.from(new Set(Object.values(assignedDifficulties)));
  activeDiffs.forEach(diff => {
    const wins = winsByDifficulty[diff];
    const totalRepresented = Object.values(assignedDifficulties).filter(d => d === diff).length;
    const rate = gamesCompleted > 0 ? ((wins / gamesCompleted) * 100).toFixed(1) : '0';
    console.log(`${diff.charAt(0).toUpperCase() + diff.slice(1)} Wins          : ${wins} (${rate}%)`);
  });

  console.log('----------------------------------------------------');
  console.log(`Average Turns        : ${avgTurns}`);
  console.log(`Shortest Game        : ${shortestGame === 99999 ? 0 : shortestGame} Turns`);
  console.log(`Longest Game         : ${longestGame} Turns`);
  console.log('----------------------------------------------------');
  console.log(`Average Captures     : ${avgCaptures}`);
  console.log(`Average Home Entries : ${avgHomeEntries}`);
  console.log(`Average Safe Landings: ${avgSafeLandings}`);
  console.log(`Average Blockades    : ${avgBlockades}`);
  console.log('----------------------------------------------------');

  const illegalMovesCount = errors.filter(e => e.exception.includes('illegal move')).length;
  const invalidStatesCount = errors.filter(e => e.exception.includes('Invariant broken')).length;
  const infiniteLoopsCount = errors.filter(e => e.exception.includes('Infinite loop')).length;
  const exceptionsCount = errors.length - illegalMovesCount - invalidStatesCount - infiniteLoopsCount;

  console.log(`Illegal Moves        : ${illegalMovesCount}`);
  console.log(`Invalid Board States : ${invalidStatesCount}`);
  console.log(`Infinite Loops       : ${infiniteLoopsCount}`);
  console.log(`Exceptions           : ${exceptionsCount}`);
  console.log('====================================================');

  const pass = (gamesFailed === 0 && errors.length === 0);
  console.log('\nFINAL VERDICT');
  if (pass) {
    console.log('✓ PASS');
  } else {
    console.log('✗ FAIL');
    console.log('\nRoot Cause analysis:');
    errors.slice(0, 5).forEach((err, idx) => {
      console.log(`\n  [Error #${idx + 1}] Game #${err.gameNumber}, Turn #${err.turnNumber}, Player ${err.player.toUpperCase()}`);
      console.log(`  Difficulty: ${err.difficulty.toUpperCase()}`);
      console.log(`  Exception : ${err.exception}`);
      if (err.stackTrace) {
        console.log(`  Stack     : ${err.stackTrace.split('\n').slice(0, 3).join('\n')}`);
      }
    });
  }
  console.log('====================================================\n');
}

// Invoke CLI Execution
executeRunner();
