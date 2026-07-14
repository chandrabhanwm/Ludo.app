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
  stripPosition: "top" | "bottom";
}

// Dot positions per face — 3x3 grid coords [row, col]
const DOTS: Record<number, [number,number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const CFG: Record<PlayerColor,{grad:string,border:string,shadow:string,bg:string,pulse:string}> = {
  red:    {grad:'linear-gradient(145deg,#fda4af,#f43f5e,#881337)',border:'#be123c',shadow:'0 5px 0 #be123c,0 8px 16px rgba(244,63,94,0.35)',bg:'rgba(253,164,175,0.45)',pulse:'#be123c'},
  green:  {grad:'linear-gradient(145deg,#bbf7d0,#22c55e,#14532d)',border:'#16a34a',shadow:'0 5px 0 #15803d,0 8px 16px rgba(34,197,94,0.35)',bg:'rgba(187,247,208,0.45)',pulse:'#15803d'},
  yellow: {grad:'linear-gradient(145deg,#fef9c3,#f59e0b,#78350f)',border:'#d97706',shadow:'0 5px 0 #b45309,0 8px 16px rgba(245,158,11,0.35)',bg:'rgba(254,249,195,0.45)',pulse:'#b45309'},
  blue:   {grad:'linear-gradient(145deg,#bfdbfe,#3b82f6,#1e3a8a)',border:'#2563eb',shadow:'0 5px 0 #1d4ed8,0 8px 16px rgba(59,130,246,0.35)',bg:'rgba(191,219,254,0.45)',pulse:'#1d4ed8'},
};

const MiniFace: React.FC<{value:number; isRolling:boolean; cfg:typeof CFG[PlayerColor]; isActive:boolean; size:number}> = ({value,isRolling,cfg,isActive,size}) => {
  const face = Math.max(1,Math.min(6,value||1));
  const dots = DOTS[face]||[];
  const ds = Math.round(size*0.38); // dot area size

  return (
    <motion.div
      animate={isRolling ? {rotate:[0,-15,15,-10,10,0],scale:[1,0.9,1.05,0.97,1]} : {rotate:0,scale:1}}
      transition={{duration:0.45,ease:'easeInOut'}}
      style={{
        width:size,height:size,borderRadius:size*0.24,
        background:cfg.grad,
        border:`${isActive?2:1.5}px solid ${cfg.border}`,
        boxShadow:isActive?cfg.shadow:`0 3px 0 ${cfg.border}55`,
        display:'flex',alignItems:'center',justifyContent:'center',
        position:'relative',overflow:'hidden',flexShrink:0,cursor:isActive?'pointer':'default',
      }}>
      {/* gloss */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.45),transparent)',pointerEvents:'none'}}/>
      {/* dots */}
      {isRolling ? (
        <div style={{fontSize:size*0.45,position:'relative',zIndex:1}}>🌀</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'repeat(3,1fr)',width:ds,height:ds,position:'relative',zIndex:1}}>
          {Array.from({length:9},(_,i)=>{
            const r=Math.floor(i/3),c=i%3;
            const has=dots.some(([dr,dc])=>dr===r&&dc===c);
            return <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              {has&&<div style={{width:size*0.13,height:size*0.13,borderRadius:'50%',background:'rgba(255,255,255,0.92)',boxShadow:'inset 0 1px 2px rgba(0,0,0,0.2)'}}/>}
            </div>;
          })}
        </div>
      )}
    </motion.div>
  );
};

const TokenIcon: React.FC<{cfg:typeof CFG[PlayerColor]; isActive:boolean; size:number}> = ({cfg,isActive,size}) => (
  <div style={{
    width:size,height:size,borderRadius:'50%',
    background:cfg.grad,
    border:`${isActive?2:1.5}px solid ${cfg.border}`,
    boxShadow:isActive?`0 3px 0 ${cfg.border}66`:'none',
    display:'flex',alignItems:'center',justifyContent:'center',
    position:'relative',overflow:'hidden',flexShrink:0,
  }}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.45),transparent)',pointerEvents:'none'}}/>
    <div style={{width:size*0.42,height:size*0.42,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
      <div style={{width:size*0.27,height:size*0.27,borderRadius:'50%',background:cfg.border}}/>
    </div>
  </div>
);

// One half of a strip — left or right
const DiceHalf: React.FC<{
  player: Player;
  isActive: boolean;
  isLeft: boolean;
  diceState: 'idle'|'rolling'|'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
  diceSize: number;
  tokenSize: number;
}> = ({player,isActive,isLeft,diceState,diceValue,hasRolled,isAnimating,onRoll,diceSize,tokenSize}) => {
  const cfg = CFG[player.color];
  const canRoll = isActive && !hasRolled && !isAnimating && diceState==='idle';

  return (
    <motion.div
      animate={{opacity:isActive?1:0.35,scale:isActive?1:0.96}}
      transition={{duration:0.2}}
      onClick={canRoll?onRoll:undefined}
      style={{
        display:'flex',
        alignItems:'center',
        justifyContent:isLeft?'flex-start':'flex-end',
        gap:5,
        padding:'3px 6px',
        background:isActive?cfg.bg:'transparent',
        border:isActive?`1.5px solid ${cfg.border}44`:'1.5px solid transparent',
        borderRadius:isLeft?'8px 0 0 8px':'0 8px 8px 0',
        cursor:canRoll?'pointer':'default',
        position:'relative',
        overflow:'hidden',
        height:'100%',
      }}>
      {/* gloss when active */}
      {isActive && <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.4),transparent)',pointerEvents:'none'}}/>}

      {isLeft ? (
        <>
          <TokenIcon cfg={cfg} isActive={isActive} size={tokenSize}/>
          <MiniFace value={diceValue} isRolling={diceState==='rolling'} cfg={cfg} isActive={isActive} size={diceSize}/>
        </>
      ) : (
        <>
          <MiniFace value={diceValue} isRolling={diceState==='rolling'} cfg={cfg} isActive={isActive} size={diceSize}/>
          <TokenIcon cfg={cfg} isActive={isActive} size={tokenSize}/>
        </>
      )}

      {/* active pulse dot */}
      {isActive && !hasRolled && diceState==='idle' && (
        <motion.div
          animate={{scale:[1,1.4,1],opacity:[1,0.5,1]}}
          transition={{repeat:Infinity,duration:1.2,ease:'easeInOut'}}
          style={{
            position:'absolute',
            top:4,right:isLeft?undefined:4,left:isLeft?4:undefined,
            width:6,height:6,borderRadius:'50%',background:cfg.pulse,
          }}
        />
      )}
    </motion.div>
  );
};

// A full strip (top or bottom) with same grid as board
const DiceStrip: React.FC<{
  leftPlayer: Player|undefined;
  rightPlayer: Player|undefined;
  activeColor: PlayerColor|undefined;
  diceState: 'idle'|'rolling'|'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
  pathWidth: number; // px — same as board path column
  stripHeight: number;
  diceSize: number;
  tokenSize: number;
}> = ({leftPlayer,rightPlayer,activeColor,diceState,diceValue,hasRolled,isAnimating,onRoll,pathWidth,stripHeight,diceSize,tokenSize}) => (
  <div style={{
    display:'grid',
    gridTemplateColumns:`1fr ${pathWidth}px 1fr`,
    height:stripHeight,
    flexShrink:0,
  }}>
    {/* Left yard dice */}
    <div>
      {leftPlayer && (
        <DiceHalf
          player={leftPlayer}
          isActive={activeColor===leftPlayer.color}
          isLeft
          diceState={diceState}
          diceValue={diceValue}
          hasRolled={hasRolled}
          isAnimating={isAnimating}
          onRoll={onRoll}
          diceSize={diceSize}
          tokenSize={tokenSize}
        />
      )}
    </div>
    {/* Middle path gap — empty */}
    <div/>
    {/* Right yard dice */}
    <div>
      {rightPlayer && (
        <DiceHalf
          player={rightPlayer}
          isActive={activeColor===rightPlayer.color}
          isLeft={false}
          diceState={diceState}
          diceValue={diceValue}
          hasRolled={hasRolled}
          isAnimating={isAnimating}
          onRoll={onRoll}
          diceSize={diceSize}
          tokenSize={tokenSize}
        />
      )}
    </div>
  </div>
);

export const PassPlayDice: React.FC<PassPlayDiceProps> = ({
  players,activePlayer,diceState,diceValue,hasRolled,isAnimating,onRoll,boardSize,stripPosition,
}) => {
  const active = players.filter(p=>p.type!=='none');
  const get = (c:PlayerColor) => active.find(p=>p.color===c);

  // Scale dice and token to board size — mobile-optimised
  // board is e.g. 340px on a typical phone → path col = 340*(2/15) ≈ 45px
  const pathWidth = Math.round(boardSize * (2/15));
  const stripHeight = Math.max(44, Math.round(boardSize * 0.13));
  const diceSize  = Math.max(32, Math.round(stripHeight * 0.78));
  const tokenSize = Math.max(24, Math.round(stripHeight * 0.58));

  const isTop = stripPosition === 'top';
  return (
    <DiceStrip
      leftPlayer={isTop ? get('red') : get('blue')}
      rightPlayer={isTop ? get('green') : get('yellow')}
      activeColor={activePlayer?.color}
      diceState={diceState}
      diceValue={diceValue}
      hasRolled={hasRolled}
      isAnimating={isAnimating}
      onRoll={onRoll}
      pathWidth={pathWidth}
      stripHeight={stripHeight}
      diceSize={diceSize}
      tokenSize={tokenSize}
    />
  );
};
