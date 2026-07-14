/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallet, CoinTransaction, RewardRules, RedemptionRequest, RewardStoreItem } from './types';
import { DEFAULT_REWARD_RULES, DEFAULT_REWARD_STORE_ITEMS } from './rewardRules';

// Define keys used for LocalStorage persistence
const KEYS = {
  WALLET: 'ludo_reward_wallet',
  RULES: 'ludo_reward_rules',
  TRANSACTIONS: 'ludo_reward_transactions',
  STORE_ITEMS: 'ludo_reward_store_items',
  REDEMPTIONS: 'ludo_reward_redemptions',
};

export interface IRewardStorage {
  getPoints(): Wallet;
  saveWallet(wallet: Wallet): void;
  getRules(): RewardRules;
  saveRules(rules: RewardRules): void;
  getTransactions(): CoinTransaction[];
  saveTransactions(transactions: CoinTransaction[]): void;
  getStoreItems(): RewardStoreItem[];
  saveStoreItems(items: RewardStoreItem[]): void;
  getRedemptions(): RedemptionRequest[];
  saveRedemptions(redemptions: RedemptionRequest[]): void;
}

/**
 * LocalStorage implementation of our reward storage adapter.
 * For future Firebase migration, replace this implementation
 * with one that reads/writes to Firestore.
 */
class LocalRewardStorage implements IRewardStorage {
  getPoints(): Wallet {
    const data = localStorage.getItem(KEYS.WALLET);
    if (data) {
      try {
        const wallet = JSON.parse(data);
        // Recalculate available just in case to maintain system integrity
        wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;
        return wallet;
      } catch (e) {
        console.error('Error parsing wallet data', e);
      }
    }
    // Initialize default wallet with some starting points (e.g., 2500 for a warm onboarding experience)
    const defaultWallet: Wallet = {
      currentPoints: 2500,
      reservedPoints: 0,
      availablePoints: 2500,
      lifetimePointsEarned: 2500,
      lifetimePointsRedeemed: 0,
    };
    this.saveWallet(defaultWallet);
    return defaultWallet;
  }

  saveWallet(wallet: Wallet): void {
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;
    localStorage.setItem(KEYS.WALLET, JSON.stringify(wallet));
  }

  getRules(): RewardRules {
    const data = localStorage.getItem(KEYS.RULES);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing rules data', e);
      }
    }
    return DEFAULT_REWARD_RULES;
  }

  saveRules(rules: RewardRules): void {
    localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
  }

  getTransactions(): CoinTransaction[] {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing transactions data', e);
      }
    }
    // Setup initial onboarding credit
    const initialTx: CoinTransaction = {
      id: 'tx-welcome',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      reason: 'Welcome Bonus 🎁',
      type: 'credit',
      pointsAdded: 2500,
      pointsRemoved: 0,
      balanceAfter: 2500,
    };
    const txs = [initialTx];
    this.saveTransactions(txs);
    return txs;
  }

  saveTransactions(transactions: CoinTransaction[]): void {
    // Sort transactions by date and time in descending order (most recent first)
    const sorted = [...transactions].sort((a, b) => {
      const dtA = `${a.date}T${a.time}`;
      const dtB = `${b.date}T${b.time}`;
      return dtB.localeCompare(dtA);
    });
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(sorted));
  }

  getStoreItems(): RewardStoreItem[] {
    const data = localStorage.getItem(KEYS.STORE_ITEMS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing store items data', e);
      }
    }
    return DEFAULT_REWARD_STORE_ITEMS;
  }

  saveStoreItems(items: RewardStoreItem[]): void {
    localStorage.setItem(KEYS.STORE_ITEMS, JSON.stringify(items));
  }

  getRedemptions(): RedemptionRequest[] {
    const data = localStorage.getItem(KEYS.REDEMPTIONS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing redemptions data', e);
      }
    }
    return [];
  }

  saveRedemptions(redemptions: RedemptionRequest[]): void {
    localStorage.setItem(KEYS.REDEMPTIONS, JSON.stringify(redemptions));
  }
}

// Export a singleton storage service
export const rewardStorage: IRewardStorage = new LocalRewardStorage();
