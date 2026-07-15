/**
 * Online Lobby — shows all 6 tables with live player counts
 * Players tap JOIN to enter a table's waiting room
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Lock, ArrowLeft, Wifi } from 'lucide-react';
import { TABLES, TableDoc, TableMode } from '../multiplayer/tableConfig';
import { listenToTables, initializeTables, resetStaleSlots } from '../multiplayer/gameSync';

interface OnlineLobbyProps {
  onJoinTable: (tableId: string, mode: TableMode) => void;
  onBack: () => void;
  currentUid: string;
  isGuest?: boolean;
  onRequireLogin?: () => void;
}

const WARM_CARD = {
  background: 'rgba(255,255,255,0.88)',
  border: '1.5px solid rgba(180,120,60,0.22)',
  boxShadow: '0 4px 16px rgba(140,80,20,0.1),inset 0 1px 2px rgba(255,255,255,0.9)',
};

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  onJoinTable, onBack, currentUid, isGuest, onRequireLogin,
}) => {
  const [tables, setTables] = useState<Record<string, TableDoc>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start listener immediately — rooms appear instantly
    const unsub = listenToTables((data) => {
      setTables(data);
      setLoading(false);
    });

    // Init missing tables + reset stale ones in parallel
    initializeTables().catch(() => {});
    resetStaleSlots().catch(() => {});

    // Re-check stale slots every 60 seconds while lobby is open
    const staleCheck = setInterval(() => {
      resetStaleSlots().catch(() => {});
    }, 60_000);

    return () => {
      unsub();
      clearInterval(staleCheck);
    };
  }, []);

  const getSlotInfo = (tableId: string, mode: TableMode) => {
    const table = tables[tableId];
    if (!table) return { count: 0, max: mode === '2P' ? 2 : 4, status: 'waiting', hasMe: false };
    const slot = mode === '2P' ? table.slots2P : table.slots4P;
    const max = mode === '2P' ? 2 : 4;
    const hasMe = slot?.players?.some(p => p.uid === currentUid) || false;
    return {
      count: slot?.players?.length || 0,
      max,
      status: slot?.status || 'waiting',
      hasMe,
    };
  };

  const renderSlotButton = (tableId: string, cfg: typeof TABLES[0], mode: TableMode) => {
    const { count, max, status, hasMe } = getSlotInfo(tableId, mode);
    const isFull = count >= max;
    const isLocked = status === 'playing' || status === 'countdown';
    const canJoin = !isLocked && !isFull;

    return (
      <motion.button
        key={mode}
        whileTap={canJoin ? { scale: 0.96 } : {}}
        onClick={() => { if (isGuest) { onRequireLogin?.(); return; } canJoin && onJoinTable(tableId, mode); }}
        disabled={!canJoin}
        className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl relative overflow-hidden"
        style={{
          background: canJoin
            ? `linear-gradient(145deg,${cfg.from},${cfg.to})`
            : 'rgba(200,200,200,0.3)',
          border: `1.5px solid ${canJoin ? cfg.border : 'rgba(180,120,60,0.15)'}`,
          boxShadow: canJoin ? `0 4px 0 ${cfg.border},0 6px 12px ${cfg.border}44` : 'none',
          cursor: canJoin ? 'pointer' : 'not-allowed',
          opacity: isLocked ? 0.6 : 1,
        }}>
        {/* Gloss */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.4),transparent)',pointerEvents:'none'}}/>

        <span className="text-[10px] font-black uppercase tracking-wider relative z-10"
          style={{color: canJoin ? cfg.textDark : '#999'}}>
          {mode}
        </span>

        {/* Player dots */}
        <div className="flex gap-1 relative z-10">
          {Array.from({length: max}).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < count ? 'white' : 'rgba(255,255,255,0.3)',
              boxShadow: i < count ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}/>
          ))}
        </div>

        <span className="text-[9px] font-bold relative z-10"
          style={{color: canJoin ? cfg.textDark : '#999'}}>
          {isLocked ? (
            <span className="flex items-center gap-0.5">
              <Lock size={8}/> Playing
            </span>
          ) : hasMe ? '✓ Joined' : `${count}/${max}`}
        </span>
      </motion.button>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 select-none px-1"
      style={{minHeight:'100%'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 text-xs font-black uppercase tracking-wider transition active:scale-95"
          style={WARM_CARD}>
          <ArrowLeft size={14}/> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-xs font-bold text-amber-700">Live Rooms</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-xl font-black text-stone-800 tracking-tight">🌐 Play Online</h1>
        <p className="text-xs text-amber-700 font-medium mt-0.5">
          Join a table — game starts when full
        </p>
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"/>
          <span className="text-xs text-amber-700 font-medium">Loading rooms...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-6">
          {TABLES.map((cfg) => (
            <motion.div
              key={cfg.id}
              initial={{opacity:0, y:10}}
              animate={{opacity:1, y:0}}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={WARM_CARD}>

              {/* Table icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: `linear-gradient(145deg,${cfg.from},${cfg.to})`,
                  border: `2px solid ${cfg.border}`,
                  boxShadow: `0 4px 0 ${cfg.border}`,
                }}>
                {cfg.emoji}
              </div>

              {/* Table name */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-stone-800">
                  {cfg.name} Room
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Wifi size={10} className="text-amber-600"/>
                  <span className="text-[10px] text-amber-700 font-medium">
                    {(() => {
                      const t = tables[cfg.id];
                      if (!t) return 'Loading...';
                      const t2 = t.slots2P?.players?.length || 0;
                      const t4 = t.slots4P?.players?.length || 0;
                      const total = t2 + t4;
                      return total > 0 ? `${total} player${total > 1 ? 's' : ''} online` : 'Empty — be first!';
                    })()}
                  </span>
                </div>
              </div>

              {/* 2P and 4P buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {renderSlotButton(cfg.id, cfg, '2P')}
                {renderSlotButton(cfg.id, cfg, '4P')}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
