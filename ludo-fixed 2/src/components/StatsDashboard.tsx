/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerStats, GameHistoryEntry } from '../types';
import { Trophy, RefreshCw, BarChart2, Star, Calendar, Hash, Clock, ArrowLeft, Trash2 } from 'lucide-react';
import { audio } from '../utils/audio';

interface StatsDashboardProps {
 stats: PlayerStats;
 history: GameHistoryEntry[];
 onBack: () => void;
 onResetStats: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
 stats,
 history,
 onBack,
 onResetStats,
}) => {
 const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
 const avgSixes = stats.totalRolls > 0 ? ((stats.totalSixes / stats.totalRolls) * 100).toFixed(1) : '0';

 const formatDuration = (sec: number) => {
 const mins = Math.floor(sec / 60);
 const remainingSec = sec % 60;
 return `${mins}m ${remainingSec}s`;
 };

 const [isConfirmingReset, setIsConfirmingReset] = React.useState(false);

 const handleResetClick = () => {
 audio.playClick();
 if (!isConfirmingReset) {
 setIsConfirmingReset(true);
 // Auto-cancel confirmation after 4 seconds
 setTimeout(() => {
 setIsConfirmingReset(false);
 }, 4000);
 } else {
 onResetStats();
 setIsConfirmingReset(false);
 }
 };

 return (
 <div className="w-full max-w-xl mx-auto rounded-3xl p-5 md:p-6 flex flex-col gap-5 select-none relative overflow-hidden" style={{background:"linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)",border:"1.5px solid rgba(245,200,130,0.4)",boxShadow:"0 32px 80px -12px rgba(180,120,60,0.22),inset 0 1px 0 rgba(255,255,255,0.9)"}}>
 {/* Header back bar */}
 <div className="flex items-center justify-between pb-3 border-b border-amber-200/30 ">
 <button
 id="stats-back-btn"
 onClick={() => {
 audio.playClick();
 onBack();
 }}
 className="flex items-center gap-1.5 text-xs font-black text-amber-600 hover:text-stone-800 uppercase tracking-wider transition"
 >
 <ArrowLeft size={16} />
 Back to Menu
 </button>

 <button
 id="stats-reset-btn"
 onClick={handleResetClick}
 className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition duration-200 ${
 isConfirmingReset 
 ? "text-rose-600 bg-rose-500/10 px-2 sm:px-3 py-1 rounded-lg animate-pulse border border-rose-500/20" 
 : "text-rose-500 hover:text-rose-600"
 }`}
 title={isConfirmingReset ? "Click again to confirm deleting all statistics" : "Reset All Stats"}
 >
 <Trash2 size={14} />
 {isConfirmingReset ? "Confirm Reset?" : "Reset All"}
 </button>
 </div>

 {/* Main Stats Header Title */}
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
 <BarChart2 size={24} />
 </div>
 <div>
 <h2 className="text-xl font-black text-stone-900 tracking-tight leading-none">
 HALL OF RECORDS
 </h2>
 <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mt-1">
 Track your matches & achievements
 </p>
 </div>
 </div>

 {/* Metrics Grid Cards (Bento style) */}
 <div className="grid grid-cols-2 gap-3">
 {/* Games Played Card */}
 <div className="bg-white/70 rounded-xl p-3 border border-amber-200/40 flex flex-col justify-between">
 <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
 Matches Played
 </span>
 <div className="flex items-baseline gap-1.5 mt-1.5">
 <span className="text-2xl font-black text-stone-800 ">
 {stats.gamesPlayed}
 </span>
 <span className="text-[10px] text-amber-700 font-semibold">rounds</span>
 </div>
 </div>

 {/* Win Rate Card */}
 <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 flex flex-col justify-between">
 <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
 Win Ratio
 </span>
 <div className="flex items-baseline gap-1.5 mt-1.5">
 <span className="text-2xl font-black text-amber-500">
 {winRate}%
 </span>
 <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1">
 <div
 className="bg-amber-500 h-full rounded-full"
 style={{ width: `${winRate}%` }}
 />
 </div>
 </div>
 </div>

 {/* Total Rolls Metrics */}
 <div className="bg-white/70 rounded-xl p-3 border border-amber-200/40 flex flex-col gap-1">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
 Total Rolls
 </span>
 <Hash size={12} className="text-amber-700" />
 </div>
 <p className="text-xl font-black text-stone-800 mt-1">
 {stats.totalRolls}
 </p>
 <span className="text-[9px] text-amber-700 font-medium">
 with {stats.totalSixes} sixes ({avgSixes}%)
 </span>
 </div>

 {/* Captures Card */}
 <div className="bg-white/70 rounded-xl p-3 border border-amber-200/40 flex flex-col gap-1">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
 Token Captures
 </span>
 <Trophy size={12} className="text-amber-700" />
 </div>
 <p className="text-xl font-black text-stone-800 mt-1">
 {stats.totalCaptures}
 </p>
 <span className="text-[9px] text-amber-700 font-medium">
 opponent tokens captured
 </span>
 </div>
 </div>

 {/* Mini Achievements widgets */}
 <div className="bg-white/60 rounded-xl p-3 border border-amber-200/40 flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow">
 <Star size={14} className="text-white" fill="currentColor" />
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-stone-800 dark:text-stone-700">Lucky Roll Streak</span>
 <span className="text-[10px] text-amber-700">Most consecutive 6 rolls</span>
 </div>
 </div>
 <span className="text-base font-black text-stone-800 dark:text-stone-700">
 {stats.highestRollStreak} rolls
 </span>
 </div>

 {/* Match History Log */}
 <div className="flex flex-col gap-2.5">
 <h3 className="text-xs font-black uppercase tracking-wider text-amber-700">
 Recent Match History ({history.length})
 </h3>

 {history.length === 0 ? (
 <div className="text-center py-6 border border-dashed border-stone-200 rounded-xl text-amber-700 text-xs">
 No games completed yet. Play your first match to log records!
 </div>
 ) : (
 <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
 {history.slice().reverse().map((entry) => {
 // Find local human player performance in that round
 const humanRanks = entry.players
 .filter(p => p.type === 'human')
 .map(p => `${p.name}: ${p.rank ? `${p.rank} Place` : 'DNF'}`);

 return (
 <div
 key={entry.id}
 className="bg-white dark:bg-white/70 border border-stone-200/55 dark:border-amber-200/40 rounded-xl p-2.5 flex justify-between items-center text-xs shadow-sm"
 >
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
 <span className="flex items-center gap-1">
 <Calendar size={10} />
 {entry.date}
 </span>
 <span className="flex items-center gap-1">
 <Clock size={10} />
 {formatDuration(entry.durationSeconds)}
 </span>
 </div>

 <div className="flex flex-wrap gap-1 mt-0.5">
 {entry.players.map((p, idx) => (
 <span
 key={idx}
 className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 bg-stone-50 dark:bg-white/60 border border-amber-200/40/50`}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${p.color === 'red' ? 'bg-rose-500' : p.color === 'green' ? 'bg-emerald-500' : p.color === 'yellow' ? 'bg-amber-400' : 'bg-sky-500'}`} />
 {p.name} {p.rank ? `(#${p.rank})` : ''}
 </span>
 ))}
 </div>
 </div>

 <div className="text-right">
 <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 rounded-md px-1.5 py-0.5">
 COMPLETED
 </span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
};
