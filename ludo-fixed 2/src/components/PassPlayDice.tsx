/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Player, PlayerColor } from '../types';

interface PassPlayDiceProps {
  players: Player[];
  activePlayer: Player | null;
  diceState: 'idle' | 'rolling' | 'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
}

const COLOR_CONFIG: Record<PlayerColor, {
  activeBg: string;
  activeBorder: string;
  activeShadow: string;
  text: string;
  gradient: string;
  shadowColor: string;
}> = {
  red:    { activeBg:'rgba(254,205,211,0.85)', activeBorder:'rgba(244,63,94,0.5)', activeShadow:'0 4px 16px rgba(244,63,94,0.35)', text:'#be123c', gradient:'linear-gradient(145deg,#fda4af,#f43f5e,#881337)', shadowColor:'#be123c' },
  green:  { activeBg:'rgba(187,247,208,0.85)', activeBorder:'rgba(34,197,94,0.5)',  activeShadow:'0 4px 16px rgba(34,197,94,0.35)',  text:'#15803d', gradient:'linear-gradient(145deg,#bbf7d0,#22c55e,#14532d)', shadowColor:'#16a34a' },
  yellow: { activeBg:'rgba(254,249,195,0.85)', activeBorder:'rgba(245,158,11,0.5)', activeShadow:'0 4px 16px rgba(245,158,11,0.35)', text:'#b45309', gradient:'linear-gradient(145deg,#fef9c3,#f59e0b,#78350f)', shadowColor:'#d97706' },
  blue:   { activeBg:'rgba(191,219,254,0.85)', activeBorder:'rgba(59,130,246,0.5)', activeShadow:'0 4px 16px rgba(59,130,246,0.35)', text:'#1d4ed8', gradient:'linear-gradient(145deg,#bfdbfe,#3b82f6,#1e3a8a)', shadowColor:'#2563eb' },
};

// Each player color maps to a fixed corner
const CORNER: Record<PlayerColor, 'tl' | 'tr' | 'bl' | 'br'> = {
  red: 'tl', green: 'tr', blue: 'bl', yellow: 'br',
};

// Dot patterns for dice faces
const DOT_PATTERN: Record<number, number[][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const MiniDice: React.FC<{
  value: number;
  isRolling: boolean;
  color: PlayerColor;
  isActive: boolean;
}> = ({ value, isRolling, color, isActive }) => {
  const cfg = COLOR_CONFIG[color];
  const dots = DOT_PATTERN[Math.max(1, Math.min(6, value || 1))] || [];

  return (
    <motion.div
      animate={isRolling ? {rotate:[0,90,180,270,360], scale:[1,0.9,1.1,0.95,1]} : {rotate:0}}
      transition={{duration:0.5, ease:'easeInOut'}}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: isActive ? cfg.gradient : 'rgba(255,255,255,0.6)',
        border: `2px solid ${isActive ? cfg.shadowColor : 'rgba(180,120,60,0.2)'}`,
        boxShadow: isActive ? `0 5px 0 ${cfg.shadowColor},0 8px 16px ${cfg.activeShadow.split('shadow: ')[0]}` : '0 3px 0 rgba(180,120,60,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
      {/* Gloss */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)',pointerEvents:'none'}} />

      {isRolling ? (
        <span style={{fontSize:18,position:'relative',zIndex:1}}>🌀</span>
      ) : (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gridTemplateRows:'repeat(3,1fr)',
          width:32,
          height:32,
          position:'relative',
          zIndex:1,
          gap:2,
        }}>
          {Array.from({length:9},(_,i) => {
            const r = Math.floor(i/3), c = i%3;
            const hasDot = dots.some(([dr,dc]) => dr===r && dc===c);
            return (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                {hasDot && (
                  <div style={{
                    width:6,
                    height:6,
                    borderRadius:'50%',
                    background: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(180,120,60,0.4)',
                    boxShadow:'inset 0 1px 2px rgba(0,0,0,0.2)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

const CornerDice: React.FC<{
  player: Player;
  corner: 'tl'|'tr'|'bl'|'br';
  isActive: boolean;
  diceState: 'idle'|'rolling'|'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
}> = ({ player, corner, isActive, diceState, diceValue, hasRolled, isAnimating, onRoll }) => {
  const cfg = COLOR_CONFIG[player.color];

  const borderRadius: Record<string, string> = {
    tl: '4px 12px 12px 4px',
    tr: '12px 4px 4px 12px',
    bl: '4px 12px 12px 4px',
    br: '12px 4px 4px 12px',
  };

  const canRoll = isActive && !hasRolled && !isAnimating && diceState === 'idle';

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.35, scale: isActive ? 1 : 0.92 }}
      transition={{ duration: 0.2 }}
      onClick={canRoll ? onRoll : undefined}
      style={{
        display: 'flex',
        flexDirection: corner === 'tl' || corner === 'bl' ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: 5,
        padding: '5px 7px',
        borderRadius: borderRadius[corner],
        background: isActive ? cfg.activeBg : 'rgba(255,255,255,0.5)',
        border: `1.5px solid ${isActive ? cfg.activeBorder : 'rgba(180,120,60,0.12)'}`,
        boxShadow: isActive ? cfg.activeShadow : 'none',
        cursor: canRoll ? 'pointer' : 'default',
        backdropFilter: 'blur(4px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Gloss */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)',pointerEvents:'none'}} />

      <MiniDice
        value={diceValue}
        isRolling={diceState === 'rolling'}
        color={player.color}
        isActive={isActive}
      />

      <div style={{display:'flex',flexDirection:'column',gap:1,textAlign: corner==='tl'||corner==='bl' ? 'left' : 'right', position:'relative', zIndex:1}}>
        <span style={{fontSize:9,fontWeight:900,color:cfg.text,lineHeight:1.2,maxWidth:50,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {player.name.split(' ')[0]}
        </span>
        <span style={{fontSize:7,fontWeight:700,color:cfg.text,textTransform:'uppercase',letterSpacing:'0.3px',opacity:0.8}}>
          {isActive
            ? (hasRolled ? 'PICK TOKEN' : diceState === 'rolling' ? 'ROLLING...' : 'ROLL DICE')
            : 'WAITING'}
        </span>
        {/* Active ping dot */}
        {isActive && !hasRolled && diceState === 'idle' && (
          <span style={{
            display:'inline-block',
            width:5,
            height:5,
            borderRadius:'50%',
            background:cfg.text,
            alignSelf: corner==='tl'||corner==='bl' ? 'flex-start' : 'flex-end',
            animation:'ping 1s infinite',
          }} />
        )}
      </div>
    </motion.div>
  );
};

export const PassPlayDice: React.FC<PassPlayDiceProps> = ({
  players, activePlayer, diceState, diceValue, hasRolled, isAnimating, onRoll,
}) => {
  const activePlayers = players.filter(p => p.type !== 'none');

  const getPlayer = (color: PlayerColor) => activePlayers.find(p => p.color === color);

  const corners: Array<{ color: PlayerColor; corner: 'tl'|'tr'|'bl'|'br'; style: React.CSSProperties }> = [
    { color:'red',    corner:'tl', style:{position:'absolute', top:0, left:0} },
    { color:'green',  corner:'tr', style:{position:'absolute', top:0, right:0} },
    { color:'blue',   corner:'bl', style:{position:'absolute', bottom:0, left:0} },
    { color:'yellow', corner:'br', style:{position:'absolute', bottom:0, right:0} },
  ];

  return (
    <>
      {corners.map(({ color, corner, style }) => {
        const player = getPlayer(color);
        if (!player) return null;
        return (
          <div key={color} style={style}>
            <CornerDice
              player={player}
              corner={corner}
              isActive={activePlayer?.color === color}
              diceState={diceState}
              diceValue={diceValue}
              hasRolled={hasRolled}
              isAnimating={isAnimating}
              onRoll={onRoll}
            />
          </div>
        );
      })}
    </>
  );
};
