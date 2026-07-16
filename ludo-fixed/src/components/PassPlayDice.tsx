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
  boardSize: number;
  stripPosition: 'top' | 'bottom';
}

const CFG: Record<PlayerColor, {grad:string; border:string; shadow:string; activeBg:string}> = {
  red:    {grad:'linear-gradient(145deg,#fda4af,#f43f5e,#881337)', border:'#be123c', shadow:'0 5px 0 #9f1239,0 8px 18px rgba(244,63,94,0.4)', activeBg:'rgba(253,164,175,0.18)'},
  green:  {grad:'linear-gradient(145deg,#bbf7d0,#22c55e,#14532d)', border:'#16a34a', shadow:'0 5px 0 #15803d,0 8px 18px rgba(34,197,94,0.4)',  activeBg:'rgba(187,247,208,0.18)'},
  yellow: {grad:'linear-gradient(145deg,#fef9c3,#f59e0b,#78350f)', border:'#d97706', shadow:'0 5px 0 #b45309,0 8px 18px rgba(245,158,11,0.4)', activeBg:'rgba(254,249,195,0.18)'},
  blue:   {grad:'linear-gradient(145deg,#bfdbfe,#3b82f6,#1e3a8a)', border:'#2563eb', shadow:'0 5px 0 #1d4ed8,0 8px 18px rgba(59,130,246,0.4)', activeBg:'rgba(191,219,254,0.18)'},
};

// Dot layout per face — [row, col] in 3×3 grid
const DOTS: Record<number, [number,number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const DiceFace: React.FC<{
  value: number;
  isRolling: boolean;  // FIX 2: only true for ACTIVE player
  cfg: typeof CFG[PlayerColor];
  isActive: boolean;
  size: number;
}> = ({ value, isRolling, cfg, isActive, size }) => {
  const face = Math.max(1, Math.min(6, value || 1));
  const dots = DOTS[face] || [];
  const gridSize = Math.round(size * 0.72); // FIX 3: bigger grid
  const pipSize = Math.round(size * 0.18);  // FIX 3: bigger pips

  return (
    <motion.div
      // FIX 2: only animate for active player
      animate={isRolling
        ? { rotate: [0, -20, 20, -12, 12, 0], scale: [1, 0.88, 1.08, 0.95, 1] }
        : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.24),
        background: cfg.grad,
        border: `${isActive ? 2 : 1.5}px solid ${cfg.border}`,
        boxShadow: isActive ? cfg.shadow : `0 3px 0 ${cfg.border}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        opacity: isActive ? 1 : 0.3, // FIX 5 + Option C: dimmed at 30%
      }}>
      {/* gloss */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.45),transparent)',pointerEvents:'none'}}/>

      {/* FIX 3: proper centered dot grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gridTemplateRows: 'repeat(3,1fr)',
        width: gridSize, height: gridSize,
        position: 'relative', zIndex: 1,
      }}>
        {Array.from({length: 9}, (_, i) => {
          const r = Math.floor(i / 3), c = i % 3;
          const hasDot = dots.some(([dr, dc]) => dr === r && dc === c);
          return (
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              {hasDot && (
                <div style={{
                  width: pipSize, height: pipSize,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// One dice half (left or right)
const DiceSlot: React.FC<{
  player: Player;
  isActive: boolean;
  isLeft: boolean;
  diceState: 'idle'|'rolling'|'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
  diceSize: number;
}> = ({ player, isActive, isLeft, diceState, diceValue, hasRolled, isAnimating, onRoll, diceSize }) => {
  const cfg = CFG[player.color];
  const canRoll = isActive && !hasRolled && !isAnimating && diceState === 'idle';

  return (
    <div
      onClick={canRoll ? onRoll : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isLeft ? 'flex-start' : 'flex-end',
        padding: `3px ${isLeft ? '6px 3px 6px' : '3px 6px 3px'}`,
        cursor: canRoll ? 'pointer' : 'default',
        height: '100%',
        position: 'relative',
        // FIX 5: active player gets subtle colored bg hint
        background: isActive && !hasRolled ? cfg.activeBg : 'transparent',
        borderRadius: isLeft ? '8px 0 0 8px' : '0 8px 8px 0',
        transition: 'background 0.2s',
      }}>
      {/* FIX 2: isRolling only for active player */}
      <DiceFace
        value={diceValue}
        isRolling={isActive && diceState === 'rolling'}
        cfg={cfg}
        isActive={isActive}
        size={diceSize}
      />

      {/* Active pulse dot */}
      {isActive && !hasRolled && diceState === 'idle' && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 4,
            [isLeft ? 'right' : 'left']: 4,
            width: 6, height: 6,
            borderRadius: '50%',
            background: cfg.border,
          }}
        />
      )}
    </div>
  );
};

// Full strip — same 3-col grid as board
const Strip: React.FC<{
  leftPlayer: Player | undefined;
  rightPlayer: Player | undefined;
  activeColor: PlayerColor | undefined;
  diceState: 'idle'|'rolling'|'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
  pathWidth: number;
  diceSize: number;
}> = ({ leftPlayer, rightPlayer, activeColor, diceState, diceValue, hasRolled, isAnimating, onRoll, pathWidth, diceSize }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `1fr ${pathWidth}px 1fr`,
    height: diceSize + 10, // FIX 5: strip = dice + small padding only
    flexShrink: 0,
    width: '100%',
  }}>
    {/* Left yard dice */}
    <div style={{overflow:'hidden'}}>
      {leftPlayer && (
        <DiceSlot
          player={leftPlayer}
          isActive={activeColor === leftPlayer.color}
          isLeft
          diceState={diceState}
          diceValue={diceValue}
          hasRolled={hasRolled}
          isAnimating={isAnimating}
          onRoll={onRoll}
          diceSize={diceSize}
        />
      )}
    </div>
    {/* Middle path gap — empty */}
    <div />
    {/* Right yard dice */}
    <div style={{overflow:'hidden'}}>
      {rightPlayer && (
        <DiceSlot
          player={rightPlayer}
          isActive={activeColor === rightPlayer.color}
          isLeft={false}
          diceState={diceState}
          diceValue={diceValue}
          hasRolled={hasRolled}
          isAnimating={isAnimating}
          onRoll={onRoll}
          diceSize={diceSize}
        />
      )}
    </div>
  </div>
);

export const PassPlayDice: React.FC<PassPlayDiceProps> = ({
  players, activePlayer, diceState, diceValue,
  hasRolled, isAnimating, onRoll, boardSize, stripPosition,
}) => {
  const active = players.filter(p => p.type !== 'none');
  const get = (c: PlayerColor) => active.find(p => p.color === c);

  // Scale dice to board — FIX 5: smaller, just dice
  const diceSize = Math.max(34, Math.round(boardSize * 0.11));
  const pathWidth = Math.round(boardSize * (2 / 15));

  const isTop = stripPosition === 'top';

  return (
    <Strip
      leftPlayer={isTop ? get('red') : get('blue')}
      rightPlayer={isTop ? get('green') : get('yellow')}
      activeColor={activePlayer?.color}
      diceState={diceState}
      diceValue={diceValue}
      hasRolled={hasRolled}
      isAnimating={isAnimating}
      onRoll={onRoll}
      pathWidth={pathWidth}
      diceSize={diceSize}
    />
  );
};
