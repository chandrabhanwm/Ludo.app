/**
 * Table Room — waiting room where players wait for table to fill
 * Shows 2P / 4P tabs, player list, and countdown when full
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Crown } from 'lucide-react';
import { TABLES, TableMode, TableDoc, COUNTDOWN_SECONDS } from '../multiplayer/tableConfig';
import { PlayerColor, Token } from '../types';
import { listenToTable, joinTable, leaveTable } from '../multiplayer/gameSync';

interface TableRoomProps {
  tableId: string;
  tableNum: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  onGameStart: (gameId: string, color: string, mode: TableMode, tableNum: number) => void;
  onBack: () => void;
}

const COLOR_STYLES: Record<string, {bg: string; text: string; border: string}> = {
  red:    { bg: '#f9a8b8', text: '#881337', border: '#be123c' },
  green:  { bg: '#6ee7b7', text: '#14532d', border: '#16a34a' },
  blue:   { bg: '#93c5fd', text: '#1e3a8a', border: '#2563eb' },
  yellow: { bg: '#fbbf24', text: '#78350f', border: '#d97706' },
};

export const TableRoom: React.FC<TableRoomProps> = ({
  tableId, tableNum, uid, displayName, photoURL, onGameStart, onBack,
}) => {
  const cfg = TABLES.find(t => t.id === tableId)!;
  const [mode, setMode] = useState<TableMode>('4P');
  const [tableData, setTableData] = useState<TableDoc | null>(null);
  const [myColor, setMyColor] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarting, setGameStarting] = useState(false);

  // Listen to table changes
  useEffect(() => {
    const unsub = listenToTable(tableId, (data) => {
      setTableData(data);
    });
    return () => unsub();
  }, [tableId]);

  // Get current slot
  const slots = tableData ? (mode === '2P' ? tableData.slots2P : tableData.slots4P) : null;
  const slot = Array.isArray(slots) ? slots.find(s => s.tableNum === tableNum) || null : null;
  const maxPlayers = mode === '2P' ? 2 : 4;
  const myPlayer = slot?.players?.find(p => p.uid === uid);
  const isInSlot = !!myPlayer;

  // Countdown timer
  useEffect(() => {
    if (slot?.status !== 'countdown' || !slot.countdownStartedAt) return;

    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - slot.countdownStartedAt!) / 1000);
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setCountdown(remaining);

      if (remaining === 0) {
        clearInterval(tick);
        // Only first player (index 0) creates the game document
        const doStart = async () => {
        setGameStarting(true);
        if (isInSlot && myPlayer && slot?.players?.[0]?.uid === uid) {
          const gameId = `${tableId}_${mode}_t${tableNum}_${slot.countdownStartedAt}`;
          // Build initial tokens
          const colors = slot.players.map(p => p.color) as PlayerColor[];
          const initialTokens: import('../types').Token[] = [];
          colors.forEach(color => {
            for (let i = 0; i < 4; i++) {
              initialTokens.push({ id: `${color}-${i}`, playerColor: color as import('../types').PlayerColor, idInColor: i, position: 'yard' });
            }
          });
          // Build multiplayer players
          const mpPlayers = slot.players.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            photoURL: p.photoURL,
            color: p.color as import('../types').PlayerColor,
            connected: true,
            knockedOut: false,
            disconnectedAt: null,
            finishedPosition: null,
          }));
          await import('../multiplayer/gameSync').then(({ createGame, saveUserCurrentGame }) => {
            createGame(gameId, tableId, tableNum, mode, mpPlayers, initialTokens);
            slot.players.forEach(p => saveUserCurrentGame(p.uid, gameId, tableId, tableNum, p.color));
          });
        }
        if (isInSlot && myPlayer) {
          const gameId = `${tableId}_${mode}_t${tableNum}_${slot.countdownStartedAt}`;
          onGameStart(gameId, myPlayer.color, mode, tableNum);
        }
        };
        doStart();
      }
    }, 500);

    return () => clearInterval(tick);
  }, [slot?.status, slot?.countdownStartedAt]);

  // Leave current slot when switching tabs
  const handleModeSwitch = async (newMode: TableMode) => {
    if (newMode === mode) return;
    if (isInSlot && slot?.status === 'waiting') {
      await leaveTable(tableId, mode, uid, tableNum);
      setMyColor(null);
    }
    setMode(newMode);
    setError(null);
  };

  // Join table
  const handleJoin = async () => {
    if (joining || isInSlot) return;
    setJoining(true);
    setError(null);
    const result = await joinTable(tableId, mode, uid, displayName, photoURL, tableNum);
    if (result.success && result.color) {
      setMyColor(result.color);
    } else {
      setError(result.error || 'Could not join');
    }
    setJoining(false);
  };

  // Leave table on back
  const handleBack = async () => {
    if (isInSlot && slot?.status === 'waiting') {
      await leaveTable(tableId, mode, uid, tableNum);
    }
    onBack();
  };

  const renderPlayerSlot = (index: number) => {
    const player = slot?.players?.[index];
    if (!player) {
      return (
        <div key={index} className="flex items-center gap-3 p-3 rounded-xl"
          style={{background:'rgba(180,120,60,0.06)',border:'1.5px dashed rgba(180,120,60,0.2)'}}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(180,120,60,0.1)'}}>
            <span className="text-lg opacity-40">⚪</span>
          </div>
          <span className="text-xs font-bold text-stone-400">Waiting for player...</span>
        </div>
      );
    }

    const cs = COLOR_STYLES[player.color] || COLOR_STYLES.red;
    const isMe = player.uid === uid;

    return (
      <motion.div key={player.uid}
        initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}}
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{background: cs.bg + '55', border: `1.5px solid ${cs.border}44`}}>
        {/* Avatar */}
        {player.photoURL ? (
          <img src={player.photoURL} alt={player.displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{border:`2px solid ${cs.border}`}}/>
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
            style={{background:`linear-gradient(145deg,${cs.bg},${cs.border})`, border:`2px solid ${cs.border}`}}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-stone-800 truncate">
            {player.displayName}
            {isMe && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{background: cs.border, color:'white'}}>YOU</span>}
          </div>
          <div className="text-[10px] font-bold mt-0.5 capitalize" style={{color: cs.border}}>
            🎮 {player.color} token
          </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0"
          style={{boxShadow:'0 0 6px rgba(52,211,153,0.6)'}}/>
      </motion.div>
    );
  };

  const isFull = (slot?.players?.length || 0) >= maxPlayers;
  const isCountdown = slot?.status === 'countdown';

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 px-1 pb-6 select-none">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 text-xs font-black uppercase tracking-wider active:scale-95"
          style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1)'}}>
          <ArrowLeft size={14}/> Lobby
        </button>

        {/* Table name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{background:`linear-gradient(145deg,${cfg.from},${cfg.to})`,border:`2px solid ${cfg.border}`,boxShadow:`0 3px 0 ${cfg.border}`}}>
            {cfg.emoji}
          </div>
          <span className="text-base font-black text-stone-800">{cfg.name} Room</span>
        </div>

        <div className="w-16"/>
      </div>

      {/* 2P / 4P tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl"
        style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(180,120,60,0.18)'}}>
        {(['2P', '4P'] as TableMode[]).map((m) => {
          const s = m === '2P' ? tableData?.slots2P : tableData?.slots4P;
          const count = s?.players?.length || 0;
          const max = m === '2P' ? 2 : 4;
          const locked = s?.status === 'playing' || s?.status === 'countdown';
          const isActive = mode === m;

          return (
            <button key={m} onClick={() => !locked && handleModeSwitch(m)}
              disabled={locked}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all"
              style={{
                background: isActive
                  ? `linear-gradient(145deg,${cfg.from},${cfg.to})`
                  : 'transparent',
                border: isActive ? `1.5px solid ${cfg.border}` : '1.5px solid transparent',
                boxShadow: isActive ? `0 3px 0 ${cfg.border}` : 'none',
                color: isActive ? cfg.textDark : locked ? '#ccc' : '#92400e',
                cursor: locked ? 'not-allowed' : 'pointer',
              }}>
              <span>{m}</span>
              <span className="text-[10px] font-bold opacity-80">
                {locked ? '🔒' : `${count}/${max}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Countdown banner */}
      <AnimatePresence>
        {isCountdown && (
          <motion.div
            initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}}
            className="text-center py-4 rounded-2xl"
            style={{background:`linear-gradient(145deg,${cfg.from},${cfg.to})`,border:`2px solid ${cfg.border}`,boxShadow:`0 4px 0 ${cfg.border}`}}>
            <div className="text-3xl font-black" style={{color: cfg.textDark}}>
              {countdown}
            </div>
            <div className="text-xs font-black uppercase tracking-wider mt-1" style={{color: cfg.textDark}}>
              Game starting...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player slots */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 px-1">
          Players ({slot?.players?.length || 0}/{maxPlayers})
        </div>
        {Array.from({length: maxPlayers}).map((_, i) => renderPlayerSlot(i))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl py-2 px-4 border border-rose-200">
          {error}
        </div>
      )}

      {/* Join / Already joined */}
      {!isInSlot && !isCountdown && (
        <motion.button
          whileTap={{scale: 0.97}}
          onClick={handleJoin}
          disabled={joining || isFull}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider"
          style={{
            background: isFull
              ? 'rgba(200,200,200,0.4)'
              : `linear-gradient(145deg,${cfg.from},${cfg.to})`,
            border: `2px solid ${isFull ? 'rgba(180,120,60,0.2)' : cfg.border}`,
            boxShadow: isFull ? 'none' : `0 5px 0 ${cfg.border},0 8px 16px ${cfg.border}44`,
            color: isFull ? '#999' : cfg.textDark,
            cursor: isFull ? 'not-allowed' : 'pointer',
          }}>
          {joining ? '⏳ Joining...' : isFull ? '🔒 Table Full' : `🎮 Join ${mode} Game`}
        </motion.button>
      )}

      {isInSlot && !isCountdown && (
        <div className="text-center py-3 rounded-2xl text-sm font-bold text-amber-700"
          style={{background:'rgba(255,255,255,0.6)',border:'1.5px solid rgba(180,120,60,0.2)'}}>
          ✅ You're in! Waiting for {maxPlayers - (slot?.players?.length || 0)} more player{maxPlayers - (slot?.players?.length || 1) !== 1 ? 's' : ''}...
        </div>
      )}

      {/* Game starting overlay */}
      {gameStarting && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin"/>
          <div className="text-sm font-black text-amber-700">Setting up board...</div>
          <div className="text-xs text-stone-400">This will take 1-2 seconds</div>
        </div>
      )}

      {/* Info */}
      <div className="text-center text-[10px] text-stone-400 font-medium px-4 leading-relaxed">
        Game auto-starts with {COUNTDOWN_SECONDS}s countdown when table is full.
        Disconnect for 60s = knocked out.
      </div>
    </div>
  );
};
