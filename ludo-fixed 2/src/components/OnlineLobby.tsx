/**
 * Online Lobby — 6 rooms, each with 4×2P and 4×4P tables
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wifi } from 'lucide-react';
import { TABLES, TableDoc, TableMode, TableSlot, TABLES_PER_MODE } from '../multiplayer/tableConfig';
import { listenToTables, initializeTables, resetStaleSlots } from '../multiplayer/gameSync';

interface OnlineLobbyProps {
  onJoinTable: (tableId: string, mode: TableMode, tableNum: number) => void;
  onBack: () => void;
  currentUid: string;
  isGuest?: boolean;
  onRequireLogin?: () => void;
}

const WARM_CARD = {
  background: 'rgba(255,255,255,0.88)',
  border: '1.5px solid rgba(180,120,60,0.22)',
  boxShadow: '0 4px 16px rgba(140,80,20,0.1)',
};

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  onJoinTable, onBack, currentUid, isGuest, onRequireLogin,
}) => {
  const [tables, setTables] = useState<Record<string, TableDoc>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedMode, setExpandedMode] = useState<TableMode>('4P');

  useEffect(() => {
    const unsub = listenToTables((data) => {
      setTables(data);
      setLoading(false);
    });
    initializeTables().catch(() => {});
    resetStaleSlots().catch(() => {});

    const staleCheck = setInterval(() => resetStaleSlots().catch(() => {}), 60_000);
    return () => { unsub(); clearInterval(staleCheck); };
  }, []);

  const getSlots = (tableId: string, mode: TableMode): TableSlot[] => {
    const t = tables[tableId];
    if (!t) return Array.from({length: TABLES_PER_MODE}, (_, i) => ({
      tableNum: i + 1, status: 'waiting' as const,
      players: [], gameId: null, countdownStartedAt: null, lockedAt: null,
    }));
    const slots = mode === '2P' ? t.slots2P : t.slots4P;
    return Array.isArray(slots) ? slots : Array.from({length: TABLES_PER_MODE}, (_, i) => ({
      tableNum: i + 1, status: 'waiting' as const,
      players: [], gameId: null, countdownStartedAt: null, lockedAt: null,
    }));
  };

  const getTotalOnline = (tableId: string): number => {
    const t = tables[tableId];
    if (!t) return 0;
    const s2 = Array.isArray(t.slots2P) ? t.slots2P : [];
    const s4 = Array.isArray(t.slots4P) ? t.slots4P : [];
    return [...s2, ...s4].reduce((sum, s) => sum + (s.players?.length || 0), 0);
  };

  const handleJoin = (tableId: string, mode: TableMode, tableNum: number) => {
    if (isGuest) { onRequireLogin?.(); return; }
    onJoinTable(tableId, mode, tableNum);
  };

  const renderTableRow = (tableId: string, cfg: typeof TABLES[0], slot: TableSlot, mode: TableMode) => {
    const max = mode === '2P' ? 2 : 4;
    const count = slot.players?.length || 0;
    const isLocked = slot.status === 'playing' || slot.status === 'countdown';
    const isFull = count >= max;
    const canJoin = !isLocked && !isFull;
    const hasMe = slot.players?.some(p => p.uid === currentUid);

    return (
      <motion.div
        key={slot.tableNum}
        initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
        transition={{delay: slot.tableNum * 0.05}}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{background: hasMe ? `${cfg.from}44` : 'rgba(255,255,255,0.5)', border: `1px solid ${hasMe ? cfg.border + '44' : 'rgba(180,120,60,0.1)'}`}}>

        {/* Table number */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{background:`linear-gradient(145deg,${cfg.from},${cfg.to})`, color: cfg.textDark, border:`1.5px solid ${cfg.border}`}}>
          {slot.tableNum}
        </div>

        {/* Player dots */}
        <div className="flex gap-1 flex-1">
          {Array.from({length: max}).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < count
                ? (isLocked ? '#94a3b8' : cfg.border)
                : 'rgba(180,120,60,0.15)',
              border: `1.5px solid ${i < count ? cfg.border : 'rgba(180,120,60,0.2)'}`,
            }}/>
          ))}
          <span className="text-[10px] font-bold ml-1" style={{color: cfg.textDark + 'aa'}}>
            {count}/{max}
          </span>
        </div>

        {/* Status / Join button */}
        {isLocked ? (
          <div className="text-[9px] font-black px-2 py-1 rounded-lg"
            style={{background:'rgba(100,100,100,0.12)', color:'#64748b'}}>
            🔒 Playing
          </div>
        ) : hasMe ? (
          <div className="text-[9px] font-black px-2 py-1 rounded-lg"
            style={{background: cfg.border + '22', color: cfg.border}}>
            ✓ Joined
          </div>
        ) : (
          <motion.button
            whileTap={{scale:0.95}}
            onClick={() => canJoin && handleJoin(tableId, mode, slot.tableNum)}
            disabled={!canJoin}
            className="text-[10px] font-black px-3 py-1.5 rounded-lg transition"
            style={{
              background: `linear-gradient(145deg,${cfg.from},${cfg.to})`,
              border: `1.5px solid ${cfg.border}`,
              boxShadow: `0 3px 0 ${cfg.border}`,
              color: cfg.textDark,
              cursor: canJoin ? 'pointer' : 'not-allowed',
              opacity: canJoin ? 1 : 0.5,
            }}>
            JOIN
          </motion.button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-3 select-none px-1 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 text-xs font-black uppercase tracking-wider active:scale-95"
          style={WARM_CARD}>
          <ArrowLeft size={14}/> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-xs font-bold text-amber-700">Live Rooms</span>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-black text-stone-800">🌐 Play Online</h1>
        <p className="text-xs text-amber-700 font-medium mt-0.5">
          6 rooms · 4 tables each · 2P or 4P
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"/>
          <span className="text-xs text-amber-700 font-medium">Loading rooms...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {TABLES.map((cfg) => {
            const totalOnline = getTotalOnline(cfg.id);
            const isExpanded = expandedRoom === cfg.id;

            return (
              <div key={cfg.id} className="rounded-2xl overflow-hidden" style={WARM_CARD}>

                {/* Room header — tap to expand */}
                <motion.button
                  className="w-full flex items-center gap-3 p-4"
                  onClick={() => {
                    setExpandedRoom(isExpanded ? null : cfg.id);
                    setExpandedMode('4P');
                  }}>
                  {/* Room icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{background:`linear-gradient(145deg,${cfg.from},${cfg.to})`,border:`2px solid ${cfg.border}`,boxShadow:`0 3px 0 ${cfg.border}`}}>
                    {cfg.emoji}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="text-sm font-black text-stone-800">{cfg.name} Room</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Wifi size={9} className="text-amber-600"/>
                      <span className="text-[10px] text-amber-700 font-medium">
                        {totalOnline > 0 ? `${totalOnline} player${totalOnline > 1 ? 's' : ''} online` : 'Empty — be first!'}
                      </span>
                    </div>
                  </div>

                  <motion.div animate={{rotate: isExpanded ? 180 : 0}} transition={{duration:0.2}}
                    className="text-amber-600 text-lg">▾</motion.div>
                </motion.button>

                {/* Expanded: 2P / 4P tabs + table list */}
                {isExpanded && (
                  <motion.div
                    initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
                    exit={{height:0,opacity:0}} transition={{duration:0.2}}
                    className="px-4 pb-4">

                    {/* 2P / 4P tab selector */}
                    <div className="flex gap-2 mb-3 p-1 rounded-xl"
                      style={{background:'rgba(180,120,60,0.08)'}}>
                      {(['2P','4P'] as TableMode[]).map(m => (
                        <button key={m}
                          onClick={() => setExpandedMode(m)}
                          className="flex-1 py-2 rounded-lg text-xs font-black transition"
                          style={{
                            background: expandedMode === m
                              ? `linear-gradient(145deg,${cfg.from},${cfg.to})`
                              : 'transparent',
                            border: expandedMode === m ? `1.5px solid ${cfg.border}` : '1.5px solid transparent',
                            color: expandedMode === m ? cfg.textDark : '#92400e',
                            boxShadow: expandedMode === m ? `0 2px 0 ${cfg.border}` : 'none',
                          }}>
                          {m} Games
                        </button>
                      ))}
                    </div>

                    {/* Table list */}
                    <div className="flex flex-col gap-2">
                      {getSlots(cfg.id, expandedMode).map(slot =>
                        renderTableRow(cfg.id, cfg, slot, expandedMode)
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
