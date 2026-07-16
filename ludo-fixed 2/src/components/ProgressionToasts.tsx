/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Sparkles, Zap, X } from 'lucide-react';
import { eventBus } from '../experience/eventBus';
import { ExperienceEventType } from '../experience/types';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  type: 'xp' | 'level' | 'achievement';
  title: string;
  subtitle: string;
  detail?: string;
  icon?: string;
  rewardText?: string;
}

export const ProgressionToasts: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Subscribe to XP_GAINED
    const unsubXp = eventBus.subscribe(ExperienceEventType.XP_GAINED, (event) => {
      const { amount, reason } = event.payload;
      const id = Math.random().toString(36).substring(2);
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: 'xp',
          title: `+${amount} XP`,
          subtitle: reason,
        },
      ]);

      setTimeout(() => {
        removeToast(id);
      }, 3500);
    });

    // Subscribe to LEVEL_UP
    const unsubLevel = eventBus.subscribe(ExperienceEventType.LEVEL_UP, (event) => {
      const { level, rewards } = event.payload;
      const id = Math.random().toString(36).substring(2);
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: 'level',
          title: `Level Up! 🌟`,
          subtitle: `You reached Level ${level}!`,
          detail: rewards?.points ? `🎁 Level Bonus: +${rewards.points} Points!` : undefined,
        },
      ]);

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {}

      setTimeout(() => {
        removeToast(id);
      }, 5500);
    });

    // Subscribe to ACHIEVEMENT_UNLOCKED
    const unsubAchievement = eventBus.subscribe(ExperienceEventType.ACHIEVEMENT_UNLOCKED, (event) => {
      const { name, description, reward, badgeUnlocked } = event.payload;
      const id = Math.random().toString(36).substring(2);
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: 'achievement',
          title: `🏆 Achievement Unlocked`,
          subtitle: badgeUnlocked ? badgeUnlocked : name,
          detail: description,
          rewardText: reward || '2,000 XP & 500 Points 🪙',
        },
      ]);

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {}

      setTimeout(() => {
        removeToast(id);
      }, 7000);
    });

    return () => {
      unsubXp();
      unsubLevel();
      unsubAchievement();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isLevel = toast.type === 'level';
          const isXp = toast.type === 'xp';
          const isAchievement = toast.type === 'achievement';

          if (isAchievement) {
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -40, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                className="pointer-events-auto w-full bg-gradient-to-br from-stone-900/98 via-amber-955/95 to-stone-950/98 border-2 border-amber-400/60 text-stone-100 rounded-2xl p-4.5 shadow-[0_10px_35px_rgba(245,158,11,0.25)] flex gap-4 relative overflow-hidden ring-4 ring-amber-500/10"
              >
                {/* Left golden highlight ribbon */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-600" />

                {/* Icon Container with glowing ring */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-stone-950 shrink-0 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300">
                  <Award size={24} className="animate-bounce" />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pr-4 flex flex-col gap-1">
                  <h4 className="text-[10px] font-black tracking-widest leading-none uppercase text-amber-400 flex items-center gap-1.5">
                    <span>🏆</span> Achievement Unlocked
                  </h4>
                  <h3 className="text-sm font-black text-stone-50 leading-tight">
                    {toast.subtitle}
                  </h3>
                  <p className="text-xs text-stone-300 font-bold leading-snug">
                    {toast.detail}
                  </p>
                  
                  {/* Premium Reward Presenter box */}
                  {toast.rewardText && (
                    <div className="mt-2 p-2 bg-amber-500/15 border border-amber-500/20 rounded-xl flex items-center justify-between text-[10px] font-extrabold text-amber-300 shadow-inner">
                      <span className="uppercase tracking-wider">Reward:</span>
                      <span className="text-yellow-400">{toast.rewardText}</span>
                    </div>
                  )}
                </div>

                {/* Dismiss X button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="absolute top-3.5 right-3.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800/30 p-1 rounded-full transition duration-150"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          }

          if (isLevel) {
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -40, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                className="pointer-events-auto w-full bg-gradient-to-br from-[#1c140a] via-amber-955/90 to-stone-900 border-2 border-yellow-500/50 text-amber-50 rounded-2xl p-4.5 shadow-[0_10px_30px_rgba(217,119,6,0.2)] flex gap-4 relative overflow-hidden"
              >
                {/* Left highlight strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-500" />

                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/30 shadow-inner">
                  <Zap size={24} className="animate-pulse" />
                </div>

                <div className="flex-1 min-w-0 pr-4 flex flex-col gap-1">
                  <h4 className="text-[10px] font-black tracking-widest uppercase text-yellow-400 flex items-center gap-1">
                    <span>🌟</span> Level Up!
                  </h4>
                  <h3 className="text-sm font-black text-white leading-tight">
                    {toast.subtitle}
                  </h3>
                  {toast.detail && (
                    <div className="mt-2 p-2 bg-yellow-500/15 border border-yellow-500/20 rounded-xl text-[10px] font-extrabold text-yellow-300">
                      {toast.detail}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="absolute top-3.5 right-3.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800/30 p-1 rounded-full transition duration-150"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto w-full border backdrop-blur-md rounded-2xl p-4 shadow-2xl flex gap-3.5 relative overflow-hidden bg-stone-900/90 border-stone-850 text-stone-100 shadow-black/30"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-500/20 text-sky-400">
                <Sparkles size={18} />
              </div>

              {/* Text Context */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-black tracking-tight leading-snug text-sky-400">
                  {toast.title}
                </h4>
                <p className="text-xs font-bold text-stone-200 mt-0.5 leading-tight truncate">
                  {toast.subtitle}
                </p>
                {toast.detail && (
                  <p className="text-[10px] text-stone-400 font-medium mt-1 leading-relaxed">
                    {toast.detail}
                  </p>
                )}
              </div>

              {/* Dismiss X button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="absolute top-3 right-3 text-stone-400 hover:text-stone-200 transition duration-150"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
