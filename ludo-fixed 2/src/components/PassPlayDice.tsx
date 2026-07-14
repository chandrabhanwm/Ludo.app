/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Player, PlayerColor } from '../types';
import { Dice3D } from './Dice3D';

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
  bg: string;
  border: string;
  shadow: string;
  text: string;
  pill: string;
}> = {
  red:    { bg: 'rgba(254,205,211,0.55)', border: 'rgba(244,63,94,0.45)', shadow: 'rgba(244,63,94,0.2)', text: '#be123c', pill: 'bg-rose-500' },
  green:  { bg: 'rgba(187,247,208,0.55)', border: 'rgba(34,197,94,0.45)', shadow: 'rgba(34,197,94,0.2)', text: '#15803d', pill: 'bg-emerald-500' },
  yellow: { bg: 'rgba(254,249,195,0.55)', border: 'rgba(245,158,11,0.45)', shadow: 'rgba(245,158,11,0.2)', text: '#b45309', pill: 'bg-amber-500' },
  blue:   { bg: 'rgba(191,219,254,0.55)', border: 'rgba(59,130,246,0.45)', shadow: 'rgba(59,130,246,0.2)', text: '#1d4ed8', pill: 'bg-sky-500' },
};

// Corner positions — each color maps to a fixed corner
const CORNER_POSITIONS: Record<PlayerColor, 'tl' | 'tr' | 'bl' | 'br'> = {
  red:    'tl',
  green:  'tr',
  blue:   'bl',
  yellow: 'br',
};

const DiceCorner: React.FC<{
  player: Player;
  isActive: boolean;
  diceState: 'idle' | 'rolling' | 'rolled';
  diceValue: number;
  hasRolled: boolean;
  isAnimating: boolean;
  onRoll: () => void;
}> = ({ player, isActive, diceState, hasRolled, isAnimating, onRoll, diceValue }) => {
  const cfg = COLOR_CONFIG[player.color];
  const corner = CORNER_POSITIONS[player.color];

  const cornerRadius: Record<string, string> = {
    tl: 'rounded-br-2xl rounded-tl-xl',
    tr: 'rounded-bl-2xl rounded-tr-xl',
    bl: 'rounded-tr-2xl rounded-bl-xl',
    br: 'rounded-tl-2xl rounded-br-xl',
  };

  return (
    <motion.div
      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.38, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center gap-1 px-2 py-1.5 ${cornerRadius[corner]} relative overflow-hidden`}
      style={{
        background: isActive ? cfg.bg : 'rgba(255,255,255,0.4)',
        border: `1.5px solid ${isActive ? cfg.border : 'rgba(180,120,60,0.12)'}`,
        boxShadow: isActive ? `0 3px 12px ${cfg.shadow}` : 'none',
        minWidth: 68,
      }}
    >
      {/* Gloss */}
      <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
        style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />

      {/* Player name */}
      <span className="text-[9px] font-black tracking-wide relative z-10 truncate max-w-[60px]"
        style={{color: cfg.text}}>
        {player.name.split(' ')[0]}
      </span>

      {/* Dice */}
      <div className="relative z-10">
        {isActive ? (
          <Dice3D
            value={diceValue}
            diceState={diceState}
            onClick={onRoll}
            disabled={hasRolled || isAnimating}
            playerColor={player.color}
            compact
          />
        ) : (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black relative overflow-hidden`}
            style={{
              background: `linear-gradient(145deg,${getTokenLight(player.color)},${getTokenDark(player.color)})`,
              border: `1.5px solid ${cfg.border}`,
            }}>
            <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
              style={{background:'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)'}} />
            <span className="relative z-10 opacity-60">—</span>
          </div>
        )}
      </div>

      {/* Status label */}
      <span className="text-[7px] font-black uppercase tracking-wider relative z-10"
        style={{color: cfg.text}}>
        {isActive ? (hasRolled ? 'PICK TOKEN' : 'ROLL DICE') : 'WAITING'}
      </span>

      {/* Active pulse dot */}
      {isActive && !hasRolled && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full z-10" style={{background: cfg.text}}>
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{background: cfg.text}} />
        </span>
      )}
    </motion.div>
  );
};

function getTokenLight(color: PlayerColor): string {
  return { red: '#fda4af', green: '#bbf7d0', yellow: '#fef9c3', blue: '#bfdbfe' }[color];
}
function getTokenDark(color: PlayerColor): string {
  return { red: '#881337', green: '#14532d', yellow: '#78350f', blue: '#1e3a8a' }[color];
}

export const PassPlayDice: React.FC<PassPlayDiceProps> = ({
  players,
  activePlayer,
  diceState,
  diceValue,
  hasRolled,
  isAnimating,
  onRoll,
}) => {
  // Get active players only (not 'none' type)
  const activePlayers = players.filter(p => p.type !== 'none');

  // Top row: red (tl) + green (tr)
  const topLeft  = activePlayers.find(p => p.color === 'red');
  const topRight = activePlayers.find(p => p.color === 'green');
  const botLeft  = activePlayers.find(p => p.color === 'blue');
  const botRight = activePlayers.find(p => p.color === 'yellow');

  const renderCorner = (player: Player | undefined, fallback: React.ReactNode = null) => {
    if (!player) return <div style={{minWidth:68}} />;
    return (
      <DiceCorner
        player={player}
        isActive={activePlayer?.color === player.color}
        diceState={diceState}
        diceValue={diceValue}
        hasRolled={hasRolled}
        isAnimating={isAnimating}
        onRoll={onRoll}
      />
    );
  };

  return (
    <div className="w-full select-none" style={{padding:'0 4px 6px'}}>
      {/* Top row */}
      <div className="flex justify-between mb-1">
        {renderCorner(topLeft)}
        {renderCorner(topRight)}
      </div>
      {/* Bottom row */}
      <div className="flex justify-between mt-1">
        {renderCorner(botLeft)}
        {renderCorner(botRight)}
      </div>
    </div>
  );
};
