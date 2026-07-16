/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Wallet {
  currentPoints: number;
  reservedPoints: number;
  availablePoints: number; // currentPoints - reservedPoints
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
}

export type TransactionType = 'credit' | 'debit' | 'reserve' | 'release' | 'finalize';

export interface CoinTransaction {
  id: string;
  date: string; // e.g., "YYYY-MM-DD"
  time: string; // e.g., "HH:MM:SS"
  reason: string; // e.g., "Match Win", "Reward Redemption", etc.
  type: TransactionType;
  pointsAdded: number;
  pointsRemoved: number;
  balanceAfter: number;
}

export interface RewardRules {
  matchWin: number;
  matchLoss: number;
  tournamentQualification: number;
  tournamentChampion: number;
  weeklyContestRank1: number;
  weeklyContestRank2: number;
  weeklyContestRank3: number;
  weeklyContestRank4to5: number;
  weeklyContestRank6to10: number;
}

export type RedemptionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';

export interface RedemptionRequest {
  id: string;
  rewardId: string;
  rewardName: string;
  pointCost: number;
  requestedDate: string; // e.g., "YYYY-MM-DD"
  status: RedemptionStatus;
  updatedDate?: string;
  rewardCode?: string; // Delivered code placeholder
}

export interface RewardStoreItem {
  id: string;
  name: string;
  image: string;
  pointCost: number;
  details: string;
  comingSoon?: boolean;
}
