/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { DiceState } from '../types';
import { eventBus, ExperienceEventType, experienceEngine } from '../experience';

interface Dice3DProps {
  value: number;
  diceState: DiceState;
  onClick: () => void;
  disabled: boolean;
  playerColor: string;
  compact?: boolean;
}

export const Dice3D: React.FC<Dice3DProps> = ({
  value,
  diceState,
  onClick,
  disabled,
  playerColor,
  compact = false,
}) => {
  const controls = useAnimation();
  const shadowControls = useAnimation();
  const glowControls = useAnimation();
  const lightHighlightControls = useAnimation();

  const [displayValue, setDisplayValue] = useState(value);
  const [showSparkles, setShowSparkles] = useState(false);
  const latestValueRef = useRef(value); // always current — prevents stale closure in animation .then()
  latestValueRef.current = value; // sync in render body — guaranteed fresh before any callbacks

  // Sync displayValue when value changes outside rolling
  useEffect(() => {
    if (diceState !== 'rolling') {
      setDisplayValue(value);
    }
  }, [value, diceState]);

  useEffect(() => {
    const config = experienceEngine.getConfig();
    const isReducedMotion = config.reducedMotion || config.performanceMode;

    if (diceState === 'rolling') {
      setShowSparkles(false);

      if (isReducedMotion) {
        // Reduced motion: elegant scale and fade instead of fast spins
        controls.start({
          scale: [0.95, 1.05, 1],
          opacity: [0.7, 1],
          rotate: 0,
          x: 0,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.35, ease: 'easeOut' }
        });

        shadowControls.start({
          scale: 1,
          opacity: 0.35,
          filter: "blur(4px)",
          transition: { duration: 0.35 }
        });

        glowControls.set({ opacity: 0 });

        setTimeout(() => {
          setDisplayValue(latestValueRef.current); // use ref — not stale closure
          // Soft settled glow bloom
          glowControls.start({
            opacity: [0, 0.7, 0],
            scale: [1, 1.15, 1],
            transition: { duration: value === 6 ? 0.45 : 0.3 }
          });
          if (value === 6) {
            setShowSparkles(true);
            setTimeout(() => setShowSparkles(false), 900);
          }
        }, 350);

        return;
      }

      // Premium animation sequence (duration ~ 500ms):
      // Tap (trigger) -> Deep press (at 12%) -> Peak high jump (at 38%) -> High tumble spin (at 62%) -> Impact slam (at 82%) -> Rebound bounce (at 92%) -> Settle (at 100%)
      controls.start({
        scale: [1, 0.82, 1.28, 1.15, 0.85, 1.12, 1],
        rotate: [0, -90, 720, 1440, 2185, 2154, 2160],
        x: [0, -4, 8, -6, 4, -1, 0],
        y: [0, 6, -52, -30, 8, -12, 0],
        filter: "blur(0px)",
        transition: {
          duration: 0.5,
          times: [0, 0.12, 0.38, 0.62, 0.82, 0.92, 1],
          ease: 'easeInOut',
        }
      }).then(() => {
        setDisplayValue(latestValueRef.current); // use ref — not stale closure

        // Soft settled glow bloom (250-350ms)
        const v = latestValueRef.current;
        const bloomDuration = v === 6 ? 0.45 : 0.35;
        glowControls.start({
          opacity: [0, v === 6 ? 0.95 : 0.7, 0],
          scale: v === 6 ? [1, 1.25, 1] : [1, 1.15, 1],
          transition: { duration: bloomDuration, ease: 'easeOut' }
        });

        if (latestValueRef.current === 6) {
          setShowSparkles(true);
          setTimeout(() => setShowSparkles(false), 900);
        }
      });

      // Synchronized Shadow Animation (Ambient Occlusion)
      shadowControls.start({
        scale: [1, 1.15, 0.38, 0.55, 1.25, 0.75, 1],
        opacity: [0.35, 0.5, 0.08, 0.15, 0.6, 0.22, 0.35],
        filter: [
          "blur(4px)",
          "blur(2.5px)",
          "blur(10px)",
          "blur(7px)",
          "blur(1.8px)",
          "blur(6px)",
          "blur(4px)"
        ],
        transition: {
          duration: 0.5,
          times: [0, 0.12, 0.38, 0.62, 0.82, 0.92, 1],
          ease: 'easeInOut',
        }
      });

      // Synchronized Lighting Highlighting
      lightHighlightControls.start({
        opacity: [0, 0.15, 0.5, 0.3, 0, 0.15, 0],
        transition: {
          duration: 0.5,
          times: [0, 0.12, 0.38, 0.62, 0.82, 0.92, 1],
          ease: 'easeInOut',
        }
      });

      // Fast randomized display face updates during active tumbling for natural weight
      let randomizerInterval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 35);

      const displayLockTimeout = setTimeout(() => {
        clearInterval(randomizerInterval);
        setDisplayValue(value);
      }, 380); // lock face slightly before final settle impact

      return () => {
        clearInterval(randomizerInterval);
        clearTimeout(displayLockTimeout);
      };
    } else {
      // Idle / Rolled settled state
      controls.set({
        scale: 1,
        rotate: 0,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      });

      shadowControls.set({
        scale: 1,
        opacity: 0.35,
        filter: "blur(4px)"
      });

      lightHighlightControls.set({ opacity: 0 });
      glowControls.set({ opacity: 0 });
      setDisplayValue(value);
    }
  }, [diceState, value, controls, shadowControls, glowControls, lightHighlightControls]);

  // Dots definitions for faces 1-6
  const faceDots: { [key: number]: number[] } = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  // Color mapping matching classic Ludo luxury styling
  const colorClasses: { [key: string]: { border: string; bg: string; dot: string; glow: string; buttonBg: string; buttonShadow: string } } = {
    red: {
      border: 'border-[#ff85a1]/40',
      bg: 'from-[#ff4d6d] via-[#ff0a54] to-[#c9184a]',
      dot: 'bg-gradient-to-tr from-stone-100 to-white shadow-[0_1.5px_2px_rgba(0,0,0,0.6)]',
      glow: 'shadow-[0_15px_30px_rgba(255,10,84,0.35),inset_0_2px_4px_rgba(255,255,255,0.45)]',
      buttonBg: 'from-[#ff4d6d] to-[#ff0a54]',
      buttonShadow: 'shadow-[0_8px_20px_rgba(255,10,84,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.45)]',
    },
    green: {
      border: 'border-[#a7f3d0]/40',
      bg: 'from-[#34d399] via-[#10b981] to-[#047857]',
      dot: 'bg-gradient-to-tr from-stone-100 to-white shadow-[0_1.5px_2px_rgba(0,0,0,0.6)]',
      glow: 'shadow-[0_15px_30px_rgba(16,185,129,0.35),inset_0_2px_4px_rgba(255,255,255,0.45)]',
      buttonBg: 'from-[#34d399] to-[#10b981]',
      buttonShadow: 'shadow-[0_8px_20px_rgba(16,185,129,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.45)]',
    },
    yellow: {
      border: 'border-[#fde68a]/40',
      bg: 'from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
      dot: 'bg-gradient-to-tr from-stone-850 to-stone-950 shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]',
      glow: 'shadow-[0_15px_30px_rgba(245,158,11,0.35),inset_0_2px_4px_rgba(255,255,255,0.55)]',
      buttonBg: 'from-[#fbbf24] to-[#f59e0b]',
      buttonShadow: 'shadow-[0_8px_20px_rgba(245,158,11,0.35),inset_0_1.5px_2.5px_rgba(255,255,255,0.55)]',
    },
    blue: {
      border: 'border-[#bae6fd]/40',
      bg: 'from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]',
      dot: 'bg-gradient-to-tr from-stone-100 to-white shadow-[0_1.5px_2px_rgba(0,0,0,0.6)]',
      glow: 'shadow-[0_15px_30px_rgba(14,165,233,0.35),inset_0_2px_4px_rgba(255,255,255,0.45)]',
      buttonBg: 'from-[#38bdf8] to-[#0ea5e9]',
      buttonShadow: 'shadow-[0_8px_20px_rgba(14,165,233,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.45)]',
    },
    gray: {
      border: 'border-stone-550/40',
      bg: 'from-stone-750 to-stone-900',
      dot: 'bg-amber-400 shadow-[0_1px_2px_rgba(0,0,0,0.3)]',
      glow: 'shadow-[0_4px_10px_rgba(0,0,0,0.4)]',
      buttonBg: 'from-stone-600 to-stone-850',
      buttonShadow: 'shadow-[0_4px_10px_rgba(0,0,0,0.2)]',
    },
  };

  const activeColor = playerColor || 'gray';
  const c = colorClasses[activeColor] || colorClasses.gray;

  return (
    <div
      id="dice-container"
      className={`relative ${compact ? 'w-[40px] h-[40px]' : 'w-[76px] h-[76px] sm:w-[88px] sm:h-[88px]'} rounded-full flex items-center justify-center cursor-pointer bg-gradient-to-br from-[#dfd9ce]/45 to-white border border-[#dfd9ce] border-b-[2px] border-r-[1px] shadow-[inset_0_4px_8px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95)] transition-all duration-300 select-none ${
        disabled ? 'pointer-events-none opacity-85' : 'hover:scale-[1.03]'
      } ${
        !disabled && diceState === 'idle' && !experienceEngine.getConfig().reducedMotion ? 'living-dice-well-animate' : ''
      }`}
      onClick={() => {
        if (!disabled && diceState !== 'rolling') {
          eventBus.emit(ExperienceEventType.BUTTON_CLICK, { buttonId: 'dice-roll', context: 'dice' });
          onClick();
        }
      }}
    >
      {/* Recessed tray gloss/glass overlay */}
      <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/35 pointer-events-none" />
      <div className="absolute top-[1px] left-[1px] right-[1px] h-[40%] rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

      {/* Dynamic Ambient Landing Shadow */}
      <motion.div
        animate={shadowControls}
        className={`absolute rounded-full bg-stone-950/25 pointer-events-none z-0 ${
          !disabled && diceState === 'idle' && !experienceEngine.getConfig().reducedMotion ? 'living-dice-shadow-animate' : ''
        }`}
        style={{
          width: '40px',
          height: '11px',
          bottom: '10px',
          left: 'calc(50% - 20px)',
        }}
      />

      {/* Settled Bloom Glow Effect */}
      <motion.div
        animate={glowControls}
        className="absolute inset-[-4px] rounded-xl pointer-events-none z-0"
        style={{
          boxShadow: value === 6 
            ? '0 0 28px rgba(255,255,255,0.9), 0 0 14px currentColor'
            : '0 0 18px currentColor',
          color: activeColor === 'yellow' ? '#f59e0b' : 
                 activeColor === 'red' ? '#ff0a54' : 
                 activeColor === 'green' ? '#10b981' : 
                 activeColor === 'blue' ? '#0ea5e9' : '#a8a29e',
          opacity: 0,
        }}
      />

      {/* Premium Sparkling Particles for Sixes */}
      {showSparkles && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {[
            { id: 1, x: -18, y: -22, size: 8, delay: 0 },
            { id: 2, x: 20, y: -28, size: 6, delay: 0.12 },
            { id: 3, x: -8, y: -40, size: 10, delay: 0.06 },
            { id: 4, x: 16, y: -16, size: 7, delay: 0.18 },
          ].map((sparkle) => (
            <motion.div
              key={sparkle.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: sparkle.x,
                y: sparkle.y,
                scale: [0, 1.2, 0.8, 0],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 0.75,
                delay: sparkle.delay,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                left: `calc(50% - ${sparkle.size / 2}px)`,
                top: `calc(50% - ${sparkle.size / 2}px)`,
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`,
              }}
              className="bg-amber-300 dark:bg-amber-200 rounded-full shadow-[0_0_8px_#fde68a]"
            />
          ))}
        </div>
      )}

      {/* Flat Classic Ludo Dice element that animates beautifully in 2D */}
      <motion.div
        animate={controls}
        initial={{
          scale: 1,
          rotate: 0,
          x: 0,
          y: 0,
          filter: "blur(0px)"
        }}
        className={`relative w-[52px] h-[52px] rounded-lg cursor-pointer z-10 ${
          !disabled && diceState === 'idle' && !experienceEngine.getConfig().reducedMotion ? 'living-dice-animate' : ''
        }`}
        whileHover={!disabled ? { scale: 1.08 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <div
          className={`absolute inset-0 rounded-lg border-[1.5px] ${c.border} bg-gradient-to-br ${c.bg} p-1 flex items-center justify-center shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.45),inset_0_-1.5px_2.5px_rgba(0,0,0,0.35)]`}
        >
          {/* Dynamic lighting highlight overlay */}
          <motion.div 
            animate={lightHighlightControls}
            className="absolute inset-0 bg-white pointer-events-none mix-blend-overlay rounded-lg z-20"
            initial={{ opacity: 0 }}
          />

          {/* Specular gloss glaze highlight on the dice face */}
          <div className="absolute top-0.5 left-0.5 right-0.5 h-[40%] bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[6px] pointer-events-none z-10" />
          {/* Soft interior bevel stroke highlight */}
          <div className="absolute inset-[0.5px] rounded-[6px] border border-white/20 pointer-events-none z-10" />

          {/* 3x3 Grid for standard dice dots layout based on displayValue */}
          <div className="grid grid-cols-3 gap-1.5 w-full h-full p-1 relative z-1">
            {Array.from({ length: 9 }).map((_, dotIdx) => {
              const isDotActive = faceDots[displayValue]?.includes(dotIdx);
              return (
                <div
                  key={dotIdx}
                  className="flex items-center justify-center w-2.5 h-2.5"
                >
                  {isDotActive && (
                    <div
                      className={`w-2 h-2 rounded-full ${c.dot} shadow-[inset_0_0.5px_0.5px_rgba(0,0,0,0.3)]`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
