/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoinTransaction } from './types';
import { rewardEngine } from './rewardEngine';

/**
 * Formats an ISO date string (YYYY-MM-DD) into a friendly string like "Today", "Yesterday", or "Month DD, YYYY"
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      // Format as "MMM DD, YYYY"
      const date = new Date(`${dateStr}T12:00:00`);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (e) {
    return dateStr;
  }
}

/**
 * Returns transaction history grouped by readable dates.
 */
export function getGroupedTransactionHistory(): Record<string, CoinTransaction[]> {
  const transactions = rewardEngine.getHistory();
  const grouped: Record<string, CoinTransaction[]> = {};

  // Transactions are already sorted descending in storage, so we just group them
  for (const tx of transactions) {
    const friendlyDate = formatFriendlyDate(tx.date);
    if (!grouped[friendlyDate]) {
      grouped[friendlyDate] = [];
    }
    grouped[friendlyDate].push(tx);
  }

  return grouped;
}
