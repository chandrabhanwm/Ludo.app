export { auth, db } from './config';
export {
  signInWithGoogle,
  signInAsGuest,
  upgradeGuestToGoogle,
  signOut,
  onAuthChange,
  getCurrentUser,
} from './auth';
export {
  createOrUpdateUserProfile,
  getUserProfile,
  saveStats,
  loadStats,
  saveWallet,
  loadWallet,
  savePrestige,
  loadPrestige,
  saveUnlockedRewards,
  loadUnlockedRewards,
  saveGameHistory,
  loadGameHistory,
  updateLeaderboard,
  getLeaderboard,
  loadAndSyncUserData,
} from './db';
