/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameRules, PlayerColor, Player } from '../types';
import {
  Play,
  Settings,
  Trophy,
  Users,
  ArrowLeft,
  Volume2,
  VolumeX,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  Shield,
  Trash2,
  Music,
  Volume1,
} from 'lucide-react';
import { audio } from '../utils/audio';
import { soundEngine } from '../experience/soundEngine';
import { TournamentDashboard } from './TournamentDashboard';
import { RewardDashboard } from './RewardDashboard';
import { PrestigeCollection } from './PrestigeCollection';
import { PlayerStats } from '../types';
import { Sparkles, Star, Zap } from 'lucide-react';
import { prestigeEngine, DEFAULT_TITLES, DEFAULT_CROWNS } from '../prestige/prestigeEngine';
import { eventBus } from '../experience/eventBus';
import { ExperienceEventType } from '../experience/types';
import { rewardEngine } from '../rewards';

interface MainMenuProps {
  onStartGameWithMode: (mode: 'ai' | 'pass' | 'online') => void;
  savedRules: GameRules;
  onUpdateRules: (newRules: GameRules) => void;
  onViewStats: () => void;
  onResetStats: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onStartTournamentGame: (setupPlayers: Player[]) => void;
  isGuest?: boolean;
  onGuestLock?: (feature: 'Tournament' | 'Rewards') => void;
}

const BOT_NAMES = [
  'Ruby Bot', 'Emerald Bot', 'Amber Bot', 'Sapphire Bot',
  'Aarav', 'Ananya', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Rahul', 'Divya'
];

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGameWithMode,
  savedRules,
  onUpdateRules,
  onViewStats,
  onResetStats,
  isMuted,
  isGuest,
  onGuestLock,
  onMuteToggle,
  onStartTournamentGame,
}) => {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'tournament' | 'settings' | 'rewards' | 'prestige'>('main');
  const [rules, setRules] = useState<GameRules>(savedRules);
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const stored = localStorage.getItem('ludo_stats');
      return stored ? JSON.parse(stored) : {
        gamesPlayed: 0,
        gamesWon: 0,
        totalRolls: 0,
        totalSixes: 0,
        totalCaptures: 0,
        totalCaptured: 0,
        totalTokensFinished: 0,
        highestRollStreak: 0,
      };
    } catch {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        totalRolls: 0,
        totalSixes: 0,
        totalCaptures: 0,
        totalCaptured: 0,
        totalTokensFinished: 0,
        highestRollStreak: 0,
      };
    }
  });

  // Tournament States (stored in localStorage)
  const [tournamentRound, setTournamentRound] = useState<number>(0); // 0 = Not started, 1 = Quarters, 2 = Semis, 3 = Finals, 4 = Won
  const [tournamentResult, setTournamentResult] = useState<'win' | 'eliminated' | null>(null);
  const [tournamentPlayers, setTournamentPlayers] = useState<string[]>([]);

  useEffect(() => {
    // Load existing tournament progress
    const round = parseInt(localStorage.getItem('ludo_tournament_round') || '0', 10);
    const result = localStorage.getItem('ludo_tournament_result') as 'win' | 'eliminated' | null;
    const savedCompetitors = localStorage.getItem('ludo_tournament_competitors');

    setTournamentRound(round);
    setTournamentResult(result);

    if (savedCompetitors) {
      try {
        setTournamentPlayers(JSON.parse(savedCompetitors));
      } catch (e) {
        console.warn('Error parsing tournament competitors', e);
      }
    }
  }, [currentScreen]);

  const [prestigeState, setPrestigeState] = useState(() => prestigeEngine.getState());

  useEffect(() => {
    const handlePrestigeChange = () => {
      setPrestigeState(prestigeEngine.getState());
    };
    const unsubXp = eventBus.subscribe(ExperienceEventType.XP_GAINED, handlePrestigeChange);
    const unsubLevel = eventBus.subscribe(ExperienceEventType.LEVEL_UP, handlePrestigeChange);
    const unsubAchievement = eventBus.subscribe(ExperienceEventType.ACHIEVEMENT_UNLOCKED, handlePrestigeChange);
    return () => {
      unsubXp();
      unsubLevel();
      unsubAchievement();
    };
  }, []);

  const [masterVol, setMasterVol] = useState(1.0);
  const [musicVol, setMusicVol] = useState(0.5);
  const [effectsVol, setEffectsVol] = useState(0.8);
  const [reducedAudio, setReducedAudio] = useState(false);

  useEffect(() => {
    if (currentScreen === 'settings') {
      const cfg = soundEngine.getConfig();
      setMasterVol(cfg.masterVolume ?? 1.0);
      setMusicVol(cfg.musicVolume ?? 0.5);
      setEffectsVol(cfg.effectsVolume ?? 0.8);
      setReducedAudio(cfg.reducedAudioMode ?? false);
    }
  }, [currentScreen]);

  const handleMasterVolumeChange = (val: number) => {
    setMasterVol(val);
    soundEngine.updateConfig({ masterVolume: val });
  };

  const handleMusicVolumeChange = (val: number) => {
    setMusicVol(val);
    soundEngine.updateConfig({ musicVolume: val });
  };

  const handleEffectsVolumeChange = (val: number) => {
    setEffectsVol(val);
    soundEngine.updateConfig({ effectsVolume: val });
  };

  const handleReducedAudioToggle = () => {
    const nextVal = !reducedAudio;
    setReducedAudio(nextVal);
    soundEngine.updateConfig({ reducedAudioMode: nextVal });
  };

  const handleStartTournament = () => {
    audio.playClick();
    // Generate 7 unique tournament bots
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const selectedCompetitors = shuffled.slice(0, 7);
    
    localStorage.setItem('ludo_tournament_round', '1');
    localStorage.removeItem('ludo_tournament_result');
    localStorage.setItem('ludo_tournament_competitors', JSON.stringify(selectedCompetitors));
    
    setTournamentRound(1);
    setTournamentResult(null);
    setTournamentPlayers(selectedCompetitors);
  };

  const handleStartTournamentMatch = () => {
    audio.playClick();
    
    // Set active match flag in localStorage
    localStorage.setItem('ludo_tournament_match_active', 'true');
    localStorage.setItem('ludo_tournament_round', tournamentRound.toString());

    // Prepare players for this round
    const playerName = localStorage.getItem('ludo_player_name') || 'Player 1';
    const prepared: Player[] = [];
    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

    // Me (Always red in tournament)
    prepared.push({
      id: 'red',
      name: playerName,
      color: 'red',
      type: 'human',
      avatar: '👑',
      isWinner: false,
    });

    // Competitors based on round
    if (tournamentRound === 1) {
      // Quarter-finals: Me vs Bots 0, 1, 2
      prepared.push({
        id: 'green',
        name: tournamentPlayers[0] || 'Ruby Bot',
        color: 'green',
        type: 'computer',
        avatar: '🤖',
        isWinner: false,
      });
      prepared.push({
        id: 'yellow',
        name: tournamentPlayers[1] || 'Emerald Bot',
        color: 'yellow',
        type: 'computer',
        avatar: '🦁',
        isWinner: false,
      });
      prepared.push({
        id: 'blue',
        name: tournamentPlayers[2] || 'Sapphire Bot',
        color: 'blue',
        type: 'computer',
        avatar: '🐳',
        isWinner: false,
      });
    } else if (tournamentRound === 2) {
      // Semi-finals: Me vs Bots 3, 4, 5
      prepared.push({
        id: 'green',
        name: tournamentPlayers[3] || 'Vikram',
        color: 'green',
        type: 'computer',
        avatar: '🦊',
        isWinner: false,
      });
      prepared.push({
        id: 'yellow',
        name: tournamentPlayers[4] || 'Sneha',
        color: 'yellow',
        type: 'computer',
        avatar: '🐼',
        isWinner: false,
      });
      prepared.push({
        id: 'blue',
        name: tournamentPlayers[5] || 'Aarav',
        color: 'blue',
        type: 'computer',
        avatar: '🐯',
        isWinner: false,
      });
    } else {
      // Finals: Me vs Bot 6 (plus 2 other bots)
      prepared.push({
        id: 'green',
        name: tournamentPlayers[6] || 'Emperor Bot',
        color: 'green',
        type: 'computer',
        avatar: '👑',
        isWinner: false,
      });
      prepared.push({
        id: 'yellow',
        name: 'Pooja',
        color: 'yellow',
        type: 'computer',
        avatar: '🦄',
        isWinner: false,
      });
      prepared.push({
        id: 'blue',
        name: 'Rohan',
        color: 'blue',
        type: 'computer',
        avatar: '🐉',
        isWinner: false,
      });
    }

    onStartTournamentGame(prepared);
  };

  const handleResetTournament = () => {
    audio.playClick();
    localStorage.removeItem('ludo_tournament_round');
    localStorage.removeItem('ludo_tournament_result');
    localStorage.removeItem('ludo_tournament_competitors');
    setTournamentRound(0);
    setTournamentResult(null);
  };

  const handleToggleRule = (key: keyof GameRules) => {
    audio.playClick();
    const updated = {
      ...rules,
      [key]: !rules[key],
    };
    setRules(updated);
    onUpdateRules(updated);
  };

  const handleMuteClick = () => {
    onMuteToggle();
  };

  if (currentScreen === 'tournament') {
    return (
      <TournamentDashboard
        onBack={() => {
          audio.playClick();
          setCurrentScreen('main');
        }}
        onStartTournamentGame={onStartTournamentGame}
      />
    );
  }

  if (currentScreen === 'rewards') {
    return (
      <RewardDashboard
        onBack={() => {
          audio.playClick();
          setCurrentScreen('main');
        }}
      />
    );
  }

  if (currentScreen === 'prestige') {
    return (
      <PrestigeCollection
        stats={stats}
        onBack={() => {
          audio.playClick();
          setCurrentScreen('main');
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto select-none relative px-2">

      <AnimatePresence mode="wait">

        {/* ══════════════════════════════════════════
            MAIN HOME SCREEN — Ultra Premium Warm Pastel
            ══════════════════════════════════════════ */}
        {currentScreen === 'main' && (
          <motion.div
            key="main-screen"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            {/* Outer card — warm cream 3D glossy shell */}
            <div className="relative overflow-hidden rounded-3xl"
              style={{
                background: 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 40%,#fdf0e8 100%)',
                boxShadow: '0 32px 80px -12px rgba(180,120,60,0.22),0 8px 32px -8px rgba(180,120,60,0.14),inset 0 1px 0 rgba(255,255,255,0.9)',
                border: '1.5px solid rgba(245,200,130,0.4)',
              }}>

              {/* Subtle board dot pattern */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle,rgba(180,120,60,0.07) 1.5px,transparent 1.5px)', backgroundSize: '18px 18px' }} />

              {/* Top glass sheen */}
              <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none rounded-t-3xl"
                style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.72) 0%,transparent 100%)' }} />

              {/* ── TOP PROFILE BAR ── */}
              <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
                {(() => {
                  const rankInfo = prestigeEngine.getRankInfo(prestigeState.level);
                  const activeTitleObj = DEFAULT_TITLES.find(t => t.id === prestigeState.selectedTitleId);
                  const activeTitle = activeTitleObj ? activeTitleObj.name : 'Rookie';
                  const playerName = (typeof window !== 'undefined' && localStorage.getItem('ludo_player_name')) || 'Player';
                  const hasDiamondFrame = (() => {
                    try { return (JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]') as string[]).includes('diamond-frame'); } catch { return false; }
                  })();
                  return (
                    <div className="flex items-center gap-3">
                      {/* Avatar — 3D glossy orb with optional diamond frame */}
                      <div className="relative">
                        {/* Diamond frame outer ring */}
                        {hasDiamondFrame && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-1.5 rounded-2xl pointer-events-none"
                            style={{
                              background: 'conic-gradient(from 0deg,#a8edea,#fed6e3,#d4fc79,#96e6a1,#a8edea)',
                              borderRadius: '18px',
                              padding: '2px',
                              zIndex: 0,
                            }}>
                            <div className="w-full h-full rounded-2xl" style={{background:'#fdf8f0'}} />
                          </motion.div>
                        )}
                        {hasDiamondFrame && (
                          <span className="absolute -top-2 -right-2 text-sm z-10" style={{filter:'drop-shadow(0 1px 3px rgba(100,100,255,0.5))'}}>💎</span>
                        )}
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white relative overflow-hidden"
                          style={{
                            background: hasDiamondFrame
                              ? 'linear-gradient(145deg,#a8edea,#fed6e3)'
                              : 'linear-gradient(145deg,#fb923c,#ea580c)',
                            boxShadow: hasDiamondFrame
                              ? '0 6px 18px rgba(168,237,234,0.5),inset 0 1.5px 3px rgba(255,255,255,0.7)'
                              : '0 6px 18px rgba(234,88,12,0.4),inset 0 1.5px 3px rgba(255,255,255,0.55),inset 0 -2px 4px rgba(0,0,0,0.12)',
                            zIndex: 1,
                            position: 'relative',
                          }}>
                          <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-2xl pointer-events-none"
                            style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)' }} />
                          <span className="relative z-10" style={{color: hasDiamondFrame ? '#1e3a8a' : 'white'}}>
                            {playerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {/* Level pip */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-white"
                          style={{ background: 'linear-gradient(145deg,#f59e0b,#d97706)', boxShadow: '0 2px 6px rgba(245,158,11,0.55)', zIndex: 2 }}>
                          {prestigeState.level}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold leading-tight" style={{color: hasDiamondFrame ? '#1e3a8a' : '#d97706'}}>
                          {hasDiamondFrame ? '💎' : '👋'} Hi, {playerName.split(' ')[0]}!
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-600">{rankInfo.badgeEmoji} {rankInfo.name}</span>
                          <span className="text-[9px] text-stone-400 font-bold">· {activeTitle}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Point badge — 3D glossy gold pill */}
                {(() => {
                  const points = rewardEngine.getPoints().availablePoints;
                  return (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl relative overflow-hidden cursor-default"
                      style={{
                        background: 'linear-gradient(145deg,#fef3c7,#fde68a)',
                        border: '1.5px solid #f59e0b',
                        boxShadow: '0 4px 14px rgba(245,158,11,0.25),inset 0 1px 2px rgba(255,255,255,0.8)',
                      }}>
                      <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-2xl pointer-events-none"
                        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)' }} />
                      <span className="text-base relative z-10">⭐</span>
                      <span className="text-xs font-black text-amber-800 relative z-10">{points.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })()}
              </div>

              {/* ── XP PROGRESS BAR ── */}
              {(() => {
                const nextLvl = prestigeEngine.getNextLevelThreshold(prestigeState.level);
                const prevLvl = prestigeState.level > 1 ? prestigeEngine.getNextLevelThreshold(prestigeState.level - 1) : 0;
                const pct = Math.max(0, Math.min(100, ((prestigeState.xp - prevLvl) / (nextLvl - prevLvl)) * 100));
                return (
                  <div className="relative z-10 px-5 pb-3 flex items-center gap-2">
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider whitespace-nowrap">XP</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(180,120,60,0.14)', border: '1px solid rgba(180,120,60,0.18)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg,#fbbf24,#f59e0b,#d97706)', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }} />
                    </div>
                    <span className="text-[9px] font-bold text-stone-400 whitespace-nowrap">{prestigeState.xp}/{nextLvl}</span>
                  </div>
                );
              })()}

              {/* ── HERO LOGO ── */}
              <div className="relative z-10 flex flex-col items-center pt-1 pb-5 px-5">
                {/* Floating crown */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-4xl mb-2"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.55))' }}>
                  👑
                </motion.div>

                {/* L·U·D·O blocks — 3D glossy */}
                <div className="flex items-center gap-2 mb-3">
                  {([
                    { letter: 'L', from: '#f43f5e', to: '#e11d48', glowColor: 'rgba(244,63,94,0.6)' },
                    { letter: 'U', from: '#3b82f6', to: '#2563eb', glowColor: 'rgba(59,130,246,0.6)' },
                    { letter: 'D', from: '#22c55e', to: '#16a34a', glowColor: 'rgba(34,197,94,0.6)' },
                    { letter: 'O', from: '#f59e0b', to: '#d97706', glowColor: 'rgba(245,158,11,0.6)' },
                  ] as const).map(({ letter, from, to, glowColor }) => (
                    <div key={letter}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white relative overflow-hidden"
                      style={{
                        background: `linear-gradient(145deg,${from},${to})`,
                        boxShadow: `0 6px 0 ${glowColor.replace('0.6', '1').replace('rgba', 'rgb').replace(',1)', ')')},0 10px 24px ${glowColor},inset 0 1.5px 3px rgba(255,255,255,0.5)`,
                      }}>
                      <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-xl pointer-events-none"
                        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)' }} />
                      <span className="relative z-10">{letter}</span>
                    </div>
                  ))}
                </div>

                {/* Royale badge */}
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 px-4 py-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(145deg,rgba(254,243,199,0.9),rgba(253,230,138,0.7))',
                    border: '1px solid rgba(245,158,11,0.4)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7),0 2px 8px rgba(245,158,11,0.15)',
                  }}>
                  Royale · Premium Edition
                </div>
              </div>

              {/* ── MODE BUTTONS — 2×2 GLOSSY GRID ── */}
              <div className="relative z-10 px-5 pb-4 grid grid-cols-2 gap-3">
                {([
                  { label: 'vs Computer', emoji: '🤖', from: '#fda4af', to: '#fb7185', bottomColor: '#f43f5e', glow: 'rgba(244,63,94,0.35)', textDark: '#881337', action: () => { audio.playClick(); onStartGameWithMode('ai'); } },
                  { label: 'Pass & Play', emoji: '🧩', from: '#86efac', to: '#4ade80', bottomColor: '#22c55e', glow: 'rgba(34,197,94,0.35)', textDark: '#14532d', action: () => { audio.playClick(); onStartGameWithMode('pass'); } },
                  { label: 'Tournament', emoji: isGuest ? '🔒' : '🏆', from: '#93c5fd', to: '#60a5fa', bottomColor: '#3b82f6', glow: 'rgba(59,130,246,0.35)', textDark: '#1e3a8a', action: () => { audio.playClick(); if (isGuest) { onGuestLock?.('Tournament'); } else { setCurrentScreen('tournament'); } } },
                  { label: 'Rewards', emoji: isGuest ? '🔒' : '🪙', from: '#fde68a', to: '#fcd34d', bottomColor: '#f59e0b', glow: 'rgba(245,158,11,0.35)', textDark: '#78350f', action: () => { audio.playClick(); if (isGuest) { onGuestLock?.('Rewards'); } else { setCurrentScreen('rewards'); } } },
                ] as const).map(({ label, emoji, from, to, bottomColor, glow, textDark, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ y: -4, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                    whileTap={{ y: 3, scale: 0.97 }}
                    onMouseEnter={() => audio.playHover()}
                    onClick={action}
                    className="relative overflow-hidden rounded-2xl flex flex-col items-center gap-2 py-4 px-2 cursor-pointer"
                    style={{
                      background: `linear-gradient(145deg,${from},${to})`,
                      border: `2px solid ${bottomColor}`,
                      boxShadow: `0 6px 0 ${bottomColor},0 10px 24px ${glow},inset 0 1.5px 3px rgba(255,255,255,0.6)`,
                    }}>
                    {/* Top gloss layer */}
                    <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-2xl pointer-events-none"
                      style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.55) 0%,transparent 100%)' }} />
                    {/* Inner highlight border */}
                    <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                      style={{ border: '1px solid rgba(255,255,255,0.45)' }} />
                    {/* Icon orb — white 3D glossy */}
                    <div className="w-13 h-13 rounded-xl flex items-center justify-center text-2xl relative overflow-hidden"
                      style={{
                        width: '52px', height: '52px',
                        background: 'rgba(255,255,255,0.88)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1),inset 0 1.5px 3px rgba(255,255,255,0.95)',
                      }}>
                      <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-xl pointer-events-none"
                        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7) 0%,transparent 100%)' }} />
                      <span className="relative z-10">{emoji}</span>
                    </div>
                    <div className="relative z-10 text-center">
                      <div className="text-[11px] font-black uppercase tracking-wide" style={{ color: textDark }}>{label}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* ── BOTTOM PILL QUICK ACTIONS ── */}
              <div className="relative z-10 px-5 pb-5 flex gap-2 justify-center flex-wrap">
                {([
                  { label: 'Prestige', emoji: '✨', action: () => { audio.playClick(); setCurrentScreen('prestige'); } },
                  { label: 'Stats', emoji: '📊', action: () => { audio.playClick(); onViewStats(); } },
                  { label: 'Settings', emoji: '⚙️', action: () => { audio.playClick(); setCurrentScreen('settings'); } },
                ] as const).map(({ label, emoji, action }) => (
                  <motion.button key={label}
                    whileHover={{ y: -2, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={action}
                    onMouseEnter={() => audio.playHover()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.88)',
                      border: '1.5px solid rgba(180,120,60,0.22)',
                      boxShadow: '0 3px 0 rgba(180,120,60,0.18),0 4px 12px rgba(180,120,60,0.1),inset 0 1px 2px rgba(255,255,255,0.9)',
                    }}>
                    <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-full pointer-events-none"
                      style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.6) 0%,transparent 100%)' }} />
                    <span className="text-sm relative z-10">{emoji}</span>
                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-wide relative z-10">{label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Bottom glow fade */}
              <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none rounded-b-3xl"
                style={{ background: 'linear-gradient(0deg,rgba(253,240,232,0.6) 0%,transparent 100%)' }} />
            </div>
          </motion.div>
        )}

        {/* SCREEN 3: SETTINGS SCREEN */}
        {currentScreen === 'settings' && (
          <motion.div
            key="settings-screen"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="flex flex-col gap-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-amber-200/30">
              <button
                onClick={() => {
                  audio.playClick();
                  setCurrentScreen('main');
                }}
                className="p-1.5 rounded-lg hover:bg-amber-100/40 transition" style={{background:"rgba(255,255,255,0.88)",border:"1.5px solid rgba(180,120,60,0.22)"}}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-lg font-black text-stone-800 uppercase tracking-tight">
                  ⚙ Settings Panel
                </h2>
                <p className="text-xs text-amber-700 font-medium">
                  Customize rules, sound configurations, and view history
                </p>
              </div>
            </div>

            {/* Section 1: Audio & Audio Toggles */}
            <div className="flex flex-col gap-4 p-4 rounded-2xl" style={{background:"rgba(255,255,255,0.7)",border:"1.5px solid rgba(180,120,60,0.2)",boxShadow:"0 3px 12px rgba(140,80,20,0.08),inset 0 1px 2px rgba(255,255,255,0.9)"}} >
              <div className="flex items-center justify-between border-b border-amber-200/30 pb-2 mb-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Sound System
                </h4>
                <button
                  onClick={handleMuteClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider text-amber-700 transition" style={{background:"rgba(255,255,255,0.88)",border:"1.5px solid rgba(180,120,60,0.22)",boxShadow:"0 2px 6px rgba(140,80,20,0.1)"}}
                >
                  {isMuted ? (
                    <>
                      <VolumeX size={13} className="text-rose-500" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} className="text-emerald-500" />
                      Enabled
                    </>
                  )}
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-700 font-bold flex items-center gap-1.5">
                    <Volume2 size={14} className="text-amber-500" />
                    Master Volume
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 font-bold">{Math.round(masterVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVol}
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 rounded-lg appearance-none h-1.5 cursor-pointer bg-amber-100"
                />
              </div>

              {/* Music Volume Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-700 font-bold flex items-center gap-1.5">
                    <Music size={14} className="text-emerald-500" />
                    Atmosphere Music
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 font-bold">{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVol}
                  onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 rounded-lg appearance-none h-1.5 cursor-pointer bg-amber-100"
                />
              </div>

              {/* Effects Volume Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-700 font-bold flex items-center gap-1.5">
                    <Volume1 size={14} className="text-indigo-500" />
                    Game SFX Volume
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 font-bold">{Math.round(effectsVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={effectsVol}
                  onChange={(e) => handleEffectsVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 rounded-lg appearance-none h-1.5 cursor-pointer bg-amber-100"
                />
              </div>

              {/* Reduced Audio Mode Toggle */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/30 mt-1">
                <div className="flex flex-col">
                  <span className="text-stone-700 font-bold">Reduced Audio Mode</span>
                  <span className="text-[10px] text-amber-600">Uses lighter synth nodes to optimize battery</span>
                </div>
                <button
                  onClick={handleReducedAudioToggle}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    reducedAudio ? 'bg-amber-400' : 'bg-amber-100'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                      reducedAudio ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Section 2: Custom House Rules */}
            <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{background:"rgba(255,255,255,0.7)",border:"1.5px solid rgba(180,120,60,0.2)",boxShadow:"0 3px 12px rgba(140,80,20,0.08),inset 0 1px 2px rgba(255,255,255,0.9)"}} >
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                Custom House Rules
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'sixToExit', label: 'Unlock Base (Must roll 6 to release token)' },
                  { key: 'rollAgainOnSix', label: 'Rolling a 6 grants an Extra Turn' },
                  { key: 'rollAgainOnCapture', label: 'Capturing an opponent grants an Extra Turn' },
                  { key: 'rollAgainOnHome', label: 'Getting a token home grants an Extra Turn' },
                  { key: 'stackingEnabled', label: 'Token Stacking (Same color cells form safe blocks)' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-xs">
                    <span className="text-stone-700 font-bold">{item.label}</span>
                    <button
                      onClick={() => handleToggleRule(item.key as keyof GameRules)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        rules[item.key as keyof GameRules] ? 'bg-amber-400' : 'bg-amber-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                          rules[item.key as keyof GameRules] ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Game records & Guides */}
            <div className="grid grid-cols-2 gap-3">
              {/* Game stats button */}
              <button
                onClick={() => {
                  audio.playClick();
                  onViewStats();
                }}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-xs font-black text-stone-700 dark:text-stone-200 transition"
              >
                <Trophy size={14} className="text-yellow-500" />
                Game Records
              </button>

              {/* Reset stats button */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all local stats records? This is permanent.')) {
                    audio.playClick();
                    onResetStats();
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-black transition"
              >
                <Trash2 size={14} />
                Reset Records
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
