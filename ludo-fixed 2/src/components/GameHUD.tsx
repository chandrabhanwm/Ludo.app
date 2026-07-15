/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, PlayerColor, GameLog, GameRules, Token } from '../types';
import { Volume2, VolumeX, Pause, RefreshCw, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import { audio } from '../utils/audio';
import { AIEngine } from '../ai/engine';
import { prestigeEngine, DEFAULT_TITLES, DEFAULT_CROWNS } from '../prestige/prestigeEngine';

const getAIPresentation = (p?: Player) => {
  let level = 2;
  let title = 'AI Rookie';
  let crown = '🤖';
  let rankName = 'Bronze';
  let rankColor = 'text-amber-700';

  if (!p) return { level, title, crown, rankName, rankColor };

  if (p.color === 'green') {
    level = 12;
    title = 'Supreme AI';
    crown = '⚡';
    rankName = 'Platinum';
    rankColor = 'text-teal-400';
  } else if (p.color === 'red') {
    level = 7;
    title = 'Tactician AI';
    crown = '⚙️';
    rankName = 'Gold';
    rankColor = 'text-yellow-400';
  } else if (p.color === 'blue') {
    level = 4;
    title = 'Challenger AI';
    crown = '🦾';
    rankName = 'Silver';
    rankColor = 'text-slate-400';
  } else if (p.color === 'yellow') {
    level = 1;
    title = 'Trainee AI';
    crown = '⚙️';
    rankName = 'Bronze';
    rankColor = 'text-amber-700';
  }
  return { level, title, crown, rankName, rankColor };
};


interface GameHUDProps {
  players: Player[];
  tokens: Token[];
  currentPlayerColor: PlayerColor;
  diceValue: number;
  hasRolled: boolean;
  gameLogs: GameLog[];
  rules: GameRules;
  onPauseToggle: () => void;
  onRestart: () => void;
  onMuteToggle: () => void;
  isMuted: boolean;
  isPaused: boolean;
  tokensFinishedCount: { [key in PlayerColor]: number };
  selectedThemeId?: string;
  onThemeToggle?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  players,
  tokens,
  currentPlayerColor,
  diceValue,
  hasRolled,
  gameLogs,
  rules,
  onPauseToggle,
  onRestart,
  onMuteToggle,
  isMuted,
  isPaused,
  tokensFinishedCount,
  selectedThemeId = 'classic',
  onThemeToggle,
}) => {
  const [logsOpen, setLogsOpen] = useState(false);

  const activePlayers = players.filter(p => p.type !== 'none');
  const currentPlayer = players.find(p => p.color === currentPlayerColor);

  const themeColors = {
    red: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
      border: 'border-rose-500',
      badge: 'bg-rose-500 text-white',
      accent: 'text-rose-500',
      ring: 'ring-rose-500/50',
      progress: 'bg-rose-500',
      text: 'text-rose-700',
    },
    green: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
      border: 'border-emerald-500',
      badge: 'bg-emerald-500 text-white',
      accent: 'text-emerald-500',
      ring: 'ring-emerald-500/50',
      progress: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    yellow: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
      border: 'border-amber-400',
      badge: 'bg-amber-400 text-stone-900',
      accent: 'text-amber-500',
      ring: 'ring-amber-400/50',
      progress: 'bg-amber-450',
      text: 'text-amber-700',
    },
    blue: {
      bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600',
      border: 'border-sky-500',
      badge: 'bg-sky-500 text-white',
      accent: 'text-sky-500',
      ring: 'ring-sky-500/50',
      progress: 'bg-sky-500',
      text: 'text-sky-700',
    },
  };

  const currentTheme = themeColors[currentPlayerColor];

  // Calculate stats for each player
  const getPlayerStats = (color: PlayerColor) => {
    const finishedCount = tokensFinishedCount[color] || 0;
    
    // Sum of positions of all tokens
    const playerTokens = tokens.filter(t => t.playerColor === color);
    const totalDistance = playerTokens.reduce((sum, t) => {
      if (t.position === 'yard') return sum;
      return sum + t.position; // 1 to 56
    }, 0);

    const maxDistance = 224; // 4 tokens * 56 steps
    const progressPercent = Math.min(100, Math.round((totalDistance / maxDistance) * 100));

    return {
      totalDistance,
      progressPercent,
      finishedCount,
    };
  };

  // Sort active players for the leaderboard
  const sortedLeaderboard = [...activePlayers].sort((a, b) => {
    // 1. Finished position if won
    if (a.finishedPosition !== undefined && b.finishedPosition !== undefined) {
      return a.finishedPosition - b.finishedPosition;
    }
    if (a.finishedPosition !== undefined) return -1;
    if (b.finishedPosition !== undefined) return 1;

    const statsA = getPlayerStats(a.color);
    const statsB = getPlayerStats(b.color);

    // 2. Tokens finished count
    if (statsA.finishedCount !== statsB.finishedCount) {
      return statsB.finishedCount - statsA.finishedCount;
    }

    // 3. Distance traveled
    return statsB.totalDistance - statsA.totalDistance;
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return { emoji: '🥇', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 1:
        return { emoji: '🥈', bg: 'bg-stone-100 text-stone-800 border-stone-300' };
      case 2:
        return { emoji: '🥉', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
      default:
        return { emoji: '👤', bg: 'bg-stone-50 text-stone-600 border-stone-250' };
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-4 select-none font-sans">
      {/* HUD Controller Header - Compact */}
      <div className="flex justify-between items-center bg-[#faf8f5]/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl p-1.5 sm:p-2.5 border border-[#cfc8bc]/40">
        <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
          <span className="text-xs sm:text-sm font-display font-black tracking-wider text-stone-900 uppercase bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            Ludo Royale
          </span>
          <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-550 text-stone-950 rounded-full shadow-[0_2px_4px_rgba(245,158,11,0.25)] tracking-wider">
            ROYAL
          </span>
          {(import.meta as any).env?.DEV && (
            <span className="text-[7px] sm:text-[9px] font-mono font-black px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 tracking-wider">
              DEV: {AIEngine.getDifficulty('green').toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme Switcher */}
          <button
            id="hud-theme-btn"
            onClick={() => {
              audio.playClick();
              onThemeToggle?.();
            }}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-amber-600 hover:text-stone-900 hover:bg-stone-100 transition duration-200 flex items-center justify-center"
            title={`Switch Theme (Current: ${selectedThemeId === 'classic' ? 'Classic Ludo' : 'Cosmic Slate'})`}
          >
            <span className="text-sm select-none leading-none">
              {selectedThemeId === 'classic' ? '🌌' : '🎨'}
            </span>
          </button>

          {/* Mute button */}
          <button
            id="hud-mute-btn"
            onClick={() => {
              audio.playClick();
              onMuteToggle();
            }}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-amber-600 hover:text-stone-900 hover:bg-stone-100 transition duration-200"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Restart button */}
          <button
            id="hud-restart-btn"
            onClick={() => {
              audio.playClick();
              onRestart();
            }}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-amber-600 hover:text-stone-900 hover:bg-stone-100 transition duration-200"
            title="Restart Game"
          >
            <RefreshCw size={15} />
          </button>

          {/* Pause menu toggle */}
          <button
            id="hud-pause-btn"
            onClick={() => {
              audio.playClick();
              onPauseToggle();
            }}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-amber-600 hover:text-stone-900 hover:bg-stone-100 transition duration-200"
          >
            <Pause size={15} />
          </button>
        </div>
      </div>

      {/* NEW: Elegant Real-time Racing Leaderboard */}
      <div className="bg-[#faf8f5]/95 backdrop-blur-md rounded-2xl border border-stone-200/40 shadow-xl overflow-hidden p-3 sm:p-4.5 flex flex-col gap-3">
        {/* Leaderboard Header */}
        <div className="flex items-center justify-between border-b border-stone-200/30 pb-2">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-amber-500 animate-pulse" />
            <div>
              <h3 className="text-[10px] sm:text-xs font-black tracking-wider text-stone-900 uppercase">
                Racing Leaderboard
              </h3>
              <p className="text-[7px] sm:text-[9px] font-bold text-amber-700 uppercase">
                Real-time Positions & Tracking
              </p>
            </div>
          </div>
          <span className="text-[7px] sm:text-[9px] font-mono font-black text-[#decbb8] bg-[#3a1622] px-2 py-0.5 rounded-full uppercase border border-[#5c1e32]/40 tracking-wider">
            Live
          </span>
        </div>

        {/* Leaderboard List */}
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sortedLeaderboard.map((p, index) => {
              const isCurrent = p.color === currentPlayerColor;
              const stats = getPlayerStats(p.color);
              const badge = getRankBadge(index);
              const theme = themeColors[p.color];

              const shadowGlowClass = {
                red: 'shadow-[0_10px_35px_rgba(0,0,0,0.15),0_0_20px_rgba(244,63,94,0.18)] border-rose-500/60',
                green: 'shadow-[0_10px_35px_rgba(0,0,0,0.15),0_0_20px_rgba(16,185,129,0.18)] border-emerald-500/60',
                blue: 'shadow-[0_10px_35px_rgba(0,0,0,0.15),0_0_20px_rgba(14,165,233,0.18)] border-sky-500/60',
                yellow: 'shadow-[0_10px_35px_rgba(0,0,0,0.15),0_0_20px_rgba(245,158,11,0.18)] border-amber-500/60',
              }[p.color];

              return (
                <motion.div
                  key={p.color}
                  layout
                  className={`relative p-2.5 rounded-xl border transition-all duration-350 flex flex-col gap-1.5 overflow-hidden ${
                    isCurrent
                      ? `backdrop-blur-lg bg-white/70 border-2 ${shadowGlowClass} ring-[3px] ring-amber-400/20 scale-[1.015] z-10`
                      : 'backdrop-blur-md bg-white/15 border-stone-200/15 shadow-sm opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Glass sheen reflection overlay */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                  {/* Large floating trophy badge for the match winner */}
                  {p.finishedPosition === 1 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 text-stone-900 rounded-full border-[1.5px] border-white shadow-[0_5px_15px_rgba(245,158,11,0.7)] z-20 animate-bounce" style={{ animationDuration: '2.5s' }}>
                      <Trophy size={17} className="shrink-0 animate-pulse" />
                    </div>
                  )}

                  {/* Top line: Rank, Name, Score */}
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Indicator */}
                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black border ${badge.bg}`}>
                        {badge.emoji}
                      </span>

                      {/* Avatar */}
                      {/^https?:\/\//.test(p.avatar) ? (
                        <img
                          src={p.avatar}
                          alt=""
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-xs sm:text-base shrink-0 select-none">
                          {p.avatar}
                        </span>
                      )}

                      {/* Name & Role */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs sm:text-sm font-black tracking-wide truncate ${theme.text}`}>
                            {p.name}
                          </span>
                          <span className="text-[7px] sm:text-[8px] font-bold uppercase px-1 py-0.2 bg-stone-200/50 text-amber-600 rounded">
                            {p.type === 'computer' ? 'AI' : 'YOU'}
                          </span>
                          {index === 0 && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-500 text-stone-950 font-black text-[7px] sm:text-[9px] px-1.5 py-0.2 rounded-full shadow-[0_2px_5px_rgba(245,158,11,0.4)] tracking-wider shrink-0 animate-pulse">
                              🏆 LEADER
                            </span>
                          )}
                        </div>
                        {/* Player Progression Info Line */}
                        {p.type === 'human' ? (() => {
                          const prestigeState = prestigeEngine.getState();
                          const humanRank = prestigeEngine.getRankInfo(prestigeState.level);
                          const humanTitleObj = DEFAULT_TITLES.find(t => t.id === prestigeState.selectedTitleId);
                          const humanTitle = humanTitleObj ? humanTitleObj.name : 'Rookie';
                          const humanCrownObj = DEFAULT_CROWNS.find(c => c.id === prestigeState.selectedCrownId);
                          const humanCrown = humanCrownObj ? humanCrownObj.emoji : '👑';

                          return (
                            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-stone-450 font-bold leading-tight mt-0.5">
                              <span className="text-[9px] sm:text-[11px]">{humanCrown}</span>
                              <span className="font-extrabold text-stone-600 truncate max-w-[60px] sm:max-w-[80px]">{humanTitle}</span>
                              <span className="text-[6px] text-stone-600 select-none">•</span>
                              <span className="text-amber-500 shrink-0">Lvl {prestigeState.level}</span>
                              <span className="text-[6px] text-stone-600 select-none">•</span>
                              <span className={`font-black shrink-0 ${humanRank.color}`}>{humanRank.name} {humanRank.badgeEmoji}</span>
                            </div>
                          );
                        })() : (() => {
                          const aiInfo = getAIPresentation(p);
                          return (
                            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-stone-450 font-bold leading-tight mt-0.5">
                              <span className="text-[9px] sm:text-[11px]">{aiInfo.crown}</span>
                              <span className="font-extrabold text-stone-600 truncate max-w-[60px] sm:max-w-[80px]">{aiInfo.title}</span>
                              <span className="text-[6px] text-stone-600 select-none">•</span>
                              <span className="text-amber-500/80 shrink-0">Lvl {aiInfo.level}</span>
                              <span className="text-[6px] text-stone-600 select-none">•</span>
                              <span className={`font-black shrink-0 ${aiInfo.rankColor}`}>{aiInfo.rankName}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Progress Stats Badge */}
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      {isCurrent && (
                        <span className="flex h-1.5 w-1.5 shrink-0 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                      )}
                      
                      {/* Score Indicator */}
                      <div className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-mono font-black ${
                        p.finishedPosition !== undefined 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        🏁 {stats.finishedCount}/4
                      </div>
                    </div>
                  </div>

                  {/* Progress Line and Percentage */}
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden relative shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progressPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r from-stone-400/20 via-white/10 to-transparent relative ${theme.progress}`}
                      />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-700 shrink-0 w-8 text-right">
                      {stats.progressPercent}%
                    </span>
                  </div>

                  {/* Bottom line: Detailed Steps Info */}
                  <div className="flex justify-between items-center text-[7px] sm:text-[8.5px] text-amber-700 font-mono font-medium leading-none px-0.5 relative z-10">
                    <span>
                      {p.finishedPosition !== undefined 
                        ? `✨ Finished rank #${p.finishedPosition}` 
                        : `🎯 Steps taken: ${stats.totalDistance}/228`
                      }
                    </span>
                    {isCurrent && (
                      <span className={`font-black uppercase animate-pulse ${theme.text}`}>
                        Active Turn
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Elegant Floating Active Instruction Alert */}
        <div className={`rounded-xl border p-2 flex flex-row items-center justify-between gap-2.5 mt-1 transition-all duration-300 ${currentTheme.bg}`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full ${currentPlayerColor === 'yellow' ? 'bg-amber-400' : currentPlayerColor === 'red' ? 'bg-rose-500' : currentPlayerColor === 'green' ? 'bg-emerald-500' : 'bg-sky-500'} flex items-center justify-center text-white text-xs sm:text-sm font-black shadow-md border border-white/20 relative shrink-0 overflow-hidden`}>
              {currentPlayer?.avatar && /^https?:\/\//.test(currentPlayer.avatar) ? (
                <img
                  src={currentPlayer.avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                currentPlayer?.avatar
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-amber-600 leading-none">
                Active Turn
              </h3>
              <p className="text-[10px] sm:text-xs font-display font-black text-stone-900 mt-0.5 leading-none flex items-center gap-1">
                {currentPlayer?.type === 'human' ? (() => {
                  const state = prestigeEngine.getState();
                  const crownObj = DEFAULT_CROWNS.find(c => c.id === state.selectedCrownId);
                  return <span className="text-xs">{crownObj ? crownObj.emoji : '👑'}</span>;
                })() : <span className="text-xs">{getAIPresentation(currentPlayer).crown}</span>}
                <span>{currentPlayer?.name}</span>
              </p>
            </div>
          </div>

          <div className="bg-[#faf8f5]/85 backdrop-blur-md border border-stone-200/10 rounded-lg px-2 py-1 shadow-inner text-[9px] sm:text-[10.5px] font-bold text-stone-800 flex items-center gap-1">
            {currentPlayer?.type === 'computer' ? (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                AI is rolling...
              </span>
            ) : !hasRolled ? (
              <span className="animate-pulse text-amber-600 font-black tracking-wide">🎲 Roll the Dice!</span>
            ) : (
              <span className="text-emerald-600 font-black tracking-wide">👉 Choose Token to Move</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
