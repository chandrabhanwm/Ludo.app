/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play } from 'lucide-react';
import { Player, PlayerColor } from '../types';
import { audio } from '../utils/audio';

interface TableSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (players: Player[], mode: 'ai' | 'pass' | 'online', roomCode?: string) => void;
  initialMode?: 'ai' | 'pass' | 'online';
}

const AVATAR_POOL = ['👑', '🦁', '🐼', '🦊', '🐨', '🤖', '🦄', '🐯', '🐉', '🦉', '🎩', '🚀', '⭐', '🍀', '🍕', '⚽'];
const AI_BOT_NAMES = ['Bot · Falcon', 'Bot · Tiger', 'Bot · Dragon', 'Bot · Fox', 'Bot · Wolf', 'Bot · Panda'];

const Gloss = () => (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)', borderRadius: 'inherit', pointerEvents: 'none' }} />
);

export const TableSetupModal: React.FC<TableSetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialMode,
}) => {
  const [name, setName] = useState('');
  const [numPlayers, setNumPlayers] = useState<2 | 3 | 4>(2);
  const [otherSeats, setOtherSeats] = useState<'ai' | 'pass' | 'online'>('ai');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');

  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem('ludo_player_name') || '';
      setName(savedName);
      if (initialMode) {
        setOtherSeats(initialMode === 'online' ? 'ai' : initialMode);
      }
      const savedDifficulty = (localStorage.getItem('ludo_ai_difficulty') as 'easy' | 'medium' | 'hard') || 'medium';
      setSelectedDifficulty(savedDifficulty);
      const savedColor = (localStorage.getItem('ludo_player_color') as PlayerColor) || 'red';
      setSelectedColor(savedColor);
    }
  }, [isOpen, initialMode]);

  const handleStartClick = () => {
    audio.playClick();
    const finalName = name.trim() || 'Player 1';
    localStorage.setItem('ludo_player_name', finalName);
    if (otherSeats === 'ai') localStorage.setItem('ludo_ai_difficulty', selectedDifficulty);
    localStorage.setItem('ludo_player_color', selectedColor);
    triggerGameStart(finalName);
  };

  const triggerGameStart = (finalName: string) => {
    const preparedPlayers: Player[] = [];
    const allColors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    const otherColors = allColors.filter(c => c !== selectedColor);
    const orderedColors = [selectedColor, ...otherColors];
    const botNames = [...AI_BOT_NAMES].sort(() => 0.5 - Math.random());

    preparedPlayers.push({ id: selectedColor, name: finalName, color: selectedColor, type: 'human', avatar: '👑', isWinner: false });

    let botIndex = 0;
    for (let i = 1; i < 4; i++) {
      const color = orderedColors[i];
      if (i < numPlayers) {
        if (otherSeats === 'ai') {
          preparedPlayers.push({ id: color, name: botNames[botIndex++] || `Bot ${i}`, color, type: 'computer', avatar: '🤖', isWinner: false });
        } else {
          preparedPlayers.push({ id: color, name: `Player ${i + 1}`, color, type: 'human', avatar: AVATAR_POOL[i % AVATAR_POOL.length], isWinner: false });
        }
      } else {
        preparedPlayers.push({ id: color, name: '', color, type: 'none', avatar: '', isWinner: false });
      }
    }
    onStartGame(preparedPlayers, otherSeats, undefined);
    onClose();
  };

  if (!isOpen) return null;

  const isAI = otherSeats === 'ai';
  const title = initialMode === 'ai' ? 'vs Computer' : initialMode === 'pass' ? 'Pass & Play' : 'Table Setup';
  const titleEmoji = initialMode === 'ai' ? '🤖' : initialMode === 'pass' ? '🧩' : '🎲';

  // Shared styles
  const cardBg = 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)';
  const dotPattern = { backgroundImage: 'radial-gradient(circle,rgba(180,120,60,0.08) 1.5px,transparent 1.5px)', backgroundSize: '16px 16px' };

  const selectedBtnStyle = {
    background: 'linear-gradient(145deg,#f59e0b,#d97706)',
    border: '2px solid #b45309',
    boxShadow: '0 5px 0 #b45309,0 8px 20px rgba(245,158,11,0.3),inset 0 1.5px 3px rgba(255,255,255,0.5)',
    color: '#431407',
  };

  const idleBtnStyle = {
    background: 'rgba(255,255,255,0.7)',
    border: '2px solid rgba(180,120,60,0.25)',
    boxShadow: '0 3px 0 rgba(180,120,60,0.15),inset 0 1px 2px rgba(255,255,255,0.8)',
    color: '#78716c',
  };

  const colorMap: { color: PlayerColor; hex: string; shadow: string }[] = [
    { color: 'red',    hex: '#f43f5e', shadow: '#be123c' },
    { color: 'green',  hex: '#22c55e', shadow: '#15803d' },
    { color: 'yellow', hex: '#f59e0b', shadow: '#b45309' },
    { color: 'blue',   hex: '#3b82f6', shadow: '#1d4ed8' },
  ];

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(120,80,20,0.22)', backdropFilter: 'blur(8px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          style={{
            width: '100%', maxWidth: '440px',
            background: cardBg,
            border: '1.5px solid rgba(245,200,130,0.45)',
            borderRadius: '28px',
            boxShadow: '0 32px 80px -12px rgba(140,80,20,0.3),0 8px 32px -8px rgba(140,80,20,0.18),inset 0 1px 0 rgba(255,255,255,0.9)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Dot pattern */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...dotPattern }} />
          {/* Top sheen */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(180deg,rgba(255,255,255,0.7) 0%,transparent 100%)', pointerEvents: 'none' }} />

          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { audio.playClick(); onClose(); }}
            style={{
              position: 'absolute', top: '16px', right: '16px', zIndex: 10,
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              border: '1.5px solid rgba(180,120,60,0.25)',
              boxShadow: '0 2px 8px rgba(140,80,20,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <X size={14} strokeWidth={2.5} color="#78716c" />
          </motion.button>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 2, padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── HEADER ── */}
            <div style={{ paddingRight: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', fontSize: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(145deg,#fde68a,#fcd34d)',
                  border: '1.5px solid #f59e0b',
                  boxShadow: '0 4px 0 #f59e0b,0 6px 14px rgba(245,158,11,0.3),inset 0 1.5px 3px rgba(255,255,255,0.6)',
                  position: 'relative', overflow: 'hidden', flexShrink: 0,
                }}>
                  <Gloss />
                  <span style={{ position: 'relative', zIndex: 1 }}>{titleEmoji}</span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1917', letterSpacing: '-0.3px' }}>{title}</h2>
              </div>
            </div>

            {/* ── YOUR NAME ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={localStorage.getItem('ludo_player_name') || 'Enter your name'}
                maxLength={14}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(180,120,60,0.28)',
                  boxShadow: 'inset 0 2px 4px rgba(180,120,60,0.08),0 1px 0 rgba(255,255,255,0.9)',
                  fontSize: '13px', fontWeight: 700, color: '#1c1917',
                  outline: 'none',
                }}
              />
            </div>

            {/* ── NUMBER OF PLAYERS ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '9px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Number of Players</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {([2, 3, 4] as const).map((num) => {
                  const isSel = numPlayers === num;
                  return (
                    <motion.button
                      key={num}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ y: 2, scale: 0.97 }}
                      onClick={() => { audio.playClick(); setNumPlayers(num); }}
                      style={{
                        padding: '13px 0', borderRadius: '14px',
                        fontSize: '15px', fontWeight: 900, cursor: 'pointer',
                        position: 'relative', overflow: 'hidden',
                        transition: 'all 0.15s',
                        ...(isSel ? selectedBtnStyle : idleBtnStyle),
                      }}>
                      {isSel && <Gloss />}
                      <span style={{ position: 'relative', zIndex: 1 }}>{num}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── AI DIFFICULTY (only for AI mode) ── */}
            {isAI && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '9px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px' }}>AI Difficulty</label>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', fontFamily: 'monospace' }}>
                    {selectedDifficulty === 'easy' && '65% optimal moves'}
                    {selectedDifficulty === 'medium' && '90% optimal moves'}
                    {selectedDifficulty === 'hard' && '100% optimal moves'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {([
                    { id: 'easy', label: 'Easy', emoji: '😊' },
                    { id: 'medium', label: 'Medium', emoji: '😐' },
                    { id: 'hard', label: 'Hard', emoji: '😈' },
                  ] as const).map(({ id, label, emoji }) => {
                    const isSel = selectedDifficulty === id;
                    return (
                      <motion.button
                        key={id}
                        whileHover={{ y: -2, scale: 1.03 }}
                        whileTap={{ y: 2, scale: 0.97 }}
                        onClick={() => { audio.playClick(); setSelectedDifficulty(id); }}
                        style={{
                          padding: '12px 0', borderRadius: '14px',
                          fontSize: '12px', fontWeight: 900, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                          position: 'relative', overflow: 'hidden',
                          transition: 'all 0.15s',
                          ...(isSel ? selectedBtnStyle : idleBtnStyle),
                        }}>
                        {isSel && <Gloss />}
                        <span style={{ position: 'relative', zIndex: 1, fontSize: '16px' }}>{emoji}</span>
                        <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── YOUR COLOR ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '9px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Your Color</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {colorMap.map(({ color, hex, shadow }) => {
                  const isSel = selectedColor === color;
                  return (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { audio.playClick(); setSelectedColor(color); }}
                      style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: `linear-gradient(145deg,${hex},${shadow})`,
                        border: isSel ? `3px solid ${hex}` : '2px solid rgba(255,255,255,0.5)',
                        boxShadow: isSel
                          ? `0 5px 0 ${shadow},0 8px 18px ${hex}80,inset 0 1.5px 3px rgba(255,255,255,0.5)`
                          : '0 3px 0 rgba(0,0,0,0.1),inset 0 1px 2px rgba(255,255,255,0.4)',
                        cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        transform: isSel ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}>
                      <Gloss />
                      {isSel && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 1 }}>✓</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── START GAME BUTTON ── */}

            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ y: 4, scale: 0.97 }}
              onClick={handleStartClick}
              style={{
                width: '100%', padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(145deg,#f59e0b,#d97706)',
                border: '2px solid #b45309',
                boxShadow: '0 6px 0 #b45309,0 10px 28px rgba(245,158,11,0.35),inset 0 1.5px 3px rgba(255,255,255,0.5)',
                color: '#431407', fontSize: '15px', fontWeight: 900,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                letterSpacing: '0.3px', textTransform: 'uppercase',
              }}>
              <Gloss />
              <div style={{ position: 'absolute', inset: '2px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
              <Play size={16} fill="#431407" strokeWidth={0} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>Start Game</span>
            </motion.button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
