/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallet, CoinTransaction, RewardRules, RedemptionRequest, RewardStoreItem, TransactionType } from './types';
import { rewardStorage } from './storage';

class RewardEngine {
  // Retrieve the player's wallet state
  getPoints(): Wallet {
    return rewardStorage.getPoints();
  }

  // Get the available balance of points (available = current - reserved)
  getAvailableBalance(): number {
    const wallet = this.getPoints();
    return wallet.currentPoints - wallet.reservedPoints;
  }

  // Award points (Credit)
  awardPoints(amount: number, reason: string): void {
    if (amount <= 0) return;

    const wallet = this.getPoints();
    wallet.currentPoints += amount;
    wallet.lifetimePointsEarned += amount;
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;

    rewardStorage.saveWallet(wallet);
    this.recordTransaction('credit', amount, 0, reason, wallet.currentPoints);
  }

  // Deduct points (Direct Debit, if applicable)
  deductCoins(amount: number, reason: string): boolean {
    if (amount <= 0) return false;

    const wallet = this.getPoints();
    const available = wallet.currentPoints - wallet.reservedPoints;

    if (available < amount) {
      return false; // Insufficient available funds
    }

    wallet.currentPoints -= amount;
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;

    rewardStorage.saveWallet(wallet);
    this.recordTransaction('debit', 0, amount, reason, wallet.currentPoints);
    return true;
  }

  // Reserve points (e.g. during a pending redemption)
  reserveCoins(amount: number): boolean {
    if (amount <= 0) return false;

    const wallet = this.getPoints();
    const available = wallet.currentPoints - wallet.reservedPoints;

    if (available < amount) {
      return false;
    }

    wallet.reservedPoints += amount;
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;

    rewardStorage.saveWallet(wallet);
    return true;
  }

  // Release reserved points back to available balance
  releaseReservedCoins(amount: number): void {
    if (amount <= 0) return;

    const wallet = this.getPoints();
    wallet.reservedPoints = Math.max(0, wallet.reservedPoints - amount);
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;

    rewardStorage.saveWallet(wallet);
  }

  // Helper to record a transaction in the history log
  recordTransaction(
    type: TransactionType,
    pointsAdded: number,
    pointsRemoved: number,
    reason: string,
    balanceAfter: number
  ): void {
    const txs = rewardStorage.getTransactions();
    
    const newTx: CoinTransaction = {
      id: `tx-${Math.random().toString(36).substring(2, 11)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      reason,
      type,
      pointsAdded,
      pointsRemoved,
      balanceAfter: balanceAfter,
    };

    txs.push(newTx);
    rewardStorage.saveTransactions(txs);
  }

  // Get full sorted transaction history
  getHistory(): CoinTransaction[] {
    return rewardStorage.getTransactions();
  }

  // Get configurable rules
  getRules(): RewardRules {
    return rewardStorage.getRules();
  }

  // Get store items
  getStoreItems(): RewardStoreItem[] {
    return rewardStorage.getStoreItems();
  }

  // Get all redemption requests
  getRedemptions(): RedemptionRequest[] {
    return rewardStorage.getRedemptions();
  }

  // --- REDEMPTION FLOW ---

  // STEP 1 & 2 & 3: Create a pending redemption request and reserve points
  createRedemption(rewardId: string, rewardName: string, cost: number): { success: boolean; message: string; redemption?: RedemptionRequest } {
    // Prevent duplicate pending requests for the same reward
    const redemptions = this.getRedemptions();
    const hasPending = redemptions.some(r => r.rewardId === rewardId && r.status === 'Pending');
    if (hasPending) {
      return {
        success: false,
        message: 'You already have a pending redemption request for this reward.',
      };
    }

    const available = this.getAvailableBalance();

    if (available < cost) {
      return {
        success: false,
        message: `Insufficient balance! You need ${cost.toLocaleString()} points, but you only have ${available.toLocaleString()} available.`,
      };
    }

    // 1. Reserve the points first (decreases availablePoints, keeps currentPoints the same)
    const reserved = this.reserveCoins(cost);
    if (!reserved) {
      return { success: false, message: 'Could not reserve points. Action failed.' };
    }

    // 2. Create and persist redemption request
    const currentRedemptions = rewardStorage.getRedemptions();
    const newRequest: RedemptionRequest = {
      id: `req-${Math.random().toString(36).substring(2, 11)}`,
      rewardId,
      rewardName,
      pointCost: cost,
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
    };

    currentRedemptions.push(newRequest);
    rewardStorage.saveRedemptions(currentRedemptions);

    // Record a transaction for reservation transparency
    this.recordTransaction(
      'reserve',
      0,
      cost,
      `Reserved for ${rewardName}`,
      this.getPoints().currentPoints
    );

    return {
      success: true,
      message: `Redemption requested successfully! ${cost.toLocaleString()} points have been reserved.`,
      redemption: newRequest,
    };
  }

  // STEP 5: Approve Redemption (Deduct permanently, decrease reservation)
  approveRedemption(redemptionId: string): boolean {
    const redemptions = rewardStorage.getRedemptions();
    const idx = redemptions.findIndex(r => r.id === redemptionId);

    if (idx === -1 || redemptions[idx].status !== 'Pending') {
      return false;
    }

    const req = redemptions[idx];
    const wallet = this.getPoints();

    // 1. Decrease reserved points
    wallet.reservedPoints = Math.max(0, wallet.reservedPoints - req.pointCost);
    // 2. Deduct from currentPoints permanently
    wallet.currentPoints = Math.max(0, wallet.currentPoints - req.pointCost);
    // 3. Add to lifetime redeemed
    wallet.lifetimePointsRedeemed += req.pointCost;
    wallet.availablePoints = wallet.currentPoints - wallet.reservedPoints;

    rewardStorage.saveWallet(wallet);

    // 4. Update status
    req.status = 'Approved';
    req.updatedDate = new Date().toISOString().split('T')[0];
    rewardStorage.saveRedemptions(redemptions);

    // 5. Record a permanent Debit transaction
    this.recordTransaction(
      'finalize',
      0,
      req.pointCost,
      `Redemption Approved: ${req.rewardName}`,
      wallet.currentPoints
    );

    return true;
  }

  // STEP 5: Reject Redemption (Return reserved points to available balance)
  rejectRedemption(redemptionId: string): boolean {
    const redemptions = rewardStorage.getRedemptions();
    const idx = redemptions.findIndex(r => r.id === redemptionId);

    if (idx === -1 || redemptions[idx].status !== 'Pending') {
      return false;
    }

    const req = redemptions[idx];

    // 1. Release reserved points
    this.releaseReservedCoins(req.pointCost);

    // 2. Update status
    req.status = 'Rejected';
    req.updatedDate = new Date().toISOString().split('T')[0];
    rewardStorage.saveRedemptions(redemptions);

    // 3. Record transaction log
    this.recordTransaction(
      'release',
      req.pointCost,
      0,
      `Redemption Rejected (Refunded): ${req.rewardName}`,
      this.getPoints().currentPoints
    );

    return true;
  }

  // STEP 5: Complete Redemption (Mark completed and deliver a mock reward code)
  completeRedemption(redemptionId: string): boolean {
    const redemptions = rewardStorage.getRedemptions();
    const idx = redemptions.findIndex(r => r.id === redemptionId);

    if (idx === -1) {
      return false;
    }

    const req = redemptions[idx];
    if (req.status !== 'Approved' && req.status !== 'Pending') {
      return false;
    }

    // If it was still Pending, finalize the deduction first
    if (req.status === 'Pending') {
      const approved = this.approveRedemption(redemptionId);
      if (!approved) return false;
      // Fetch latest requests
      return this.completeRedemption(redemptionId);
    }

    // Deliver mock reward code
    const codes = ['AMZN', 'DOMS', 'FKRT'];
    const prefix = codes[Math.floor(Math.random() * codes.length)];
    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    req.rewardCode = `${prefix}-${randPart1}-${randPart2}`;

    req.status = 'Completed';
    req.updatedDate = new Date().toISOString().split('T')[0];
    rewardStorage.saveRedemptions(redemptions);

    // 3. Record transaction log for completed reward delivery
    this.recordTransaction(
      'finalize',
      0,
      0,
      `Reward Delivered: ${req.rewardName} (Completed)`,
      this.getPoints().currentPoints
    );

    return true;
  }

  // STEP 5: Cancel Redemption (User-driven cancellation before approval)
  cancelRedemption(redemptionId: string): boolean {
    const redemptions = rewardStorage.getRedemptions();
    const idx = redemptions.findIndex(r => r.id === redemptionId);

    if (idx === -1 || redemptions[idx].status !== 'Pending') {
      return false;
    }

    const req = redemptions[idx];

    // 1. Release reserved points
    this.releaseReservedCoins(req.pointCost);

    // 2. Update status
    req.status = 'Cancelled';
    req.updatedDate = new Date().toISOString().split('T')[0];
    rewardStorage.saveRedemptions(redemptions);

    // 3. Record transaction log
    this.recordTransaction(
      'release',
      req.pointCost,
      0,
      `Redemption Cancelled (Refunded): ${req.rewardName}`,
      this.getPoints().currentPoints
    );

    return true;
  }
}

export const rewardEngine = new RewardEngine();
export default rewardEngine;

// ── UNLOCK SYSTEM ──
// Stores unlocked reward items in localStorage
export const unlockReward = (itemId: string): void => {
  try {
    const existing = JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]') as string[];
    if (!existing.includes(itemId)) {
      existing.push(itemId);
      localStorage.setItem('ludo_unlocked_rewards', JSON.stringify(existing));
    }
  } catch { /* silent */ }
};

export const isRewardUnlocked = (itemId: string): boolean => {
  try {
    const existing = JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]') as string[];
    return existing.includes(itemId);
  } catch { return false; }
};

export const getUnlockedRewards = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('ludo_unlocked_rewards') || '[]') as string[];
  } catch { return []; }
};
