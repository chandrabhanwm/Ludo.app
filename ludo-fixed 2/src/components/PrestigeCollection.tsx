/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Award, 
  User, 
  ArrowLeft, 
  Flame, 
  Sparkles, 
  Lock, 
  Check, 
  Zap, 
  Shield, 
  Target 
} from 'lucide-react';
import { audio } from '../utils/audio';
import { experienceEngine } from '../experience';
import { 
  prestigeEngine, 
  DEFAULT_BADGES, 
  DEFAULT_CROWNS, 
  DEFAULT_TITLES 
} from '../prestige/prestigeEngine';
import { PrestigeState } from '../prestige/types';
import { PlayerStats } from '../types';

interface PrestigeCollectionProps {
  onBack: () => void;
  stats: PlayerStats;
}

export const PrestigeCollection: React.FC<PrestigeCollectionProps> = ({ onBack, stats }) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'crowns' | 'titles' | 'trophies'>('badges');
  const [prestigeState, setPrestigeState] = useState<PrestigeState>(prestigeEngine.getState());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    // Force recalculation when stats are loaded
    const currentLvl = parseInt(localStorage.getItem('ludo_player_level') || '1', 10);
    const currentXp = parseInt(localStorage.getItem('ludo_player_xp') || '0', 15);
    const history = JSON.parse(localStorage.getItem('ludo_history') || '[]');
    
    // Evaluate unlocks automatically to make sure everything is up-to-date
    prestigeEngine.evaluateNewUnlocks(stats, history, false);
    setPrestigeState(prestigeEngine.getState());
  }, [stats]);

  const handleEquipCrown = (crownId: string) => {
    audio.playClick();
    prestigeEngine.selectCrown(crownId);
    setPrestigeState(prestigeEngine.getState());
  };

  const handleEquipTitle = (titleId: string) => {
    audio.playClick();
    prestigeEngine.selectTitle(titleId);
    setPrestigeState(prestigeEngine.getState());
  };

  const rankInfo = prestigeEngine.getRankInfo(prestigeState.level);
  
  // Calculate next rank threshold
  const nextRankIndex = prestigeEngine.getRankInfo(prestigeState.level).minLevel === 30 ? -1 : 
    prestigeEngine.getState().level >= 30 ? -1 : 
    prestigeEngine.getRankInfo(prestigeState.level + 1).minLevel;

  const currentLevelMin = rankInfo.minLevel;
  const nextRankMin = nextRankIndex === -1 ? 100 : nextRankIndex;
  
  // Calculate progress percentage of level towards next rank
  const progressPercent = nextRankIndex === -1 ? 100 : Math.min(
    100,
    Math.max(0, ((prestigeState.level - currentLevelMin) / (nextRankMin - currentLevelMin)) * 100)
  );

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl p-5 md:p-6 flex flex-col gap-6 select-none relative overflow-hidden" style={{background:"linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)",border:"1.5px solid rgba(245,200,130,0.4)",boxShadow:"0 32px 80px -12px rgba(180,120,60,0.22),inset 0 1px 0 rgba(255,255,255,0.9)"}}>
      {/* Golden metallic grid lines in background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header back bar */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-200/50 relative z-10">
        <button
          id="prestige-back-btn"
          onClick={() => {
            audio.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-400 uppercase tracking-wider transition duration-200"
        >
          <ArrowLeft size={16} />
          Back to Menu
        </button>

        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 tracking-wider">
          <Flame size={14} className="animate-pulse" />
          {prestigeState.winStreak > 0 ? (
            <span>🔥 {prestigeState.winStreak} Win Streak</span>
          ) : (
            <span>STREAK: READY</span>
          )}
        </div>
      </div>

      {/* Profile & Prestige Rank Progression Block */}
      <div className="bg-white/70 rounded-2xl p-4 md:p-5 border border-amber-200/40 relative overflow-hidden flex flex-col gap-4 shadow-inner relative z-10">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none rounded-bl-full" />
        
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg relative flex items-center justify-center">
            <div className="absolute inset-0.5 bg-white/70 rounded-[14px] flex items-center justify-center">
              <span className="text-3xl filter drop-shadow">{rankInfo.badgeEmoji}</span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-widest leading-none">
              CURRENT PRESTIGE
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white tracking-tight">
                {rankInfo.name} Tier
              </span>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Lvl {prestigeState.level}
              </span>
            </div>
            {prestigeState.selectedTitleId && (
              <p className="text-xs font-black text-amber-400/85 tracking-widest uppercase mt-1">
                🎖 {DEFAULT_TITLES.find(t => t.id === prestigeState.selectedTitleId)?.name}
              </p>
            )}
          </div>
        </div>

        {/* Progression Bar */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-[10px] font-bold text-amber-700 uppercase tracking-wider">
            <span>Progress to Next Tier</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-3 bg-white/70 rounded-full border border-amber-200/30 overflow-hidden p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-amber-600 font-bold uppercase tracking-widest">
            <span>Tier Level {currentLevelMin}</span>
            <span>Tier Level {nextRankMin === 100 ? 'MAX' : nextRankMin}</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex bg-white/80 p-1 rounded-xl border border-amber-200/30 gap-1 relative z-10">
        {[
          { id: 'badges', label: 'Badges', icon: Award },
          { id: 'crowns', label: 'Crowns', icon: Crown },
          { id: 'titles', label: 'Titles', icon: User },
          { id: 'trophies', label: 'Trophies', icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                audio.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-2.5 rounded-lg text-xs font-black tracking-wide uppercase transition duration-150 ${
                isActive 
                  ? 'bg-white/70 border border-amber-200/50 text-amber-400 shadow' 
                  : 'text-amber-700 hover:text-stone-700 hover:bg-white/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-amber-400' : 'text-amber-700'} />
              <span className="text-[10px] sm:text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-[280px] max-h-[350px] overflow-y-auto pr-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {/* BADGES TAB */}
            {activeTab === 'badges' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {DEFAULT_BADGES.map((badge) => {
                  const isUnlocked = prestigeState.unlockedBadgeIds.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`relative overflow-hidden p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 ${
                        isUnlocked 
                          ? 'bg-white/60 border-amber-200/50 hover:border-amber-500/50 shadow-[0_4px_12px_rgba(0,0,0,0.2)]' + (experienceEngine.getConfig().reducedMotion ? '' : ' living-card-animate')
                          : 'bg-white/60/10 border-stone-900/60 opacity-60'
                      }`}
                      onMouseEnter={() => setHoveredItem(badge.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Subtly glowing aura for unlocked */}
                      {isUnlocked && (
                        <div className="absolute -inset-1 bg-amber-500/2 rounded-xl blur-lg pointer-events-none" />
                      )}

                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-2xl shadow relative ${
                        isUnlocked 
                          ? 'bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-500/20 text-white' 
                          : 'bg-white/70 border border-stone-950 text-stone-600'
                      }`}>
                        {isUnlocked ? (
                          <span className="filter drop-shadow">{badge.emoji}</span>
                        ) : (
                          <Lock size={15} className="text-stone-600" />
                        )}
                        
                        {/* Golden Sweep Line */}
                        {isUnlocked && hoveredItem === badge.id && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1s_infinite] pointer-events-none" />
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <h4 className={`text-xs font-black truncate ${isUnlocked ? 'text-amber-400' : 'text-amber-600'}`}>
                          {badge.name}
                        </h4>
                        <p className="text-[10px] text-amber-700 font-semibold mt-0.5 leading-snug">
                          {badge.description}
                        </p>
                        {isUnlocked && (
                          <span className="text-[8px] text-amber-600 font-black tracking-widest uppercase mt-1 block">
                            🏆 Unlocked Automatically
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CROWNS TAB */}
            {activeTab === 'crowns' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {DEFAULT_CROWNS.map((crown) => {
                  const isUnlocked = prestigeState.unlockedCrownIds.includes(crown.id);
                  const isEquipped = prestigeState.selectedCrownId === crown.id;
                  return (
                    <div
                      key={crown.id}
                      className={`relative overflow-hidden p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 ${
                        isUnlocked 
                          ? 'bg-white/60 border-amber-200/50 hover:border-amber-400/45 shadow-[0_4px_12px_rgba(0,0,0,0.2)]' + (experienceEngine.getConfig().reducedMotion ? '' : ' living-card-animate')
                          : 'bg-white/60/10 border-stone-900/60 opacity-60'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-2xl shadow relative ${
                        isUnlocked 
                          ? 'bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-500/20 text-white' 
                          : 'bg-white/70 border border-stone-950 text-stone-600'
                      }`}>
                        {isUnlocked ? (
                          <span className="filter drop-shadow">{crown.emoji}</span>
                        ) : (
                          <Lock size={15} className="text-stone-600" />
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <h4 className={`text-xs font-black truncate ${isUnlocked ? 'text-amber-400' : 'text-amber-600'}`}>
                          {crown.name}
                        </h4>
                        <p className="text-[10px] text-amber-700 font-semibold mt-0.5 leading-snug">
                          {crown.description}
                        </p>
                        <p className="text-[8px] text-amber-500/80 font-bold uppercase tracking-widest mt-1">
                          REQ: {crown.requirement}
                        </p>
                      </div>

                      {isUnlocked && (
                        <button
                          onClick={() => handleEquipCrown(crown.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            isEquipped 
                              ? 'bg-amber-400/15 border-amber-400 text-amber-400' 
                              : 'border-amber-200/50 hover:bg-amber-100/40 text-amber-700'
                          }`}
                          title={isEquipped ? 'Equipped' : 'Equip Crown'}
                        >
                          {isEquipped ? <Check size={12} strokeWidth={3} /> : <span className="text-[9px] font-black tracking-wide uppercase px-0.5">USE</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TITLES TAB */}
            {activeTab === 'titles' && (
              <div className="flex flex-col gap-2.5 pb-4">
                {DEFAULT_TITLES.map((title) => {
                  const isUnlocked = prestigeState.unlockedTitleIds.includes(title.id);
                  const isEquipped = prestigeState.selectedTitleId === title.id;
                  return (
                    <div
                      key={title.id}
                      className={`relative overflow-hidden p-3 px-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                        isUnlocked 
                          ? 'bg-white/60 border-amber-200/30 hover:border-amber-400/40' + (experienceEngine.getConfig().reducedMotion ? '' : ' living-card-animate')
                          : 'bg-white/60/10 border-stone-900/60 opacity-60'
                      }`}
                    >
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black tracking-wide uppercase ${isUnlocked ? 'text-white' : 'text-amber-600'}`}>
                            {title.name}
                          </span>
                          {isUnlocked && (
                            <span className="text-[8px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {title.description}
                        </p>
                        <p className="text-[8px] text-amber-600 font-black uppercase tracking-wider mt-1">
                          REQ: {title.requirement}
                        </p>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipTitle(title.id)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition ${
                            isEquipped 
                              ? 'bg-amber-400/10 border-amber-400 text-amber-400' 
                              : 'border-amber-200/50 hover:bg-amber-100/40 text-stone-600'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <Lock size={12} className="text-stone-600 mr-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TOURNAMENT TROPHIES TAB */}
            {activeTab === 'trophies' && (
              <div className="flex flex-col gap-4 items-center justify-center text-center p-6 bg-white/60/30 rounded-2xl border border-amber-200/30">
                <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500 border border-amber-400/20 relative">
                  <div className="absolute inset-0 bg-amber-400/2 rounded-full blur-md animate-pulse" />
                  <Trophy size={32} className="relative z-10" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Tournament Trophy Room
                  </h4>
                  <p className="text-xs text-amber-700 font-medium max-w-sm mt-1 leading-relaxed">
                    Trophies are awarded automatically upon winning the Grand Finals in the Weekly Tournament bracket mode.
                  </p>
                </div>

                {/* Show earned trophies from localStorage */}
                {parseInt(localStorage.getItem('ludo_tournament_round') || '0', 10) === 4 ? (
                  <div className="bg-white/70 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 w-full max-w-xs text-left">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <h5 className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        Tournament Grand Cup
                      </h5>
                      <p className="text-[10px] text-amber-700 font-semibold">
                        Awarded to Ludo Tournament Champion
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest border border-dashed border-amber-200/50 rounded-lg p-3 px-6">
                     No tournament trophies won yet.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
export default PrestigeCollection;
