/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { audio } from '../utils/audio';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  onGuest: () => void;
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LBlock = ({ letter, from, to, shadowColor }: { letter: string; from: string; to: string; shadowColor: string }) => (
  <div style={{
    width: '44px', height: '44px', borderRadius: '12px',
    background: `linear-gradient(145deg,${from},${to})`,
    boxShadow: `0 5px 0 ${shadowColor},0 8px 20px ${shadowColor}80,inset 0 1.5px 3px rgba(255,255,255,0.5)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '19px', fontWeight: 900, color: '#fff',
    position: 'relative', overflow: 'hidden', flexShrink: 0,
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)' }} />
    <span style={{ position: 'relative', zIndex: 1 }}>{letter}</span>
  </div>
);

const BenefitIcon = ({ emoji, label, from, to, border }: { emoji: string; label: string; from: string; to: string; border: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
    <div style={{
      width: '36px', height: '36px', borderRadius: '11px',
      background: `linear-gradient(145deg,${from},${to})`,
      border: `1.5px solid ${border}`,
      boxShadow: `0 3px 0 ${border},inset 0 1px 2px rgba(255,255,255,0.6)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '17px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)' }} />
      <span style={{ position: 'relative', zIndex: 1 }}>{emoji}</span>
    </div>
    <span style={{ fontSize: '8px', fontWeight: 700, color: '#92400e', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
  </div>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin, onGuest }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      style={{
        width: '100%', maxWidth: '420px', margin: '0 auto',
        borderRadius: '28px', overflow: 'hidden',
        border: '1.5px solid rgba(245,200,130,0.4)',
        boxShadow: '0 32px 80px -12px rgba(180,120,60,0.22),0 8px 32px -8px rgba(180,120,60,0.14),inset 0 1px 0 rgba(255,255,255,0.9)',
        background: 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)',
        position: 'relative',
      }}
    >
      {/* Dot pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle,rgba(180,120,60,0.08) 1.5px,transparent 1.5px)',
        backgroundSize: '16px 16px',
      }} />
      {/* Top sheen */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '140px',
        background: 'linear-gradient(180deg,rgba(255,255,255,0.72) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '36px 28px 32px',
        gap: '0',
      }}>

        {/* Crown */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: '42px', filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.55))', marginBottom: '10px' }}>
          👑
        </motion.div>

        {/* LUDO blocks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <LBlock letter="L" from="#f43f5e" to="#e11d48" shadowColor="#be123c" />
          <LBlock letter="U" from="#3b82f6" to="#2563eb" shadowColor="#1d4ed8" />
          <LBlock letter="D" from="#22c55e" to="#16a34a" shadowColor="#15803d" />
          <LBlock letter="O" from="#f59e0b" to="#d97706" shadowColor="#b45309" />
        </div>

        {/* Royale badge */}
        <div style={{
          fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px',
          color: '#92400e', padding: '4px 14px', borderRadius: '20px', marginBottom: '28px',
          background: 'linear-gradient(145deg,rgba(254,243,199,0.95),rgba(253,230,138,0.8))',
          border: '1px solid rgba(245,158,11,0.4)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7)',
        }}>
          Royale · Premium Edition
        </div>

        {/* Welcome text */}
        <div style={{ fontSize: '18px', fontWeight: 900, color: '#1c1917', marginBottom: '6px', textAlign: 'center' }}>
          Welcome 👋
        </div>
        <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
          Sign in to save your points,<br />progress & unlock tournaments
        </div>

        {/* Google Sign In button */}
        <motion.button
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 3, scale: 0.97 }}
          onClick={() => { audio.playClick(); onGoogleLogin(); }}
          style={{
            width: '100%', padding: '15px 16px', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            fontSize: '13px', fontWeight: 900, color: '#3c4043',
            background: 'linear-gradient(145deg,#ffffff,#f8f8f8)',
            border: '2px solid #dadce0',
            boxShadow: '0 5px 0 #c5c7ca,0 8px 20px rgba(0,0,0,0.1),inset 0 1.5px 3px rgba(255,255,255,0.9)',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
            marginBottom: '14px',
          }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.7) 0%,transparent 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: '2px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.6)', pointerEvents: 'none' }} />
          <GoogleIcon />
          <span style={{ position: 'relative', zIndex: 1 }}>Continue with Google</span>
        </motion.button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(180,120,60,0.2)' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(180,120,60,0.2)' }} />
        </div>

        {/* Guest button */}
        <motion.button
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 3, scale: 0.97 }}
          onClick={() => { audio.playClick(); onGuest(); }}
          style={{
            width: '100%', padding: '13px', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '12px', fontWeight: 900, color: '#78716c',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            background: 'rgba(255,255,255,0.7)',
            border: '2px solid rgba(180,120,60,0.25)',
            boxShadow: '0 4px 0 rgba(180,120,60,0.15),0 5px 14px rgba(180,120,60,0.07),inset 0 1px 2px rgba(255,255,255,0.9)',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
            marginBottom: '24px',
          }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.6) 0%,transparent 100%)', pointerEvents: 'none' }} />
          <span style={{ fontSize: '16px', position: 'relative', zIndex: 1 }}>👤</span>
          <span style={{ position: 'relative', zIndex: 1 }}>Play as Guest</span>
        </motion.button>

        {/* Benefit icons */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          <BenefitIcon emoji="🪙" label={`Save\nCoins`} from="#fde68a" to="#fcd34d" border="#f59e0b" />
          <BenefitIcon emoji="🏆" label={`Join\nTournaments`} from="#93c5fd" to="#60a5fa" border="#3b82f6" />
          <BenefitIcon emoji="📱" label={`Any\nDevice`} from="#86efac" to="#4ade80" border="#22c55e" />
          <BenefitIcon emoji="🎁" label={`Redeem\nRewards`} from="#fda4af" to="#fb7185" border="#f43f5e" />
        </div>

      </div>
    </motion.div>
  );
};

// ── LOCK POPUP — shown when guest taps a locked feature ──
interface LockPopupProps {
  feature: 'Tournament' | 'Rewards';
  onLogin: () => void;
  onDismiss: () => void;
}

export const LockPopup: React.FC<LockPopupProps> = ({ feature, onLogin, onDismiss }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(120,80,20,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '340px',
          background: 'linear-gradient(160deg,#fdf8f0,#fef3e2)',
          borderRadius: '24px', padding: '26px 22px',
          border: '1.5px solid rgba(245,200,130,0.5)',
          boxShadow: '0 24px 60px rgba(140,80,20,0.3),inset 0 1px 0 rgba(255,255,255,0.9)',
          position: 'relative', overflow: 'hidden',
        }}>
        {/* Sheen */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg,rgba(255,255,255,0.6) 0%,transparent 100%)', pointerEvents: 'none' }} />

        {/* Lock icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '18px',
          background: 'linear-gradient(145deg,#fde68a,#fcd34d)',
          border: '2px solid #f59e0b',
          boxShadow: '0 5px 0 #f59e0b,0 8px 20px rgba(245,158,11,0.3),inset 0 1.5px 3px rgba(255,255,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', margin: '0 auto 12px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)' }} />
          🔒
        </div>

        <div style={{ fontSize: '15px', fontWeight: 900, color: '#1c1917', textAlign: 'center', marginBottom: '6px' }}>
          Account Required
        </div>
        <div style={{ fontSize: '10px', color: '#b45309', textAlign: 'center', fontWeight: 700, marginBottom: '16px', lineHeight: 1.5 }}>
          {feature} is available for<br />registered players only
        </div>

        {/* Perks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {[
            { color: '#22c55e', text: 'Progress saved across devices' },
            { color: '#3b82f6', text: 'Coins & rewards protected' },
            { color: '#f59e0b', text: 'Tournament & leaderboard access' },
          ].map(({ color, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(180,120,60,0.12)',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#57534e' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Google login button */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ y: 2 }}
          onClick={() => { audio.playClick(); onLogin(); }}
          style={{
            width: '100%', padding: '13px', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '12px', fontWeight: 900, color: '#3c4043',
            background: 'linear-gradient(145deg,#ffffff,#f8f8f8)',
            border: '2px solid #dadce0',
            boxShadow: '0 4px 0 #c5c7ca,0 6px 16px rgba(0,0,0,0.08),inset 0 1.5px 3px rgba(255,255,255,0.9)',
            cursor: 'pointer', marginBottom: '10px',
            position: 'relative', overflow: 'hidden',
          }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg,rgba(255,255,255,0.7) 0%,transparent 100%)', pointerEvents: 'none' }} />
          <GoogleIcon />
          <span style={{ position: 'relative', zIndex: 1 }}>Sign in with Google</span>
        </motion.button>

        {/* Dismiss */}
        <div
          onClick={() => { audio.playClick(); onDismiss(); }}
          style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', textAlign: 'center', cursor: 'pointer', opacity: 0.75 }}>
          Maybe Later
        </div>
      </motion.div>
    </motion.div>
  );
};
