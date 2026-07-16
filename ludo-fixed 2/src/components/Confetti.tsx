/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ConfettiProps {
  active: boolean;
}

interface Particle {
  id: number;
  x: number; // initial left position %
  delay: number; // seconds
  size: number; // pixels
  color: string;
  duration: number; // seconds
  angle: number; // rotation degrees
}

const COLORS = ['#F43F5E', '#10B981', '#F59E0B', '#0EA5E9', '#EC4899', '#8B5CF6', '#F43F5E'];

export const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const initialParticles: Particle[] = Array.from({ length: 80 }).map((_, idx) => ({
      id: idx,
      x: Math.random() * 100, // random screen width placement
      delay: Math.random() * 3, // staggered entry delay
      size: Math.floor(Math.random() * 8) + 6, // 6px - 14px sizes
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: Math.random() * 2 + 2, // 2s - 4s falling speed
      angle: Math.random() * 360,
    }));

    setParticles(initialParticles);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            y: -20,
            x: `${p.x}vw`,
            rotate: p.angle,
            opacity: 0.8,
          }}
          animate={{
            y: '105vh',
            x: `${p.x + (Math.random() * 12 - 6)}vw`, // slight sway
            rotate: p.angle + 360,
            opacity: 0,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
            repeat: Infinity,
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px', // circles & squares
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
          }}
        />
      ))}
    </div>
  );
};
