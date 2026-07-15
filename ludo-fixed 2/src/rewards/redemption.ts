/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RedemptionRequest, RewardStoreItem } from './types';
import { rewardEngine } from './rewardEngine';

/**
 * Initiates a new redemption request for a store item.
 */
export function redeemStoreItem(item: RewardStoreItem) {
  return rewardEngine.createRedemption(item.id, item.name, item.pointCost);
}

/**
 * Gets all active and historical redemptions.
 */
export function getAllRedemptions(): RedemptionRequest[] {
  return rewardEngine.getRedemptions();
}

/**
 * Gets count of pending redemptions.
 */
export function getPendingRedemptionsCount(): number {
  return rewardEngine.getRedemptions().filter(r => r.status === 'Pending').length;
}

/**
 * Admin simulation actions for user playground/testing purposes.
 */
export const redemptionSimulator = {
  approve(id: string): boolean {
    return rewardEngine.approveRedemption(id);
  },
  reject(id: string): boolean {
    return rewardEngine.rejectRedemption(id);
  },
  complete(id: string): boolean {
    return rewardEngine.completeRedemption(id);
  },
  cancel(id: string): boolean {
    return rewardEngine.cancelRedemption(id);
  }
};
