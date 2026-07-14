/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerColor, Token, Player, BoardCoordinate } from '../types';
import { audio } from '../utils/audio';
import { Dice3D } from './Dice3D';
import { eventBus, ExperienceEventType, experienceEngine } from '../experience';
import { THEMES } from './themes';

interface BoardProps {
  tokens: Token[];
  players: Player[];
  activePlayerColor: PlayerColor | null;
  highlightedTokenIds: string[];
  onTokenClick: (tokenId: string) => void;
  // Dice properties for distributed dice panels
  diceValue: number;
  diceState: 'idle' | 'rolling' | 'rolled';
  hasRolled: boolean;
  onRollDice: () => void;
  isAnimating: boolean;
  isPaused: boolean;
  status?: string;
  matchWinners?: PlayerColor[];
  themeId?: string;
}

// 52 track coordinates clockwise
export const OUTER_TRACK: BoardCoordinate[] = [
  { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 },
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 }, { row: 1, col: 8 }, { row: 2, col: 8 }, { row: 3, col: 8 }, { row: 4, col: 8 }, { row: 5, col: 8 },
  { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 }, { row: 6, col: 13 }, { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 }, { row: 8, col: 13 }, { row: 8, col: 12 }, { row: 8, col: 11 }, { row: 8, col: 10 }, { row: 8, col: 9 },
  { row: 9, col: 8 }, { row: 10, col: 8 }, { row: 11, col: 8 }, { row: 12, col: 8 }, { row: 13, col: 8 }, { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 }, { row: 13, col: 6 }, { row: 12, col: 6 }, { row: 11, col: 6 }, { row: 10, col: 6 }, { row: 9, col: 6 },
  { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 3 }, { row: 8, col: 2 }, { row: 8, col: 1 }, { row: 8, col: 0 },
  { row: 7, col: 0 }
];

// Map coordinates for each player
export const PLAYER_PATHS: {
  [key in PlayerColor]: {
    startIndex: number;
    preHomeIndex: number;
    homePath: BoardCoordinate[];
    homeGoal: BoardCoordinate;
    yardSlots: BoardCoordinate[];
    scatterGoal: (idInColor: number) => BoardCoordinate;
  };
} = {
  red: {
    startIndex: 1, // row 6, col 1
    preHomeIndex: 51, // row 7, col 0 (red arrow cell)
    homePath: [
      { row: 7, col: 1 },
      { row: 7, col: 2 },
      { row: 7, col: 3 },
      { row: 7, col: 4 },
      { row: 7, col: 5 }
    ],
    homeGoal: { row: 7, col: 6 },
    yardSlots: [
      { row: 1.5, col: 1.5 },
      { row: 1.5, col: 3.5 },
      { row: 3.5, col: 1.5 },
      { row: 3.5, col: 3.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 7.0, col: 5.7 },
        { row: 6.7, col: 6.0 },
        { row: 7.3, col: 6.0 },
        { row: 7.0, col: 6.3 }
      ];
      return offsets[id] || { row: 7, col: 6 };
    }
  },
  green: {
    startIndex: 14, // row 1, col 8
    preHomeIndex: 12, // row 0, col 7 (green arrow cell)
    homePath: [
      { row: 1, col: 7 },
      { row: 2, col: 7 },
      { row: 3, col: 7 },
      { row: 4, col: 7 },
      { row: 5, col: 7 }
    ],
    homeGoal: { row: 6, col: 7 },
    yardSlots: [
      { row: 1.5, col: 10.5 },
      { row: 1.5, col: 12.5 },
      { row: 3.5, col: 10.5 },
      { row: 3.5, col: 12.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 5.7, col: 7.0 },
        { row: 6.0, col: 6.7 },
        { row: 6.0, col: 7.3 },
        { row: 6.3, col: 7.0 }
      ];
      return offsets[id] || { row: 6, col: 7 };
    }
  },
  yellow: {
    startIndex: 27, // row 8, col 13
    preHomeIndex: 25, // row 7, col 14 (yellow arrow cell)
    homePath: [
      { row: 7, col: 13 },
      { row: 7, col: 12 },
      { row: 7, col: 11 },
      { row: 7, col: 10 },
      { row: 7, col: 9 }
    ],
    homeGoal: { row: 7, col: 8 },
    yardSlots: [
      { row: 10.5, col: 10.5 },
      { row: 10.5, col: 12.5 },
      { row: 12.5, col: 10.5 },
      { row: 12.5, col: 12.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 7.0, col: 8.3 },
        { row: 6.7, col: 8.0 },
        { row: 7.3, col: 8.0 },
        { row: 7.0, col: 7.7 }
      ];
      return offsets[id] || { row: 7, col: 8 };
    }
  },
  blue: {
    startIndex: 40, // row 13, col 6
    preHomeIndex: 38, // row 14, col 7 (blue arrow cell)
    homePath: [
      { row: 13, col: 7 },
      { row: 12, col: 7 },
      { row: 11, col: 7 },
      { row: 10, col: 7 },
      { row: 9, col: 7 }
    ],
    homeGoal: { row: 8, col: 7 },
    yardSlots: [
      { row: 10.5, col: 1.5 },
      { row: 10.5, col: 3.5 },
      { row: 12.5, col: 1.5 },
      { row: 12.5, col: 3.5 }
    ],
    scatterGoal: (id: number) => {
      const offsets = [
        { row: 8.3, col: 7.0 },
        { row: 8.0, col: 6.7 },
        { row: 8.0, col: 7.3 },
        { row: 7.7, col: 7.0 }
      ];
      return offsets[id] || { row: 8, col: 7 };
    }
  }
};

// Check if a cell is a designated Safe cell
export const isSafeCell = (row: number, col: number): boolean => {
  // Safe track indices: Start cells (1, 14, 27, 40) and Star cells (9, 22, 35, 48)
  const safeIndices = [1, 9, 14, 22, 27, 35, 40, 48];
  return safeIndices.some(idx => {
    const coord = OUTER_TRACK[idx];
    return coord.row === row && coord.col === col;
  });
};

export const getTokenCoordinates = (token: Token): BoardCoordinate => {
  const pathData = PLAYER_PATHS[token.playerColor];
  if (token.position === 'yard') {
    return pathData.yardSlots[token.idInColor];
  }

  const steps = token.position;

  // Final home triangle
  if (steps === 56) {
    return pathData.scatterGoal(token.idInColor);
  }

  // Home path
  if (steps >= 51 && steps <= 55) {
    return pathData.homePath[steps - 51];
  }

  // Outer track
  const trackIndex = (pathData.startIndex + steps) % 52;
  return OUTER_TRACK[trackIndex];
};

export const Board: React.FC<BoardProps> = ({
  tokens,
  players,
  activePlayerColor,
  highlightedTokenIds,
  onTokenClick,
  diceValue,
  diceState,
  hasRolled,
  onRollDice,
  isAnimating,
  isPaused,
  status = 'playing',
  matchWinners = [],
  themeId = 'classic',
}) => {
  const activeTheme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Premium Capture Experience states
  const [activeCapture, setActiveCapture] = useState<{
    capturingColor: string;
    capturedColor: string;
    tokenId: string;
    position: number;
    timestamp: number;
  } | null>(null);

  const [boardScale, setBoardScale] = useState(1.0);
  const [showExtraTurn, setShowExtraTurn] = useState(false);
  const [extraTurnColor, setExtraTurnColor] = useState<string>('red');
  
  const [impactRing, setImpactRing] = useState<{ x: number; y: number; color: string } | null>(null);

  // Premium Home Completion states
  const [homeCompletedToken, setHomeCompletedToken] = useState<{ tokenId: string; playerColor: string } | null>(null);
  const [homeGoalBurst, setHomeGoalBurst] = useState<{ x: number; y: number; color: string; playerColor: string } | null>(null);
  const [boardLightingPulse, setBoardLightingPulse] = useState<boolean>(false);

  interface CaptureParticle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    opacity: number;
    life: number;
    isStar?: boolean;
    type?: 'clash' | 'home';
    wobbleSpeed?: number;
    wobbleAmount?: number;
    angle?: number;
  }
  const [particles, setParticles] = useState<CaptureParticle[]>([]);

  // Subscribe to Event Bus
  useEffect(() => {
    const unsubCapture = eventBus.subscribe(ExperienceEventType.TOKEN_CAPTURED, (event) => {
      const payload = event.payload;

      // 1. Set active capture status
      setActiveCapture({
        ...payload,
        timestamp: Date.now(),
      });

      setShowExtraTurn(false);

      // 2. Animate Board scale impact response (max 1% board scale, quick return)
      const config = experienceEngine.getConfig();
      if (!config.reducedMotion) {
        setBoardScale(0.99);
        setTimeout(() => {
          setBoardScale(1.0);
        }, 220);
      }

      // 3. Set up shockwave concentric impact ring
      const rowCol = OUTER_TRACK[payload.position];
      if (rowCol) {
        const cellX = ((rowCol.col + 0.5) / 15) * 100;
        const cellY = ((rowCol.row + 0.5) / 15) * 100;
        
        setImpactRing({
          x: cellX,
          y: cellY,
          color: payload.capturingColor === 'red' ? '#ff0a54' : payload.capturingColor === 'green' ? '#10b981' : payload.capturingColor === 'yellow' ? '#f59e0b' : '#0ea5e9',
        });

        setTimeout(() => {
          setImpactRing(null);
        }, 550);

        // 4. Generate elegant sparks & dust bursts (max 500ms lifetime)
        if (!config.reducedMotion && !config.performanceMode) {
          const newParticles: CaptureParticle[] = [];
          const particleCount = config.particleQuality === 'low' ? 12 : config.particleQuality === 'medium' ? 22 : 35;
          const colors = {
            red: ['#ff4d6d', '#ff0a54', '#ffe3e8', '#ffd1d6'],
            green: ['#34d399', '#10b981', '#047857', '#bbf7d0'],
            yellow: ['#fbbf24', '#f59e0b', '#b45309', '#fef08a'],
            blue: ['#38bdf8', '#0ea5e9', '#0369a1', '#bae6fd'],
          }[payload.capturingColor as PlayerColor] || ['#fbbf24', '#ffffff'];

          for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.0;
            newParticles.push({
              id: Math.random(),
              x: cellX,
              y: cellY,
              vx: Math.cos(angle) * speed * 0.16,
              vy: Math.sin(angle) * speed * 0.16,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 2.2 + Math.random() * 3.8,
              opacity: 0.9,
              life: 1.0,
              type: 'clash',
            });
          }
          setParticles((prev) => [...prev, ...newParticles]);
        } else if (config.reducedMotion) {
          // Accessibility: Spawn gentle radial fade-out pulse glow instead
          setParticles((prev) => [
            ...prev,
            {
              id: Math.random(),
              x: cellX,
              y: cellY,
              vx: 0,
              vy: 0,
              color: payload.capturingColor === 'red' ? '#ff4d6d' : payload.capturingColor === 'green' ? '#34d399' : payload.capturingColor === 'yellow' ? '#fbbf24' : '#38bdf8',
              size: 45,
              opacity: 0.6,
              life: 1.0,
              type: 'clash',
            }
          ]);
        }
      }

      // 5. Show floating extra turn indicator after 500ms (as board settles)
      setTimeout(() => {
        setExtraTurnColor(payload.capturingColor);
        setShowExtraTurn(true);
      }, 500);

      // 6. Clear banner after 2000ms
      setTimeout(() => {
        setShowExtraTurn(false);
      }, 2500);

      // 7. Clear active capture visual override after 1000ms
      setTimeout(() => {
        setActiveCapture(null);
      }, 1000);
    });

    const unsubHome = eventBus.subscribe(ExperienceEventType.TOKEN_ENTERED_HOME, (event) => {
      const payload = event.payload;

      // 1. Highlight and emphasize the completed token
      setHomeCompletedToken({
        tokenId: payload.tokenId,
        playerColor: payload.playerColor,
      });

      // 2. Setup the golden expanding burst around the home goal cell
      const rowCol = PLAYER_PATHS[payload.playerColor as PlayerColor].homeGoal;
      const cellX = ((rowCol.col + 0.5) / 15) * 100;
      const cellY = ((rowCol.row + 0.5) / 15) * 100;

      setHomeGoalBurst({
        x: cellX,
        y: cellY,
        color: '#fbbf24',
        playerColor: payload.playerColor,
      });

      // 3. Trigger Board Atmosphere Response (golden lighting pulse)
      setBoardLightingPulse(true);

      const config = experienceEngine.getConfig();

      // 4. Generate dedicated home-completion particles
      // gold sparkles, rising magical particles, small star particles, short duration (1-2 seconds)
      if (!config.reducedMotion) {
        const newParticles: CaptureParticle[] = [];
        const particleCount = config.performanceMode 
          ? 12 
          : config.particleQuality === 'low' 
            ? 16 
            : config.particleQuality === 'medium' 
              ? 26 
              : 42;

        const colors = ['#fef08a', '#fbbf24', '#f59e0b', '#d97706', '#ffffff'];

        for (let i = 0; i < particleCount; i++) {
          const isStar = Math.random() > 0.45;
          // Spawn around the goal cell but drift upwards (magical rising feeling)
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 4.5; // spawn slightly scattered near center
          const px = cellX + Math.cos(angle) * dist;
          const py = cellY + Math.sin(angle) * dist;

          // Upward rising velocity (vy is negative)
          const vx = (Math.random() - 0.5) * 0.12;
          const vy = -0.06 - Math.random() * 0.14; // rising upwards!

          newParticles.push({
            id: Math.random(),
            x: px,
            y: py,
            vx,
            vy,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: isStar ? 3.5 + Math.random() * 2.5 : 1.8 + Math.random() * 1.8,
            opacity: 0.95,
            life: 1.0,
            isStar,
            type: 'home',
            wobbleSpeed: 0.05 + Math.random() * 0.08,
            wobbleAmount: 0.12 + Math.random() * 0.2,
            angle: Math.random() * Math.PI * 2,
          });
        }
        setParticles((prev) => [...prev, ...newParticles]);
      } else {
        // Reduced Motion option: gentle expanding soft gold radial glow
        setParticles((prev) => [
          ...prev,
          {
            id: Math.random(),
            x: cellX,
            y: cellY,
            vx: 0,
            vy: 0,
            color: '#fbbf24',
            size: 50,
            opacity: 0.7,
            life: 1.0,
            type: 'home',
          }
        ]);
      }

      // Cleanup times
      setTimeout(() => {
        setBoardLightingPulse(false);
      }, 1500);

      setTimeout(() => {
        setHomeGoalBurst(null);
      }, 1800);

      setTimeout(() => {
        setHomeCompletedToken(null);
      }, 2000);
    });

    return () => {
      unsubCapture();
      unsubHome();
    };
  }, []);

  // Update particles physics loop
  useEffect(() => {
    if (particles.length === 0) return;

    let animFrame: number;
    const update = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => {
            const isHome = p.type === 'home';
            const decay = p.vx === 0 && p.vy === 0
              ? 0.04
              : isHome
                ? 0.02 + Math.random() * 0.01 // slower decay for rising sparks (1.5 - 2s)
                : 0.07; // fast decay for maximum 500ms lifetime for clash particles

            let nx = p.x + p.vx;
            let ny = p.y + p.vy;
            let nvx = p.vx;
            let nvy = p.vy;

            if (isHome && p.vx !== 0) {
              // Add upward drift with horizontal wobble
              const wobble = Math.sin(p.life * 12 + (p.id % 5)) * (p.wobbleAmount || 0.15);
              nx += wobble;
              nvx *= 0.97; // air resistance
              nvy = p.vy * 0.99; // maintain upward speed but slow down slightly
            }

            return {
              ...p,
              x: nx,
              y: ny,
              vx: nvx,
              vy: nvy,
              opacity: p.opacity - decay,
              size: p.vx === 0 && p.vy === 0
                ? p.size + 1.5
                : isHome
                  ? p.size * 0.975 // shrink slower for rising particles
                  : p.size * 0.96,
              life: p.life - decay,
            };
          })
          .filter((p) => p.life > 0 && p.opacity > 0);
        return next;
      });
      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [particles]);

  // Group tokens by their board coordinate to calculate stack grouping and offsets
  const coordinateGroups: { [key: string]: Token[] } = {};

  tokens.forEach(token => {
    // Exclude tokens in yard from coordinate grouping offset calculations (each has its own slot)
    if (token.position !== 'yard') {
      const coord = getTokenCoordinates(token);
      // Key can be row-col
      // Note: for step 57 (goal), we already scatter them, but let's check
      const key = `${coord.row.toFixed(1)}-${coord.col.toFixed(1)}`;
      if (!coordinateGroups[key]) {
        coordinateGroups[key] = [];
      }
      coordinateGroups[key].push(token);
    }
  });

  const getStackOffset = (token: Token) => {
    if (token.position === 'yard') {
      return { x: '0%', y: '0%', scale: 1 };
    }

    const coord = getTokenCoordinates(token);
    const key = `${coord.row.toFixed(1)}-${coord.col.toFixed(1)}`;
    const group = coordinateGroups[key] || [];

    if (group.length <= 1 || token.position === 56) {
      return { x: '0%', y: '0%', scale: 1 };
    }

    const idx = group.findIndex(t => t.id === token.id);
    const count = group.length;

    // Beautiful stacking clustering offsets (sub-grid positioning)
    if (count === 2) {
      // 2 tokens: side-by-side
      return {
        x: idx === 0 ? '-20%' : '20%',
        y: '0%',
        scale: 0.9,
      };
    } else if (count === 3) {
      // 3 tokens: triangle
      if (idx === 0) return { x: '0%', y: '-20%', scale: 0.82 };
      if (idx === 1) return { x: '-20%', y: '20%', scale: 0.82 };
      return { x: '20%', y: '20%', scale: 0.82 };
    } else {
      // 4 or more tokens: 2x2 grid
      const rx = idx % 2 === 0 ? '-20%' : '20%';
      const ry = Math.floor(idx / 2) === 0 ? '-20%' : '20%';
      return { x: rx, y: ry, scale: 0.74 };
    }
  };

  // Check if grid square is star cell
  const getCellStar = (r: number, c: number) => {
    const starIndices = [9, 22, 35, 48];
    const isSpecialStar = starIndices.some(idx => {
      const coord = OUTER_TRACK[idx];
      return coord.row === r && coord.col === c;
    });

    // Also render star on starting tracks
    const startColors: { [key: string]: BoardCoordinate } = {
      red: OUTER_TRACK[PLAYER_PATHS.red.startIndex],
      green: OUTER_TRACK[PLAYER_PATHS.green.startIndex],
      yellow: OUTER_TRACK[PLAYER_PATHS.yellow.startIndex],
      blue: OUTER_TRACK[PLAYER_PATHS.blue.startIndex]
    };

    const isStartStar = Object.values(startColors).some(coord => coord.row === r && coord.col === c);

    return isSpecialStar || isStartStar;
  };

  const getCellBgColor = (r: number, c: number): string => {
    // Corner Home Yards
    if (r <= 5 && c <= 5) return 'bg-transparent'; // styled via absolute panel
    if (r <= 5 && c >= 9) return 'bg-transparent';
    if (r >= 9 && c >= 9) return 'bg-transparent';
    if (r >= 9 && c <= 5) return 'bg-transparent';

    // Center Home Triangle
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'bg-transparent';

    // Home paths with vibrant colors styled from the active theme
    if (r === 7 && c >= 1 && c <= 5) return activeTheme.pathBg.red + ' text-white';
    if (c === 7 && r >= 1 && r <= 5) return activeTheme.pathBg.green + ' text-white';
    if (r === 7 && c >= 9 && c <= 13) return activeTheme.pathBg.yellow + ' text-amber-950';
    if (c === 7 && r >= 9 && r <= 13) return activeTheme.pathBg.blue + ' text-white';

    // Starting cells (matching theme colors)
    if (r === 6 && c === 1) return activeTheme.cellBg.start.red + ' text-white font-black z-10';
    if (r === 1 && c === 8) return activeTheme.cellBg.start.green + ' text-white font-black z-10';
    if (r === 8 && c === 13) return activeTheme.cellBg.start.yellow + ' text-amber-950 font-black z-10';
    if (r === 13 && c === 6) return activeTheme.cellBg.start.blue + ' text-white font-black z-10';

    // Safe stars cells styled from theme
    if (getCellStar(r, c)) {
      return activeTheme.cellBg.safe + ' text-amber-600';
    }

    // Normal paths styled from theme
    return activeTheme.cellBg.standard + ' text-stone-850 dark:text-stone-100 hover:bg-[#fafaf9]/20';
  };

  // Color theme classes
  const colorThemes = {
    red: {
      border: 'border-rose-500',
      bg: 'from-[#ff4d6d] to-[#c9184a]',
      text: 'text-[#ff0a54]',
      tokenBg: 'from-[#ff4d6d] via-[#ff0a54] to-[#c9184a]',
      ring: 'ring-[#ff85a1]',
    },
    green: {
      border: 'border-emerald-500',
      bg: 'from-[#34d399] to-[#047857]',
      text: 'text-[#10b981]',
      tokenBg: 'from-[#34d399] via-[#10b981] to-[#047857]',
      ring: 'ring-[#a7f3d0]',
    },
    yellow: {
      border: 'border-amber-400',
      bg: 'from-[#fbbf24] to-[#b45309]',
      text: 'text-[#f59e0b]',
      tokenBg: 'from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
      ring: 'ring-[#fde68a]',
    },
    blue: {
      border: 'border-sky-500',
      bg: 'from-[#38bdf8] to-[#0369a1]',
      text: 'text-[#0ea5e9]',
      tokenBg: 'from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]',
      ring: 'ring-[#bae6fd]',
    },
  };

  // Render a Ludo token component beautifully
  const renderToken = (token: Token, inYard = false) => {
    const isBeingCaptured = activeCapture?.tokenId === token.id;
    const isClickable = highlightedTokenIds.includes(token.id);
    const t = colorThemes[token.playerColor];
    const { x: ox, y: oy, scale: s } = getStackOffset(token);

    const isGameOver = status === 'gameover';
    const isWinnerColor = isGameOver && matchWinners && matchWinners.length > 0 && token.playerColor === matchWinners[0];

    const sizeClasses = inYard
      ? 'w-[32px] h-[32px] xs:w-[37px] xs:h-[37px] sm:w-[51px] sm:h-[51px] lg:w-[62px] lg:h-[62px]'
      : 'w-[114%] h-[114%]';

    const shadowClasses = inYard
      ? 'w-[30px] h-[6px] xs:w-[34px] xs:h-[7px] sm:w-[48px] sm:h-[9.5px] lg:w-[58px] lg:h-[11.5px]'
      : 'w-[95%] h-[12%] bottom-[-1%]';

    const activeColors = {
      red: {
        outer: 'from-white via-[#fff0f3] to-[#ffe3e8] dark:from-[#311b1f] dark:to-[#1a0e10]',
        innerBg: 'from-[#ff4d6d] via-[#ff0a54] to-[#c9184a]',
        glow: 'rgba(255,10,84,0.4)',
        dotBg: 'bg-[#c9184a]'
      },
      green: {
        outer: 'from-white via-[#f0fdf4] to-[#d1fae5] dark:from-[#14291f] dark:to-[#0b1712]',
        innerBg: 'from-[#34d399] via-[#10b981] to-[#047857]',
        glow: 'rgba(16,185,129,0.4)',
        dotBg: 'bg-[#047857]'
      },
      yellow: {
        outer: 'from-white via-[#fefbeb] to-[#fef3c7] dark:from-[#302517] dark:to-[#1b140d]',
        innerBg: 'from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
        glow: 'rgba(245,158,11,0.4)',
        dotBg: 'bg-[#b45309]'
      },
      blue: {
        outer: 'from-white via-[#f0f9ff] to-[#e0f2fe] dark:from-[#152735] dark:to-[#0c161e]',
        innerBg: 'from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]',
        glow: 'rgba(14,165,233,0.4)',
        dotBg: 'bg-[#0369a1]'
      }
    };

    // Style for the layout wrapper
    const wrapperStyle: React.CSSProperties = inYard
      ? {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: isWinnerColor ? 50 : isClickable ? 40 : 10 + token.idInColor,
        }
      : {
          position: 'absolute',
          left: `${(getTokenCoordinates(token).col / 15) * 100}%`,
          top: `${(getTokenCoordinates(token).row / 15) * 100}%`,
          width: `${100 / 15}%`,
          height: `${100 / 15}%`,
          zIndex: isWinnerColor ? 50 : isClickable ? 40 : 10 + token.idInColor,
        };

    return (
      <motion.div
        key={token.id}
        id={token.id}
        layoutId={`token-layout-${token.id}`}
        transition={
          isBeingCaptured
            ? {
                type: 'spring',
                stiffness: 70,
                damping: 20,
              }
            : {
                type: 'spring',
                stiffness: 140,
                damping: 18,
              }
        }
        style={wrapperStyle}
        className={`flex items-center justify-center ${inYard ? 'p-[2px]' : 'p-0'}`}
      >
        {/* 3D Dynamic Token Shadow */}
        <motion.div
          style={{
            x: inYard ? 0 : ox,
            y: inYard ? 0 : oy,
          }}
          animate={
            isClickable
              ? {
                  scale: inYard ? [0.95, 0.78, 0.95] : [s * 0.95, s * 0.6, s * 0.95],
                  opacity: inYard ? [0.35, 0.18, 0.35] : [0.4, 0.15, 0.4],
                  transition: {
                    repeat: Infinity,
                    duration: 1.35,
                    ease: 'easeInOut',
                  },
                }
              : isBeingCaptured
              ? {
                  scale: 0.62,
                  opacity: 0.12,
                }
              : {
                  scale: inYard ? 1 : s * 1,
                  opacity: 0.3,
                }
          }
          className={`absolute ${shadowClasses} bg-black/45 blur-[2.5px] rounded-full pointer-events-none ${
            !isClickable && !isBeingCaptured && !experienceEngine.getConfig().reducedMotion ? 'living-token-shadow-idle' : ''
          }`}
        />

        {/* Floating Token Element - Cylindrical Button Disk */}
        <motion.div
          style={{
            x: inYard ? 0 : ox,
            y: inYard ? 0 : oy,
          }}
          animate={
            homeCompletedToken?.tokenId === token.id
              ? {
                  scale: experienceEngine.getConfig().reducedMotion
                    ? (inYard ? 1.15 : s * 1.25)
                    : (inYard ? [1, 1.4, 1.28] : [s * 1, s * 1.5, s * 1.35]),
                  y: inYard ? -7 : `calc(${oy} - 16px)`,
                  transition: {
                    type: 'spring',
                    stiffness: 120,
                    damping: 11,
                  }
                }
              : isClickable
              ? {
                  scale: inYard ? [1, 1.15, 1] : [s * 1, s * 1.25, s * 1],
                  y: inYard ? [0, -4, 0] : [oy, `calc(${oy} - 12px)`, oy],
                  transition: {
                    repeat: Infinity,
                    duration: 1.35,
                    ease: 'easeInOut',
                  },
                }
              : isBeingCaptured
              ? {
                  scale: 0.68,
                  opacity: 0.6,
                  y: 0,
                }
              : {
                  scale: inYard ? 1 : s * 1,
                  y: inYard ? 0 : oy,
                }
          }
          whileHover={
            isClickable
              ? {
                  scale: inYard ? 1.08 : s * 1.35,
                  y: inYard ? -3 : `calc(${oy} - 6px)`,
                }
              : {}
          }
          onClick={(e) => {
            e.stopPropagation();
            if (isClickable) {
              audio.playClick();
              onTokenClick(token.id);
            }
          }}
          className={`pointer-events-auto relative ${sizeClasses} rounded-full bg-gradient-to-b from-white via-[#e2e8f0] to-[#cbd5e1] dark:from-[#475569] dark:via-[#1e293b] dark:to-[#0f172a] border-[1.5px] sm:border-[2.5px] border-stone-300 dark:border-stone-800 flex items-center justify-center cursor-pointer transition-all duration-300 ${
            isGameOver
              ? isWinnerColor
                ? 'ring-[4.5px] ring-amber-400 ring-offset-2 shadow-[0_0_28px_#fbbf24,0_10px_22px_rgba(245,158,11,0.6)] scale-110 z-50 animate-pulse'
                : 'opacity-25 filter grayscale-[40%] scale-90 pointer-events-none'
              : homeCompletedToken?.tokenId === token.id
              ? `ring-[4px] ring-amber-400 ring-offset-2 shadow-[0_0_32px_#fbbf24,0_10px_25px_rgba(245,158,11,0.7)] z-50 scale-115`
              : token.position === 56
              ? `ring-[3.5px] ring-amber-400 ring-offset-2 shadow-[0_0_24px_#fbbf24,0_8px_18px_rgba(0,0,0,0.3)] ${
                  !experienceEngine.getConfig().reducedMotion ? 'living-token-winner' : 'animate-pulse'
                }`
              : isClickable
              ? `ring-[3.5px] ${t.ring} ring-offset-2 dark:ring-offset-stone-950 shadow-[0_0_22px_${activeColors[token.playerColor].glow},0_8px_18px_rgba(0,0,0,0.26)]`
              : `shadow-[0_6px_14px_rgba(0,0,0,0.22),inset_0_1.5px_2px_rgba(255,255,255,1),0_0_12px_${activeColors[token.playerColor].glow}] dark:shadow-[0_6px_16px_rgba(0,0,0,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.15),0_0_14px_${activeColors[token.playerColor].glow}] ${
                  !isClickable && !isBeingCaptured && !experienceEngine.getConfig().reducedMotion ? 'living-token-idle' : ''
                }`
          }`}
        >
          {/* Glass glare effect overlay */}
          <div className="absolute top-0.5 left-0.5 right-0.5 h-[42%] bg-gradient-to-b from-white/70 via-white/10 to-transparent rounded-full pointer-events-none z-15" />

          {/* Inner Colored Ring Structure - Thinner White rim, Thicker Color Center */}
          <div className="w-[91%] h-[91%] rounded-full bg-gradient-to-b from-white to-[#f1ebd9] dark:from-[#3a3532] dark:to-[#1e1b19] flex items-center justify-center shadow-[inset_0_1px_2.5px_rgba(0,0,0,0.15)] relative z-10 p-[1px] sm:p-[1.5px]">
            
            {/* The primary color circle - significantly thicker */}
            <div className={`w-full h-full rounded-full bg-gradient-to-b ${activeColors[token.playerColor].innerBg} flex items-center justify-center shadow-[0_2.5px_5px_rgba(0,0,0,0.22),inset_0_1px_2px_rgba(255,255,255,0.45)] relative overflow-hidden`}>
              
              {/* Intensely Glassy Highlight Dome inside colored center */}
              <div className="absolute top-0.2 left-0.2 right-0.2 h-[45%] bg-gradient-to-b from-white/60 via-white/5 to-transparent rounded-b-xl pointer-events-none z-10" />
              <div className="absolute bottom-0.2 right-0.2 w-[35%] h-[35%] bg-gradient-to-tr from-white/12 to-transparent rounded-full pointer-events-none z-10" />
              
              {/* Eye/Lens core - heavy jewel glass lens */}
              <div className="w-[42%] h-[42%] rounded-full bg-white dark:bg-stone-900 flex items-center justify-center shadow-[0_1.5px_3.5px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(0,0,0,0.15)] relative z-20">
                <div className={`w-[65%] h-[65%] rounded-full ${activeColors[token.playerColor].dotBg} shadow-[inset_0_1px_2px_rgba(255,255,255,0.45)]`} />
              </div>
            </div>
          </div>

          {/* Token crown/achievement glow */}
          {homeCompletedToken?.tokenId === token.id && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={experienceEngine.getConfig().reducedMotion 
                ? { scale: 1.15, opacity: 0.75 } 
                : { scale: [1, 1.8, 1], opacity: [0.95, 0, 0.95] }
              }
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              className="absolute inset-[-12px] rounded-full bg-gradient-to-r from-yellow-400/45 via-amber-500/45 to-yellow-300/45 blur-md pointer-events-none z-0"
            />
          )}

          {/* Floating Crown Badge for Completed Tokens */}
          {token.position === 56 && (
            <div className="absolute -top-3.5 w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 rounded-full border border-white dark:border-stone-850 flex items-center justify-center shadow-[0_2.5px_7px_rgba(245,158,11,0.7)] z-20 animate-bounce" style={{ animationDuration: '2.2s' }}>
              <span className="text-[10px] sm:text-[11.5px] text-stone-900 select-none leading-none">👑</span>
            </div>
          )}

          {/* Little Active Star Badge */}
          {isClickable && (
            <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full border border-white flex items-center justify-center shadow shadow-amber-500/60 z-20">
              <span className="text-[8.5px] sm:text-[11px] text-stone-950 font-black select-none leading-none">★</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  const getYardPlayerInfo = (color: PlayerColor) => {
    const player = players.find(p => p.color === color);
    const score = tokens.filter(t => t.playerColor === color && t.position === 56).length;
    return { player, score, isActive: activePlayerColor === color };
  };

  const getYardWrapperClasses = (color: PlayerColor) => {
    const { isActive } = getYardPlayerInfo(color);
    
    // Base styles: take full size, flex column, inner shadow to look recessed/sunken
    const base = `relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
      activeTheme.isPhysical 
        ? 'shadow-[inset_0_6px_10px_rgba(0,0,0,0.35)]' 
        : 'shadow-[inset_0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_4px_16px_rgba(0,0,0,0.45)]'
    } `;
    
    const bgStyle = activeTheme.yardBg[color];
    const borderStyle = activeTheme.yardBorder[color];

    if (color === 'red') {
      const activeGlow = isActive 
        ? "ring-[2.5px] ring-[#ff4d6d]/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.08),0_0_25px_rgba(244,63,94,0.3)] z-35" 
        : "";
      return base + activeGlow + ` ${bgStyle} rounded-tl-xl sm:rounded-tl-[24px] border-b-[1.5px] sm:border-b-2 border-r-[1.5px] sm:border-r-2 border-t-0 border-l-0 ${borderStyle}`;
    }
    if (color === 'green') {
      const activeGlow = isActive 
        ? "ring-[2.5px] ring-[#34d399]/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.08),0_0_25px_rgba(16,185,129,0.3)] z-35" 
        : "";
      return base + activeGlow + ` ${bgStyle} rounded-tr-xl sm:rounded-tr-[24px] border-b-[1.5px] sm:border-b-2 border-l-[1.5px] sm:border-l-2 border-t-0 border-r-0 ${borderStyle}`;
    }
    if (color === 'yellow') {
      const activeGlow = isActive 
        ? "ring-[2.5px] ring-[#fbbf24]/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.08),0_0_25px_rgba(245,158,11,0.3)] z-35" 
        : "";
      return base + activeGlow + ` ${bgStyle} rounded-br-xl sm:rounded-br-[24px] border-t-[1.5px] sm:border-t-2 border-l-[1.5px] sm:border-l-2 border-b-0 border-r-0 ${borderStyle}`;
    }
    // Blue
    const activeGlow = isActive 
      ? "ring-[2.5px] ring-[#38bdf8]/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.08),0_0_25px_rgba(14,165,233,0.3)] z-35" 
      : "";
    return base + activeGlow + ` ${bgStyle} rounded-bl-xl sm:rounded-bl-[24px] border-t-[1.5px] sm:border-t-2 border-r-[1.5px] sm:border-r-2 border-b-0 border-l-0 ${borderStyle}`;
  };

  const renderYardHeader = (color: PlayerColor) => {
    const { player, score, isActive } = getYardPlayerInfo(color);
    const isBottom = color === 'yellow' || color === 'blue';

    if (!player || player.type === 'none') {
      const fallbackNames = {
        red: 'Ruby',
        green: 'Oasis',
        yellow: 'Gold',
        blue: 'Sapphire'
      };
      const textColors = {
        red: 'text-rose-600/50 dark:text-rose-400/50',
        green: 'text-emerald-600/50 dark:text-emerald-400/50',
        yellow: 'text-amber-600/50 dark:text-amber-450/50',
        blue: 'text-sky-600/50 dark:text-sky-450/50'
      };
      const fallbackLeftClass = (color === 'red' || color === 'blue') ? 'left-6 sm:left-3' : 'left-1.5 sm:left-3';
      return (
        <div className={`absolute ${isBottom ? 'bottom-1 sm:bottom-2' : 'top-1 sm:top-2'} ${fallbackLeftClass} text-[5.8px] sm:text-[8.8px] font-semibold tracking-wider uppercase select-none z-10`}>
          <span className={`flex items-center gap-0.5 sm:gap-1 uppercase ${textColors[color]}`}>
            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${color === 'red' ? 'bg-rose-500/50' : color === 'green' ? 'bg-emerald-500/50' : color === 'yellow' ? 'bg-amber-500/50' : 'bg-sky-500/50'}`} />
            {fallbackNames[color]}
          </span>
        </div>
      );
    }

    const theme = {
      red: {
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-100 dark:border-rose-950/60',
        badge: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-250/30 dark:border-rose-900/30'
      },
      green: {
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-950/60',
        badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-250/30 dark:border-emerald-900/30'
      },
      yellow: {
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-950/60',
        badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-250/30 dark:border-amber-900/30'
      },
      blue: {
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-100 dark:border-sky-950/60',
        badge: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 border border-sky-250/30 dark:border-sky-900/30'
      }
    }[color];

    const isLeftYard = color === 'red' || color === 'blue';
    const paddingClass = isLeftYard
      ? 'pl-7 pr-1 sm:px-2'
      : 'pr-7 pl-1 sm:px-2';

    return (
      <div className={`absolute ${isBottom ? 'bottom-0 border-t rounded-b-xl sm:rounded-b-[24px]' : 'top-0 border-b rounded-t-xl sm:rounded-t-[24px]'} left-0 right-0 ${paddingClass} py-1 sm:py-2 flex justify-between items-center select-none z-10 ${theme.border} bg-white/70 dark:bg-[#151312]/70 backdrop-blur-sm`}>
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <span className="text-[9px] sm:text-[13px] leading-none">{player.avatar}</span>
          <span className={`text-[8.5px] sm:text-[12.4px] font-display font-semibold tracking-wide truncate ${theme.text}`}>
            {player.name}
          </span>
          {isActive && (
            <span className={`ml-1 px-1 sm:px-1.5 py-0.5 text-[5.5px] sm:text-[7.5px] font-black tracking-widest uppercase rounded-full ${
              color === 'red' ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/25' :
              color === 'green' ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25' :
              color === 'yellow' ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25' :
              'bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/25'
            } animate-pulse shrink-0`}>
              TURN
            </span>
          )}
        </div>

        <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${theme.badge} font-mono text-[7.5px] sm:text-[10.4px] font-black shadow-inner shrink-0 leading-none`}>
          <span>🏁</span>
          <span>{score}/4</span>
        </div>
      </div>
    );
  };

  const renderYard = (color: PlayerColor) => {
    // Positioning class for the absolute corner container
    const positionClasses = {
      red: 'top-0 left-0',
      green: 'top-0 right-0',
      yellow: 'bottom-0 right-0',
      blue: 'bottom-0 left-0'
    }[color];

    // Ambient radial glow positioning matched with player theme
    const glowClasses = {
      red: '-top-10 -left-10 bg-rose-500/15',
      green: '-top-10 -right-10 bg-emerald-500/15',
      yellow: '-bottom-10 -right-10 bg-amber-500/15',
      blue: '-bottom-10 -left-10 bg-sky-500/15'
    }[color];

    // Premium styling parameters for the slots based on player theme
    const slotThemes = {
      red: {
        bg: 'from-[#fff0f1] to-[#ffe4e6] dark:from-[#2e1215] dark:to-[#1a0a0c]',
        innerCup: 'bg-[#ffd1d6] dark:bg-[#100507]',
        dot: 'bg-[#ff0a54] shadow-[0_1.5px_3px_rgba(255,10,84,0.6)]',
        border: 'border-rose-300 dark:border-rose-950/60',
        innerBorder: 'border-rose-200 dark:border-rose-950/45',
        shadow: 'shadow-[0_3px_6px_rgba(244,63,94,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.05)]'
      },
      green: {
        bg: 'from-[#f0fdf4] to-[#d1fae5] dark:from-[#0f241a] dark:to-[#0a1610]',
        innerCup: 'bg-[#bbf7d0] dark:bg-[#04100b]',
        dot: 'bg-[#10b981] shadow-[0_1.5px_3px_rgba(16,185,129,0.6)]',
        border: 'border-emerald-300 dark:border-emerald-950/60',
        innerBorder: 'border-emerald-200 dark:border-emerald-950/45',
        shadow: 'shadow-[0_3px_6px_rgba(16,185,129,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.05)]'
      },
      yellow: {
        bg: 'from-[#fefbeb] to-[#fef3c7] dark:from-[#261f12] dark:to-[#181207]',
        innerCup: 'bg-[#fef08a] dark:bg-[#100a04]',
        dot: 'bg-[#f59e0b] shadow-[0_1.5px_3px_rgba(245,158,11,0.6)]',
        border: 'border-amber-300 dark:border-amber-950/60',
        innerBorder: 'border-amber-200 dark:border-amber-950/45',
        shadow: 'shadow-[0_3px_6px_rgba(245,158,11,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.05)]'
      },
      blue: {
        bg: 'from-[#f0f9ff] to-[#e0f2fe] dark:from-[#0f2030] dark:to-[#0a141e]',
        innerCup: 'bg-[#bae6fd] dark:bg-[#040c14]',
        dot: 'bg-[#0ea5e9] shadow-[0_1.5px_3px_rgba(14,165,233,0.6)]',
        border: 'border-sky-300 dark:border-sky-950/60',
        innerBorder: 'border-sky-200 dark:border-sky-950/45',
        shadow: 'shadow-[0_3px_6px_rgba(14,165,233,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.05)]'
      }
    }[color];

    const isBottom = color === 'yellow' || color === 'blue';
    const isGameOver = status === 'gameover';
    const isWinnerYard = isGameOver && matchWinners && matchWinners.length > 0 && matchWinners[0] === color;
    const { isActive } = getYardPlayerInfo(color);
    const isActiveTurn = isActive && !isGameOver;

    return (
      <div className={`absolute ${positionClasses} w-[40%] h-[40%] z-10 select-none rounded-xl sm:rounded-[24px] transition-all duration-500 ${
        isGameOver && !isWinnerYard ? 'opacity-30 filter grayscale-[25%] pointer-events-none' : ''
      } ${
        isActiveTurn ? {
          red: 'shadow-[0_0_25px_#f43f5e,0_0_12px_rgba(244,63,94,0.45)] ring-[3.5px] sm:ring-[5px] ring-rose-500 scale-[1.015] z-30 animate-pulse',
          green: 'shadow-[0_0_25px_#10b981,0_0_12px_rgba(16,185,129,0.45)] ring-[3.5px] sm:ring-[5px] ring-emerald-500 scale-[1.015] z-30 animate-pulse',
          yellow: 'shadow-[0_0_25px_#f59e0b,0_0_12px_rgba(245,158,11,0.45)] ring-[3.5px] sm:ring-[5px] ring-amber-500 scale-[1.015] z-30 animate-pulse',
          blue: 'shadow-[0_0_25px_#0ea5e9,0_0_12px_rgba(14,165,233,0.45)] ring-[3.5px] sm:ring-[5px] ring-sky-500 scale-[1.015] z-30 animate-pulse'
        }[color] : ''
      }`}>
        <div className={`${getYardWrapperClasses(color)} w-full h-full relative overflow-hidden rounded-xl sm:rounded-[24px] shadow-[inset_0_4px_10px_rgba(0,0,0,0.12),0_2px_4px_rgba(255,255,255,0.06)]`}>
          {/* Subtle Radial Light Base */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14)_0%,transparent_75%)] pointer-events-none z-0" />

          {/* Active Turn Breathing Ambient Color Glow overlay */}
          {isActiveTurn && (
            <div className={`absolute inset-0 pointer-events-none z-0 opacity-30 animate-pulse ${
              color === 'red' ? 'bg-rose-500/10' :
              color === 'green' ? 'bg-emerald-500/10' :
              color === 'yellow' ? 'bg-amber-500/10' :
              'bg-sky-500/10'
            }`} />
          )}

          {/* Extremely faint luxury grid texture overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Crect width='1' height='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Ambient inner glow */}
          <div className={`absolute w-32 h-32 blur-2xl rounded-full pointer-events-none ${glowClasses}`} />
          
          {renderYardHeader(color)}

          {/* Decorative Gold-leaf alignment grid behind slots to ground them */}
          <div className={`absolute inset-x-7 xs:inset-x-9 sm:inset-x-12 ${
            isBottom
              ? 'bottom-11 xs:bottom-13 sm:bottom-16 top-3 sm:top-5'
              : 'top-11 xs:top-13 sm:top-16 bottom-3 sm:bottom-5'
          } border border-amber-500/8 dark:border-amber-400/4 rounded-2xl pointer-events-none flex items-center justify-center`}>
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-amber-500/8 dark:border-amber-400/4 flex items-center justify-center">
              <span className="text-[7px] sm:text-[10px] text-amber-500/8 dark:text-amber-400/4">★</span>
            </div>
          </div>
          
          {/* Centered Slots Container with generous breathing space below/above header */}
          <div className={`flex-1 w-full flex items-center justify-center ${
            isBottom 
              ? 'pb-[32px] xs:pb-[40px] sm:pb-[56px] pt-1.5 xs:pt-2.5 sm:pt-4.5' 
              : 'pt-[32px] xs:pt-[40px] sm:pt-[56px] pb-1.5 xs:pb-2.5 sm:pb-4.5'
          } px-3 sm:px-6 z-10`}>
            <div className="grid grid-cols-2 gap-4 xs:gap-5.5 sm:gap-7.5 md:gap-8.5">
              {Array.from({ length: 4 }).map((_, i) => {
                const yardToken = tokens.find(t => t.playerColor === color && t.idInColor === i && t.position === 'yard');
                return (
                  <div
                    key={i}
                    className={`w-[34px] h-[34px] xs:w-[41px] xs:h-[41px] sm:w-[59px] sm:h-[59px] md:w-[65px] md:h-[65px] rounded-full bg-gradient-to-br ${slotThemes.bg} border-2 ${slotThemes.border} flex items-center justify-center ${slotThemes.shadow} relative`}
                  >
                    {/* 3D Gloss Highlight Overlay */}
                    <div className="absolute top-0.5 left-0.5 right-0.5 h-1 sm:h-2 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" />
                    
                    {/* Inner slot cup */}
                    <div className={`w-[24px] h-[24px] xs:w-[28px] xs:h-[28px] sm:w-[39px] sm:h-[39px] md:w-[43px] md:h-[43px] rounded-full ${slotThemes.innerCup} border ${slotThemes.innerBorder} flex items-center justify-center shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.12)] relative overflow-hidden`}>
                      <div className="absolute top-0.2 left-0.2 right-0.2 h-0.5 sm:h-1 bg-gradient-to-b from-white/45 to-transparent rounded-full pointer-events-none" />
                      <div className={`w-[10px] h-[10px] xs:w-[10px] xs:h-[10px] sm:w-[18px] sm:h-[18px] rounded-full ${slotThemes.dot}`} />
                    </div>

                    {yardToken && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
                        {/* Soft ambient pulse behind the living token */}
                        <div className={`absolute inset-1 rounded-full border-2 border-${color === 'red' ? 'rose' : color === 'green' ? 'emerald' : color === 'yellow' ? 'amber' : 'sky'}-500/20 dark:border-${color === 'red' ? 'rose' : color === 'green' ? 'emerald' : color === 'yellow' ? 'amber' : 'sky'}-400/15 pointer-events-none`} />
                        {renderToken(yardToken, true)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAvatarBox = (color: PlayerColor) => {
    // CSS-only Ludo token themes matching our real tokens
    const tokenThemes = {
      red: {
        outer: 'from-white via-[#fff0f3] to-[#ffe3e8] dark:from-[#311b1f] dark:to-[#1a0e10]',
        innerBg: 'from-[#ff4d6d] via-[#ff0a54] to-[#c9184a]',
        dotBg: 'bg-[#c9184a]',
        border: 'border-[#ff0a54] dark:border-[#c9184a]'
      },
      green: {
        outer: 'from-white via-[#f0fdf4] to-[#d1fae5] dark:from-[#14291f] dark:to-[#0b1712]',
        innerBg: 'from-[#34d399] via-[#10b981] to-[#047857]',
        dotBg: 'bg-[#047857]',
        border: 'border-[#10b981] dark:border-[#047857]'
      },
      yellow: {
        outer: 'from-white via-[#fefbeb] to-[#fef3c7] dark:from-[#302517] dark:to-[#1b140d]',
        innerBg: 'from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
        dotBg: 'bg-[#b45309]',
        border: 'border-[#fbbf24] dark:border-[#b45309]'
      },
      blue: {
        outer: 'from-white via-[#f0f9ff] to-[#e0f2fe] dark:from-[#152735] dark:to-[#0c161e]',
        innerBg: 'from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]',
        dotBg: 'bg-[#0369a1]',
        border: 'border-[#0ea5e9] dark:border-[#0369a1]'
      }
    }[color];

    return (
      <div 
        className={`w-[36px] h-[36px] sm:w-[50px] sm:h-[50px] rounded-[10px] sm:rounded-[14px] bg-white dark:bg-stone-950 flex items-center justify-center relative overflow-hidden shrink-0 select-none border-[3px] sm:border-[4px] ${tokenThemes.border} shadow-[0_1.5px_3px_rgba(0,0,0,0.08)]`}
      >
        {/* Sleek reflection overlay */}
        <div className="absolute top-0.5 left-0.5 right-0.5 h-[30%] bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
        
        {/* 3D Ludo Token exactly matching board tokens */}
        <div className={`w-[12px] h-[17px] sm:w-[17px] sm:h-[24px] rounded-full bg-gradient-to-b ${tokenThemes.outer} border-[0.8px] sm:border-[1.2px] border-stone-200 dark:border-stone-800 flex items-center justify-center shadow-sm relative shrink-0`}>
          {/* Gloss dome overlay */}
          <div className="absolute top-0.2 left-0.2 right-0.2 h-1 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" />
          {/* Inner Colored Pill */}
          <div className={`w-[6px] h-[10.5px] sm:w-[9px] sm:h-[16px] rounded-full bg-gradient-to-b ${tokenThemes.innerBg} flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute top-0.2 left-0.2 right-0.2 h-0.5 bg-gradient-to-b from-white/35 to-transparent rounded-full pointer-events-none" />
            <div className="w-0.8 h-0.8 sm:w-1.2 sm:h-1.2 rounded-full bg-white flex items-center justify-center shadow-sm">
              <div className={`w-[1.5px] h-[1.5px] sm:w-[2px] sm:h-[2px] rounded-full ${tokenThemes.dotBg}`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDiceBox = (color: PlayerColor, isTurn: boolean) => {
    const player = players.find(p => p.color === color);
    if (!player) return null;

    // Soft colored radial well background based on player yard colors
    const wellBg = {
      red: 'from-[#fff1f2] to-[#ffe4e6] dark:from-[#2e1216]/60 dark:to-[#1c080b]/80 border-rose-100 dark:border-rose-950/40 shadow-[inset_0_2px_4.5px_rgba(225,29,72,0.12)]',
      green: 'from-[#f0fdf4] to-[#d1fae5] dark:from-[#0c2a1c]/60 dark:to-[#061810]/80 border-emerald-100 dark:border-emerald-950/40 shadow-[inset_0_2px_4.5px_rgba(16,185,129,0.12)]',
      blue: 'from-[#f0f9ff] to-[#e0f2fe] dark:from-[#0b253a]/60 dark:to-[#061624]/80 border-sky-100 dark:border-sky-950/40 shadow-[inset_0_2px_4.5px_rgba(14,165,233,0.12)]',
      yellow: 'from-[#fefbeb] to-[#fef3c7] dark:from-[#2b1f0d]/60 dark:to-[#1a1205]/80 border-amber-100 dark:border-amber-950/40 shadow-[inset_0_2px_4.5px_rgba(217,119,6,0.12)]',
    }[color];

    return (
      <div className={`w-[54px] h-[54px] sm:w-[70px] sm:h-[70px] rounded-full bg-gradient-to-br ${wellBg} border flex items-center justify-center relative shrink-0 overflow-visible`}>
        <div className="scale-[0.58] sm:scale-[0.76] flex items-center justify-center origin-center transition-transform">
          <Dice3D
            value={diceValue}
            diceState={isTurn ? diceState : 'idle'}
            onClick={onRollDice}
            disabled={
              !isTurn ||
              player.type === 'computer' ||
              hasRolled ||
              isAnimating ||
              isPaused
            }
            playerColor={color}
          />
        </div>

        {/* Display roll value inside a luxury badge inside the DiceBox if already rolled */}
        {isTurn && hasRolled && diceValue > 0 && (
          <div className="absolute -top-1 sm:-top-1.5 right-1/2 translate-x-1/2 z-50 bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 text-[6.5px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-full shadow-[0_1.5px_3px_rgba(0,0,0,0.15)] border border-white animate-bounce leading-none">
            {diceValue}
          </div>
        )}
      </div>
    );
  };

  const renderDicePanel = (color: PlayerColor) => {
    const player = players.find(p => p.color === color);
    if (!player || player.type === 'none') return null;

    const isTurn = activePlayerColor === color;
    
    // Panel positions outside adjacent to yards
    const positionClasses = {
      red: 'top-1 sm:top-2.5 left-1 sm:left-2',
      green: 'top-1 sm:top-2.5 right-1 sm:right-2',
      blue: 'bottom-1 sm:bottom-2.5 left-1 sm:left-2',
      yellow: 'bottom-1 sm:bottom-2.5 right-1 sm:right-2',
    }[color];

    // Inside the reference image:
    // Red & Blue have: [AvatarBox | DiceBox]
    // Green & Yellow have: [DiceBox | AvatarBox]
    const isLeftSided = color === 'red' || color === 'blue';

    const colors = {
      red: {
        activeGlow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
      },
      green: {
        activeGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      },
      blue: {
        activeGlow: 'shadow-[0_0_12px_rgba(14,165,233,0.35)]',
      },
      yellow: {
        activeGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
      },
    }[color];

    return (
      <div className={`absolute ${positionClasses} z-40 transition-all duration-300`}>
        <div className={`relative flex items-center bg-[#fcf8ee] dark:bg-[#1a1715] border-[3px] sm:border-[4px] border-amber-400 dark:border-amber-500 p-[3px] sm:p-[4.5px] rounded-[18px] sm:rounded-[24px] gap-[5px] sm:gap-[9px] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.85),0_4px_12px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.55)] overflow-visible ${
          isTurn 
            ? 'ring-[2px] sm:ring-[3px] ring-amber-400/35 dark:ring-amber-500/35 scale-[1.03] ' + (experienceEngine.getConfig().reducedMotion ? colors.activeGlow : 'living-focus-ring-animate ' + colors.activeGlow)
            : 'opacity-75'
        }`}>
          {/* Ambient indicator overlay */}
          {isTurn && (
            <span className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none animate-pulse rounded-[15px] sm:rounded-[20px]" />
          )}

          {isLeftSided ? (
            <>
              {renderAvatarBox(color)}
              {renderDiceBox(color, isTurn)}
            </>
          ) : (
            <>
              {renderDiceBox(color, isTurn)}
              {renderAvatarBox(color)}
            </>
          )}

          {/* Pointer Arrow pointing to active dice */}
          {isTurn && !hasRolled && (
            <motion.div 
              className={`absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center ${
                isLeftSided 
                  ? '-right-3 sm:-right-4' 
                  : '-left-3 sm:-left-4'
              }`}
              animate={{ 
                x: isLeftSided ? [0, -3, 0] : [0, 3, 0] 
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.8,
                ease: 'easeInOut' 
              }}
            >
              <svg 
                className={`w-3 h-3 sm:w-4 sm:h-4 text-amber-500 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] ${
                  isLeftSided ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-full sm:max-w-[700px] md:max-w-[780px] lg:max-w-[900px] xl:max-w-[1020px] 2xl:max-w-[1120px] mx-auto px-0 select-none">
      {/* Real-time 3D Ludo Board */}
      <motion.div
        animate={{ scale: boardScale }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        className={`relative w-full aspect-square ${activeTheme.boardBg} rounded-2xl sm:rounded-[32px] ${activeTheme.boardShadow} border-[4px] sm:border-[6px] ${activeTheme.boardBorder} p-0.5 sm:p-1 overflow-hidden ${
          !experienceEngine.getConfig().reducedMotion && activeTheme.id === 'cosmic' ? 'living-board-animate' : ''
        }`}
      >
      {/* Wood grain overlay for classic physical board */}
      {activeTheme.isPhysical && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay z-25"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.15' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* 3D Glass Board Glare/Reflection Layer */}
      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/20 via-white/4 to-transparent rounded-t-xl sm:rounded-t-[24px] pointer-events-none z-30" />

      {/* Sunlight directional lighting overlay: Top-left brighter, bottom-right darker */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.11] via-transparent to-black/[0.15] rounded-2xl sm:rounded-[32px] pointer-events-none z-30 pointer-events-none" />

      {/* Board-wide Golden Atmosphere Pulse Layer */}
      <AnimatePresence>
        {boardLightingPulse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={experienceEngine.getConfig().reducedMotion ? { opacity: 0.15 } : { opacity: [0, 0.35, 0] }}
            exit={{ opacity: 0 }}
            transition={experienceEngine.getConfig().reducedMotion ? { duration: 0.8 } : { duration: 1.2, times: [0, 0.25, 1], ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none z-35 bg-gradient-to-r from-yellow-500/10 via-amber-400/25 to-yellow-500/10 rounded-2xl sm:rounded-[32px] mix-blend-color-dodge shadow-[inset_0_0_80px_rgba(245,158,11,0.55)]"
          />
        )}
      </AnimatePresence>

      {/* Spotlight vignette and ambient particles when game ends */}
      <AnimatePresence>
        {status === 'gameover' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-20 pointer-events-none bg-stone-950/25 mix-blend-multiply flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-[32px]"
          >
            {/* Ambient vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />
            
            {/* Subtle slow ambient floating gold particles */}
            <div className="absolute inset-0 overflow-hidden opacity-40">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-amber-400 blur-[1px] animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-ping" style={{ animationDuration: '6s' }} />
              <div className="absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full bg-yellow-400 blur-[2px] animate-pulse" style={{ animationDuration: '5s' }} />
              <div className="absolute bottom-1/3 right-1/3 w-2 h-2 rounded-full bg-amber-200 blur-[1px] animate-pulse" style={{ animationDuration: '3.5s' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Base grid layer */}
      <div className={`grid grid-cols-15 grid-rows-15 w-full h-full gap-0 ${activeTheme.gridBg} rounded-lg sm:rounded-[20px] overflow-hidden relative`}>
        {Array.from({ length: 15 }).map((_, rIdx) =>
          Array.from({ length: 15 }).map((_, cIdx) => {
            const isStar = getCellStar(rIdx, cIdx);
            const isStart = (rIdx === 6 && cIdx === 1) || (rIdx === 1 && cIdx === 8) || (rIdx === 8 && cIdx === 13) || (rIdx === 13 && cIdx === 6);
            const isHomePathCell = (rIdx === 7 && cIdx >= 1 && cIdx <= 5) || (cIdx === 7 && rIdx >= 1 && rIdx <= 5) || (rIdx === 7 && cIdx >= 9 && cIdx <= 13) || (cIdx === 7 && rIdx >= 9 && rIdx <= 13);
            
            const isGreenArrow = rIdx === 0 && cIdx === 7;
            const isRedArrow = rIdx === 7 && cIdx === 0;
            const isYellowArrow = rIdx === 7 && cIdx === 14;
            const isBlueArrow = rIdx === 14 && cIdx === 7;

            const isPlayCell = !(
              (rIdx <= 5 && cIdx <= 5) ||
              (rIdx <= 5 && cIdx >= 9) ||
              (rIdx >= 9 && cIdx >= 9) ||
              (rIdx >= 9 && cIdx <= 5) ||
              (rIdx >= 6 && rIdx <= 8 && cIdx >= 6 && cIdx <= 8)
            );

            const cellId = `cell-${rIdx}-${cIdx}`;

            // Disable path glowing animations for a completely static board background
            const premiumGlowClass = '';

            return (
               <div
                key={cellId}
                id={cellId}
                className={`relative flex items-center justify-center transition-colors duration-250 rounded-none ${getCellBgColor(
                  rIdx,
                  cIdx
                )} ${premiumGlowClass}`}
              >
                {/* Safe cell stars - beautifully styled gold-bordered tiles with bright orange/yellow stars */}
                {/* Safe cell stars - beautifully styled 3D embossed gold metallic stars and borders */}
                {isStar && !isStart && (
                  <div className="flex items-center justify-center w-[88%] h-[88%] rounded-[6px] sm:rounded-[10px] border-[1.8px] sm:border-[2.5px] border-amber-600/95 bg-gradient-to-br from-[#fffbeb] via-[#fef3c7] to-[#fde68a] dark:from-[#2a2215] dark:to-[#17120a] shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.24)] dark:shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    {/* Specular glare shine cut */}
                    <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/45 to-transparent rounded-b-xl pointer-events-none z-10" />
                    
                    {/* Golden embossed SVG Star with custom metallic color mapping */}
                    <svg viewBox="0 0 24 24" className="w-[82%] h-[82%] drop-shadow-[0_2.5px_4px_rgba(146,64,14,0.42)] relative z-10">
                      <defs>
                        <linearGradient id={`goldStarGrad-${rIdx}-${cIdx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fffbeb" />
                          <stop offset="30%" stopColor="#fcd34d" />
                          <stop offset="65%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#78350f" />
                        </linearGradient>
                      </defs>
                      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" fill={`url(#goldStarGrad-${rIdx}-${cIdx})`} stroke="#ffffff" strokeWidth="0.4" />
                    </svg>
                  </div>
                )}
                
                {/* Clean white play icons centered on start cells indicating track direction */}
                {isStart && (
                  <span className="text-[14px] sm:text-[19px] font-black select-none text-white drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.55)]">
                    {rIdx === 6 && cIdx === 1 ? '▶' :
                     rIdx === 1 && cIdx === 8 ? '▼' :
                     rIdx === 8 && cIdx === 13 ? '◀' :
                     rIdx === 13 && cIdx === 6 ? '▲' : '▶'}
                  </span>
                )}

                {/* Heavy track entrance direction arrows */}
                {isGreenArrow && (
                  <span className="text-[17px] sm:text-[30px] font-black text-[#10b981] leading-none select-none">
                    ↓
                  </span>
                )}
                {isRedArrow && (
                  <span className="text-[17px] sm:text-[30px] font-black text-[#ff3b5c] leading-none select-none">
                    →
                  </span>
                )}
                {isYellowArrow && (
                  <span className="text-[17px] sm:text-[30px] font-black text-[#ffcc00] leading-none select-none">
                    ←
                  </span>
                )}
                {isBlueArrow && (
                  <span className="text-[17px] sm:text-[30px] font-black text-[#2f9cfc] leading-none select-none">
                    ↑
                  </span>
                )}

                {/* Subtle center dot on empty path/track cells for high readability */}
                {isPlayCell && !isStar && !isStart && !isGreenArrow && !isRedArrow && !isYellowArrow && !isBlueArrow && (
                  <div className={`w-[5.5px] h-[5.5px] sm:w-[9px] sm:h-[9px] rounded-full opacity-[0.32] ${
                    (rIdx === 7 && cIdx >= 1 && cIdx <= 5) || (cIdx === 7 && rIdx >= 1 && rIdx <= 5) || (rIdx === 7 && cIdx >= 9 && cIdx <= 13) || (cIdx === 7 && rIdx >= 9 && rIdx <= 13)
                      ? 'bg-white'
                      : 'bg-stone-400 dark:bg-stone-500'
                  }`} />
                )}
              </div>
            );
          })
        )}

        {/* 4. Absolute Tokens Layer (relocated inside grid for pixel-perfect alignment) */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <AnimatePresence>
            {tokens
              .filter((token) => token.position !== 'yard')
              .map((token) => renderToken(token, false))}
          </AnimatePresence>
        </div>
      </div>
 
      {/* 2. Absolute Home Yards Layer */}
      {renderYard('red')}
      {renderYard('green')}
      {renderYard('yellow')}
      {renderYard('blue')}

      {/* 3. Center Home Triangle Layer - meetings cleanly separated by crisp lines */}
      <div className={`absolute top-[40%] left-[40%] w-[20%] h-[20%] z-20 border-[2.5px] sm:border-[4px] ${
        activeTheme.isPhysical ? 'border-[#8d5830]' : 'border-[#ebe5da] dark:border-[#2b2725]'
      } shadow-[0_12px_32px_rgba(0,0,0,0.26),inset_0_1.5px_3.5px_rgba(255,255,255,0.15)] ${
        !experienceEngine.getConfig().reducedMotion ? 'living-center-glow' : ''
      } ${activeTheme.isPhysical ? 'bg-[#faf3e3]' : 'bg-[#faf8f5] dark:bg-[#151312]'} rounded-xl overflow-hidden flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
        >
          <defs>
            {/* Vibrant opaque linear gradients for center triangles matching paths */}
            <linearGradient id="redHomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d6d" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="greenHomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="yellowHomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="blueHomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            {/* Specular gloss shine overlay */}
            <linearGradient id="centerSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            {/* Royal Gold radial gradient for central medallion */}
            <radialGradient id="centerGold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="65%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
          </defs>

          {/* Red Triangle (Left) */}
          <polygon
            points="0,0 50,50 0,100"
            fill={activeTheme.centerGrads.red}
            className={`${activeTheme.centerBorderClass} stroke-[3.5] sm:stroke-[4.5] transition-colors duration-250 hover:opacity-95`}
          />
          {/* Green Triangle (Top) */}
          <polygon
            points="0,0 50,50 100,0"
            fill={activeTheme.centerGrads.green}
            className={`${activeTheme.centerBorderClass} stroke-[3.5] sm:stroke-[4.5] transition-colors duration-250 hover:opacity-95`}
          />
          {/* Yellow Triangle (Right) */}
          <polygon
            points="100,0 50,50 100,100"
            fill={activeTheme.centerGrads.yellow}
            className={`${activeTheme.centerBorderClass} stroke-[3.5] sm:stroke-[4.5] transition-colors duration-250 hover:opacity-95`}
          />
          {/* Blue Triangle (Bottom) */}
          <polygon
            points="0,100 50,50 100,100"
            fill={activeTheme.centerGrads.blue}
            className={`${activeTheme.centerBorderClass} stroke-[3.5] sm:stroke-[4.5] transition-colors duration-250 hover:opacity-95`}
          />

          {/* Elegant central gold crown medallion logo */}
          <circle cx="50" cy="50" r="19.5" fill="none" stroke="#fbbf24" strokeWidth="0.8" className="opacity-40" />
          <circle cx="50" cy="50" r="18" fill={activeTheme.centerMedallionBg} stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="#78350f" strokeWidth="0.6" strokeDasharray="2,1" className="opacity-50" />
          <text x="50" y="43" textAnchor="middle" fontSize="9.5" className="select-none pointer-events-none">👑</text>
          <text x="50" y="51" textAnchor="middle" fontSize="5.2" fill="#78350f" fontWeight="900" className="select-none pointer-events-none tracking-wider font-semibold">LUDO</text>
          <text x="50" y="57" textAnchor="middle" fontSize="4.4" fill="#b45309" fontWeight="800" className="select-none pointer-events-none tracking-widest font-semibold">ROYALE</text>
          <text x="50" y="63" textAnchor="middle" fontSize="3.8" fill="#78350f" className="select-none pointer-events-none opacity-80">★</text>

          {/* Diagonal glass gloss sheet over center home triangles */}
          <polygon
            points="0,0 100,0 50,50"
            fill="url(#centerSpecular)"
            pointerEvents="none"
          />
        </svg>
      </div>

      {/* Dynamic Expanding Impact Concentric Shockwave Ring */}
      {impactRing && (
        <svg className="absolute inset-0 pointer-events-none z-40 w-full h-full">
          <motion.circle
            cx={`${impactRing.x}%`}
            cy={`${impactRing.y}%`}
            initial={{ r: 4, opacity: 0.95 }}
            animate={{ r: 40, opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            stroke={impactRing.color}
            strokeWidth={3}
            fill="none"
            style={{
              filter: `drop-shadow(0px 0px 5px ${impactRing.color})`,
            }}
          />
        </svg>
      )}

      {/* Premium Home Goal Burst (Concentric Expanding Radial Light Waves) */}
      <AnimatePresence>
        {homeGoalBurst && (
          <svg className="absolute inset-0 pointer-events-none z-40 w-full h-full">
            {/* Inner intense golden core flash */}
            <motion.circle
              cx={`${homeGoalBurst.x}%`}
              cy={`${homeGoalBurst.y}%`}
              initial={{ r: 2, opacity: 0.95 }}
              animate={experienceEngine.getConfig().reducedMotion 
                ? { r: 18, opacity: 0.7 } 
                : { r: [2, 35, 60], opacity: [0.95, 0.4, 0] }
              }
              exit={{ opacity: 0 }}
              transition={experienceEngine.getConfig().reducedMotion
                ? { duration: 0.6 }
                : { duration: 1.2, ease: 'easeOut' }
              }
              fill="url(#goldRadialGrad)"
            />
            {/* Outer expanding shockwave wave */}
            <motion.circle
              cx={`${homeGoalBurst.x}%`}
              cy={`${homeGoalBurst.y}%`}
              initial={{ r: 4, opacity: 0.9 }}
              animate={experienceEngine.getConfig().reducedMotion 
                ? { r: 30, opacity: 0.5 } 
                : { r: [4, 55, 110], opacity: [0.9, 0.6, 0] }
              }
              exit={{ opacity: 0 }}
              transition={experienceEngine.getConfig().reducedMotion
                ? { duration: 0.8 }
                : { duration: 1.5, ease: 'easeOut' }
              }
              stroke="url(#goldStrokeGrad)"
              strokeWidth={4}
              fill="none"
              style={{
                filter: 'drop-shadow(0px 0px 8px #fbbf24)',
              }}
            />
            <defs>
              <radialGradient id="goldRadialGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="35%" stopColor="#fef08a" />
                <stop offset="70%" stopColor="#fbbf24" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </radialGradient>
              <linearGradient id="goldStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </AnimatePresence>

      {/* Premium Elegant Particles Burst Overlay */}
      {particles.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-40 w-full h-full">
          {particles.map((p) => {
            if (p.vx === 0 && p.vy === 0) {
              // Reduced Motion option: a beautiful, expanding soft radial glow
              return (
                <g key={p.id}>
                  <defs>
                    <radialGradient id={`glowGrad-${p.id}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={p.color} stopOpacity={0.65} />
                      <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                    </radialGradient>
                  </defs>
                  <circle
                    cx={`${p.x}%`}
                    cy={`${p.y}%`}
                    r={p.size}
                    fill={`url(#glowGrad-${p.id})`}
                    opacity={p.opacity}
                  />
                </g>
              );
            }
            if (p.isStar) {
              return (
                <svg
                  key={p.id}
                  x={`${p.x - (p.size * 0.75)}%`}
                  y={`${p.y - (p.size * 0.75)}%`}
                  width={`${p.size * 2.2}px`}
                  height={`${p.size * 2.2}px`}
                  viewBox="0 0 24 24"
                  className="overflow-visible"
                  style={{
                    transform: `rotate(${(p.id * 360 + p.life * 140) % 360}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <path
                    d="M 12 2 Q 12 12 22 12 Q 12 12 12 22 Q 12 12 2 12 Q 12 12 12 2"
                    fill={p.color}
                    opacity={p.opacity}
                    style={{
                      filter: `drop-shadow(0px 0px 4px ${p.color})`,
                    }}
                  />
                </svg>
              );
            }
            // Normal spark or dust particle
            return (
              <circle
                key={p.id}
                cx={`${p.x}%`}
                cy={`${p.y}%`}
                r={p.size}
                fill={p.color}
                opacity={p.opacity}
                style={{
                  filter: `drop-shadow(0px 0px 3px ${p.color})`,
                }}
              />
            );
          })}
        </svg>
      )}

      {/* Elegant Floating Extra Turn Banner */}
      <AnimatePresence>
        {showExtraTurn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-500/95 text-stone-950 font-black text-xs sm:text-sm tracking-wider uppercase px-4.5 sm:px-6 py-2 rounded-full shadow-[0_8px_24px_rgba(245,158,11,0.3),0_0_12px_rgba(255,255,255,0.4)] border border-white flex items-center gap-1.5 sm:gap-2 select-none"
            >
              <span className="text-sm sm:text-base animate-pulse">🎁</span>
              <span>Extra Turn!</span>
              <span className="text-sm sm:text-base animate-pulse">✨</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>

  </div>
);
};
