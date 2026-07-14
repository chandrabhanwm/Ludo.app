/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallet } from './types';
import { rewardEngine } from './rewardEngine';

/**
 * Retrieves the current player wallet state.
 */
export function getPlayerWallet(): Wallet {
  return rewardEngine.getPoints();
}

/**
 * Checks if the wallet has a specific amount of available points.
 */
export function hasAvailableCoins(amount: number): boolean {
  return rewardEngine.getAvailableBalance() >= amount;
}

/**
 * Award points to player.
 */
export function rewardPlayerCoins(amount: number, reason: string): void {
  rewardEngine.awardPoints(amount, reason);
}
