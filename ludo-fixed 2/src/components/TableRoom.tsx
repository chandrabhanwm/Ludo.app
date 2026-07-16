/**
 * Table Room — waiting room with countdown
 * Fixed: stale closure bug in countdown timer
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { TABLES, TableMode, TableDoc, TableSlot, COUNTDOWN_SECONDS } from '../multiplayer/tableConfig';
import { PlayerColor } from '../types';
import { listenToTable, joinTable, leaveTable } from '../multiplayer/gameSync';

interface TableRoomProps {
  tableId: string;
  tableNum: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  onGameStart: (gameId: string, color: string, mode: TableMode, tableNum: number, gameData?: any) => void;
  onBack: () => void;
}

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
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

  // FIX: use refs so countdown interval always has fresh values
  const slotRef = useRef<TableSlot | null>(null);
  const modeRef = useRef<TableMode>('4P');
  const gameStartedRef = useRef(false);

  // Listen to table
  useEffect(() => {
    const unsub = listenToTable(tableId, (data) => setTableData(data));
    return () => unsub();
  }, [tableId]);

  // Compute current slot
  const slots = tableData ? (mode === '2P' ? tableData.slots2P : tableData.slots4P) : null;
  const slot = Array.isArray(slots) ? (slots.find(s => s.tableNum === tableNum) || null) : null;
  const maxPlayers = mode === '2P' ? 2 : 4;
  const myPlayer = slot?.players?.find(p => p.uid === uid);
  const isInSlot = !!myPlayer;

  // FIX: Keep refs in sync with latest values
  useEffect(() => {
    slotRef.current = slot;
    modeRef.current = mode;
  });

  // Countdown timer — reads from refs not closure
  useEffect(() => {
    if (slot?.status !== 'countdown' || !slot.countdownStartedAt) return;
    if (gameStartedRef.current) return;

    const startedAt = slot.countdownStartedAt;

    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setCountdown(remaining);

      if (remaining === 0) {
        clearInterval(tick);
        if (gameStartedRef.current) return;
        gameStartedRef.current = true;

        // FIX: read fresh values from refs
        const currentSlot = slotRef.current;
        const currentMode = modeRef.current;

        if (!currentSlot) return;

        const currentMyPlayer = currentSlot.players?.find(p => p.uid === uid);
        if (!currentMyPlayer) return;

        const doStart = async () => {
          setGameStarting(true);
          const gameId = `${tableId}_${currentMode}_t${tableNum}_${startedAt}`;

          // Only first player creates game doc
          if (currentSlot.players?.[0]?.uid === uid) {
            try {
              const colors = currentSlot.players.map(p => p.color) as PlayerColor[];
              const initialTokens: any[] = [];
              colors.forEach(color => {
                for (let i = 0; i < 4; i++) {
                  initialTokens.push({
                    id: `${color}-${i}`,
                    playerColor: color,
                    idInColor: i,
                    position: 'yard',
                  });
                }
              });

              const mpPlayers = currentSlot.players.map(p => ({
                uid: p.uid,
                displayName: p.displayName,
                photoURL: p.photoURL || null,
                color: p.color as PlayerColor,
                connected: true,
                knockedOut: false,
                disconnectedAt: null,
                finishedPosition: null,
              }));

              const { createGame, saveUserCurrentGame } = await import('../multiplayer/gameSync');
              await createGame(gameId, tableId, tableNum, currentMode, mpPlayers, initialTokens);
              await Promise.all(
                currentSlot.players.map(p =>
                  saveUserCurrentGame(p.uid, gameId, tableId, tableNum, p.color)
                )
              );
              // HOST: pass game data directly — no need to re-read from Firestore
              const hostedGameData = {
                players: mpPlayers,
                tokens: initialTokens,
                activePlayerColor: mpPlayers[0].color,
                diceValue: 0,
                hasRolled: false,
                consecutiveSixes: 0,
                matchWinners: [],
                status: 'playing',
              };
              onGameStart(gameId, currentMyPlayer.color, currentMode, tableNum, hostedGameData);
              return;
            } catch (e) {
              console.error('createGame failed:', e);
              setGameStarting(false);
              gameStartedRef.current = false;
              return;
            }
          } else {
            // Non-host: wait for host to create game doc, then read it
            await new Promise(resolve => setTimeout(resolve, 1200));
          }

          onGameStart(gameId, currentMyPlayer.color, currentMode, tableNum);
        };

        doStart();
      }
    }, 500);

    return () => clearInterval(tick);
  }, [slot?.status, slot?.countdownStartedAt, tableId, tableNum]);

  // Mode switch
  const handleModeSwitch = async (newMode: TableMode) => {
    if (newMode === mode) return;
    if (isInSlot && slot?.status === 'waiting') {
      await leaveTable(tableId, mode, uid, tableNum);
      setMyColor(null);
    }
    setMode(newMode);
    setError(null);
  };

  // Join
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

  // Back
  const handleBack = async () => {
    if (isInSlot && slot?.status === 'waiting') {
      await leaveTable(tableId, mode, uid, tableNum);
    }
    onBack();
  };

  const isFull = (slot?.players?.length || 0) >= maxPlayers;
  const isCountdown = slot?.status === 'countdown';

  const renderPlayer = (index: number) => {
    const player = slot?.players?.[index];
    if (!player) {
      return (
        <div key={index} className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(180,120,60,0.06)', border: '1.5px dashed rgba(180,120,60,0.2)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(180,120,60,0.1)' }}>
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
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: cs.bg + '55', border: `1.5px solid ${cs.border}44` }}>
        {player.photoURL ? (
          <img src={player.photoURL} alt={player.displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${cs.border}` }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
            style={{ background: `linear-gradient(145deg,${cs.bg},${cs.border})`, border: `2px solid ${cs.border}` }}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-stone-800 truncate">
            {player.displayName}
            {isMe && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: cs.border, color: 'white' }}>YOU</span>}
          </div>
          <div className="text-[10px] font-bold mt-0.5 capitalize" style={{ color: cs.border }}>
            🎮 {player.color} token
          </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0"
          style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 px-1 pb-6 select-none">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 text-xs font-black uppercase tracking-wider active:scale-95"
          style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(180,120,60,0.22)', boxShadow: '0 2px 6px rgba(140,80,20,0.1)' }}>
          <ArrowLeft size={14} /> Lobby
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `linear-gradient(145deg,${cfg.from},${cfg.to})`, border: `2px solid ${cfg.border}`, boxShadow: `0 3px 0 ${cfg.border}` }}>
            {cfg.emoji}
          </div>
          <span className="text-base font-black text-stone-800">{cfg.name} Room · Table {tableNum}</span>
        </div>
        <div className="w-16" />
      </div>

      {/* 2P / 4P tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(180,120,60,0.18)' }}>
        {(['2P', '4P'] as TableMode[]).map((m) => {
          const mSlots = m === '2P' ? tableData?.slots2P : tableData?.slots4P;
          const mSlot = Array.isArray(mSlots) ? mSlots.find(s => s.tableNum === tableNum) : null;
          const count = mSlot?.players?.length || 0;
          const max = m === '2P' ? 2 : 4;
          const locked = mSlot?.status === 'playing' || mSlot?.status === 'countdown';
          const isActive = mode === m;
          return (
            <button key={m} onClick={() => !locked && handleModeSwitch(m)}
              disabled={locked}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all"
              style={{
                background: isActive ? `linear-gradient(145deg,${cfg.from},${cfg.to})` : 'transparent',
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

      {/* Countdown */}
      <AnimatePresence>
        {isCountdown && !gameStarting && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center py-4 rounded-2xl"
            style={{ background: `linear-gradient(145deg,${cfg.from},${cfg.to})`, border: `2px solid ${cfg.border}`, boxShadow: `0 4px 0 ${cfg.border}` }}>
            <div className="text-3xl font-black" style={{ color: cfg.textDark }}>{countdown}</div>
            <div className="text-xs font-black uppercase tracking-wider mt-1" style={{ color: cfg.textDark }}>
              Game starting...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game starting spinner */}
      {gameStarting && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
          <div className="text-sm font-black text-amber-700">Setting up board...</div>
          <div className="text-xs text-stone-400">Just a moment</div>
        </div>
      )}

      {/* Players */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 px-1">
          Players ({slot?.players?.length || 0}/{maxPlayers})
        </div>
        {Array.from({ length: maxPlayers }).map((_, i) => renderPlayer(i))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl py-2 px-4 border border-rose-200">
          {error}
        </div>
      )}

      {/* Join button */}
      {!isInSlot && !isCountdown && !gameStarting && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin}
          disabled={joining || isFull}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider"
          style={{
            background: isFull ? 'rgba(200,200,200,0.4)' : `linear-gradient(145deg,${cfg.from},${cfg.to})`,
            border: `2px solid ${isFull ? 'rgba(180,120,60,0.2)' : cfg.border}`,
            boxShadow: isFull ? 'none' : `0 5px 0 ${cfg.border}`,
            color: isFull ? '#999' : cfg.textDark,
            cursor: isFull ? 'not-allowed' : 'pointer',
          }}>
          {joining ? '⏳ Joining...' : isFull ? '🔒 Table Full' : `🎮 Join ${mode} Game`}
        </motion.button>
      )}

      {isInSlot && !isCountdown && !gameStarting && (
        <div className="text-center py-3 rounded-2xl text-sm font-bold text-amber-700"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(180,120,60,0.2)' }}>
          ✅ You're in! Waiting for {maxPlayers - (slot?.players?.length || 0)} more player{maxPlayers - (slot?.players?.length || 1) !== 1 ? 's' : ''}...
        </div>
      )}

      <div className="text-center text-[10px] text-stone-400 font-medium px-4 leading-relaxed">
        Game auto-starts with {COUNTDOWN_SECONDS}s countdown when table is full.
        Disconnect for 60s = knocked out.
      </div>
    </div>
  );
};
