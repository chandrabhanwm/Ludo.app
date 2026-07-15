/**
 * Firestore database service
 * All read/write operations for user data.
 * localStorage remains as fast local cache.
 * Firestore is the source of truth.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './config';
import { PlayerStats, GameHistoryEntry } from '../types';
import { Wallet } from '../rewards/types';
import { PrestigeState } from '../prestige/types';

// ── User Profile ────────────────────────────────────────────────
export const createOrUpdateUserProfile = async (
  user: User,
  isGuest: boolean
): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // First time — create profile
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || (isGuest ? 'Guest' : 'Player'),
      email: user.email || null,
      photoURL: user.photoURL || null,
      isGuest,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  } else {
    // Returning user — update last seen + upgrade guest if needed
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      ...(user.displayName && { displayName: user.displayName }),
      ...(user.photoURL && { photoURL: user.photoURL }),
      ...(user.email && { email: user.email }),
      isGuest,
    });
  }
};

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

// ── Stats ───────────────────────────────────────────────────────
export const saveStats = async (
  uid: string,
  stats: PlayerStats
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'stats', 'main'),
    {
      ...stats,
      winRate: stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const loadStats = async (uid: string): Promise<PlayerStats | null> => {
  const snap = await getDoc(doc(db, 'users', uid, 'stats', 'main'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    gamesPlayed: data.gamesPlayed || 0,
    gamesWon: data.gamesWon || 0,
    totalRolls: data.totalRolls || 0,
    totalSixes: data.totalSixes || 0,
    totalCaptures: data.totalCaptures || 0,
    totalCaptured: data.totalCaptured || 0,
    totalTokensFinished: data.totalTokensFinished || 0,
    highestRollStreak: data.highestRollStreak || 0,
  };
};

// ── Wallet / Points ─────────────────────────────────────────────
export const saveWallet = async (
  uid: string,
  wallet: Wallet
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'wallet', 'main'),
    {
      ...wallet,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const loadWallet = async (uid: string): Promise<Wallet | null> => {
  const snap = await getDoc(doc(db, 'users', uid, 'wallet', 'main'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    currentPoints: data.currentPoints || 0,
    reservedPoints: data.reservedPoints || 0,
    availablePoints: data.availablePoints || 0,
    lifetimePointsEarned: data.lifetimePointsEarned || 0,
    lifetimePointsRedeemed: data.lifetimePointsRedeemed || 0,
  };
};

// ── Prestige ────────────────────────────────────────────────────
export const savePrestige = async (
  uid: string,
  state: PrestigeState
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'prestige', 'main'),
    {
      ...state,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const loadPrestige = async (uid: string): Promise<PrestigeState | null> => {
  const snap = await getDoc(doc(db, 'users', uid, 'prestige', 'main'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    level: data.level || 1,
    xp: data.xp || 0,
    winStreak: data.winStreak || 0,
    highestWinStreak: data.highestWinStreak || 0,
    selectedCrownId: data.selectedCrownId,
    selectedTitleId: data.selectedTitleId,
    unlockedBadgeIds: data.unlockedBadgeIds || [],
    unlockedCrownIds: data.unlockedCrownIds || [],
    unlockedTitleIds: data.unlockedTitleIds || [],
    unlockedTrophyIds: data.unlockedTrophyIds || [],
  };
};

// ── Unlocked Rewards ────────────────────────────────────────────
export const saveUnlockedRewards = async (
  uid: string,
  rewardIds: string[]
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid, 'rewards', 'unlocked'),
    { rewardIds, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const loadUnlockedRewards = async (uid: string): Promise<string[]> => {
  const snap = await getDoc(doc(db, 'users', uid, 'rewards', 'unlocked'));
  if (!snap.exists()) return [];
  return snap.data().rewardIds || [];
};

// ── Game History ────────────────────────────────────────────────
export const saveGameHistory = async (
  uid: string,
  history: GameHistoryEntry[]
): Promise<void> => {
  // Store last 50 games only
  const recent = history.slice(-50);
  await setDoc(
    doc(db, 'users', uid, 'stats', 'history'),
    { games: recent, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const loadGameHistory = async (uid: string): Promise<GameHistoryEntry[]> => {
  const snap = await getDoc(doc(db, 'users', uid, 'stats', 'history'));
  if (!snap.exists()) return [];
  return snap.data().games || [];
};

// ── Leaderboard ─────────────────────────────────────────────────
export const updateLeaderboard = async (
  uid: string,
  displayName: string,
  photoURL: string | null,
  stats: PlayerStats,
  availablePoints: number
): Promise<void> => {
  await setDoc(
    doc(db, 'leaderboard', uid),
    {
      uid,
      displayName,
      photoURL: photoURL || null,
      totalWins: stats.gamesWon,
      totalGames: stats.gamesPlayed,
      totalPoints: availablePoints,
      winRate: stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getLeaderboard = async (limitCount = 50) => {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('totalWins', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── Full user data load on login ─────────────────────────────────
// Loads all user data from Firestore and syncs to localStorage
export const loadAndSyncUserData = async (uid: string): Promise<{
  stats: PlayerStats | null;
  wallet: Wallet | null;
  prestige: PrestigeState | null;
  unlockedRewards: string[];
  history: GameHistoryEntry[];
}> => {
  const [stats, wallet, prestige, unlockedRewards, history] = await Promise.all([
    loadStats(uid),
    loadWallet(uid),
    loadPrestige(uid),
    loadUnlockedRewards(uid),
    loadGameHistory(uid),
  ]);

  // Sync to localStorage as cache
  if (stats) {
    localStorage.setItem('ludo_stats', JSON.stringify(stats));
  }
  if (wallet) {
    localStorage.setItem('ludo_reward_wallet', JSON.stringify(wallet));
  }
  if (prestige) {
    localStorage.setItem('ludo_prestige_state', JSON.stringify(prestige));
    localStorage.setItem('ludo_player_level', prestige.level.toString());
    localStorage.setItem('ludo_player_xp', prestige.xp.toString());
  }
  if (unlockedRewards.length > 0) {
    localStorage.setItem('ludo_unlocked_rewards', JSON.stringify(unlockedRewards));
  }
  if (history.length > 0) {
    localStorage.setItem('ludo_history', JSON.stringify(history));
  }

  return { stats, wallet, prestige, unlockedRewards, history };
};
