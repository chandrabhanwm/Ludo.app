/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, PlayerColor } from '../types';
import {
  Trophy,
  HelpCircle,
  Award,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Play,
  RotateCcw,
  BookOpen,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { audio } from '../utils/audio';
import { 
  PRODUCTION_OPPONENTS as OPPONENTS,
  TOURNAMENT_TOTAL_MATCHES,
  TOURNAMENT_QUALIFICATION_TARGET
} from '../tournament/config';

interface TournamentDashboardProps {
  onBack: () => void;
  onStartTournamentGame: (setupPlayers: Player[]) => void;
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({
  onBack,
  onStartTournamentGame,
}) => {
  // Screen States: 'dashboard' | 'rules' | 'loading_match' | 'result' | 'progress' | 'summary' | 'leaderboard'
  const [viewState, setViewState] = useState<string>('dashboard');

  // Attempt counters
  const [attemptNum, setAttemptNum] = useState<number>(1);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [wins, setWins] = useState<number>(0);
  const [losses, setLosses] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);

  // Best attempt records
  const [bestWins, setBestWins] = useState<number>(0);
  const [bestPoints, setBestPoints] = useState<number>(0);
  const [bestLosses, setBestLosses] = useState<number>(0);
  const [rank, setRank] = useState<string>('Unranked');

  // Interactive current opponent state
  const [currentOpponent, setCurrentOpponent] = useState<typeof OPPONENTS[0]>(OPPONENTS[0]);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);
  const [lastResult, setLastResult] = useState<'win' | 'loss' | null>(null);

  // Load and sync tournament values from localStorage
  const syncFromStorage = () => {
    let state = localStorage.getItem('ludo_tourney_state') || 'dashboard';
    
    // Safety check: if state is 'playing' or not in valid views, reset to dashboard
    const validStates = ['dashboard', 'rules', 'loading_match', 'result', 'progress', 'summary', 'leaderboard'];
    if (!validStates.includes(state) || state === 'playing') {
      state = 'dashboard';
      localStorage.setItem('ludo_tourney_state', 'dashboard');
    }
    
    const savedAttempt = parseInt(localStorage.getItem('ludo_tourney_attempt_num') || '1', 10);
    const savedGames = parseInt(localStorage.getItem('ludo_tourney_games') || '0', 10);
    const savedWins = parseInt(localStorage.getItem('ludo_tourney_wins') || '0', 10);
    const savedLosses = parseInt(localStorage.getItem('ludo_tourney_losses') || '0', 10);
    const savedPoints = parseInt(localStorage.getItem('ludo_tourney_points') || '0', 10);

    const bWins = parseInt(localStorage.getItem('ludo_tourney_best_wins') || '0', 10);
    const bPoints = parseInt(localStorage.getItem('ludo_tourney_best_points') || '0', 10);
    const bLosses = parseInt(localStorage.getItem('ludo_tourney_best_losses') || '0', 10);
    const savedRank = localStorage.getItem('ludo_tourney_rank') || 'Unranked';

    const lastRes = localStorage.getItem('ludo_tourney_last_result') as 'win' | 'loss' | null;
    const lastEarned = parseInt(localStorage.getItem('ludo_tourney_last_points_earned') || '0', 10);

    setViewState(state);
    setAttemptNum(savedAttempt);
    setGamesPlayed(savedGames);
    setWins(savedWins);
    setLosses(savedLosses);
    setPoints(savedPoints);

    setBestWins(bWins);
    setBestPoints(bPoints);
    setBestLosses(bLosses);
    setRank(savedRank);

    setLastResult(lastRes);
    setLastPointsEarned(lastEarned);

    // Get current opponent (or roll one if not present)
    const oppStr = localStorage.getItem('ludo_tourney_current_opponent');
    if (oppStr) {
      try {
        setCurrentOpponent(JSON.parse(oppStr));
      } catch (e) {
        rollNewOpponent();
      }
    } else {
      rollNewOpponent();
    }
  };

  useEffect(() => {
    syncFromStorage();
  }, []);

  const rollNewOpponent = () => {
    // Pick opponent based on current game number or completely random
    const idx = Math.floor(Math.random() * OPPONENTS.length);
    const opp = OPPONENTS[idx];
    setCurrentOpponent(opp);
    localStorage.setItem('ludo_tourney_current_opponent', JSON.stringify(opp));
  };

  const handleStartTournament = () => {
    audio.playClick();
    // If games is 0, we simply transition to 'loading_match'. If games is 20, we reset.
    if (gamesPlayed >= TOURNAMENT_TOTAL_MATCHES) {
      // Start a new attempt
      const nextAttempt = attemptNum + 1;
      localStorage.setItem('ludo_tourney_attempt_num', nextAttempt.toString());
      localStorage.setItem('ludo_tourney_games', '0');
      localStorage.setItem('ludo_tourney_wins', '0');
      localStorage.setItem('ludo_tourney_losses', '0');
      localStorage.setItem('ludo_tourney_points', '0');
      
      setAttemptNum(nextAttempt);
      setGamesPlayed(0);
      setWins(0);
      setLosses(0);
      setPoints(0);
    }
    
    rollNewOpponent();
    changeViewState('loading_match');
  };

  const handleLaunchMatch = () => {
    audio.playClick();
    
    // Set matching flags in localStorage for App.tsx interception
    localStorage.setItem('ludo_tourney_match_active', 'true');
    localStorage.setItem('ludo_tourney_state', 'playing'); // When match finishes, code redirects

    const playerName = localStorage.getItem('ludo_player_name') || 'Player 1';
    
    // Setup tournament bracket players: Player 1 (Red), Current Opponent (Green), Player 3 (Yellow), Player 4 (Blue)
    const prepared: Player[] = [
      {
        id: 'red',
        name: playerName,
        color: 'red',
        type: 'human',
        avatar: '👑',
        isWinner: false,
      },
      {
        id: 'green',
        name: currentOpponent.name,
        color: 'green',
        type: 'computer',
        avatar: currentOpponent.avatar,
        isWinner: false,
      },
      {
        id: 'yellow',
        name: 'Player 3',
        color: 'yellow',
        type: 'computer',
        avatar: '🤖',
        isWinner: false,
      },
      {
        id: 'blue',
        name: 'Player 4',
        color: 'blue',
        type: 'computer',
        avatar: '🤖',
        isWinner: false,
      }
    ];

    onStartTournamentGame(prepared);
  };

  const handleContinueAfterResult = () => {
    audio.playClick();
    // Clear last result indicators so they don't pop up again
    localStorage.removeItem('ludo_tourney_last_result');
    localStorage.removeItem('ludo_tourney_last_points_earned');
    setLastResult(null);
    setLastPointsEarned(0);

    // Roll new opponent for next match
    rollNewOpponent();

    // Transition to progress display
    changeViewState('progress');
  };

  const handleContinueAfterProgress = () => {
    audio.playClick();
    // Head back to main tournament dashboard
    changeViewState('dashboard');
  };

  const changeViewState = (newState: string) => {
    localStorage.setItem('ludo_tourney_state', newState);
    setViewState(newState);
  };

  const handleRestartAttempt = () => {
    audio.playClick();
    const nextAttempt = attemptNum + 1;
    localStorage.setItem('ludo_tourney_attempt_num', nextAttempt.toString());
    localStorage.setItem('ludo_tourney_games', '0');
    localStorage.setItem('ludo_tourney_wins', '0');
    localStorage.setItem('ludo_tourney_losses', '0');
    localStorage.setItem('ludo_tourney_points', '0');
    localStorage.removeItem('ludo_tourney_last_result');
    localStorage.removeItem('ludo_tourney_last_points_earned');

    setAttemptNum(nextAttempt);
    setGamesPlayed(0);
    setWins(0);
    setLosses(0);
    setPoints(0);
    setLastResult(null);
    setLastPointsEarned(0);

    rollNewOpponent();
    changeViewState('loading_match');
  };

  // Helper lists for dynamic dashboard ranking
  const getLeaderboardList = () => {
    const list = [
      { name: 'Aman', points: 2480, rank: 1, isYou: false },
      { name: 'Ravi', points: 2440, rank: 2, isYou: false },
      { name: 'Priya', points: 2410, rank: 3, isYou: false },
      { name: 'Sneha Rao', points: 2380, rank: 4, isYou: false },
      { name: 'Vikram P', points: 2250, rank: 5, isYou: false },
      { name: 'Ananya G', points: 2120, rank: 6, isYou: false },
      { name: 'Divya R', points: 2080, rank: 7, isYou: false },
      { name: 'Amit M', points: 1990, rank: 8, isYou: false },
    ];

    if (bestPoints > 0) {
      const yourNumericRank = bestPoints >= 1500 ? Math.round(2300 - bestPoints) : Math.round(5000 - bestPoints * 2);
      // Place yourself at correct position in list if points match, otherwise append
      const playerEntry = { name: 'You', points: bestPoints, rank: yourNumericRank, isYou: true };
      
      let inserted = false;
      const sortedList: typeof list = [];
      
      for (const item of list) {
        if (!inserted && playerEntry.points > item.points) {
          sortedList.push(playerEntry);
          inserted = true;
        }
        // Don't duplicate "You"
        if (item.name !== 'You') {
          sortedList.push(item);
        }
      }
      if (!inserted) sortedList.push(playerEntry);
      
      return sortedList.slice(0, 9);
    }

    return list;
  };

  return (
    <div className="w-full max-w-xl mx-auto select-none relative overflow-hidden font-sans rounded-3xl"
      style={{
        background: 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)',
        border: '1.5px solid rgba(245,200,130,0.4)',
        boxShadow: '0 32px 80px -12px rgba(180,120,60,0.22),0 8px 32px -8px rgba(180,120,60,0.14),inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>

      {/* Dot pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{backgroundImage:'radial-gradient(circle,rgba(180,120,60,0.07) 1.5px,transparent 1.5px)',backgroundSize:'16px 16px'}} />
      {/* Top sheen */}
      <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{background:'linear-gradient(180deg,rgba(255,255,255,0.65) 0%,transparent 100%)'}} />

      <AnimatePresence mode="wait">

        {/* VIEW 1: TOURNAMENT MAIN DASHBOARD */}
        {viewState === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col gap-4 p-5 md:p-6 relative z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1)',color:'#92400e'}}>
                <ArrowLeft size={13} /> Back
              </button>
              <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full"
                style={{background:'linear-gradient(145deg,rgba(254,243,199,0.95),rgba(253,230,138,0.8))',border:'1px solid rgba(245,158,11,0.4)',color:'#92400e'}}>
                🏆 Weekly Cup Active
              </span>
            </div>

            {/* Hero Championship Card */}
            <div className="relative overflow-hidden rounded-2xl"
              style={{
                background:'linear-gradient(145deg,#f59e0b,#d97706)',
                border:'2px solid #b45309',
                boxShadow:'0 6px 0 #b45309,0 10px 28px rgba(245,158,11,0.35),inset 0 1.5px 3px rgba(255,255,255,0.5)',
              }}>
              <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
              <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                style={{border:'1px solid rgba(255,255,255,0.35)'}} />
              <div className="relative z-10 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-black text-amber-950 tracking-tight leading-none">🏆 Weekly Championship</h1>
                    <p className="text-[10px] font-black text-amber-950/70 uppercase tracking-widest mt-1">Conquer the leaderboards</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{background:'rgba(255,255,255,0.25)',border:'1px solid rgba(255,255,255,0.3)'}}>🏆</div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3" style={{borderTop:'1px solid rgba(67,20,7,0.2)'}}>
                  {[
                    {label:'Prize Pool', value:'Coming Soon'},
                    {label:'Ends In', value:'7 Days'},
                    {label:'Qualify', value:'Win 12/15'},
                  ].map(({label, value}) => (
                    <div key={label}>
                      <span className="block text-[7px] uppercase tracking-wider font-black" style={{color:'rgba(67,20,7,0.6)'}}>{label}</span>
                      <span className="text-[11px] font-black text-amber-950">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:'⭐ Best Score', value: bestWins > 0 ? `${bestWins} Wins` : 'No score yet', sub: bestPoints > 0 ? `${bestPoints} Tourney Pts` : 'Play to qualify', from:'#fde68a', to:'#fcd34d', border:'#f59e0b', shadow:'rgba(245,158,11,0.25)', textDark:'#78350f'},
                {label:'🏅 Your Rank', value: rank !== 'Unranked' ? rank : 'Unranked', sub: bestWins >= 12 ? 'Qualified! ✅' : 'Win 12+ to qualify', from:'#93c5fd', to:'#60a5fa', border:'#3b82f6', shadow:'rgba(59,130,246,0.25)', textDark:'#1e3a8a'},
              ].map(({label, value, sub, from, to, border, shadow, textDark}) => (
                <div key={label} className="relative overflow-hidden rounded-2xl p-3.5"
                  style={{background:`linear-gradient(145deg,${from},${to})`,border:`1.5px solid ${border}`,boxShadow:`0 4px 0 ${border},0 6px 16px ${shadow},inset 0 1.5px 3px rgba(255,255,255,0.5)`}}>
                  <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                    style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                  <span className="block text-[8px] uppercase tracking-wider font-black relative z-10" style={{color:textDark}}>{label}</span>
                  <span className="text-base font-black block mt-1 relative z-10" style={{color:textDark}}>{value}</span>
                  <span className="text-[9px] font-bold block mt-0.5 relative z-10" style={{color:textDark, opacity:0.7}}>{sub}</span>
                </div>
              ))}
            </div>

            {/* Current Attempt Panel */}
            <div className="rounded-2xl p-4"
              style={{background:'rgba(255,255,255,0.7)',border:'1.5px solid rgba(180,120,60,0.2)',boxShadow:'0 3px 12px rgba(140,80,20,0.08),inset 0 1px 2px rgba(255,255,255,0.9)'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-stone-600">
                    Attempt <span style={{color:'#d97706'}}>#{attemptNum}</span>
                  </span>
                </div>
                <span className="text-[9px] font-bold text-amber-700">
                  {gamesPlayed === 0 ? 'Not Started' : `${gamesPlayed} / ${TOURNAMENT_TOTAL_MATCHES} Games`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full overflow-hidden mb-3"
                style={{background:'rgba(180,120,60,0.14)',border:'1px solid rgba(180,120,60,0.18)'}}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width:`${(gamesPlayed / TOURNAMENT_TOTAL_MATCHES) * 100}%`,
                    background:'linear-gradient(90deg,#fbbf24,#f59e0b,#d97706)',
                    boxShadow:'0 0 6px rgba(245,158,11,0.5)',
                  }} />
              </div>

              {/* Stats counters */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  {icon:'📊', label:'Games', value:`${gamesPlayed}/${TOURNAMENT_TOTAL_MATCHES}`, color:'#1c1917'},
                  {icon:'🏆', label:'Wins', value:`${wins}`, color:'#15803d'},
                  {icon:'❌', label:'Loss', value:`${losses}`, color:'#be123c'},
                  {icon:'💎', label:'Pts', value:`${points}`, color:'#b45309'},
                ].map(({icon, label, value, color}) => (
                  <div key={label} className="text-center rounded-xl py-2"
                    style={{background:'rgba(255,255,255,0.8)',border:'1px solid rgba(180,120,60,0.12)'}}>
                    <div className="text-[7px] font-black uppercase tracking-wider" style={{color:'#b45309'}}>{icon} {label}</div>
                    <div className="text-sm font-black mt-0.5" style={{color}}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{y:-3,scale:1.02}}
                whileTap={{y:3,scale:0.97}}
                onClick={handleStartTournament}
                className="w-full relative overflow-hidden rounded-2xl flex items-center justify-center gap-2 py-4 font-black text-sm uppercase tracking-wide cursor-pointer"
                style={{
                  background:'linear-gradient(145deg,#f59e0b,#d97706)',
                  border:'2px solid #b45309',
                  boxShadow:'0 6px 0 #b45309,0 10px 28px rgba(245,158,11,0.35),inset 0 1.5px 3px rgba(255,255,255,0.5)',
                  color:'#431407',
                }}>
                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                  style={{border:'1px solid rgba(255,255,255,0.4)'}} />
                <Play size={15} fill="#431407" strokeWidth={0} className="relative z-10" />
                <span className="relative z-10">
                  {gamesPlayed === 0 ? 'Start Tournament' : gamesPlayed >= TOURNAMENT_TOTAL_MATCHES ? 'New Attempt' : 'Continue Attempt'}
                </span>
              </motion.button>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {icon:<Trophy size={16} className="text-amber-600" />, label:'Leaderboard', action:()=>{audio.playClick();changeViewState('leaderboard');}},
                  {icon:<BookOpen size={16} className="text-blue-500" />, label:'Rules', action:()=>{audio.playClick();changeViewState('rules');}},
                ].map(({icon, label, action}) => (
                  <motion.button key={label}
                    whileHover={{y:-2,scale:1.02}}
                    whileTap={{scale:0.97}}
                    onClick={action}
                    className="relative overflow-hidden rounded-xl py-3 flex flex-col items-center gap-1.5 cursor-pointer"
                    style={{background:'rgba(255,255,255,0.7)',border:'1.5px solid rgba(180,120,60,0.2)',boxShadow:'0 3px 0 rgba(180,120,60,0.13),inset 0 1px 2px rgba(255,255,255,0.8)'}}>
                    <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                      style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                    <span className="relative z-10">{icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wide text-stone-600 relative z-10">{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: RULES SCREEN */}
        {viewState === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4 p-5 md:p-6 relative z-10"
          >
            <div className="flex items-center justify-between">
              <button onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1)',color:'#92400e'}}>
                <ArrowLeft size={13} /> Back
              </button>
              <span className="text-[10px] font-black uppercase text-amber-700">Tournament Guidelines</span>
            </div>

            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{background:'rgba(255,255,255,0.7)',border:'1.5px solid rgba(180,120,60,0.2)',boxShadow:'0 3px 12px rgba(140,80,20,0.08),inset 0 1px 2px rgba(255,255,255,0.9)'}}>
              <h2 className="text-lg font-black text-amber-800 uppercase tracking-tight flex items-center gap-2">🏆 Tournament Rules</h2>
              <ul className="flex flex-col gap-3 text-xs text-stone-600 font-semibold leading-relaxed">
                {[
                  <>Every attempt contains <strong className="text-stone-900">12 games</strong>. Complete all to log your score.</>,
                  <>Win <strong className="text-emerald-700">at least 12 games</strong> to qualify for weekly rewards.</>,
                  <>Every win earns <strong className="text-amber-700">Tournament Points</strong>. Stronger opponents award more points.</>,
                  <>You can replay <strong className="text-stone-900">unlimited attempts</strong>. No entry limit!</>,
                  <>Only your <strong className="text-amber-700">BEST attempt</strong> counts toward the leaderboard.</>,
                  <>Improve your score to climb the rankings and unlock grand prizes.</>,
                  <>Top qualified players enter the final stage at week-end.</>,
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{background:'linear-gradient(145deg,#fde68a,#fcd34d)',border:'1px solid #f59e0b',color:'#78350f',boxShadow:'0 2px 0 #f59e0b'}}>
                      {i+1}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{y:-2}} whileTap={{scale:0.97}}
                onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                className="w-full mt-2 py-3 rounded-xl font-black uppercase text-xs tracking-wider relative overflow-hidden"
                style={{background:'linear-gradient(145deg,#f59e0b,#d97706)',border:'2px solid #b45309',boxShadow:'0 4px 0 #b45309,inset 0 1.5px 3px rgba(255,255,255,0.5)',color:'#431407'}}>
                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none" style={{background:'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)'}} />
                <span className="relative z-10">Close and Return</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: MATCH LOADING / OPPONENT PREVIEW */}
        {viewState === 'loading_match' && (
          <motion.div
            key="loading_match"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-4 text-center items-center"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-amber-200/60 relative z-10 text-left">
              <button
                onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 hover:bg-white/60 text-xs font-bold text-stone-600 transition"
              >
                <ArrowLeft size={14} /> Leave
              </button>
              <span className="text-xs font-extrabold text-amber-400 uppercase">
                Match Loading • Game {gamesPlayed + 1}/20
              </span>
            </div>

            <div className="w-full bg-white/70 rounded-2xl p-6 border border-amber-200/60 flex flex-col items-center gap-5 relative overflow-hidden mt-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 via-amber-600/10 to-transparent rotate-45 translate-x-10 -translate-y-10" />
              
              <h2 className="text-xl font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                🏆 Tournament Match
              </h2>

              {/* Opponent Card with 3D Gloss Accent */}
              <div className="w-full max-w-sm bg-gradient-to-br from-stone-850 via-stone-900 to-stone-950 border border-amber-200 rounded-2xl p-5 shadow-lg relative flex flex-col items-center gap-3">
                <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                
                <span className="block text-[9px] uppercase tracking-widest text-amber-600 font-extrabold">Your Opponent</span>
                
                {/* 3D Circular Avatar badge */}
                <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-[0_4px_12px_rgba(245,158,11,0.2)] animate-pulse">
                  {currentOpponent.avatar}
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <h3 className="text-lg font-black text-white">{currentOpponent.name}</h3>
                    <span className="text-[9px] font-black bg-sky-500/20 border border-sky-500/40 text-sky-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>
                  </div>
                  <p className="text-[10px] font-black tracking-wider text-amber-700 uppercase mt-0.5">
                    System AI Opponent · Not a real player
                  </p>
                </div>

                {/* Info Pills */}
                <div className="flex gap-4 text-xs font-black text-stone-600 bg-white/60/80 p-3 rounded-xl border border-amber-200/40 w-full justify-around mt-1">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-bold">Difficulty</span>
                    <span className={`text-xs ${
                      currentOpponent.difficulty === 'Hard' ? 'text-rose-400' :
                      currentOpponent.difficulty === 'Medium' ? 'text-sky-400' : 'text-emerald-400'
                    }`}>{currentOpponent.difficulty}</span>
                  </div>
                  <div className="w-[1px] border-amber-200/20" />
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-bold">Opponent Rating</span>
                    <span className="text-xs text-amber-400">{currentOpponent.rating} Elo</span>
                  </div>
                  <div className="w-[1px] border-amber-200/20" />
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-bold">Points Worth</span>
                    <span className="text-xs text-stone-800">
                      {currentOpponent.difficulty === 'Hard' ? '+140' :
                       currentOpponent.difficulty === 'Medium' ? '+120' : '+100'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Start button */}
              <motion.button
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ y: 1, scale: 0.98 }}
                onClick={handleLaunchMatch}
                className="w-full max-w-sm py-4 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-black uppercase text-xs tracking-wider rounded-xl shadow-lg border-b-4 border-amber-700 border-t-2 border-white/20 hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Play size={14} fill="currentColor" /> Start Match
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* VIEW 4: MATCH RESULT COMPONENT */}
        {viewState === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col gap-4 text-center items-center py-4"
          >
            {lastResult === 'win' ? (
              <div className="flex flex-col items-center gap-4">
                {/* Winner Glossy 3D Circle */}
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-white rounded-full flex items-center justify-center text-4xl shadow-[0_8px_24px_rgba(245,158,11,0.4)] animate-bounce relative">
                  <div className="absolute inset-0 rounded-full border border-white/20" />
                  🎉
                </div>

                <div>
                  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 uppercase tracking-tight">
                    Victory 🎉
                  </h1>
                  <p className="text-xs font-black text-amber-700 uppercase tracking-widest mt-1">
                    Conquered the board match!
                  </p>
                </div>

                <div className="bg-white/70/80 border border-amber-200/40 p-4 rounded-xl flex items-center justify-center gap-3 shadow-md w-72 mt-2">
                  <span className="text-2xl">💎</span>
                  <div className="text-left">
                    <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-black">Points Added</span>
                    <span className="text-lg font-black text-emerald-400">+{lastPointsEarned} Tournament Points</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinueAfterResult}
                  className="w-56 mt-4 py-3 bg-amber-500 text-stone-950 font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg border-b-2 border-amber-700 transition"
                >
                  Continue
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {/* Loser Gray Circle */}
                <div className="w-18 h-18 bg-white/60 border-2 border-amber-200/40 rounded-full flex items-center justify-center text-3xl shadow-lg animate-pulse">
                  😞
                </div>

                <div>
                  <h1 className="text-2.5xl font-black text-rose-500 uppercase tracking-tight">
                    Defeat
                  </h1>
                  <p className="text-xs font-extrabold text-amber-700 uppercase tracking-widest mt-1">
                    Better luck next game.
                  </p>
                </div>

                <div className="bg-white/70/80 border border-amber-200/40 p-4 rounded-xl flex items-center justify-center gap-3 shadow-md w-72 mt-2">
                  <span className="text-2xl">💪</span>
                  <div className="text-left font-bold text-stone-600 text-xs leading-relaxed">
                    Opponent played smart! Re-strategize your tokens to block and safe-stack.
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinueAfterResult}
                  className="w-56 mt-4 py-3 bg-white/60 text-stone-600 hover:bg-amber-50/60 font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg transition border border-amber-200/40"
                >
                  Continue
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 5: PROGRESS SCREEN */}
        {viewState === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-4 text-center items-center"
          >
            <div className="w-full flex justify-between pb-2 border-b border-amber-200/60 text-left">
              <span className="text-xs font-extrabold text-amber-500 uppercase">Championship attempt progress</span>
              <span className="text-[10px] text-amber-700 uppercase font-bold">Games {gamesPlayed}/20</span>
            </div>

            <div className="w-full bg-white/70 border border-amber-200/60 rounded-2xl p-5 flex flex-col gap-4 mt-2 max-w-md">
              <h2 className="text-lg font-black uppercase tracking-wider text-amber-400">Current Attempt</h2>

              {/* Grid with statistics */}
              <div className="grid grid-cols-2 gap-3.5 text-left">
                {/* Games Counter */}
                <div className="bg-white/60/60 border border-amber-200/40 p-3.5 rounded-xl flex flex-col gap-0.5">
                  <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-black">Games</span>
                  <span className="text-xl font-black text-stone-800">{gamesPlayed} / 15</span>
                  <span className="text-[9px] text-amber-700 font-medium">{20 - gamesPlayed} games remaining</span>
                </div>

                {/* Wins Counter */}
                <div className="bg-white/60/60 border border-amber-200/40 p-3.5 rounded-xl flex flex-col gap-0.5">
                  <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-black">Wins</span>
                  <span className="text-xl font-black text-emerald-400">{wins}</span>
                  <span className="text-[9px] text-amber-700 font-medium">Qualification target: 15</span>
                </div>

                {/* Losses Counter */}
                <div className="bg-white/60/60 border border-amber-200/40 p-3.5 rounded-xl flex flex-col gap-0.5">
                  <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-black">Losses</span>
                  <span className="text-xl font-black text-rose-400">{losses}</span>
                  <span className="text-[9px] text-amber-700 font-medium">Out of 20 maximum matches</span>
                </div>

                {/* Points Counter */}
                <div className="bg-white/60/60 border border-amber-200/40 p-3.5 rounded-xl flex flex-col gap-0.5">
                  <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-black">Tournament Points</span>
                  <span className="text-xl font-black text-amber-400">{points}</span>
                  <span className="text-[9px] text-amber-700 font-medium">Earn points for leaderboards</span>
                </div>
              </div>

              {/* Progress Bar overlay */}
              <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden p-[1px] mt-1 border border-amber-200/40">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400"
                  style={{ width: `${(gamesPlayed / 15) * 100}%` }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinueAfterProgress}
                className="w-full mt-2 py-3.5 bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg border-b-2 border-amber-700"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* VIEW 6: ATTEMPT COMPLETED SUMMARY */}
        {viewState === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="flex flex-col gap-4 text-center items-center"
          >
            <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
              Attempt Completed!
            </span>

            {wins >= 15 ? (
              <div className="w-full max-w-md bg-white/70 border border-amber-200 rounded-2xl p-5 flex flex-col items-center gap-4">
                <span className="text-4.5xl animate-bounce">👑🏆👑</span>
                
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 uppercase tracking-tight leading-tight">
                    Qualified ✅
                  </h2>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mt-1">
                    Best Attempt Updated
                  </p>
                </div>

                <div className="w-full bg-white/60/60 p-4 rounded-xl border border-amber-200/40 text-left flex flex-col gap-2.5 mt-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Total Wins</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Total Losses</span>
                    <span className="font-extrabold text-rose-400 text-sm">{losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Tournament Points Earned</span>
                    <span className="font-extrabold text-amber-400 text-sm">{points}</span>
                  </div>
                  <div className="w-full h-[1px] border-amber-200/20 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-extrabold">Leaderboard Rank</span>
                    <span className="text-sky-400 font-black text-base">
                      #{Math.max(1, Math.round(2300 - points))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRestartAttempt}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg border-b-2 border-amber-700"
                  >
                    Play Again (New Attempt)
                  </motion.button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { audio.playClick(); changeViewState('leaderboard'); }}
                      className="py-2.5 bg-white/60 hover:bg-amber-50/60 text-stone-600 border border-amber-200/40 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                    >
                      Leaderboard
                    </button>
                    <button
                      onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                      className="py-2.5 bg-white/60 hover:bg-amber-50/60 text-stone-600 border border-amber-200/40 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md bg-white/70 border border-amber-200 rounded-2xl p-5 flex flex-col items-center gap-4">
                <span className="text-3.5xl">⚠️</span>
                
                <div>
                  <h2 className="text-xl font-black text-rose-500 uppercase tracking-tight leading-tight">
                    Qualification Failed
                  </h2>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mt-1">
                    Missed qualification target (15 Wins)
                  </p>
                </div>

                <div className="w-full bg-white/60/60 p-4 rounded-xl border border-amber-200/40 text-left flex flex-col gap-2 mt-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Wins</span>
                    <span className="font-extrabold text-stone-600 text-sm">{wins} / 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Losses</span>
                    <span className="font-extrabold text-rose-400 text-sm">{losses} / 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">Tournament Points</span>
                    <span className="font-extrabold text-amber-500 text-sm">{points}</span>
                  </div>
                  <div className="w-full h-[1px] border-amber-200/20 my-1" />
                  <p className="text-[10.5px] text-amber-700 font-semibold leading-relaxed">
                    No sweat! Every pro ludo player has attempts that miss the mark. You can retry with an <strong className="text-white">unlimited count of attempts</strong>!
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRestartAttempt}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg border-b-2 border-amber-700"
                  >
                    Play Again (Retry Attempt)
                  </motion.button>

                  <button
                    onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                    className="w-full py-2.5 bg-white/60 hover:bg-amber-50/60 text-stone-600 border border-amber-200/40 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 7: LEADERBOARD SCREEN */}
        {viewState === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 relative z-10">
              <button
                onClick={() => { audio.playClick(); changeViewState('dashboard'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 hover:bg-white/60 text-xs font-bold text-stone-600 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span className="text-xs font-extrabold text-amber-500 uppercase">Live Standings</span>
            </div>

            <div className="bg-white/60 rounded-2xl p-4 border border-amber-200/40 flex flex-col gap-3">
              <h2 className="text-lg font-black text-amber-400 uppercase tracking-tight flex items-center gap-1.5">
                🏆 Weekly Leaderboard
              </h2>

              {/* Standings table */}
              <div className="w-full flex flex-col gap-2 mt-1 max-h-72 overflow-y-auto pr-1">
                {getLeaderboardList().map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        item.isYou 
                          ? 'bg-amber-400/10 border-amber-400/40' 
                          : 'bg-white/50 border-amber-200/40 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                          item.rank === 1 ? 'bg-yellow-400 text-stone-950' :
                          item.rank === 2 ? 'bg-stone-300 text-stone-950' :
                          item.rank === 3 ? 'bg-amber-600 text-stone-800' : 'bg-white/70 text-amber-700'
                        }`}>
                          {item.rank}
                        </span>
                        <span className={`text-xs font-black ${item.isYou ? 'text-amber-400' : 'text-stone-600'}`}>
                          {item.name} {item.isYou && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded font-black ml-1">YOU</span>}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-400">
                        {item.points} pts
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-amber-700 font-medium leading-relaxed bg-white/60/30 p-3 rounded-xl mt-1 text-center">
                Leaderboard updates after each match. Play more games to climb the rankings.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
