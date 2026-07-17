/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PrestigeRank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Legend';

export interface PrestigeRankInfo {
  name: PrestigeRank;
  minLevel: number;
  color: string;
  badgeEmoji: string;
  bgGradient: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'wins' | 'captures' | 'defense' | 'speed' | 'tournament' | 'special';
  requirementType: 'wins_count' | 'captures_count' | 'sixes_count' | 'streak_count' | 'safe_spot_count' | 'tournament_won' | 'tournament_qualified';
  requirementValue: number;
  unlockedAt?: string; // Date string
}

export interface PrestigeCrown {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requirement: string;
  unlockedAt?: string;
}

export interface PlayerTitle {
  id: string;
  name: string;
  description: string;
  requirement: string;
  unlockedAt?: string;
}

export interface TournamentTrophy {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt?: string;
  tournamentName: string;
}

export interface PrestigeState {
  level: number;
  xp: number;
  winStreak: number;
  highestWinStreak: number;
  selectedCrownId?: string;
  selectedTitleId?: string;
  unlockedBadgeIds: string[];
  unlockedCrownIds: string[];
  unlockedTitleIds: string[];
  unlockedTrophyIds: string[];
}
