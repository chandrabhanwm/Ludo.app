/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Coins, 
  RotateCcw, 
  Home, 
  Star, 
  Crown, 
  Zap, 
  ChevronRight, 
  Sparkles, 
  Shield, 
  Flame, 
  Compass 
} from 'lucide-react';
import { Player, PlayerColor, PlayerType, GameRules, GameLog } from '../types';
import { rewardEngine, getPlayerWallet } from '../rewards';
import { eventBus } from '../experience/eventBus';
import { ExperienceEventType } from '../experience/types';
import { audio } from '../utils/audio';
import { prestigeEngine, DEFAULT_TITLES } from '../prestige/prestigeEngine';

interface EndGameScreenProps {
  players: Player[];
  matchWinners: PlayerColor[];
  onRematch: () => void;
  onReturnToMenu: () => void;
  isTournamentMatch?: boolean;
  logs?: GameLog[];
}

const XP_PER_LEVEL = 1000;

class FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number = 1;
  decay: number;
  size: number;

  constructor(x: number, y: number, color: string, speedMultiplier = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4.5 + 2) * speedMultiplier;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.decay = Math.random() * 0.012 + 0.009;
    this.size = Math.random() * 3 + 1.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.04; // natural gravity
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = Math.random() * width;
    this.y = -20;
    this.vx = Math.random() * 3 - 1.5;
    this.vy = Math.random() * 3 + 2;
    const colors = ['#F59E0B', '#FFFFFF', '#FCD34D', '#FFFBEB', '#D97706', '#E0F2FE', '#38BDF8', '#818CF8'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = Math.random() * 6 + 4;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    if (this.y > this.height) {
      this.y = -20;
      this.x = Math.random() * this.width;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    ctx.restore();
  }
}

export const EndGameScreen: React.FC<EndGameScreenProps> = ({
  players,
  matchWinners,
  onRematch,
  onReturnToMenu,
  isTournamentMatch = false,
  logs = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Hero Moment pause state (600ms pure board anticipation)
  const [isReadyToShowOverlay, setIsReadyToShowOverlay] = useState(false);

  // Core stats extraction
  const humanPlayer = players.find(p => p.type === 'human') || players[0];
  const isHumanWinner = humanPlayer && matchWinners[0] === humanPlayer.color;

  // Level & XP calculations
  const [level, setLevel] = useState(1);
  const [startXP, setStartXP] = useState(0);
  const [currentXP, setCurrentXP] = useState(0);
  const [targetXP, setTargetXP] = useState(0);
  const [didLevelUp, setDidLevelUp] = useState(false);

  // Points rewards details
  const [coinsReward, setCoinsReward] = useState(0);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // Prestige and achievement states
  const [prestigeState, setPrestigeState] = useState(() => prestigeEngine.getState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<any[]>([]);
  const [newlyUnlockedCrowns, setNewlyUnlockedCrowns] = useState<any[]>([]);
  const [newlyUnlockedTitles, setNewlyUnlockedTitles] = useState<any[]>([]);
  const [rankUpgraded, setRankUpgraded] = useState(false);
  const [streakIncreased, setStreakIncreased] = useState(false);

  // Helper to fetch level progress based on cumulative XP
  const getLevelProgress = (totalXP: number) => {
    let lvl = 1;
    while (totalXP >= prestigeEngine.getNextLevelThreshold(lvl)) {
      lvl++;
    }
    const prevThreshold = lvl > 1 ? prestigeEngine.getNextLevelThreshold(lvl - 1) : 0;
    const nextThreshold = prestigeEngine.getNextLevelThreshold(lvl);
    
    const xpInLevel = totalXP - prevThreshold;
    const xpRequiredForLevel = nextThreshold - prevThreshold;
    const progressPercent = xpRequiredForLevel > 0 ? (xpInLevel / xpRequiredForLevel) * 100 : 0;
    
    return {
      level: lvl,
      xpInLevel,
      xpRequiredForLevel,
      progressPercent
    };
  };

  // Animation sequence states
  const [phase, setPhase] = useState<'intro' | 'rewards' | 'final'>('intro');
  const [revealedCardIndex, setRevealedCardIndex] = useState(-1);
  const [mvpPlayer, setMvpPlayer] = useState<Player | null>(null);

  // Flying Points State
  const [flyingCoins, setFlyingCoins] = useState<{ id: number; delay: number }[]>([]);
  const [triggerWalletBounce, setTriggerWalletBounce] = useState(false);

  // Audio trigger once on mount
  useEffect(() => {
    try {
      if (isHumanWinner) {
        audio.playVictory();
      } else {
        // Soft encouraging chime for respectful defeat
        audio.playTokenHome();
      }
    } catch (e) {
      console.warn('Error playing victory/defeat sound cues', e);
    }

    const timer = setTimeout(() => {
      setIsReadyToShowOverlay(true);
    }, 600); // 600ms beautiful screen focus pause
    return () => clearTimeout(timer);
  }, [isHumanWinner]);

  // Load and apply Experience Engine specifications
  useEffect(() => {
    if (!isReadyToShowOverlay) return;

    try {
      // Determine MVP dynamically based on captures or fallback to the winner
      let bestPlayer = players.find(p => p.color === matchWinners[0]) || players[0];
      setMvpPlayer(bestPlayer);

      // Load XP from storage
      const storedXP = parseInt(localStorage.getItem('ludo_player_xp') || '0', 10);
      const storedLvl = parseInt(localStorage.getItem('ludo_player_level') || '1', 10);
      
      const xpGain = isHumanWinner ? 500 : 100;
      const startXPVal = Math.max(0, storedXP - xpGain);
      const startLvl = getLevelProgress(startXPVal).level;
      
      setLevel(startLvl);
      setStartXP(startXPVal);
      setCurrentXP(startXPVal);
      setTargetXP(storedXP);
      setDidLevelUp(storedLvl > startLvl);

      const coinGain = isHumanWinner ? 500 : 100;
      setCoinsReward(coinGain);

      // Read my points balance and set the display to BEFORE adding the reward
      const wallet = getPlayerWallet();
      setWalletBalance(Math.max(0, wallet.currentPoints - coinGain));

      // Evaluate prestige and achievements automatically
      try {
        const storedStats = localStorage.getItem('ludo_stats');
        const statsObj = storedStats ? JSON.parse(storedStats) : {
          gamesPlayed: 0,
          gamesWon: 0,
          totalRolls: 0,
          totalSixes: 0,
          totalCaptures: 0,
          totalCaptured: 0,
          totalTokensFinished: 0,
          highestRollStreak: 0,
        };
        const historyObj = JSON.parse(localStorage.getItem('ludo_history') || '[]');

        const prestigeResults = prestigeEngine.evaluateNewUnlocks(
          statsObj,
          historyObj,
          isHumanWinner
        );

        setNewlyUnlockedBadges(prestigeResults.newBadges);
        setNewlyUnlockedCrowns(prestigeResults.newCrowns || []);
        setNewlyUnlockedTitles(prestigeResults.newTitles);
        setRankUpgraded(prestigeResults.rankUpgraded);
        setStreakIncreased(prestigeResults.streakIncreased);
        setPrestigeState(prestigeEngine.getState());

        if (prestigeResults.newBadges.length > 0) {
          eventBus.emit(ExperienceEventType.COINS_EARNED, { amount: 150 * prestigeResults.newBadges.length, source: 'Achievement Unlocked' });
        }
      } catch (err) {
        console.warn('Error evaluating prestige unlocks', err);
      }

      // Emit experience events
      if (isHumanWinner) {
        eventBus.emit(ExperienceEventType.SUCCESS, { message: '🏆 Magnificent Match Victory!' });
      } else {
        eventBus.emit(ExperienceEventType.SUCCESS, { message: '🤝 Wonderful effort, keep getting stronger!' });
      }
    } catch (e) {
      console.warn('Error loading end-game configurations', e);
    }
  }, [players, matchWinners, isHumanWinner, isReadyToShowOverlay]);

  // Phase transition timeouts after overlay renders
  useEffect(() => {
    if (!isReadyToShowOverlay) return;

    const timer1 = setTimeout(() => {
      setPhase('rewards');
    }, 1000);

    return () => clearTimeout(timer1);
  }, [isReadyToShowOverlay]);

  // Staggered card revealing and counter animations
  useEffect(() => {
    if (phase !== 'rewards') return;

    const cardsCount = 3;
    let cardIdx = 0;

    const cardInterval = setInterval(() => {
      if (cardIdx < cardsCount) {
        setRevealedCardIndex(cardIdx);
        
        try {
          audio.playTokenHop();
        } catch {}

        // CARD 1: XP Card Animation
        if (cardIdx === 0) {
          const duration = 1600; // ms
          const start = Date.now();
          const xpDiff = targetXP - startXP;
          
          const animateXP = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            const animatedVal = Math.round(startXP + easeProgress * xpDiff);
            setCurrentXP(animatedVal);
            
            const progressInfo = getLevelProgress(animatedVal);
            setLevel(progressInfo.level);

            if (progress < 1) {
              requestAnimationFrame(animateXP);
            }
          };
          requestAnimationFrame(animateXP);
        }

        // CARD 2: Points Card Animation & Trigger Flying Points Burst
        if (cardIdx === 1) {
          const duration = 1200;
          const start = Date.now();
          const animateCoins = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setDisplayCoins(Math.round(easeProgress * coinsReward));
            if (progress < 1) {
              requestAnimationFrame(animateCoins);
            }
          };
          requestAnimationFrame(animateCoins);

          // Populate flying points list for 3D visual flight to wallet
          const pointsList = Array.from({ length: 10 }).map((_, i) => ({
            id: i,
            delay: i * 0.08,
          }));
          setFlyingCoins(pointsList);

          // Trigger physical wallet total update and scale bounce on first arrivals
          setTimeout(() => {
            setTriggerWalletBounce(true);
            const finalWalletCoins = getPlayerWallet().currentPoints;
            const initialCoins = Math.max(0, finalWalletCoins - coinsReward);
            
            let coinCountStart = Date.now();
            const countDuration = 800;
            const animateWallet = () => {
              const elapsed = Date.now() - coinCountStart;
              const prog = Math.min(elapsed / countDuration, 1);
              const ease = 1 - Math.pow(1 - prog, 3);
              setWalletBalance(Math.round(initialCoins + ease * coinsReward));
              if (prog < 1) {
                requestAnimationFrame(animateWallet);
              } else {
                setTriggerWalletBounce(false);
              }
            };
            requestAnimationFrame(animateWallet);
          }, 650);
        }

        cardIdx++;
      } else {
        clearInterval(cardInterval);
        setTimeout(() => {
          setPhase('final');
        }, 1000);
      }
    }, 850);

    return () => clearInterval(cardInterval);
  }, [phase, startXP, targetXP, didLevelUp, coinsReward]);

  // Canvas particle loops (Fireworks & Confetti)
  useEffect(() => {
    if (!isReadyToShowOverlay) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const fireworks: FireworkParticle[] = [];
    const confetti: ConfettiParticle[] = [];

    // gold confetti particles
    const confettiCount = isHumanWinner ? 75 : 15;
    for (let i = 0; i < confettiCount; i++) {
      confetti.push(new ConfettiParticle(canvas.width, canvas.height));
    }

    // Gold/white firework bursts
    const spawnFirework = (x: number, y: number, colorStyle: 'gold' | 'white' | 'accent') => {
      const colors = 
        colorStyle === 'gold' ? ['#F59E0B', '#FCD34D', '#FFFBEB', '#D97706', '#9A3412'] :
        colorStyle === 'white' ? ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#F8FAFC'] :
        ['#F43F5E', '#10B981', '#0EA5E9', '#8B5CF6'];

      const count = Math.floor(Math.random() * 25 + 30);
      for (let i = 0; i < count; i++) {
        const pColor = colors[Math.floor(Math.random() * colors.length)];
        fireworks.push(new FireworkParticle(x, y, pColor, colorStyle === 'accent' ? 1.25 : 0.95));
      }
    };

    let fireworkTimer: NodeJS.Timeout | null = null;
    if (isHumanWinner) {
      let bursts = 0;
      const triggerBurst = () => {
        if (bursts > 12) return;
        const rx = Math.random() * (canvas.width * 0.7) + canvas.width * 0.15;
        const ry = Math.random() * (canvas.height * 0.45) + canvas.height * 0.12;
        const styles: ('gold' | 'white' | 'accent')[] = ['gold', 'white', 'accent'];
        const style = styles[Math.floor(Math.random() * styles.length)];
        spawnFirework(rx, ry, style);
        bursts++;
        fireworkTimer = setTimeout(triggerBurst, Math.random() * 500 + 350);
      };
      
      // Initial dual dramatic bursts
      setTimeout(() => spawnFirework(canvas.width * 0.28, canvas.height * 0.32, 'gold'), 250);
      setTimeout(() => spawnFirework(canvas.width * 0.72, canvas.height * 0.26, 'white'), 550);
      
      triggerBurst();
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render & update fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fp = fireworks[i];
        fp.update();
        if (fp.alpha <= 0) {
          fireworks.splice(i, 1);
        } else {
          fp.draw(ctx);
        }
      }

      // Render & update confetti cascade
      confetti.forEach((cp) => {
        cp.update();
        cp.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fireworkTimer) clearTimeout(fireworkTimer);
    };
  }, [isHumanWinner, isReadyToShowOverlay]);

  // Encouraging Defeat Quotes
  const encouragingMessages = [
    "An admirable effort! Keep learning, you're getting stronger.",
    "Victory favors the persistent. One more match to sharpen your skills?",
    "Every roll teaches us. Let's claim your victory in the next round!",
    "A game beautifully played. Your strategies are getting sharper!",
    "Nice effort. Shall we seek redemption right away?"
  ];

  const [defeatQuote] = useState(() => encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]);

  const playerColorHex = (color: PlayerColor) => {
    switch (color) {
      case 'red': return '#EF4444';
      case 'green': return '#10B981';
      case 'yellow': return '#F59E0B';
      case 'blue': return '#0EA5E9';
    }
  };

  const formattedPlayerColorName = (color: PlayerColor) => {
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  // Helper method: Parse the actual game logs to construct authentic match highlights
  const getCapturesCount = (color: PlayerColor) => {
    return logs.filter(log => 
      log.color === color && 
      (log.message.includes('captured') || log.message.includes('Capture'))
    ).length;
  };

  const getSixesCount = (color: PlayerColor) => {
    return logs.filter(log => 
      log.color === color && 
      log.message.includes('rolled a 6')
    ).length;
  };

  const getSafeCount = (color: PlayerColor) => {
    return logs.filter(log => 
      log.color === color && 
      (log.message.includes('Safe') || log.message.includes('🛡️'))
    ).length;
  };

  if (!isReadyToShowOverlay) {
    return null; // Anticipation pause - board glows on background first
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto select-none"
      id="end-game-overlay-root"
      style={{
        backgroundColor: 'rgba(120,80,20,0.22)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Canvas for fireworks and confetti */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Main Container Card — warm pastel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 140 }}
        className="relative z-20 w-full max-w-xl rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)',
          border: '1.5px solid rgba(245,200,130,0.4)',
          boxShadow: '0 32px 80px -12px rgba(180,120,60,0.28),0 8px 32px -8px rgba(180,120,60,0.18),inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{backgroundImage:'radial-gradient(circle,rgba(180,120,60,0.07) 1.5px,transparent 1.5px)',backgroundSize:'16px 16px'}} />
        {/* Top sheen */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{background:'linear-gradient(180deg,rgba(255,255,255,0.65) 0%,transparent 100%)'}} />

        {/* Points Balance Badge — warm gloss */}
        <motion.div
          animate={triggerWalletBounce ? { scale: [1, 1.25, 0.92, 1.12, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full z-30"
          style={{background:'rgba(255,255,255,0.92)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 3px 10px rgba(140,80,20,0.12),inset 0 1px 2px rgba(255,255,255,0.9)'}}
        >
          <span className="text-sm">⭐</span>
          <span className="text-xs font-mono font-black text-amber-800 min-w-[28px] text-right">
            {walletBalance.toLocaleString()}
          </span>
        </motion.div>

        {/* VICTORY HEADER */}
        {isHumanWinner ? (
          <div className="flex flex-col items-center text-center gap-2 pt-6 pb-2 px-6 relative z-10">
            <motion.div
              initial={{ y: 90, rotate: -25, scale: 0.3, opacity: 0 }}
              animate={{ y: 0, rotate: isTournamentMatch ? 360 : 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1, damping: 14, stiffness: 110 }}
              className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background:'linear-gradient(145deg,#fef08a,#fcd34d,#f59e0b)',
                border:'3px solid #f59e0b',
                boxShadow:'0 8px 0 #b45309,0 12px 32px rgba(245,158,11,0.4),inset 0 2px 4px rgba(255,255,255,0.6)',
              }}>
              <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-full"
                style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
              <Trophy className="w-12 h-12 relative z-10" style={{color:'#431407'}} />
              <motion.div
                initial={{ x: '-100%' }} animate={{ x: '100%' }}
                transition={{ repeat: Infinity, repeatDelay: 2.2, duration: 1.3, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-4xl font-black tracking-tight"
                style={{background:'linear-gradient(135deg,#92400e,#d97706,#92400e)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                VICTORY!
              </h1>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mt-1 text-amber-700">
                Ludo Royale Champion
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2 pt-6 pb-2 px-6 relative z-10">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1, damping: 16 }}
              className="relative w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background:'linear-gradient(145deg,#e2e8f0,#cbd5e1)',
                border:'2px solid #94a3b8',
                boxShadow:'0 6px 0 #94a3b8,0 8px 20px rgba(148,163,184,0.3),inset 0 1.5px 3px rgba(255,255,255,0.5)',
              }}>
              <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-full"
                style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
              <span className="text-3xl relative z-10">🤝</span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-3xl font-black tracking-tight text-stone-700">Good Game!</h1>
              <p className="text-xs text-amber-600 font-medium px-4 mt-2 max-w-sm italic leading-relaxed">
                "{defeatQuote}"
              </p>
            </motion.div>
          </div>
        )}

        {/* 3. HERO AVATAR FOCUS & CROWN DROP */}
        <div className="flex flex-col items-center mt-5 relative py-2">
          <div className="relative">
            {/* Avatar circle */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-xl z-20 relative overflow-hidden">
              {humanPlayer?.avatar || '👤'}
            </div>

            {/* Pulsing outline glow mapping the player's color */}
            <div 
              className="absolute -inset-1 rounded-full animate-pulse filter blur-[6px] opacity-65 pointer-events-none"
              style={{ backgroundColor: playerColorHex(humanPlayer?.color || 'red') }}
            />

            {/* CROWN DROP ANIMATION (Only for victory) */}
            {isHumanWinner && (
              <motion.div
                initial={{ y: -180, opacity: 0, rotate: -35, scale: 0.3 }}
                animate={{ y: -30, opacity: 1, rotate: 0, scale: 1.3 }}
                transition={{
                  type: 'spring',
                  delay: 0.8,
                  damping: 10,
                  stiffness: 85
                }}
                className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]"
              >
                {/* Premium Gold Crown with soft glow and metallic shine */}
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-amber-500/20 rounded-full blur-md animate-pulse pointer-events-none" />
                  <Crown className="w-9 h-9 text-amber-700 fill-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] relative z-10" />
                </div>
              </motion.div>
            )}
          </div>

          <div className="text-center mt-3">
            <span className="font-extrabold text-stone-800 text-lg block">
              {humanPlayer?.name}
            </span>
            {prestigeState.selectedTitleId && (
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-amber-700 bg-amber-400/10 px-2.5 py-0.5 rounded-full mt-1.5 inline-block border border-amber-400/25 shadow-sm">
                🎖 {DEFAULT_TITLES.find(t => t.id === prestigeState.selectedTitleId)?.name}
              </span>
            )}
            
            {prestigeState.winStreak > 1 && (
              <div className="flex items-center gap-1 justify-center mt-2 px-2.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider animate-bounce border border-amber-500/20 w-fit mx-auto">
                🔥 {prestigeState.winStreak} Win Streak
              </div>
            )}

            <div className="flex items-center gap-1.5 justify-center mt-2">
              <span 
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: playerColorHex(humanPlayer?.color || 'red') }}
              />
              <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest font-mono">
                {formattedPlayerColorName(humanPlayer?.color || 'red')} Team
              </span>
            </div>
          </div>
        </div>

        {/* REWARD CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 mt-4 relative z-10">

          {/* CARD 1: XP */}
          <AnimatePresence>
            {revealedCardIndex >= 0 && (() => {
              const progressInfo = getLevelProgress(currentXP);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 18 }}
                  className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2"
                  style={{
                    background:'linear-gradient(145deg,#fde68a,#fcd34d)',
                    border:'2px solid #f59e0b',
                    boxShadow:'0 4px 0 #f59e0b,0 6px 16px rgba(245,158,11,0.25),inset 0 1.5px 3px rgba(255,255,255,0.5)',
                  }}>
                  <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                    style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
                  <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                    style={{border:'1px solid rgba(255,255,255,0.4)'}} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider" style={{color:'rgba(67,20,7,0.65)'}}>⚡ XP Earned</span>
                    <span className="text-lg">🎯</span>
                  </div>
                  <div className="relative z-10 text-2xl font-black" style={{color:'#431407'}}>
                    +{isHumanWinner ? 500 : 100} XP
                  </div>
                  <div className="relative z-10 w-full">
                    <div className="flex justify-between text-[8px] font-black mb-1" style={{color:'rgba(67,20,7,0.6)'}}>
                      <span>LVL {level}</span>
                      <span>{progressInfo.xpInLevel}/{progressInfo.xpRequiredForLevel}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.35)'}}>
                      <motion.div className="h-full rounded-full relative"
                        style={{width:`${progressInfo.progressPercent}%`,background:'linear-gradient(90deg,#d97706,#b45309)'}}>
                        <motion.div initial={{x:'-100%'}} animate={{x:'100%'}}
                          transition={{duration:1.5,ease:'easeInOut',repeat:Infinity,repeatDelay:1.2}}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      </motion.div>
                    </div>
                    {didLevelUp && currentXP >= targetXP && (
                      <span className="text-[9px] font-black tracking-widest animate-bounce mt-1 inline-block uppercase" style={{color:'#431407'}}>
                        ⭐ Level Up!
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* CARD 2: POINTS */}
          <AnimatePresence>
            {revealedCardIndex >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 18 }}
                className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2"
                style={{
                  background: isHumanWinner
                    ? 'linear-gradient(145deg,#86efac,#4ade80)'
                    : 'linear-gradient(145deg,#93c5fd,#60a5fa)',
                  border: `2px solid ${isHumanWinner ? '#22c55e' : '#3b82f6'}`,
                  boxShadow: `0 4px 0 ${isHumanWinner ? '#22c55e' : '#3b82f6'},0 6px 16px ${isHumanWinner ? 'rgba(34,197,94,0.25)' : 'rgba(59,130,246,0.25)'},inset 0 1.5px 3px rgba(255,255,255,0.5)`,
                }}>
                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
                <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                  style={{border:'1px solid rgba(255,255,255,0.4)'}} />
                {/* Flying points */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {flyingCoins.map((fc) => (
                    <motion.div key={fc.id}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                      animate={{ scale: [0,1.2,1,0.8,0], x: [0,(Math.random()-0.4)*80,120,240], y: [0,(Math.random()-0.5)*80,-100,-220], opacity: [1,1,1,0.8,0] }}
                      transition={{ duration: 1.1, delay: fc.delay, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border shadow-sm flex items-center justify-center text-[7px]"
                      style={{background:'#fef08a',borderColor:'#f59e0b'}}>
                      ⭐
                    </motion.div>
                  ))}
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider"
                    style={{color: isHumanWinner ? 'rgba(5,46,22,0.65)' : 'rgba(30,58,138,0.65)'}}>
                    ⭐ Points Earned
                  </span>
                  <span className="text-lg">{isHumanWinner ? '💰' : '💪'}</span>
                </div>
                <div className="relative z-10 text-2xl font-black"
                  style={{color: isHumanWinner ? '#14532d' : '#1e3a8a'}}>
                  +{displayCoins}
                </div>
                <div className="relative z-10 text-[9px] font-bold uppercase tracking-wider"
                  style={{color: isHumanWinner ? '#15803d' : '#1d4ed8'}}>
                  Balance: {walletBalance.toLocaleString()} pts
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CARD 3: MVP */}
          <AnimatePresence>
            {revealedCardIndex >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 18 }}
                className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2"
                style={{
                  background:'linear-gradient(145deg,#fda4af,#fb7185)',
                  border:'2px solid #f43f5e',
                  boxShadow:'0 4px 0 #f43f5e,0 6px 16px rgba(244,63,94,0.25),inset 0 1.5px 3px rgba(255,255,255,0.5)',
                }}>
                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
                <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                  style={{border:'1px solid rgba(255,255,255,0.4)'}} />
                <div className="absolute top-0 right-0 font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-bl-lg"
                  style={{background:'#f43f5e',color:'#fff'}}>MVP</div>                <div className="w-10 h-10 bg-indigo-500/15 rounded-full flex items-center justify-center text-indigo-400">
                  <Star className="w-5 h-5 fill-indigo-400/20 animate-spin-slow" />
                </div>
                
                <div className="w-full mt-2">
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider font-mono block">Match MVP</span>
                  <div className="flex items-center gap-1 justify-center mt-1">
                    {mvpPlayer?.avatar && /^https?:\/\//.test(mvpPlayer.avatar) ? (
                      <img
                        src={mvpPlayer.avatar}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm">{mvpPlayer?.avatar}</span>
                    )}
                    <span className="text-sm font-black text-stone-800 truncate max-w-[100px]">{mvpPlayer?.name}</span>
                  </div>
                </div>

                <div className="text-[8px] text-amber-700 bg-amber-400/10 font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-full mt-1">
                  Elite Performer
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Achievements / Unlocks Section */}
        {phase === 'final' && (newlyUnlockedBadges.length > 0 || newlyUnlockedTitles.length > 0 || newlyUnlockedCrowns.length > 0 || rankUpgraded) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 bg-gradient-to-br from-amber-500/10 via-yellow-600/5 to-transparent border border-amber-500/20 rounded-2xl shadow-lg relative overflow-hidden"
          >
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
            
            <h3 className="text-[10px] font-black tracking-widest text-amber-700 uppercase flex items-center gap-1.5 justify-center mb-3">
              🏆 Treasures & Achievements Unlocked!
            </h3>
            
            <div className="flex flex-col gap-2">
              {/* Badges */}
              {newlyUnlockedBadges.map((badge) => (
                <div key={`end-badge-${badge.id}`} className="flex items-center gap-3 p-2 bg-white/60 border border-amber-500/15 rounded-xl">
                  <span className="text-xl shrink-0">{badge.emoji}</span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[8px] font-mono text-amber-700 uppercase font-bold tracking-wider">Badge Unlocked</div>
                    <div className="text-[11px] font-black text-stone-800 uppercase">{badge.name}</div>
                    <div className="text-[9px] text-amber-700 leading-tight truncate">{badge.description}</div>
                  </div>
                </div>
              ))}

              {/* Crowns */}
              {newlyUnlockedCrowns.map((crown) => (
                <div key={`end-crown-${crown.id}`} className="flex items-center gap-3 p-2 bg-white/60 border border-yellow-500/15 rounded-xl">
                  <span className="text-xl shrink-0">{crown.emoji}</span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[8px] font-mono text-amber-700 uppercase font-bold tracking-wider">Crown Unlocked</div>
                    <div className="text-[11px] font-black text-stone-800 uppercase">{crown.name}</div>
                    <div className="text-[9px] text-amber-700 leading-tight truncate">{crown.description}</div>
                  </div>
                </div>
              ))}

              {/* Titles */}
              {newlyUnlockedTitles.map((title) => (
                <div key={`end-title-${title.id}`} className="flex items-center gap-3 p-2 bg-white/60 border border-sky-500/15 rounded-xl">
                  <span className="text-xl shrink-0">🎖</span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[8px] font-mono text-sky-600 uppercase font-bold tracking-wider">Title Unlocked</div>
                    <div className="text-[11px] font-black text-stone-800 uppercase">"{title.name}"</div>
                    <div className="text-[9px] text-amber-700 leading-tight truncate">{title.description}</div>
                  </div>
                </div>
              ))}

              {/* Rank Promoted */}
              {rankUpgraded && (
                <div className="flex items-center gap-3 p-2 bg-white/60 border border-purple-500/15 rounded-xl">
                  <span className="text-xl shrink-0">⭐</span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[8px] font-mono text-purple-400 uppercase font-bold tracking-wider">Prestige Promotion</div>
                    <div className="text-[11px] font-black text-stone-800 uppercase">
                      Promoted to {prestigeEngine.getRankInfo(level).name}!
                    </div>
                    <div className="text-[9px] text-amber-700 leading-tight">Advanced to Level {level}. Keep climbing!</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 5. AUTHENTIC MATCH HIGHLIGHTS (BENTO STYLE) */}
        {phase === 'final' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 border-t border-amber-200/30 pt-4"
          >
            <div className="text-[10px] font-black text-amber-700 tracking-wider uppercase mb-3 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Match Highlights</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Highlight 1: Capture Master */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-amber-100/30 shadow-inner">
                <div className="w-9 h-9 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-amber-700 font-mono font-bold uppercase tracking-wider">Opponents Captured</div>
                  <div className="text-sm font-black text-stone-800 mt-0.5">
                    {getCapturesCount(humanPlayer.color)} Token{getCapturesCount(humanPlayer.color) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Highlight 2: Safe Spot Shields (Defense master) */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-amber-100/30 shadow-inner">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-amber-700 font-mono font-bold uppercase tracking-wider">Safe Spot Defenses</div>
                  <div className="text-sm font-black text-stone-800 mt-0.5">
                    {getSafeCount(humanPlayer.color)} Block{getSafeCount(humanPlayer.color) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Highlight 3: Dice Master (6s rolled) */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-amber-100/30 shadow-inner">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-700 shrink-0">
                  <Star className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-amber-700 font-mono font-bold uppercase tracking-wider">Super Sixes Rolled</div>
                  <div className="text-sm font-black text-stone-800 mt-0.5">
                    {getSixesCount(humanPlayer.color)} Time{getSixesCount(humanPlayer.color) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Highlight 4: Journey Master */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-amber-100/30 shadow-inner">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <Compass className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-amber-700 font-mono font-bold uppercase tracking-wider">Fastest Home Player</div>
                  <div className="text-sm font-black text-stone-800 mt-0.5 truncate">
                    {formattedPlayerColorName(matchWinners[0] || 'red')} Winner
                  </div>
                </div>
              </div>
            </div>

            {/* Standings positions list */}
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="text-[9px] text-amber-600 font-black tracking-wider uppercase font-mono mb-1 text-center">Final Positions</div>
              <div className="flex gap-2 justify-center">
                {matchWinners.slice(0, 3).map((color, idx) => {
                  const player = players.find(p => p.color === color);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div 
                      key={color}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70/30 border border-amber-100/30 text-xs"
                    >
                      <span>{medals[idx]}</span>
                      <span className="text-[10px] font-extrabold text-stone-600">{player?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 6. GAME CONTROL ACTIONS */}
        <AnimatePresence>
          {phase === 'final' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col gap-3 mt-5 px-6 pb-6"
            >
              {/* Rematch */}
              <motion.button
                whileHover={{y:-3,scale:1.02}}
                whileTap={{y:3,scale:0.97}}
                onClick={() => { try { audio.playClick(); } catch {} onRematch(); }}
                className="w-full py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background:'linear-gradient(145deg,#f59e0b,#d97706)',
                  border:'2px solid #b45309',
                  boxShadow:'0 5px 0 #b45309,0 8px 20px rgba(245,158,11,0.3),inset 0 1.5px 3px rgba(255,255,255,0.5)',
                  color:'#431407',
                }}>
                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
                <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
                  style={{border:'1px solid rgba(255,255,255,0.4)'}} />
                <RotateCcw className="w-4 h-4 relative z-10" />
                <span className="relative z-10">🔄 Rematch</span>
              </motion.button>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{y:-2,scale:1.02}}
                  whileTap={{scale:0.97}}
                  onClick={() => { try { audio.playClick(); } catch {} onReturnToMenu(); }}
                  className="py-3 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 relative overflow-hidden"
                  style={{
                    background:'rgba(255,255,255,0.75)',
                    border:'1.5px solid rgba(180,120,60,0.22)',
                    boxShadow:'0 3px 0 rgba(180,120,60,0.15),inset 0 1px 2px rgba(255,255,255,0.9)',
                    color:'#78716c',
                  }}>
                  <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                    style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                  <Home className="w-3.5 h-3.5 text-amber-700 relative z-10" />
                  <span className="relative z-10">Menu</span>
                </motion.button>

                <motion.button
                  whileHover={{y:-2,scale:1.02}}
                  whileTap={{scale:0.97}}
                  onClick={() => { try { audio.playClick(); } catch {} onReturnToMenu(); }}
                  className="py-3 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 relative overflow-hidden"
                  style={{
                    background:'rgba(255,255,255,0.75)',
                    border:'1.5px solid rgba(180,120,60,0.22)',
                    boxShadow:'0 3px 0 rgba(180,120,60,0.15),inset 0 1px 2px rgba(255,255,255,0.9)',
                    color:'#78716c',
                  }}>
                  <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                    style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                  <span className="relative z-10">Stats</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-700 relative z-10" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Prestige Unlocks Notifications (Elegant, Non-Intrusive Slide-up) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {newlyUnlockedBadges.map((badge, idx) => (
            <motion.div
              key={`badge-${badge.id}`}
              initial={{ opacity: 0, y: 50, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 15, delay: idx * 0.2 }}
              className="bg-white/70/95 border border-amber-500/30 text-stone-800 rounded-2xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex items-center gap-3.5 pointer-events-auto overflow-hidden relative"
            >
              {/* Soft Golden Shine Sweep effect */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
              />
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl border border-amber-500/20 shadow-inner shrink-0">
                {badge.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest font-mono">Achievement Badge Unlocked!</span>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide truncate mt-0.5">{badge.name}</h4>
                <p className="text-[10px] text-amber-700 leading-tight mt-0.5">{badge.description}</p>
              </div>
            </motion.div>
          ))}

          {newlyUnlockedTitles.map((title, idx) => (
            <motion.div
              key={`title-${title.id}`}
              initial={{ opacity: 0, y: 50, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 15, delay: (newlyUnlockedBadges.length + idx) * 0.2 }}
              className="bg-white/70/95 border border-amber-500/30 text-stone-800 rounded-2xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex items-center gap-3.5 pointer-events-auto overflow-hidden relative"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl border border-amber-500/20 shadow-inner shrink-0">
                🎖
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest font-mono">New Player Title Unlocked!</span>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide truncate mt-0.5">{title.name}</h4>
                <p className="text-[10px] text-amber-700 leading-tight mt-0.5">Equip this title in your Prestige collection menu.</p>
              </div>
            </motion.div>
          ))}

          {rankUpgraded && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-gradient-to-r from-amber-500/20 to-yellow-600/20 backdrop-blur border border-amber-400/40 text-stone-800 rounded-2xl p-4 shadow-[0_12px_30px_rgba(245,158,11,0.2)] flex items-center gap-3.5 pointer-events-auto overflow-hidden relative"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-2xl border border-amber-400/30 shadow-inner shrink-0">
                📈
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest font-mono">Prestige Tier Upgraded!</span>
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide truncate mt-0.5">{prestigeEngine.getRankInfo(prestigeState.level).name} Tier</h4>
                <p className="text-[10px] text-stone-600 leading-tight mt-0.5">You have advanced to Lvl {prestigeState.level}. Keep climbing!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EndGameScreen;
