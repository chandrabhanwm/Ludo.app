/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet as WalletIcon,
  Coins,
  History,
  Gift,
  ShoppingBag,
  Pizza,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Lock,
  ShieldCheck,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { audio } from '../utils/audio';
import { experienceEngine } from '../experience';
import {
  rewardEngine,
  Wallet,
  CoinTransaction,
  RedemptionRequest,
  RewardStoreItem,
  getGroupedTransactionHistory
} from '../rewards';
import { unlockReward } from '../rewards/rewardEngine';

interface RewardDashboardProps {
  onBack: () => void;
}

export const RewardDashboard: React.FC<RewardDashboardProps> = ({ onBack }) => {
  // Navigation tabs: 'store' | 'wallet' | 'redemptions' | 'rules'
  const [activeTab, setActiveTab] = useState<'store' | 'wallet' | 'redemptions' | 'rules'>('store');

  // Local component states
  const [wallet, setWallet] = useState<Wallet>(rewardEngine.getPoints());
  const [groupedTx, setGroupedTx] = useState<Record<string, CoinTransaction[]>>({});
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [copiedRewardId, setCopiedRewardId] = useState<string | null>(null);
  const [unlockedRewards, setUnlockedRewards] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]'); } catch { return []; }
  });

  // Feedback messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load and refresh rewards state
  const refreshData = () => {
    setWallet(rewardEngine.getPoints());
    setGroupedTx(getGroupedTransactionHistory());
    setRedemptions(rewardEngine.getRedemptions());
    try { setUnlockedRewards(JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]')); } catch { /**/ }
  };

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRedeem = (item: RewardStoreItem) => {
    audio.playClick();
    const result = rewardEngine.createRedemption(item.id, item.name, item.pointCost);
    if (result.success) {
      // Instantly unlock the reward in localStorage
      unlockReward(item.id);
      showToast(`${item.name} unlocked! ✨`, 'success');
      refreshData();
    } else {
      showToast(result.message, 'error');
    }
  };

  // Helper to copy delivered code
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRewardId(id);
    audio.playClick();
    setTimeout(() => setCopiedRewardId(null), 2000);
  };

  // Helper to render icon based on store item
  const renderStoreIcon = (imageName: string) => {
    switch (imageName) {
      case 'Sparkles': return '⚡';
      case 'Crown': return '👑';
      case 'Star': return '🎨';
      case 'Dice': return '🎲';
      case 'Award': return '🎭';
      case 'Diamond': return '💎';
      case 'ShieldCheck': return '🛡️';
      case 'ShoppingBag': return '🛒';
      case 'Pizza': return '🍕';
      default: return '🎁';
    }
  };

  // Helper to get status pill styling
  const getStatusBadge = (status: RedemptionRequest['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center gap-1">
            <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} /> Pending
          </span>
        );
      case 'Approved':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck size={10} /> Approved
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center gap-1">
            <CheckCircle2 size={10} /> Completed
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
            <XCircle size={10} /> Rejected
          </span>
        );
      default: // Cancelled
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-stone-500/15 text-amber-700 border border-stone-500/20 flex items-center gap-1">
            <XCircle size={10} /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto select-none relative overflow-hidden font-sans rounded-3xl"
      style={{
        background: 'linear-gradient(160deg,#fdf8f0 0%,#fef3e2 45%,#fdf0e8 100%)',
        border: '1.5px solid rgba(245,200,130,0.4)',
        boxShadow: '0 32px 80px -12px rgba(180,120,60,0.22),0 8px 32px -8px rgba(180,120,60,0.14),inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>

      {/* Dot pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{backgroundImage:'radial-gradient(circle,rgba(180,120,60,0.07) 1.5px,transparent 1.5px)',backgroundSize:'16px 16px'}} />
      {/* Top sheen */}
      <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{background:'linear-gradient(180deg,rgba(255,255,255,0.65) 0%,transparent 100%)'}} />

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 relative z-10">
        <button onClick={() => { audio.playClick(); onBack(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          style={{background:'rgba(255,255,255,0.88)',border:'1.5px solid rgba(180,120,60,0.22)',boxShadow:'0 2px 6px rgba(140,80,20,0.1)',color:'#92400e'}}>
          <ArrowLeft size={13} /> Menu
        </button>
        <span className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1 tracking-wider">
          <Sparkles size={12} className="text-amber-700 animate-pulse" /> Royal Rewards
        </span>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold text-stone-950 ${
              toast.type === 'success'
                ? 'bg-gradient-to-r from-amber-300 to-yellow-400 border-yellow-300'
                : 'bg-rose-500 border-rose-400 text-stone-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* POINTS BALANCE CARD */}
      <div className="relative overflow-hidden rounded-2xl mx-5 mb-3"
        style={{
          background:'linear-gradient(145deg,#f59e0b,#d97706)',
          border:'2px solid #b45309',
          boxShadow:'0 6px 0 #b45309,0 10px 28px rgba(245,158,11,0.35),inset 0 1.5px 3px rgba(255,255,255,0.5)',
        }}>
        <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-t-2xl"
          style={{background:'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,transparent 100%)'}} />
        <div className="absolute inset-0.5 rounded-2xl pointer-events-none"
          style={{border:'1px solid rgba(255,255,255,0.35)'}} />
        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{background:'rgba(255,255,255,0.25)',border:'1px solid rgba(255,255,255,0.3)'}}>⭐</div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider font-black" style={{color:'rgba(67,20,7,0.65)'}}>Available Points</span>
                <span className="text-3xl font-black leading-none" style={{color:'#431407'}}>
                  {wallet.availablePoints.toLocaleString()}
                </span>
                <span className="block text-[9px] font-bold mt-0.5" style={{color:'rgba(67,20,7,0.65)'}}>Points</span>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[8px] uppercase font-black" style={{color:'rgba(67,20,7,0.6)'}}>Lifetime Earned</span>
              <span className="text-sm font-black" style={{color:'#431407'}}>{wallet.lifetimePointsEarned.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{borderTop:'1px solid rgba(67,20,7,0.15)'}}>
            {[
              {label:'Reserved', value: wallet.reservedPoints.toLocaleString(), color:'rgba(67,20,7,0.7)'},
              {label:'Total Earned', value:`+${wallet.lifetimePointsEarned.toLocaleString()}`, color:'#15803d'},
              {label:'Redeemed', value:`-${wallet.lifetimePointsRedeemed.toLocaleString()}`, color:'#be123c'},
            ].map(({label, value, color}) => (
              <div key={label} className="text-center rounded-xl py-1.5"
                style={{background:'rgba(255,255,255,0.18)'}}>
                <span className="block text-[7px] uppercase tracking-wider font-black" style={{color:'rgba(67,20,7,0.6)'}}>{label}</span>
                <span className="text-[11px] font-black" style={{color}}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="grid grid-cols-4 gap-1.5 mx-5 mb-3 p-1.5 rounded-2xl relative z-10"
        style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(180,120,60,0.18)'}}>
        {([
          {id:'store', label:'Store', icon:'🛒'},
          {id:'wallet', label:'History', icon:'💰'},
          {id:'redemptions', label:'Orders', icon:'🎁'},
          {id:'rules', label:'Rules', icon:'📖'},
        ] as const).map(({id, label, icon}) => (
          <button key={id}
            onClick={() => { audio.playClick(); setActiveTab(id); }}
            className="py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex flex-col items-center gap-1 relative overflow-hidden"
            style={activeTab === id ? {
              background:'linear-gradient(145deg,#f59e0b,#d97706)',
              border:'1.5px solid #b45309',
              boxShadow:'0 2px 0 #b45309,inset 0 1px 2px rgba(255,255,255,0.4)',
              color:'#431407',
            } : {color:'#92400e'}}>
            {activeTab === id && (
              <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                style={{background:'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)'}} />
            )}
            <span className="relative z-10">{icon}</span>
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>


      {/* TAB CONTENT AREAS */}
      <div className="min-h-72 overflow-y-auto px-5 pb-5 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: REWARD STORE */}
          {activeTab === 'store' && (
            <motion.div
              key="store"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-3"
            >
              <div className="flex justify-between items-center pb-1">
                <span className="text-[9px] uppercase font-black tracking-widest text-amber-700">In-App Rewards</span>
                <span className="text-[8px] text-amber-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(180,120,60,0.15)'}}>
                  <ShieldCheck size={10} className="text-amber-700" /> Need enough points
                </span>
              </div>

              {rewardEngine.getStoreItems().map((item) => {
                const canAfford = wallet.availablePoints >= item.pointCost;
                const isUnlocked = unlockedRewards.includes(item.id);
                const isComingSoon = item.comingSoon === true;
                return (
                  <div key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl relative overflow-hidden"
                    style={{
                      background: isUnlocked ? 'rgba(34,197,94,0.08)' : isComingSoon ? 'rgba(255,255,255,0.4)' : canAfford ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                      border: `1.5px solid ${isUnlocked ? 'rgba(34,197,94,0.3)' : isComingSoon ? 'rgba(180,120,60,0.1)' : canAfford ? 'rgba(180,120,60,0.22)' : 'rgba(180,120,60,0.1)'}`,
                      boxShadow: canAfford && !isUnlocked && !isComingSoon ? '0 3px 10px rgba(140,80,20,0.08),inset 0 1px 2px rgba(255,255,255,0.9)' : 'none',
                      opacity: isComingSoon ? 0.55 : !canAfford && !isUnlocked ? 0.6 : 1,
                    }}>
                    <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                      style={{background:'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)'}} />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center relative overflow-hidden"
                        style={{
                          background: isUnlocked
                            ? 'linear-gradient(145deg,#86efac,#4ade80)'
                            : 'linear-gradient(145deg,#fde68a,#fcd34d)',
                          border: `1.5px solid ${isUnlocked ? '#22c55e' : '#f59e0b'}`,
                          boxShadow: `0 3px 0 ${isUnlocked ? '#22c55e' : '#f59e0b'},inset 0 1px 2px rgba(255,255,255,0.6)`,
                        }}>
                        <div className="absolute top-0 inset-x-0 h-1/2" style={{background:'linear-gradient(180deg,rgba(255,255,255,0.5) 0%,transparent 100%)'}} />
                        <span className="relative z-10 text-lg">{isUnlocked ? '✅' : renderStoreIcon(item.image)}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-black text-stone-800 leading-tight">{item.name}</h3>
                        <p className="text-[9px] text-amber-700 font-semibold mt-0.5 max-w-[160px] leading-relaxed">
                          {item.details}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 mt-1.5 px-2 py-0.5 rounded-lg"
                          style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)'}}>
                          ⭐ {item.pointCost.toLocaleString()} pts
                        </span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={!isUnlocked && !isComingSoon && canAfford ? {y:-2,scale:1.04} : {}}
                      whileTap={!isUnlocked && !isComingSoon && canAfford ? {y:2,scale:0.96} : {}}
                      onClick={() => !isUnlocked && !isComingSoon && handleRedeem(item)}
                      disabled={isUnlocked || isComingSoon || !canAfford}
                      className="relative overflow-hidden rounded-xl font-black text-[9px] uppercase tracking-wider px-3 py-2 flex-shrink-0"
                      style={isUnlocked ? {
                        background:'linear-gradient(145deg,#86efac,#4ade80)',
                        border:'1.5px solid #22c55e',
                        boxShadow:'0 3px 0 #22c55e,inset 0 1px 2px rgba(255,255,255,0.5)',
                        color:'#14532d',
                        cursor:'default',
                      } : isComingSoon ? {
                        background:'rgba(255,255,255,0.5)',
                        border:'1px solid rgba(180,120,60,0.18)',
                        color:'#b45309',
                        cursor:'not-allowed',
                      } : canAfford ? {
                        background:'linear-gradient(145deg,#f59e0b,#d97706)',
                        border:'1.5px solid #b45309',
                        boxShadow:'0 3px 0 #b45309,inset 0 1px 2px rgba(255,255,255,0.5)',
                        color:'#431407',
                        cursor:'pointer',
                      } : {
                        background:'rgba(255,255,255,0.4)',
                        border:'1px solid rgba(180,120,60,0.15)',
                        color:'#d4a86a',
                        cursor:'not-allowed',
                      }}>
                      {(isUnlocked || (!isComingSoon && canAfford)) && (
                        <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none"
                          style={{background:'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)'}} />
                      )}
                      <span className="relative z-10">
                        {isUnlocked ? '✓ Owned' : isComingSoon ? '🔒 Soon' : 'Redeem'}
                      </span>
                    </motion.button>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* TAB 2: WALLET & TRANSACTION HISTORY */}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-700 block pb-1">
                Points History
              </span>

              {Object.keys(groupedTx).length === 0 ? (
                <div className="py-12 text-center text-amber-600 text-xs font-bold flex flex-col items-center gap-2">
                  <History size={24} className="text-stone-600" />
                  No transactions recorded yet. Keep playing to earn rewards!
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(Object.entries(groupedTx) as [string, CoinTransaction[]][]).map(([date, txs]) => (
                    <div key={date} className="flex flex-col gap-2">
                      {/* Date Header */}
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 border-b border-amber-200/40 pb-1 text-left">
                        {date}
                      </span>

                      {/* Transaction List */}
                      <div className="flex flex-col gap-1.5">
                        {txs.map((tx) => {
                          const isCredit = tx.type === 'credit';
                          const isDebit = tx.type === 'debit' || tx.type === 'finalize';
                          const isReserve = tx.type === 'reserve';
                          const isRelease = tx.type === 'release';

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3 bg-white/70 border border-amber-200/40 rounded-xl"
                            >
                              <div className="text-left">
                                <span className="block text-xs font-bold text-stone-800">{tx.reason}</span>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-amber-700">
                                  <span>{tx.time}</span>
                                  <span>•</span>
                                  <span className="uppercase text-amber-600">{tx.type}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`font-mono text-xs font-black ${
                                    isCredit ? 'text-emerald-600' :
                                    isDebit ? 'text-rose-600' :
                                    isReserve ? 'text-amber-700' : 'text-sky-600'
                                  }`}
                                >
                                  {isCredit && `+${tx.pointsAdded.toLocaleString()} Points`}
                                  {isDebit && `-${tx.pointsRemoved.toLocaleString()} Points`}
                                  {isReserve && `Reserved: -${tx.pointsRemoved.toLocaleString()} Points`}
                                  {isRelease && `Refunded: +${tx.pointsAdded.toLocaleString()} Points`}
                                </span>
                                <span className="block text-[8px] font-mono text-amber-600 mt-0.5">
                                  Balance: {tx.balanceAfter.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: USER REDEMPTIONS */}
          {activeTab === 'redemptions' && (
            <motion.div
              key="redemptions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="flex justify-between items-center pb-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-amber-700">Your Redemption Requests</span>
              </div>

              {redemptions.length === 0 ? (
                <div className="py-12 text-center text-amber-600 text-xs font-bold flex flex-col items-center gap-2 border border-dashed border-amber-200/60 rounded-2xl">
                  <Gift size={24} className="text-stone-600" />
                  No redemption requests. Go to the Store tab to redeem!
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {redemptions.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl text-left flex flex-col gap-3" style={{background:"rgba(255,255,255,0.7)",border:"1.5px solid rgba(180,120,60,0.2)",boxShadow:"0 3px 10px rgba(140,80,20,0.06)"}}
                    >
                      {/* Top detail row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs font-black text-stone-800">{req.rewardName}</h3>
                          <span className="block text-[9px] font-mono text-amber-600 mt-0.5">
                            ID: {req.id} • Requested: {req.requestedDate}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(req.status)}
                          <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                            {req.pointCost.toLocaleString()} Points
                          </span>
                        </div>
                      </div>

                      {/* Delivered reward code block */}
                      {req.status === 'Completed' && req.rewardCode && (
                        <div className="p-2.5 bg-sky-500/10 border border-sky-400/20 rounded-xl flex items-center justify-between text-xs font-mono">
                          <div className="text-left">
                            <span className="block text-[8px] uppercase font-black tracking-widest text-sky-600 font-sans mb-0.5">Gift Card Code</span>
                            <span className="text-sky-300 font-black">{req.rewardCode}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(req.rewardCode!, req.id)}
                            className="px-2.5 py-1.5 bg-sky-500 text-stone-950 text-[10px] font-black uppercase rounded-lg shadow hover:brightness-110 flex items-center gap-1 transition"
                          >
                            {copiedRewardId === req.id ? (
                              <>
                                <Check size={10} /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={10} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: REWARD RULES EXPLANATION */}
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 text-left"
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-700">
                Official Payout Rules Config
              </span>

              <div className="rounded-2xl overflow-hidden text-xs" style={{background:"rgba(255,255,255,0.7)",border:"1.5px solid rgba(180,120,60,0.2)"}}>
                {/* Match Wins & Losses */}
                <div className="p-3.5 border-b border-amber-200/40 flex items-center justify-between">
                  <div>
                    <span className="block font-black text-stone-800">Classic Mode Match</span>
                    <span className="text-[10px] text-amber-700">Awarded to players on game completion</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-emerald-600">+500 Points (Win)</span>
                    <span className="block text-[10px] font-bold text-amber-700">+100 Points (Loss)</span>
                  </div>
                </div>

                {/* Tournament Qualified & Champ */}
                <div className="p-3.5 border-b border-amber-200/40 flex items-center justify-between">
                  <div>
                    <span className="block font-black text-stone-800">Championship & Tournaments</span>
                    <span className="text-[10px] text-amber-700">Earned via bracket progression</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-amber-700">+20,000 Points (Champion)</span>
                    <span className="block text-[10px] font-bold text-sky-600">+2,000 Points (Qualification)</span>
                  </div>
                </div>

                {/* Weekly Contests */}
                <div className="p-3.5 flex flex-col gap-2">
                  <div>
                    <span className="block font-black text-stone-800">Weekly Contest Leaderboard Ranks</span>
                    <span className="text-[10px] text-amber-700">Claimable when ranks lock in</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1 text-[10.5px] font-mono">
                    <div className="flex justify-between p-1.5 bg-white/60/60 rounded">
                      <span className="text-amber-700">Rank #1</span>
                      <span className="text-amber-700 font-bold">+100,000</span>
                    </div>
                    <div className="flex justify-between p-1.5 bg-white/60/60 rounded">
                      <span className="text-amber-700">Rank #2</span>
                      <span className="text-amber-700 font-bold">+75,000</span>
                    </div>
                    <div className="flex justify-between p-1.5 bg-white/60/60 rounded">
                      <span className="text-amber-700">Rank #3</span>
                      <span className="text-amber-700 font-bold">+50,000</span>
                    </div>
                    <div className="flex justify-between p-1.5 bg-white/60/60 rounded">
                      <span className="text-amber-700">Ranks #4–5</span>
                      <span className="text-amber-700 font-bold">+25,000</span>
                    </div>
                    <div className="flex justify-between p-1.5 bg-white/60/60 rounded col-span-2">
                      <span className="text-amber-700">Ranks #6–10</span>
                      <span className="text-amber-700 font-bold">+10,000</span>
                    </div>
                  </div>
                </div>
              </div>


            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER METRIC NOTE */}
      <div className="text-[10px] text-amber-600 border-t border-amber-200/60/40 pt-3 text-center leading-relaxed">
        Balances are secured with the central engine. Local storage holds wallet state safely.
      </div>

    </div>
  );
};
export default RewardDashboard;
