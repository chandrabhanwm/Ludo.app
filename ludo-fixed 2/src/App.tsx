/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithGoogle,
  signInAsGuest,
  upgradeGuestToGoogle,
  signOut,
  onAuthChange,
  saveStats,
  saveWallet,
  saveGameHistory,
  savePrestige,
  saveUnlockedRewards,
  updateLeaderboard,
  loadAndSyncUserData,
} from './firebase';
import { auth } from './firebase/config';
import type { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Token, GameRules, GameLog, GameHistoryEntry, PlayerStats, PlayerColor, PlayerType, DiceState, GameStatus } from './types';
import { Board, getTokenCoordinates, isSafeCell } from './components/Board';
import { Dice3D } from './components/Dice3D';
import { GameHUD } from './components/GameHUD';
import { PassPlayDice } from './components/PassPlayDice';
import { OnlineLobby } from './components/OnlineLobby';
import { TableRoom } from './components/TableRoom';
import { TableMode } from './multiplayer/tableConfig';
import { useMultiplayerGame } from './multiplayer/useMultiplayerGame';
import { createGame, saveUserCurrentGame } from './multiplayer/gameSync';
import { MainMenu } from './components/MainMenu';
import { LoginScreen, LockPopup } from './components/LoginScreen';
import { TableSetupModal } from './components/TableSetupModal';
import { StatsDashboard } from './components/StatsDashboard';
import { EndGameScreen } from './components/EndGameScreen';
import { Confetti } from './components/Confetti';
import { ProgressionToasts } from './components/ProgressionToasts';
import confetti from 'canvas-confetti';
import { audio } from './utils/audio';
import { Trophy, HelpCircle, AlertCircle, BookOpen, Volume2, VolumeX, Settings, LogOut, Award, Clock, ArrowLeft, Maximize2, Minimize2, X } from 'lucide-react';
import { AIEngine } from './ai/engine';
import { aiConfigManager } from './ai/config';
import { rewardEngine } from './rewards';
import { TOURNAMENT_TOTAL_MATCHES, TOURNAMENT_QUALIFICATION_TARGET } from './tournament/config';
import { eventBus, ExperienceEventType, experienceEngine } from './experience';
import { prestigeEngine } from './prestige/prestigeEngine';

const DEFAULT_RULES: GameRules = {
  sixToExit: true,
  rollAgainOnSix: true,
  rollAgainOnCapture: true,
  rollAgainOnHome: true,
  stackingEnabled: true,
};

const INITIAL_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalRolls: 0,
  totalSixes: 0,
  totalCaptures: 0,
  totalCaptured: 0,
  totalTokensFinished: 0,
  highestRollStreak: 0,
};

export default function App() {
  // Navigation / screen states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [lockPopup, setLockPopup] = useState<'Tournament' | 'Rewards' | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState<boolean>(true);
  const firebaseUserRef = useRef<User | null>(null); // ref so closures always get latest value

  // Auth state listener — runs on mount
  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setFirebaseUser(user);
      firebaseUserRef.current = user;
      setFirebaseLoading(false);
      if (user) {
        const guest = user.isAnonymous;
        setIsLoggedIn(!guest);
        setIsGuest(guest);
        localStorage.setItem('ludo_is_logged_in', (!guest).toString());
        localStorage.setItem('ludo_is_guest', guest.toString());
        if (user.displayName) {
          localStorage.setItem('ludo_player_name', user.displayName);
        }
        // Returning user — skip login screen, go straight to menu
        setStatus(prev => prev === 'login' ? 'menu' : prev);
        // Load Firestore data → sync to localStorage
        try {
          await loadAndSyncUserData(user.uid);
        } catch (e) {
          // Offline — localStorage cache used
        }
      } else {
        // No user — show login screen
        setStatus('login');
        setIsLoggedIn(false);
        setIsGuest(false);
      }
    });
    return () => unsub();
  }, []);

  // LOGIN TEMPORARILY DISABLED FOR TESTING
  const [status, setStatus] = useState<GameStatus>('login');
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isTableSetupOpen, setIsTableSetupOpen] = useState(false);
  const [initialSetupMode, setInitialSetupMode] = useState<'ai' | 'pass' | 'online'>('ai');
  const [gameMode, setGameMode] = useState<'ai' | 'pass' | 'online'>('ai');

  // Multiplayer state
  const [onlineScreen, setOnlineScreen] = useState<'lobby' | 'room' | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeTableMode, setActiveTableMode] = useState<TableMode>('4P');
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null);
  const [myMultiplayerColor, setMyMultiplayerColor] = useState<PlayerColor | null>(null);
  const [activeTableNum, setActiveTableNum] = useState<number>(1);
  const [initialGameState, setInitialGameState] = useState<any>(null);
  const [wasKnockedOut, setWasKnockedOut] = useState(false);

  // Multiplayer game hook — only active during online games
  const multiplayer = useMultiplayerGame(
    multiplayerGameId && activeTableId && myMultiplayerColor && firebaseUserRef.current?.uid ? {
      gameId: multiplayerGameId,
      tableId: activeTableId,
      tableNum: activeTableNum,
      mode: activeTableMode,
      myUid: firebaseUserRef.current.uid,
      myColor: myMultiplayerColor,
      initialGameState: initialGameState,
      onGameEnd: (winners) => {
        setMatchWinners(winners);
        setStatus('gameover');
        setMultiplayerGameId(null);
        setMyMultiplayerColor(null);
        setOnlineScreen(null);
      },
    } : null
  );
  const [roomCode, setRoomCode] = useState<string | undefined>(undefined);
  const [mobileActiveTab, setMobileActiveTab] = useState<'board' | 'leaderboard'>('board');
  const [boardSize, setBoardSize] = useState<number>(0);
  const [isFullScreenMode, setIsFullScreenMode] = useState<boolean>(false);
  const [fullScreenBoardSize, setFullScreenBoardSize] = useState<number>(300);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ludo_board_theme');
      return saved || 'classic'; // Default to Classic Physical Ludo as requested
    } catch {
      return 'classic';
    }
  });

  const handleThemeToggle = () => {
    const nextTheme = selectedThemeId === 'classic' ? 'cosmic' : 'classic';
    setSelectedThemeId(nextTheme);
    try {
      localStorage.setItem('ludo_board_theme', nextTheme);
    } catch (e) {
      console.warn('Theme storage failed', e);
    }
  };

  // Match configurations
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const tokensRef = useRef<Token[]>([]);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);

  // Dice states
  const [diceValue, setDiceValue] = useState<number>(1);
  const [diceState, setDiceState] = useState<DiceState>('idle');
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [recentRolls, setRecentRolls] = useState<{ value: number; color: PlayerColor }[]>([
    { value: 2, color: 'red' },
    { value: 5, color: 'green' },
    { value: 5, color: 'yellow' },
  ]);

  // Animation lock states
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Game details logs & metrics
  const [gameLogs, setGameLogs] = useState<GameLog[]>([]);
  const [matchWinners, setMatchWinners] = useState<PlayerColor[]>([]);

  // Local storage persisted stats
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);

  // Timers and game durations
  const matchStartTime = useRef<number>(0);

  // ── Sync Firestore → local board state (online mode only) ────────
  useEffect(() => {
    if (gameMode !== 'online') return;
    const gs = multiplayer?.gameState;
    if (!gs) return;
    if (gs.status !== 'playing' && gs.status !== 'countdown') return;

    // Sync tokens — update both state and ref
    if (gs.tokens && gs.tokens.length > 0) {
      setTokens(gs.tokens);
      tokensRef.current = gs.tokens; // keep ref in sync for online mode
    }

    // Sync active player
    if (players.length > 0) {
      const activeIdx = players.findIndex(p => p.color === gs.activePlayerColor);
      if (activeIdx >= 0) setCurrentPlayerIndex(activeIdx);
    }

    // Sync dice state
    if (gs.hasRolled && gs.diceValue > 0) {
      setDiceValue(gs.diceValue);
      setDiceState('rolled');
      setHasRolled(true);
    } else if (!gs.hasRolled) {
      setDiceState('idle');
      setHasRolled(false);
      setDiceValue(1);
    }

    setConsecutiveSixes(gs.consecutiveSixes || 0);
    if (gs.matchWinners && gs.matchWinners.length > 0) setMatchWinners(gs.matchWinners);

    // Check if MY player was knocked out
    if (myMultiplayerColor) {
      const myPlayer = gs.players?.find((p: any) => p.color === myMultiplayerColor);
      if (myPlayer?.knockedOut) {
        setWasKnockedOut(true);
      }
    }
  }, [multiplayer?.gameState, gameMode, myMultiplayerColor, players.length]);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load sound configurations & persistent statistics on mount
  useEffect(() => {
    try {
      setIsMuted(audio.getMuteState());

      const savedStats = localStorage.getItem('ludo_stats');
      if (savedStats) setStats(JSON.parse(savedStats));

      const savedHistory = localStorage.getItem('ludo_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const savedRules = localStorage.getItem('ludo_rules');
      if (savedRules) setRules(JSON.parse(savedRules));
    } catch (e) {
      console.warn('Could not load local storage data', e);
    }

    // Initialize Experience Engine
    experienceEngine.init({ soundVolume: audio.getMuteState() ? 0 : 0.5 });
    return () => {
      experienceEngine.destroy();
    };
  }, []);

  // Sync Experience Engine mute state with audio settings
  useEffect(() => {
    experienceEngine.setMute(isMuted);
  }, [isMuted]);

  // Dynamically calculate and update board size on mobile screens
  useEffect(() => {
    if (status !== 'playing') return;

    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isPortrait = vw < vh;

      // Full screen board size in portrait: cap by vw - 16 and vh * 0.78 to guarantee perfect square 1:1 shape
      const fsSize = isPortrait 
        ? Math.min(vw - 16, vh * 0.76) 
        : Math.min(vw, vh) * 0.94;
      setFullScreenBoardSize(Math.max(280, fsSize));

      if (vw >= 1024) {
        setBoardSize(0); // 0 means use CSS responsive layouts (desktop)
        return;
      }

      // Standard mode mobile portrait board size layout logic
      // In Pass & Play, subtract space for top + bottom dice strips (~96px total)
      const passPlayOffset = (initialSetupMode === 'pass') ? 96 : 0;
      const maxAvailableHeight = Math.floor(vh * 0.815) - 16 - passPlayOffset;
      const maxAvailableWidth = vw - 16;
      const size = isPortrait 
        ? Math.min(maxAvailableWidth, maxAvailableHeight) 
        : Math.min(vw, maxAvailableHeight);

      // Bound size within sane limits (min 280px)
      setBoardSize(Math.max(280, size));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [status]);

  // Save configurations helper
  const saveStatsAndHistory = (newStats: PlayerStats, newHistory: GameHistoryEntry[]) => {
    try {
      localStorage.setItem('ludo_stats', JSON.stringify(newStats));
      localStorage.setItem('ludo_history', JSON.stringify(newHistory));
      setStats(newStats);
      setHistory(newHistory);
    } catch (e) {
      console.warn('Could not save stats to local storage', e);
    }
  };

  const addLog = (message: string, color?: PlayerColor) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setGameLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2),
        timestamp,
        message,
        color,
      }
    ]);
  };

  // Setup / Initialize a new match
  const startNewMatch = (
    selectedPlayers: Player[],
    configuredRules: GameRules,
    mode: 'ai' | 'pass' | 'online' = 'ai',
    code?: string
  ) => {
    setPlayers(selectedPlayers);
    setRules(configuredRules);
    setGameMode(mode);
    setRoomCode(code);
    try {
      localStorage.setItem('ludo_rules', JSON.stringify(configuredRules));
      const humanPlayer = selectedPlayers.find(p => p.type === 'human');
      if (humanPlayer) {
        localStorage.setItem('ludo_human_color', humanPlayer.color);
      } else {
        localStorage.removeItem('ludo_human_color');
      }
    } catch {}

    // Initialize tokens
    const newTokens: Token[] = [];
    selectedPlayers.forEach((p) => {
      if (p.type !== 'none') {
        for (let i = 0; i < 4; i++) {
          newTokens.push({
            id: `${p.color}-${i}`,
            playerColor: p.color,
            idInColor: i,
            position: 'yard',
          });
        }
      }
    });

    setTokens(newTokens);
    setMatchWinners([]);
    setIsFullScreenMode(false);
    setGameLogs([]);
    setConsecutiveSixes(0);
    setDiceValue(1);
    setDiceState('idle');
    setHasRolled(false);
    setIsAnimating(false);
    setIsPaused(false);
    setRecentRolls([
      { value: 2, color: 'red' },
      { value: 5, color: 'green' },
      { value: 5, color: 'yellow' },
    ]);

    // Find first active player
    const firstActiveIdx = selectedPlayers.findIndex(p => p.type !== 'none');
    setCurrentPlayerIndex(firstActiveIdx >= 0 ? firstActiveIdx : 0);

    matchStartTime.current = Date.now();
    
    if (mode === 'online') {
      addLog(`🌐 Joined Online Room: ${code || 'Lobby'}! Match Started!`);
    } else if (mode === 'ai') {
      addLog('🤖 Match vs House AI Started! Good luck.');
    } else {
      addLog('👥 Pass & Play Match Started! Good luck.');
    }

    setStatus('playing');
  };

  const activePlayer = players[currentPlayerIndex];

  // Evaluate valid moves for a given rolled value
  const getValidTokenMoves = (playerColor: PlayerColor, roll: number): string[] => {
    const playerTokens = tokensRef.current.filter(t => t.playerColor === playerColor);
    const validIds: string[] = [];

    playerTokens.forEach(token => {
      if (token.position === 'yard') {
        // Must roll a 6 to release from base
        if (rules.sixToExit) {
          if (roll === 6) validIds.push(token.id);
        } else {
          // any roll releases token if sixToExit is false
          validIds.push(token.id);
        }
      } else {
        // Moving token along path
        const currentPos = token.position as number;
        // Journey maximum is 56
        if (currentPos + roll <= 56) {
          validIds.push(token.id);
        }
      }
    });

    return validIds;
  };

  const highlightedTokenIds = (status === 'playing' && hasRolled && !isAnimating && activePlayer && activePlayer.type === 'human')
    ? getValidTokenMoves(activePlayer.color, diceValue)
    : [];

  // Pass Turn Clockwise to next eligible player
  const passTurn = () => {
    if (status !== 'playing') return;

    let nextIdx = (currentPlayerIndex + 1) % players.length;

    for (let i = 0; i < 4; i++) {
      const p = players[nextIdx];
      // FIX 7: use tokensRef.current (always fresh) not stale tokens state
      const finishedCount = tokensRef.current.filter(t => t.playerColor === p.color && t.position === 56).length;

      if (p.type !== 'none' && p.type !== 'online' || (p.type === 'online' && !p.isWinner)) {
        if (p.type !== 'none' && finishedCount < 4) {
          setCurrentPlayerIndex(nextIdx);
          setHasRolled(false);
          setDiceState('idle');
          return;
        }
      }
      nextIdx = (nextIdx + 1) % players.length;
    }

    // FIX 9: In online mode, don't call endMatch — let Firestore drive it
    if (gameMode !== 'online') endMatch();
  };

  // Finalize full game ending
  const endMatch = () => {
    setStatus('gameover');
    audio.playVictory();

    // Trigger premium multi-angle confetti
    try {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.5 } });
      }, 350);
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.5 } });
      }, 700);
    } catch (e) {
      console.warn("Confetti error", e);
    }

    // Log to stats & history
    const durationSec = Math.round((Date.now() - matchStartTime.current) / 1000);
    const finishedPlayers = players
      .filter(p => p.type !== 'none')
      .map(p => {
        const score = tokensRef.current.filter(t => t.playerColor === p.color && t.position === 56).length;
        let rank = 4;
        const winnerIndex = matchWinners.indexOf(p.color);
        if (winnerIndex >= 0) rank = winnerIndex + 1;
        return { name: p.name, color: p.color, type: p.type, rank: score === 4 ? rank : undefined };
      });

    // Update global user stats if there is a human playing
    const hasHuman = players.some(p => p.type === 'human');
    if (hasHuman) {
      const humanPlayer = players.find(p => p.type === 'human');
      const humanFinished = humanPlayer ? tokensRef.current.filter(t => t.playerColor === humanPlayer.color && t.position === 56).length === 4 : false;
      const isHumanWinner = humanPlayer && matchWinners[0] === humanPlayer.color;

      // Check tournament progression
      const inTournament = localStorage.getItem('ludo_tournament_match_active') === 'true';
      const inNewTournament = localStorage.getItem('ludo_tourney_match_active') === 'true';

      // AWARD COINS THROUGH THE CENTRAL REWARD ENGINE
      try {
        const rulesObj = rewardEngine.getRules();
        
        // 1. Classic Tournament Progression rewards
        if (inTournament) {
          const currentRoundStr = localStorage.getItem('ludo_tournament_round') || '1';
          const currentRound = parseInt(currentRoundStr, 10);
          if (isHumanWinner && currentRound === 3) {
            rewardEngine.awardPoints(rulesObj.tournamentChampion, 'Tournament Champion 👑');
          }
        }

        // 2. Weekly Championship Tourney rewards
        if (inNewTournament) {
          const gamesPlayed = parseInt(localStorage.getItem('ludo_tourney_games') || '0', 10);
          const winsCount = parseInt(localStorage.getItem('ludo_tourney_wins') || '0', 10);
          const newGames = gamesPlayed + 1;
          const newWins = isHumanWinner ? winsCount + 1 : winsCount;
          
          if (newGames === TOURNAMENT_TOTAL_MATCHES) {
            if (newWins === TOURNAMENT_TOTAL_MATCHES) {
              rewardEngine.awardPoints(rulesObj.tournamentChampion, 'Tournament Champion (Unbeaten) 👑');
            } else if (newWins >= TOURNAMENT_QUALIFICATION_TARGET) {
              rewardEngine.awardPoints(rulesObj.tournamentQualification, 'Tournament Qualification ✅');
            }
          }
        }

        // 3. Regular match win / loss points
        if (isHumanWinner) {
          rewardEngine.awardPoints(rulesObj.matchWin, 'Match Win 🏆');
        } else {
          rewardEngine.awardPoints(rulesObj.matchLoss, 'Match Loss 🤝');
          if (humanPlayer) {
            eventBus.emit(ExperienceEventType.MATCH_LOST, { playerColor: humanPlayer.color });
          }
        }
      } catch (err) {
        console.warn('Error awarding points:', err);
      }
      if (inTournament) {
        const currentRoundStr = localStorage.getItem('ludo_tournament_round') || '1';
        const currentRound = parseInt(currentRoundStr, 10);
        if (isHumanWinner) {
          // Advance round!
          localStorage.setItem('ludo_tournament_round', (currentRound + 1).toString());
          localStorage.setItem('ludo_tournament_result', 'win');
        } else {
          // Eliminated!
          localStorage.setItem('ludo_tournament_result', 'eliminated');
        }
        localStorage.removeItem('ludo_tournament_match_active');
      }

      // Check Monthly Championship tournament progression
      if (inNewTournament) {
        const gamesPlayed = parseInt(localStorage.getItem('ludo_tourney_games') || '0', 10);
        const winsCount = parseInt(localStorage.getItem('ludo_tourney_wins') || '0', 10);
        const lossesCount = parseInt(localStorage.getItem('ludo_tourney_losses') || '0', 10);
        const pointsCount = parseInt(localStorage.getItem('ludo_tourney_points') || '0', 10);

        const oppJson = localStorage.getItem('ludo_tourney_current_opponent');
        let pointsEarned = 120; // default
        if (oppJson) {
          try {
            const opp = JSON.parse(oppJson);
            if (opp.difficulty === 'Hard') pointsEarned = 140;
            else if (opp.difficulty === 'Easy') pointsEarned = 100;
          } catch {}
        }

        const newGames = gamesPlayed + 1;
        let newWins = winsCount;
        let newLosses = lossesCount;
        let newPoints = pointsCount;

        if (isHumanWinner) {
          newWins += 1;
          newPoints += pointsEarned;
          localStorage.setItem('ludo_tourney_last_result', 'win');
          localStorage.setItem('ludo_tourney_last_points_earned', pointsEarned.toString());
        } else {
          newLosses += 1;
          localStorage.setItem('ludo_tourney_last_result', 'loss');
          localStorage.setItem('ludo_tourney_last_points_earned', '0');
        }

        localStorage.setItem('ludo_tourney_games', newGames.toString());
        localStorage.setItem('ludo_tourney_wins', newWins.toString());
        localStorage.setItem('ludo_tourney_losses', newLosses.toString());
        localStorage.setItem('ludo_tourney_points', newPoints.toString());

        if (newGames >= TOURNAMENT_TOTAL_MATCHES) {
          const prevBestWins = parseInt(localStorage.getItem('ludo_tourney_best_wins') || '0', 10);
          const prevBestPoints = parseInt(localStorage.getItem('ludo_tourney_best_points') || '0', 10);
          const qualified = newWins >= TOURNAMENT_QUALIFICATION_TARGET;

          if (newWins > prevBestWins || (newWins === prevBestWins && newPoints > prevBestPoints)) {
            localStorage.setItem('ludo_tourney_best_wins', newWins.toString());
            localStorage.setItem('ludo_tourney_best_points', newPoints.toString());
            localStorage.setItem('ludo_tourney_best_losses', newLosses.toString());

            if (qualified) {
              const newRank = Math.max(1, Math.round(2300 - newPoints));
              localStorage.setItem('ludo_tourney_rank', `#${newRank}`);
            } else {
              localStorage.setItem('ludo_tourney_rank', 'Unranked');
            }
          }
          localStorage.setItem('ludo_tourney_state', 'summary');
        } else {
          localStorage.setItem('ludo_tourney_state', 'result');
        }

        localStorage.removeItem('ludo_tourney_match_active');
      }

      const updatedStats: PlayerStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        gamesWon: isHumanWinner ? stats.gamesWon + 1 : stats.gamesWon,
        totalRolls: stats.totalRolls + gameLogs.length, // approximation or actual tracked counts
        totalSixes: stats.totalSixes,
        totalCaptures: stats.totalCaptures,
        totalTokensFinished: stats.totalTokensFinished + tokensRef.current.filter(t => t.playerColor === humanPlayer?.color && t.position === 56).length,
        highestRollStreak: Math.max(stats.highestRollStreak, consecutiveSixes),
      };

      const newHistoryEntry: GameHistoryEntry = {
        id: Math.random().toString(36).substring(2),
        date: new Date().toLocaleDateString(),
        players: finishedPlayers,
        rules,
        durationSeconds: durationSec,
      };

      const updatedHistory = [...history, newHistoryEntry];
      saveStatsAndHistory(updatedStats, updatedHistory);

      // Sync to Firestore in background (non-blocking)
      const fbUser = firebaseUserRef.current;
      if (fbUser && !fbUser.isAnonymous) {
        const wallet = rewardEngine.getPoints();
        const prestigeState = prestigeEngine.getState();
        const unlockedRewards = JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]');
        Promise.all([
          saveStats(fbUser.uid, updatedStats),
          saveWallet(fbUser.uid, wallet),
          savePrestige(fbUser.uid, prestigeState),
          saveUnlockedRewards(fbUser.uid, unlockedRewards),
          saveGameHistory(fbUser.uid, updatedHistory),
          updateLeaderboard(
            fbUser.uid,
            fbUser.displayName || 'Player',
            fbUser.photoURL,
            updatedStats,
            wallet.availablePoints
          ),
        ]).catch(e => console.warn('Firestore sync failed (offline?):', e));
      }
      prestigeEngine.evaluateAchievementsRealtime(true, !!isHumanWinner, updatedStats, updatedHistory);
    }
  };

  // Perform smooth incremental token hopping
  const moveTokenStepByStep = (tokenId: string, stepsToMove: number, rolledValue?: number) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const token = tokensRef.current.find(t => t.id === tokenId);
    if (!token) {
      setIsAnimating(false);
      return;
    }

    const startPos = token.position;
    let stepsHopped = 0;

    const intervalTime = 220; // ms per hop
    const hopInterval = setInterval(() => {
      setTokens(prevTokens => {
        return prevTokens.map(t => {
          if (t.id === tokenId) {
            let nextPos: 'yard' | number = 0;
            if (t.position === 'yard') {
              nextPos = 0; // Release onto track (step 0)
            } else {
              nextPos = (t.position as number) + 1;
            }
            
            // Emit Experience Event for token moving
            eventBus.emit(ExperienceEventType.TOKEN_MOVED, {
              playerColor: t.playerColor,
              tokenId: t.id,
              startPos: t.position,
              endPos: nextPos,
              isSafe: false,
            });

            audio.playTokenHop();
            return { ...t, position: nextPos };
          }
          return t;
        });
      });

      stepsHopped++;

      if (stepsHopped >= stepsToMove) {
        clearInterval(hopInterval);
        // Completed journey! Run final checks after slight visual settle
        setTimeout(() => {
          finalizeTokenMove(tokenId, rolledValue);
        }, 120);
      }
    }, intervalTime);
  };

  // Finalize land, capturing, victory, and turn rules
  const finalizeTokenMove = (tokenId: string, rolledValue?: number) => {
    const updatedTokens = [...tokensRef.current];
    const movedToken = updatedTokens.find(t => t.id === tokenId);
    if (!movedToken) {
      setIsAnimating(false);
      return;
    }

    const finalPos = movedToken.position;
    const playerColor = movedToken.playerColor;

    addLog(`Moved token to step ${finalPos === 56 ? 'Goal 🏆' : finalPos}`, playerColor);

    // 1. Goal Check
    if (finalPos === 56) {
      audio.playTokenHome();
      addLog(`⭐ Fantastic! A token reached the central Goal!`, playerColor);
      
      // Emit Experience Event for token reaching the goal
      eventBus.emit(ExperienceEventType.TOKEN_ENTERED_HOME, { playerColor, tokenId });

      // Check if player completed all 4 tokens
      const activePlayerTokens = updatedTokens.filter(t => t.playerColor === playerColor);
      const finishedCount = activePlayerTokens.filter(t => t.position === 56).length;

      if (finishedCount === 4) {
        audio.playVictory();
        const ranking = matchWinners.length + 1;
        setMatchWinners(prev => [...prev, playerColor]);
        addLog(`🏆 GLORIOUS VICTORY! Player finished in rank #${ranking}!`, playerColor);

        // Emit Experience Events for Final Token Home & Match Won
        eventBus.emit(ExperienceEventType.FINAL_TOKEN_HOME, { playerColor, tokenId });
        eventBus.emit(ExperienceEventType.MATCH_WON, {
          playerColor,
          stats: { turns: stats.totalRolls, captures: stats.totalCaptures }
        });

        // Check if game is over (only 1 player remains unfinished)
        const activeCount = players.filter(p => p.type !== 'none').length;
        const remainingUnfinished = players
          .filter(p => p.type !== 'none')
          .filter(p => {
            const finished = tokensRef.current.filter(t => t.playerColor === p.color && t.position === 56).length === 4;
            return !finished && p.color !== playerColor;
          });

        if (remainingUnfinished.length <= 1 || ranking >= activeCount - 1) {
          // FIX 9: Online mode — don't call endMatch locally, let Firestore drive
          if (gameMode !== 'online') {
            endMatch();
          }
          setIsAnimating(false);
          return;
        }
      }

      // Roll again on goal rule
      if (rules.rollAgainOnHome) {
        addLog(`🎁 Bonus Turn awarded for reaching the Goal!`, playerColor);
        setHasRolled(false);
        setDiceState('idle');
        setIsAnimating(false);
        return;
      }
    }

    // 2. Capture Check (only if on track and not on safe cell)
    let extraTurnFromCapture = false;
    if (finalPos !== 'yard' && finalPos < 51) {
      const targetCoord = getTokenCoordinates(movedToken);
      const isSafe = isSafeCell(targetCoord.row, targetCoord.col);

      if (isSafe) {
        // Emit Experience Event for reaching safe cell
        eventBus.emit(ExperienceEventType.SAFE_CELL_REACHED, {
          playerColor,
          tokenId,
          position: finalPos as number
        });
      } else {
        // Find other players' tokens on exact coordinates
        const vulnerableTokens = updatedTokens.filter(t => {
          if (t.playerColor === playerColor || t.position === 'yard' || t.position >= 51) return false;
          const otherCoord = getTokenCoordinates(t);
          return otherCoord.row === targetCoord.row && otherCoord.col === targetCoord.col;
        });

        if (vulnerableTokens.length > 0) {
          // If stacking block is enabled, verify count
          const opponentColor = vulnerableTokens[0].playerColor;
          const stackCount = vulnerableTokens.length;

          if (rules.stackingEnabled && stackCount >= 2) {
            // Stacked block defends! Cannot capture
            addLog(`🛡️ Blocked by opponent stack block! Safe from capture.`, opponentColor);
          } else {
            // Cut/Capture!
            extraTurnFromCapture = true;
            audio.playTokenCapture();

            // Send all to yard
            vulnerableTokens.forEach(target => {
              target.position = 'yard';
              addLog(`⚔️ Captured opponent! Token sent back to Yard.`, playerColor);
              
              // Emit Experience Event for captured opponent
              eventBus.emit(ExperienceEventType.TOKEN_CAPTURED, {
                capturingColor: playerColor,
                capturedColor: opponentColor,
                tokenId: target.id,
                position: finalPos as number
              });
            });

            // Update stats
            if (players.some(p => p.type === 'human')) {
              const hPlayer = players.find(p => p.type === 'human');
              if (hPlayer && playerColor === hPlayer.color) {
                setStats(prev => ({ ...prev, totalCaptures: prev.totalCaptures + vulnerableTokens.length }));
              }
              if (hPlayer && opponentColor === hPlayer.color) {
                setStats(prev => ({ ...prev, totalCaptured: prev.totalCaptured + vulnerableTokens.length }));
              }
            }

            setTokens(updatedTokens);
          }
        }
      }
    }

    // Save tokens state
    setTokens(updatedTokens);

    // 3. Post-Move Turn evaluation
    if (extraTurnFromCapture && rules.rollAgainOnCapture) {
      addLog(`🎁 Bonus Turn awarded for capturing opponent!`, playerColor);
      setHasRolled(false);
      setDiceState('idle');
      setIsAnimating(false);
      return;
    }

    // Extra Turn on rolling 6 — use rolledValue param to avoid stale closure
    const effectiveDiceValue = rolledValue ?? diceValue;
    if (effectiveDiceValue === 6 && rules.rollAgainOnSix) {
      addLog(`🎁 Extra Roll for rolling a 6!`, playerColor);
      setConsecutiveSixes(prev => prev + 1);
      setHasRolled(false);
      setDiceState('idle');
    } else {
      setConsecutiveSixes(0);
      passTurn();
    }

    setIsAnimating(false);

    // Online mode — write resulting board state to Firestore
    // FIX: compute nextColor BEFORE passTurn (React state not yet updated)
    if (gameMode === 'online' && multiplayer && multiplayerGameId) {
      // Extra turn on 6 — same player rolls again, don't pass turn
      const isExtraTurn = effectiveDiceValue === 6 && rules.rollAgainOnSix;
      const isCaptureTurn = extraTurnFromCapture && rules.rollAgainOnCapture;

      let nextColor: PlayerColor;
      if (isExtraTurn || isCaptureTurn) {
        // Same player's turn — keep activePlayerColor
        nextColor = playerColor as PlayerColor;
      } else {
        // Compute next active player index manually (same logic as passTurn)
        const activePlayers = players.filter(p => p.type !== 'none');
        const myIdx = activePlayers.findIndex(p => p.color === playerColor);
        const nextIdx = (myIdx + 1) % activePlayers.length;
        nextColor = activePlayers[nextIdx]?.color as PlayerColor || activePlayers[0].color as PlayerColor;
      }

      // Filter knocked tokens before writing to Firestore
      const tokensForFirestore = updatedTokens.filter((t: any) => t.position !== 'knocked');
      multiplayer.makeMove(
        tokenId,
        tokensForFirestore,
        nextColor,
        matchWinners,
        isExtraTurn ? consecutiveSixes + 1 : 0,
        isExtraTurn,
      ).catch(e => console.warn('Firestore move write failed:', e));
    }
  };

  // Human click dice trigger
  const handleRollDice = async () => {
    // Online mode — write to Firestore, let sync effect update diceState
    if (gameMode === 'online' && multiplayer) {
      if (!multiplayer.isMyTurn || hasRolled || diceState === 'rolling' || diceState === 'rolled') return;
      // Verify auth before attempting
      const { auth } = await import('./firebase/config');
      if (!auth.currentUser) {
        console.error('Not authenticated — cannot roll dice');
        return;
      }
      try {
        await multiplayer.rollDice();
      } catch (e: any) {
        console.error('Dice roll failed:', e?.code, e?.message);
      }
      return;
    }

    if (hasRolled || diceState === 'rolling' || isAnimating) return;

    const rolled = Math.floor(Math.random() * 6) + 1;
    setDiceValue(rolled);
    setDiceState('rolling');

    // Emit Experience events for the roll
    eventBus.emit(ExperienceEventType.DICE_ROLLED, { playerColor: activePlayer.color, value: rolled });
    if (rolled === 6) {
      eventBus.emit(ExperienceEventType.DICE_SIX, { playerColor: activePlayer.color });
    }

    // Simulate dice rotation duration (500ms)
    setTimeout(() => {
      setDiceState('rolled');
      setHasRolled(true);

      setRecentRolls(prev => {
        const updated = [...prev, { value: rolled, color: activePlayer.color }];
        if (updated.length > 3) {
          return updated.slice(updated.length - 3);
        }
        return updated;
      });

      addLog(`Rolled a ${rolled}`, activePlayer.color);

      // Save rolls counts
      if (activePlayer.type === 'human') {
        setStats(prev => ({
          ...prev,
          totalRolls: prev.totalRolls + 1,
          totalSixes: rolled === 6 ? prev.totalSixes + 1 : prev.totalSixes,
        }));
      }

      // ── FIX 1: Triple 6 — pass turn IMMEDIATELY on 3rd six, before player can move ──
      if (rolled === 6 && consecutiveSixes >= 2) {
        addLog(`⚠️ 3 consecutive sixes! Turn forfeited.`, activePlayer.color);
        setConsecutiveSixes(0);
        setTimeout(() => { passTurn(); }, 1000);
        return;
      }

      // Check for valid moves
      const validMoves = getValidTokenMoves(activePlayer.color, rolled);
      if (validMoves.length === 0) {
        addLog(`No valid moves! Turn passing...`, activePlayer.color);
        setTimeout(() => {
          passTurn();
        }, 1300);
        return;
      }

      // ── FIX 2: Auto-move when only 1 token can move ──
      if (validMoves.length === 1 && activePlayer.type === 'human') {
        const onlyToken = tokens.find(t => t.id === validMoves[0]);
        if (onlyToken) {
          addLog(`Auto-moving only available token`, activePlayer.color);
          setTimeout(() => {
            const steps = onlyToken.position === 'yard' ? 1 : rolled;
            moveTokenStepByStep(validMoves[0], steps, rolled);
          }, 600);
        }
      }
    }, 500);
  };

  // Select token to move action
  const handleTokenSelect = (tokenId: string) => {
    if (!hasRolled || isAnimating || diceState === 'rolling') return;
    // Online mode — only active player can move
    if (gameMode === 'online' && !multiplayer?.isMyTurn) return;
    const validMoves = getValidTokenMoves(activePlayer.color, diceValue);

    if (validMoves.includes(tokenId)) {
      const token = tokens.find(t => t.id === tokenId);
      if (token) {
        // Emit Experience Event for token selected/tapped
        eventBus.emit(ExperienceEventType.TOKEN_SELECTED, {
          playerColor: activePlayer.color,
          tokenId: token.id,
        });

        // Compute steps to move
        const steps = token.position === 'yard' ? 1 : diceValue;
        moveTokenStepByStep(tokenId, steps, diceValue);
      }
    }
  };

  // AI Decision Logic Thread
  useEffect(() => {
    if (status !== 'playing' || isPaused || isAnimating) return;
    // Online mode — never run AI or auto-move for opponents
    if (gameMode === 'online') return;

    // Trigger AI workflow if active player is a Computer
    if (AIEngine.isAITurn(activePlayer)) {
      // Clean previous timers
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      const aiConfig = aiConfigManager.getConfig();

      if (!hasRolled && diceState === 'idle') {
        // 1. AI thinking before rolling
        aiTimeoutRef.current = setTimeout(() => {
          handleRollDice();
        }, aiConfig.rollDelayMs);
      } else if (hasRolled && diceState === 'rolled') {
        // 2. AI thinking before moving
        const validMoves = getValidTokenMoves(activePlayer.color, diceValue);

        if (validMoves.length > 0) {
          aiTimeoutRef.current = setTimeout(() => {
            // Select the token to move using the AI Engine
            const decision = AIEngine.selectTokenMove(
              activePlayer.color,
              diceValue,
              validMoves,
              tokensRef.current
            );

            // Execute the selected move using the existing game engine
            const chosenToken = tokensRef.current.find(t => t.id === decision.tokenId)!;
            const stepsToTake = chosenToken.position === 'yard' ? 1 : diceValue;
            moveTokenStepByStep(decision.tokenId, stepsToTake, diceValue);
          }, aiConfig.moveDelayMs);
        }
      }
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [status, activePlayer, hasRolled, diceState, isPaused, isAnimating]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);

  const resetStatsAndHistory = () => {
    saveStatsAndHistory(INITIAL_STATS, []);
    addLog('🧹 All local statistics records deleted.');
  };

  const getFinishedTokensCount = (): { [key in PlayerColor]: number } => {
    const counts = { red: 0, green: 0, yellow: 0, blue: 0 };
    tokens.forEach(t => {
      if (t.position === 56) counts[t.playerColor]++;
    });
    return counts;
  };

  const activeFinishedCount = getFinishedTokensCount();

  // Show warm loading splash while Firebase resolves auth state
  // Prevents login screen flash for returning users
  if (firebaseLoading) {
    return (
      <div style={{
        minHeight:'100dvh',
        background:'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)',
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',gap:16,
      }}>
        <div style={{
          width:64,height:64,borderRadius:'50%',
          background:'linear-gradient(145deg,#fde68a,#f59e0b,#b45309)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:28,boxShadow:'0 8px 24px rgba(180,120,60,0.3)',
          animation:'lrpulse 1.2s ease-in-out infinite',
        }}>👑</div>
        <div style={{fontSize:13,fontWeight:700,color:'#b45309',letterSpacing:'2px',textTransform:'uppercase'}}>
          Ludo Royale
        </div>
        <style>{`@keyframes lrpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-stone-800 flex flex-col transition-colors duration-300 relative overflow-hidden ${status === 'playing' ? 'h-screen overflow-hidden lg:h-auto lg:overflow-visible' : ''}`} style={{background:'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)'}}>
      <Confetti active={status === 'gameover'} />

      {/* Disconnect banner — shown when a player is reconnecting */}
      {gameMode === 'online' && multiplayer?.disconnectingPlayer && (
        <div className="fixed top-14 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl"
            style={{background:'rgba(239,68,68,0.95)',color:'white',boxShadow:'0 4px 20px rgba(239,68,68,0.4)'}}>
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0"/>
            <div className="flex flex-col">
              <span className="font-black">{multiplayer.disconnectingPlayer.displayName} disconnected</span>
              <span className="text-xs opacity-90">
                {multiplayer.disconnectSecondsLeft > 0
                  ? `Waiting ${multiplayer.disconnectSecondsLeft}s before knockout...`
                  : 'Knocking out...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Knocked out overlay — shown when THIS player is knocked out */}
      {gameMode === 'online' && wasKnockedOut && status === 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 rounded-3xl text-center max-w-xs mx-4"
            style={{background:'linear-gradient(145deg,#fdf8f0,#fef3e2)',border:'2px solid rgba(180,120,60,0.3)',boxShadow:'0 24px 60px rgba(0,0,0,0.3)'}}>
            <div className="text-4xl">😔</div>
            <div className="text-lg font-black text-stone-800">You were disconnected</div>
            <div className="text-sm text-amber-700">You were away for 60+ seconds and got knocked out of the game.</div>
            <button
              onClick={() => {
                setWasKnockedOut(false);
                setMultiplayerGameId(null);
                setMyMultiplayerColor(null);
                setGameMode('ai');
                setStatus('menu');
                setOnlineScreen('lobby');
              }}
              className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider text-white"
              style={{background:'linear-gradient(145deg,#f59e0b,#d97706)',boxShadow:'0 4px 0 #b45309'}}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Lock popup for guest users */}
      <AnimatePresence>
        {lockPopup && (
          <LockPopup
            feature={lockPopup}
            onLogin={async () => {
              setLockPopup(null);
              if (firebaseUser?.isAnonymous) {
                // Guest upgrading to Google — no data loss
                try {
                  const user = await upgradeGuestToGoogle();
                  localStorage.setItem('ludo_is_logged_in', 'true');
                  localStorage.setItem('ludo_is_guest', 'false');
                  if (user.displayName) localStorage.setItem('ludo_player_name', user.displayName);
                  setIsLoggedIn(true);
                  setIsGuest(false);
                } catch (e) {
                  setStatus('login');
                }
              } else {
                setStatus('login');
              }
            }}
            onDismiss={() => setLockPopup(null)}
          />
        )}
      </AnimatePresence>

      <TableSetupModal
        isOpen={isTableSetupOpen}
        onClose={() => setIsTableSetupOpen(false)}
        initialMode={initialSetupMode}
        onStartGame={(preparedPlayers, mode, code) => {
          startNewMatch(preparedPlayers, rules, mode, code);
          setIsTableSetupOpen(false);
        }}
      />

      {/* Main container wrapper */}
      <main className={`flex-1 w-full mx-auto flex flex-col ${
        status === 'playing'
          ? 'max-w-[1350px] px-0 sm:px-4 py-0 sm:py-2 md:py-3 items-center justify-start sm:justify-center h-[100dvh] lg:h-auto overflow-hidden lg:overflow-visible gap-0'
          : 'max-w-6xl px-1.5 sm:px-4 py-3 md:py-6 items-center justify-center gap-4 sm:gap-6'
      }`}>
        <AnimatePresence mode="wait">
          {status === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex justify-center"
            >
              <LoginScreen
                onGoogleLogin={async () => {
                  try {
                    const user = await signInWithGoogle();
                    localStorage.setItem('ludo_is_logged_in', 'true');
                    localStorage.setItem('ludo_is_guest', 'false');
                    if (user.displayName) localStorage.setItem('ludo_player_name', user.displayName);
                    setIsLoggedIn(true);
                    setIsGuest(false);
                    setStatus('menu');
                  } catch (e) {
                    console.warn('Login failed:', e);
                  }
                }}
                onGuest={async () => {
                  try {
                    await signInAsGuest();
                    localStorage.setItem('ludo_is_guest', 'true');
                    localStorage.setItem('ludo_is_logged_in', 'false');
                    setIsGuest(true);
                    setIsLoggedIn(false);
                    setStatus('menu');
                  } catch (e) {
                    console.warn('Guest login failed:', e);
                  }
                }}
              />
            </motion.div>
          )}

          {/* Online Lobby */}
          {status === 'menu' && onlineScreen === 'lobby' && (
            <motion.div key="lobby" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
              className="w-full max-w-xl mx-auto px-2 py-4 overflow-y-auto"
              style={{minHeight:'calc(100dvh - 48px)'}}>
              <OnlineLobby
                currentUid={firebaseUser?.uid || ''}
                isGuest={isGuest}
                onRequireLogin={() => setLockPopup('Tournament')}
                onJoinTable={(tableId, mode, tableNum) => {
                  setActiveTableId(tableId);
                  setActiveTableMode(mode);
                  setActiveTableNum(tableNum);
                  setOnlineScreen('room');
                }}
                onBack={() => setOnlineScreen(null)}
              />
            </motion.div>
          )}

          {/* Table Room */}
          {status === 'menu' && onlineScreen === 'room' && activeTableId && (
            <motion.div key="room" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
              className="w-full max-w-xl mx-auto px-2 py-4 overflow-y-auto"
              style={{minHeight:'calc(100dvh - 48px)'}}>
              <TableRoom
                tableId={activeTableId}
                tableNum={activeTableNum}
                uid={firebaseUser?.uid || ''}
                displayName={firebaseUser?.displayName || 'Player'}
                photoURL={firebaseUser?.photoURL || null}
                onGameReady={(gameId, gameData, color, mode, tNum) => {
                  // Simple: game data comes directly from Firestore snapshot
                  setMultiplayerGameId(gameId);
                  setMyMultiplayerColor(color as PlayerColor);
                  setActiveTableMode(mode);
                  setActiveTableNum(tNum);
                  setInitialGameState(gameData);

                  const allColors: PlayerColor[] = ['red','green','blue','yellow'];
                  const COLOR_EMOJIS: Record<string,string> = {red:'🔴',green:'🟢',blue:'🔵',yellow:'🟡'};
                  const myUid = firebaseUserRef.current?.uid;

                  const gamePlayers: Player[] = allColors.map(c => {
                    const mp = gameData.players?.find((p: any) => p.color === c);
                    if (!mp) return { id: c, name: '', color: c, type: 'none' as PlayerType, avatar: '⚪', isWinner: false };
                    return {
                      id: c,
                      name: mp.displayName || 'Player',
                      color: c,
                      type: mp.uid === myUid ? 'human' as PlayerType : 'online' as PlayerType,
                      avatar: COLOR_EMOJIS[c] || '🎮',
                      isWinner: false,
                    };
                  });

                  const gameTokens = (gameData.tokens || []).filter((t: any) => t.position !== 'knocked');
                  const activeColor = gameData.activePlayerColor || gameData.players?.[0]?.color;
                  const activeIdx = gamePlayers.findIndex(p => p.color === activeColor && p.type !== 'none');

                  setPlayers(gamePlayers);
                  setTokens(gameTokens);
                  setGameMode('online');
                  setMatchWinners(gameData.matchWinners || []);
                  setDiceValue(gameData.diceValue > 0 ? gameData.diceValue : 1);
                  setDiceState(gameData.hasRolled ? 'rolled' : 'idle');
                  setHasRolled(gameData.hasRolled || false);
                  setConsecutiveSixes(gameData.consecutiveSixes || 0);
                  setIsAnimating(false);
                  setGameLogs([]);
                  setCurrentPlayerIndex(activeIdx >= 0 ? activeIdx : 0);
                  matchStartTime.current = Date.now();
                  setOnlineScreen(null);
                  setStatus('playing');
                }}
                onBack={() => setOnlineScreen('lobby')}
              />
            </motion.div>
          )}

          {status === 'menu' && !onlineScreen && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <MainMenu
                onStartGameWithMode={(mode) => {
                  if (mode === 'online') {
                    if (isGuest) { setLockPopup('Tournament'); return; }
                    setOnlineScreen('lobby');
                    return;
                  }
                  setInitialSetupMode(mode);
                  setIsTableSetupOpen(true);
                }}
                savedRules={rules}
                onUpdateRules={(newRules) => {
                  setRules(newRules);
                  try {
                    localStorage.setItem('ludo_rules', JSON.stringify(newRules));
                  } catch {}
                }}
                onViewStats={() => setStatus('stats')}
                onResetStats={resetStatsAndHistory}
                isMuted={isMuted}
                onMuteToggle={() => setIsMuted(audio.toggleMute())}
                isGuest={isGuest}
                onGuestLock={(feature) => setLockPopup(feature)}
                onStartTournamentGame={(tournamentPlayers) => {
                  if (isGuest) { setLockPopup('Tournament'); return; }
                  startNewMatch(tournamentPlayers, rules, 'ai');
                }}
                onLogout={async () => {
                  if (isGuest) {
                    // Guest taps "Sign in" — upgrade to Google
                    try {
                      const { upgradeGuestToGoogle } = await import('./firebase');
                      const user = await upgradeGuestToGoogle();
                      localStorage.setItem('ludo_is_logged_in', 'true');
                      localStorage.setItem('ludo_is_guest', 'false');
                      if (user.displayName) localStorage.setItem('ludo_player_name', user.displayName);
                      setIsLoggedIn(true);
                      setIsGuest(false);
                    } catch {
                      setStatus('login');
                    }
                  } else {
                    // Logged in user signs out
                    const { signOut } = await import('./firebase');
                    await signOut();
                    setIsLoggedIn(false);
                    setIsGuest(false);
                    setFirebaseUser(null);
                    setStatus('login');
                  }
                }}
                userPhotoURL={firebaseUser?.photoURL}
                userDisplayName={firebaseUser?.displayName}
                userEmail={firebaseUser?.email}
              />
            </motion.div>
          )}

          {status === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <StatsDashboard
                stats={stats}
                history={history}
                onBack={() => setStatus('menu')}
                onResetStats={resetStatsAndHistory}
              />
            </motion.div>
          )}

          {(status === 'playing' || status === 'gameover') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-0 h-full lg:h-auto overflow-hidden lg:overflow-visible"
            >
              {/* Sticky top header for mobile - compact control row occupying exactly 10% space */}
              <div className="lg:hidden sticky top-0 left-0 right-0 w-full backdrop-blur-md border-b z-30 px-3 flex items-center justify-between shrink-0 select-none" style={{background:'rgba(253,248,240,0.92)',borderColor:'rgba(180,120,60,0.18)',height:'48px',paddingTop:'env(safe-area-inset-top)'}}>
                {/* Left side actions: Back/Leave and Fullscreen */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      audio.playClick();
                      setIsPaused(true);
                      setShowExitConfirm(true);
                    }}
                    title="Leave Game"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-900 transition active:scale-95"
                    style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1),inset 0 1px 2px rgba(255,255,255,0.9)'}}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      audio.playClick();
                      setIsFullScreenMode(true);
                    }}
                    title="Full Screen Mode"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-900 transition active:scale-95"
                    style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1),inset 0 1px 2px rgba(255,255,255,0.9)'}}
                  >
                    <Maximize2 size={16} />
                  </button>
                  <button
                    onClick={handleThemeToggle}
                    title={`Switch Theme (Current: ${selectedThemeId === 'classic' ? 'Classic Physical' : 'Cosmic Slate'})`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-900 transition active:scale-95"
                    style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1),inset 0 1px 2px rgba(255,255,255,0.9)'}}
                  >
                    <span className="text-sm select-none leading-none">
                      {selectedThemeId === 'classic' ? '🌌' : '🎨'}
                    </span>
                  </button>
                </div>

                {/* Right/Center segmented control */}
                <div className="flex-1 max-w-[220px] xs:max-w-xs h-8 p-0.5 rounded-xl flex gap-0.5 ml-2" style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(180,120,60,0.18)'}}>
                  <button
                    onClick={() => {
                      audio.playClick();
                      setMobileActiveTab('board');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                      mobileActiveTab === 'board'
                        ? 'text-amber-900'
                        : 'text-amber-700/60 hover:text-amber-800'
                    }`}
                    style={mobileActiveTab === 'board' ? {background:'linear-gradient(145deg,#f59e0b,#d97706)',boxShadow:'0 2px 0 #b45309,inset 0 1px 2px rgba(255,255,255,0.4)'} : {}}
                  >
                    <span>🎮</span> Board
                  </button>
                  <button
                    onClick={() => {
                      audio.playClick();
                      setMobileActiveTab('leaderboard');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 relative ${
                      mobileActiveTab === 'leaderboard'
                        ? 'text-amber-900'
                        : 'text-amber-700/60 hover:text-amber-800'
                    }`}
                    style={mobileActiveTab === 'leaderboard' ? {background:'linear-gradient(145deg,#f59e0b,#d97706)',boxShadow:'0 2px 0 #b45309,inset 0 1px 2px rgba(255,255,255,0.4)'} : {}}
                  >
                    <span>🏆</span> Leaderboard
                    {mobileActiveTab !== 'leaderboard' && activePlayer?.type === 'human' && (
                      <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className={`w-full lg:h-auto flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-5 items-center lg:items-start px-0 lg:px-2 py-0`} style={{height:'calc(100dvh - 48px - env(safe-area-inset-top))'}}>
                {/* Left sidebar UI panel */}
                <div className={`lg:col-span-4 flex-col gap-2 sm:gap-4 order-1 lg:order-1 ${mobileActiveTab === 'leaderboard' ? 'flex overflow-y-auto px-2 py-2' : 'hidden lg:flex'}`} style={{height:'calc(100dvh - 48px - env(safe-area-inset-top))'}}>
                  <GameHUD
                    players={players}
                    tokens={tokens}
                    currentPlayerColor={activePlayer?.color}
                    diceValue={diceValue}
                    hasRolled={hasRolled}
                    gameLogs={gameLogs}
                    rules={rules}
                    onPauseToggle={() => {
                      setIsPaused(!isPaused);
                      setShowExitConfirm(false);
                    }}
                    onRestart={() => startNewMatch(players, rules)}
                    onMuteToggle={() => setIsMuted(audio.toggleMute())}
                    isMuted={isMuted}
                    isPaused={isPaused}
                    tokensFinishedCount={activeFinishedCount}
                    selectedThemeId={selectedThemeId}
                    onThemeToggle={handleThemeToggle}
                  />

                  {/* Return to menu overlay in side menu (hidden on mobile, can use pause menu instead) */}
                  <div className="hidden lg:flex gap-2">
                    <button
                      onClick={() => {
                        audio.playClick();
                        setIsPaused(true);
                        setShowExitConfirm(true);
                      }}
                      className="flex-1 py-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition"
                    >
                      <LogOut size={14} />
                      Exit Game
                    </button>
                  </div>
                </div>

                {/* Right board containing yard-adjacent dice panels */}
                <div className={`lg:col-span-8 flex flex-col items-center order-2 lg:order-2 w-full ${mobileActiveTab === 'board' ? 'flex' : 'hidden lg:flex'} px-0 py-0 overflow-hidden ${gameMode === 'pass' ? 'justify-center' : 'justify-between'}`} style={{height:'calc(100dvh - 48px - env(safe-area-inset-top))'}}>
                  
                  {/* Board Area + Pass & Play Dice Strips */}
                  <div className="w-full flex-1 lg:h-auto flex flex-col items-center justify-center overflow-hidden">
                    <div
                      style={boardSize > 0 ? { width: boardSize } : undefined}
                      className="mx-auto shrink-0 transition-all duration-300 w-full flex flex-col"
                    >
                      {/* TOP dice strip — Pass & Play only */}
                      {gameMode === 'pass' && !isFullScreenMode && (
                        <div style={boardSize > 0 ? {width: boardSize} : {width:'100%'}}>
                          <PassPlayDice
                            players={players}
                            activePlayer={activePlayer}
                            diceState={diceState}
                            diceValue={diceValue}
                            hasRolled={hasRolled}
                            isAnimating={isAnimating}
                            onRoll={handleRollDice}
                            boardSize={boardSize || 340}
                            stripPosition="top"
                          />
                        </div>
                      )}

                      {/* Board */}
                      <div style={boardSize > 0 ? {width: boardSize, height: boardSize} : undefined}
                        className="mx-auto shrink-0">
                        {!isFullScreenMode && (
                          <Board
                            tokens={tokens}
                            players={players}
                            activePlayerColor={activePlayer?.color}
                            highlightedTokenIds={highlightedTokenIds}
                            onTokenClick={handleTokenSelect}
                            diceValue={diceValue}
                            diceState={diceState}
                            hasRolled={hasRolled}
                            onRollDice={handleRollDice}
                            isAnimating={isAnimating}
                            isPaused={isPaused}
                            status={status}
                            matchWinners={matchWinners}
                            themeId={selectedThemeId}
                          />
                        )}
                      </div>

                      {/* BOTTOM dice strip — Pass & Play only */}
                      {gameMode === 'pass' && !isFullScreenMode && (
                        <div style={boardSize > 0 ? {width: boardSize} : {width:'100%'}}>
                          <PassPlayDice
                            players={players}
                            activePlayer={activePlayer}
                            diceState={diceState}
                            diceValue={diceValue}
                            hasRolled={hasRolled}
                            isAnimating={isAnimating}
                            onRoll={handleRollDice}
                            boardSize={boardSize || 340}
                            stripPosition="bottom"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom HUD for vs Computer / Tournament */}
                  {gameMode !== 'pass' && (
                  <div className="w-full lg:h-auto flex items-center justify-center px-1 sm:px-0 py-2 pb-3 shrink-0 select-none">
                    <div
                      style={boardSize > 0 ? { width: Math.min(boardSize, 480) } : undefined}
                      className="w-full max-w-full mx-auto"
                    >
                      {/* Centered Single Dice Placeholder */}
                      <div className="w-full backdrop-blur-md rounded-2xl px-3.5 py-1.5 shadow-xl flex items-center justify-between gap-3 transition-all duration-300 relative overflow-visible min-h-[64px]" style={{background:'rgba(255,255,255,0.92)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 4px 20px rgba(140,80,20,0.12),inset 0 1px 2px rgba(255,255,255,0.9)'}}>
                        {/* Glass glare effect overlay */}
                        <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none z-0 rounded-2xl" />

                        {/* Player Turn & Status */}
                        <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 z-10 min-w-0">
                          <div className={`w-9 h-9 sm:w-[52px] sm:h-[52px] rounded-full ${
                            activePlayer?.color === 'red' ? 'bg-rose-500' :
                            activePlayer?.color === 'green' ? 'bg-emerald-500' :
                            activePlayer?.color === 'yellow' ? 'bg-amber-450' : 'bg-sky-500'
                          } flex items-center justify-center text-white text-sm sm:text-xl font-black shadow-md border border-white/25 relative shrink-0`}>
                            {activePlayer?.avatar || '👤'}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest text-amber-700 leading-none">
                              {activePlayer?.type === 'computer' ? 'AI Turn' : activePlayer?.type === 'online' ? 'Their Turn' : 'Active Turn'}
                            </span>
                            <span className="text-[10px] sm:text-base font-display font-black text-stone-800 mt-1 sm:mt-1.5 leading-none truncate max-w-[80px] xs:max-w-none">
                              {activePlayer?.name || 'Waiting...'}
                            </span>
                            
                            {/* Progress / Steps Taken Bar - hide on extremely small phones or compact screens */}
                            {(() => {
                              const activeTokens = tokens.filter(t => t.playerColor === activePlayer?.color);
                              const totalDistance = activeTokens.reduce((sum, t) => {
                                if (t.position === 'yard') return sum;
                                return sum + t.position;
                              }, 0);
                              const maxDistance = 228;
                              const progressPercent = Math.min(100, Math.round((totalDistance / maxDistance) * 100));

                              return (
                                <div className="hidden xs:flex flex-col mt-1 w-16 xs:w-20 sm:w-36">
                                  <div className="flex justify-between items-center text-[6px] sm:text-[8.5px] font-mono font-black text-amber-700 uppercase tracking-widest leading-none mb-0.5">
                                    <span>Steps</span>
                                    <span>{totalDistance}/228</span>
                                  </div>
                                  <div className="h-1 bg-amber-100/40 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        activePlayer?.color === 'red' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.3)]' :
                                        activePlayer?.color === 'green' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]' :
                                        activePlayer?.color === 'yellow' ? 'bg-amber-450 shadow-[0_0_6px_rgba(245,158,11,0.3)]' :
                                        'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.3)]'
                                      }`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Integrated Pill Controller (Dice + Number Placeholder) */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5 p-1 border rounded-full shadow-inner z-10 select-none shrink-0 overflow-visible" style={{background:'rgba(245,232,200,0.4)',borderColor:'rgba(180,120,60,0.25)'}}>
                          {/* Current Number Placeholder */}
                          <div className={`w-[42px] h-[42px] sm:w-[58px] sm:h-[58px] rounded-full border flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300 shrink-0 ${
                            activePlayer?.color === 'red' ? 'bg-[#ff4d6d] border-[#ff4d6d]/30 text-white shadow-[0_0_10px_rgba(255,77,109,0.35)]' :
                            activePlayer?.color === 'green' ? 'bg-[#10b981] border-[#10b981]/30 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]' :
                            activePlayer?.color === 'yellow' ? 'bg-[#fbbf24] border-[#fbbf24]/30 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.35)]' :
                            activePlayer?.color === 'blue' ? 'bg-[#0ea5e9] border-[#0ea5e9]/30 text-white shadow-[0_0_10px_rgba(14,165,233,0.35)]' :
                            'bg-white/60 border-amber-200/30 text-stone-400'
                          }`}>
                            {diceState === 'rolling' ? (
                              <span className={`text-sm sm:text-xl animate-spin ${activePlayer?.color === 'yellow' ? 'text-amber-950' : 'text-white'}`}>🌀</span>
                            ) : hasRolled && diceValue > 0 ? (
                              <span className="text-base sm:text-2xl font-black font-mono mt-[1px]">{diceValue}</span>
                            ) : (
                              <span className={`text-xs sm:text-xl font-black ${activePlayer?.color === 'yellow' ? 'text-amber-950/70' : 'text-white/70'}`}>-</span>
                            )}
                          </div>

                          {/* Interactive Dice3D */}
                          <div className="relative shrink-0 overflow-visible">
                            {!isFullScreenMode && (
                              <Dice3D
                                value={diceValue}
                                diceState={diceState}
                                onClick={handleRollDice}
                                disabled={
                                  activePlayer?.type === 'computer' ||
                                  (gameMode === 'online' && !multiplayer?.isMyTurn) ||
                                  hasRolled ||
                                  isAnimating ||
                                  isPaused
                                }
                                playerColor={activePlayer?.color || 'gray'}
                              />
                            )}

                            {/* Glow Indicator when it's your turn to roll */}
                            {!isFullScreenMode && activePlayer?.type === 'human' && !hasRolled && diceState !== 'rolling' && (
                              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>

              {/* Immersive Full Screen Mode Overlay */}
              <AnimatePresence>
                {isFullScreenMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden"
                    style={{background:'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)'}}
                  >
                    {/* Warm dot pattern */}
                    <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'radial-gradient(circle,rgba(180,120,60,0.07) 1.5px,transparent 1.5px)',backgroundSize:'16px 16px'}} />
                    <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{background:'linear-gradient(180deg,rgba(255,255,255,0.6) 0%,transparent 100%)'}} />

                    {/* Cut / Back to standard screen mode button (Circular Floating Button) */}
                    <button
                      onClick={() => {
                        audio.playClick();
                        setIsFullScreenMode(false);
                      }}
                      className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition duration-200 active:scale-90"
                      style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 3px 10px rgba(140,80,20,0.15),inset 0 1px 2px rgba(255,255,255,0.9)',color:'#78716c'}}
                      title="Exit Full Screen"
                    >
                      <X size={18} />
                    </button>

                    {/* Active player indicator in top-left */}
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg" style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 3px 10px rgba(140,80,20,0.12),inset 0 1px 2px rgba(255,255,255,0.9)'}}>
                      <span className="text-xs">{activePlayer?.avatar || '👤'}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                        {activePlayer?.name}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        activePlayer?.color === 'red' ? 'bg-rose-500' :
                        activePlayer?.color === 'green' ? 'bg-emerald-500' :
                        activePlayer?.color === 'yellow' ? 'bg-amber-450' : 'bg-sky-500'
                      }`} />
                    </div>

                    {/* Center Board Wrapper */}
                    <div className="w-full flex items-center justify-center p-0 sm:p-2.5">
                      <div
                        style={{ width: fullScreenBoardSize, height: fullScreenBoardSize }}
                        className="shrink-0 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden"
                      >
                        <Board
                          tokens={tokens}
                          players={players}
                          activePlayerColor={activePlayer?.color}
                          highlightedTokenIds={highlightedTokenIds}
                          onTokenClick={handleTokenSelect}
                          diceValue={diceValue}
                          diceState={diceState}
                          hasRolled={hasRolled}
                          onRollDice={handleRollDice}
                          isAnimating={isAnimating}
                          isPaused={isPaused}
                          status={status}
                          matchWinners={matchWinners}
                          themeId={selectedThemeId}
                        />
                      </div>
                    </div>

                    {/* Dynamic Floating Dice Panel (Portrait: Center Bottom, Landscape: Right Bottom Corner) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 landscape:bottom-4 landscape:right-4 landscape:left-auto landscape:translate-x-0 z-50 w-[90%] xs:w-auto xs:min-w-[310px] max-w-sm transition-all duration-300">
                      <div className="backdrop-blur-lg rounded-2xl px-3.5 py-2 shadow-2xl flex items-center justify-between gap-3.5 relative overflow-visible min-h-[64px] sm:h-auto sm:py-3.5" style={{background:'rgba(255,255,255,0.92)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 4px 20px rgba(140,80,20,0.14),inset 0 1px 2px rgba(255,255,255,0.9)'}}>
                        {/* Glass glare effect overlay */}
                        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-2xl" />

                        {/* Active player info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-full ${
                            activePlayer?.color === 'red' ? 'bg-rose-500' :
                            activePlayer?.color === 'green' ? 'bg-emerald-500' :
                            activePlayer?.color === 'yellow' ? 'bg-amber-450' : 'bg-sky-500'
                          } flex items-center justify-center text-white text-xs font-black shadow border border-white/20 shrink-0`}>
                            {activePlayer?.avatar || '👤'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-700 leading-none">
                              {activePlayer?.type === 'computer' ? 'AI Turn' : activePlayer?.type === 'online' ? 'Their Turn' : 'Active Turn'}
                            </span>
                            <span className="text-[11.5px] font-black text-stone-800 mt-1 leading-none truncate max-w-[80px] xs:max-w-[110px]">
                              {activePlayer?.name}
                            </span>
                          </div>
                        </div>

                        {/* Pill Controller */}
                        <div className="flex items-center gap-2 p-1 border rounded-full shadow-inner select-none shrink-0 overflow-visible" style={{background:'rgba(245,232,200,0.4)',borderColor:'rgba(180,120,60,0.22)'}}>
                          {/* Dice rolled number placeholder */}
                          <div className={`w-[42px] h-[42px] rounded-full border flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300 shrink-0 ${
                            activePlayer?.color === 'red' ? 'bg-[#ff4d6d] border-[#ff4d6d]/30 text-white shadow-[0_0_10px_rgba(255,77,109,0.35)]' :
                            activePlayer?.color === 'green' ? 'bg-[#10b981] border-[#10b981]/30 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]' :
                            activePlayer?.color === 'yellow' ? 'bg-[#fbbf24] border-[#fbbf24]/30 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.35)]' :
                            activePlayer?.color === 'blue' ? 'bg-[#0ea5e9] border-[#0ea5e9]/30 text-white shadow-[0_0_10px_rgba(14,165,233,0.35)]' :
                            'border-white/5 bg-stone-950 text-stone-600'
                          }`}>
                            {diceState === 'rolling' ? (
                              <span className={`text-sm animate-spin ${activePlayer?.color === 'yellow' ? 'text-amber-950' : 'text-white'}`}>🌀</span>
                            ) : hasRolled && diceValue > 0 ? (
                              <span className="text-base font-black font-mono mt-[1px]">{diceValue}</span>
                            ) : (
                              <span className={`text-xs font-black ${activePlayer?.color === 'yellow' ? 'text-amber-950/70' : 'text-white/70'}`}>-</span>
                            )}
                          </div>

                          {/* 3D Interactive Dice */}
                          <div className="relative shrink-0 overflow-visible">
                            <Dice3D
                              value={diceValue}
                              diceState={diceState}
                              onClick={handleRollDice}
                              disabled={
                                activePlayer?.type === 'computer' ||
                                hasRolled ||
                                isAnimating ||
                                isPaused
                              }
                              playerColor={activePlayer?.color || 'gray'}
                            />

                            {/* Glow indicator when user needs to roll */}
                            {activePlayer?.type === 'human' && !hasRolled && diceState !== 'rolling' && (
                              <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {status === 'gameover' && (
            <EndGameScreen
              players={players}
              matchWinners={matchWinners}
              onRematch={() => {
                              if (gameMode === 'online') {
                                // For online mode, go back to lobby instead of rematch
                                setMultiplayerGameId(null);
                                setMyMultiplayerColor(null);
                                setWasKnockedOut(false);
                                setGameMode('ai');
                                setStatus('menu');
                                setOnlineScreen('lobby');
                              } else {
                                startNewMatch(players, rules);
                              }
                            }}
              onReturnToMenu={() => setStatus('menu')}
              logs={gameLogs}
              isTournamentMatch={
                localStorage.getItem('ludo_tournament_match_active') === 'true' ||
                localStorage.getItem('ludo_tourney_match_active') === 'true'
              }
            />
          )}
        </AnimatePresence>

        {/* 5. In-Game Pause Options Modal overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-amber-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-amber-50/95 border border-amber-200/50 max-w-xs w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center"
              >
                {showExitConfirm ? (
                  <>
                    <h3 className="text-base font-black uppercase text-rose-600 tracking-tight flex items-center justify-center gap-1.5">
                      ⚠️ Abandon Match?
                    </h3>

                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                      Are you sure you want to exit? Your current match progress will be lost.
                    </p>

                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => {
                          audio.playClick();
                          setIsPaused(false);
                          setShowExitConfirm(false);
                          setStatus('menu');
                        }}
                        className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-rose-500/25 transition duration-200"
                      >
                        Yes, Exit Match
                      </button>

                      <button
                        onClick={() => {
                          audio.playClick();
                          setShowExitConfirm(false);
                        }}
                        className="py-2.5 bg-white hover:bg-amber-50 text-stone-700 border border-amber-200/40 font-bold text-xs uppercase tracking-wider rounded-lg transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-black uppercase text-stone-800 tracking-tight">
                      Game Paused
                    </h3>

                    <p className="text-xs text-stone-600 font-medium">
                      Review options below to continue or exit the match.
                    </p>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          audio.playClick();
                          setIsPaused(false);
                        }}
                        className="py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition"
                      >
                        Resume Match
                      </button>

                      <button
                        onClick={() => {
                          audio.playClick();
                          setIsPaused(false);
                          startNewMatch(players, rules);
                        }}
                        className="py-2.5 bg-white hover:bg-amber-50 text-stone-700 border border-amber-200/40 font-bold text-xs uppercase tracking-wider rounded-lg transition"
                      >
                        Restart Round
                      </button>

                      <button
                        onClick={() => {
                          audio.playClick();
                          setShowExitConfirm(true);
                        }}
                        className="py-2.5 bg-rose-50 text-rose-500 hover:bg-rose-100 font-bold text-xs uppercase tracking-wider rounded-lg transition"
                      >
                        Exit Match
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ProgressionToasts />
    </div>
  );
}
