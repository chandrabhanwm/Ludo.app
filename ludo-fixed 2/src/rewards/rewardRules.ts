/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RewardRules, RewardStoreItem } from './types';

export const DEFAULT_REWARD_RULES: RewardRules = {
  matchWin: 500,
  matchLoss: 100,
  tournamentQualification: 2000,
  tournamentChampion: 20000,
  weeklyContestRank1: 100000,
  weeklyContestRank2: 75000,
  weeklyContestRank3: 50000,
  weeklyContestRank4to5: 25000,
  weeklyContestRank6to10: 10000,
};

export const DEFAULT_REWARD_STORE_ITEMS: RewardStoreItem[] = [
  {
    id: 'diamond-frame',
    name: 'Diamond Prestige Frame',
    image: 'Diamond',
    pointCost: 10000,
    details: 'Exclusive sparkling diamond frame around your avatar. Permanent unlock — visible every time you open the app.',
  },
  {
    id: 'xp-boost-2x',
    name: '2× XP Boost',
    image: 'Sparkles',
    pointCost: 2000,
    details: 'Double your XP earnings for 2 hours. Level up faster!',
    comingSoon: true,
  },
  {
    id: 'gold-crown',
    name: 'Gold Crown Badge',
    image: 'Crown',
    pointCost: 3000,
    details: 'Unlock an exclusive Gold Crown displayed on your profile.',
    comingSoon: true,
  },
  {
    id: 'cosmic-theme',
    name: 'Cosmic Board Theme',
    image: 'Star',
    pointCost: 5000,
    details: 'Unlock the Cosmic board skin for a premium game experience.',
    comingSoon: true,
  },
  {
    id: 'lucky-dice',
    name: 'Lucky Dice Skin',
    image: 'Dice',
    pointCost: 8000,
    details: 'A special animated dice skin shown only to you during rolls.',
    comingSoon: true,
  },
  {
    id: 'ludo-legend-title',
    name: 'Ludo Legend Title',
    image: 'Award',
    pointCost: 4000,
    details: 'Equip the exclusive "Ludo Legend" title on your profile.',
    comingSoon: true,
  },
];
