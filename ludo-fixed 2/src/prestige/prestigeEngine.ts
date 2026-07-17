/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  PrestigeState, 
  AchievementBadge, 
  PrestigeCrown, 
  PlayerTitle, 
  TournamentTrophy, 
  PrestigeRank, 
  PrestigeRankInfo 
} from './types';
import { PlayerStats, GameHistoryEntry, PlayerColor } from '../types';
import { eventBus } from '../experience/eventBus';
import { ExperienceEventType } from '../experience/types';
import { rewardEngine } from '../rewards/rewardEngine';

export const PRESTIGE_RANKS: PrestigeRankInfo[] = [
  { name: 'Bronze', minLevel: 1, color: 'text-amber-700', badgeEmoji: '🥉', bgGradient: 'from-amber-700/20 to-amber-900/35' },
  { name: 'Silver', minLevel: 3, color: 'text-slate-400', badgeEmoji: '🥈', bgGradient: 'from-slate-400/20 to-slate-600/35' },
  { name: 'Gold', minLevel: 6, color: 'text-yellow-400', badgeEmoji: '🥇', bgGradient: 'from-yellow-400/20 to-yellow-600/35' },
  { name: 'Platinum', minLevel: 10, color: 'text-teal-400', badgeEmoji: '💎', bgGradient: 'from-teal-400/20 to-teal-600/35' },
  { name: 'Diamond', minLevel: 15, color: 'text-sky-400', badgeEmoji: '🔮', bgGradient: 'from-sky-400/20 to-sky-600/35' },
  { name: 'Master', minLevel: 20, color: 'text-indigo-400', badgeEmoji: '👑', bgGradient: 'from-indigo-400/20 to-indigo-600/35' },
  { name: 'Grandmaster', minLevel: 25, color: 'text-rose-400', badgeEmoji: '🔱', bgGradient: 'from-rose-400/20 to-rose-600/35' },
  { name: 'Legend', minLevel: 30, color: 'text-violet-400', badgeEmoji: '☯', bgGradient: 'from-violet-400/25 to-fuchsia-600/40' },
];

export const DEFAULT_BADGES: AchievementBadge[] = [
  { id: 'first_victory', name: 'First Victory', description: 'Won your first Ludo Royale match', emoji: '🏆', category: 'wins', requirementType: 'wins_count', requirementValue: 1 },
  { id: 'ten_wins', name: 'Deca-Champion', description: 'Achieve 10 lifetime victories', emoji: '🎖', category: 'wins', requirementType: 'wins_count', requirementValue: 10 },
  { id: 'fifty_wins', name: 'Centurion Core', description: 'Achieve 50 lifetime victories', emoji: '🥇', category: 'wins', requirementType: 'wins_count', requirementValue: 50 },
  { id: 'hundred_wins', name: 'Ludo Overlord', description: 'Achieve 100 lifetime victories', emoji: '👑', category: 'wins', requirementType: 'wins_count', requirementValue: 100 },
  { id: 'capture_master', name: 'Capture Master', description: 'Captured 25 opponent tokens', emoji: '⚔', category: 'captures', requirementType: 'captures_count', requirementValue: 25 },
  { id: 'survivor', name: 'Survivor', description: 'Landed on safe cells 30 times', emoji: '🛡', category: 'defense', requirementType: 'safe_spot_count', requirementValue: 30 },
  { id: 'speed_runner', name: 'Speed Runner', description: 'Completed a token home path in record turns', emoji: '🚀', category: 'speed', requirementType: 'sixes_count', requirementValue: 15 },
  { id: 'tourney_qualifier', name: 'Tournament Contender', description: 'Qualified for Tournament Semis/Finals', emoji: '🎯', category: 'tournament', requirementType: 'tournament_qualified', requirementValue: 1 },
  { id: 'tourney_champion', name: 'Tournament Champion', description: 'Won the ultimate Weekly Tournament Cup', emoji: '👑', category: 'tournament', requirementType: 'tournament_won', requirementValue: 1 },
];

export const DEFAULT_CROWNS: PrestigeCrown[] = [
  { id: 'gold_crown', name: 'Royal Sovereign', description: 'A gleaming 24K gold crown for esteemed victors', emoji: '👑', requirement: 'Win 1 match' },
  { id: 'diamond_crown', name: 'Grand Monarch', description: 'Embedded with pure celestial diamond crystals', emoji: '💎', requirement: 'Reach a 5-win streak' },
  { id: 'tourney_crown', name: 'Imperial Emperor', description: 'The absolute ruler of Ludo tournaments', emoji: '🔱', requirement: 'Win a Weekly Tournament' },
];

export const DEFAULT_TITLES: PlayerTitle[] = [
  { id: 'title_champ', name: 'Champion', description: 'For those who have tasted sweet victory', requirement: 'Win 1 match' },
  { id: 'title_veteran', name: 'Veteran', description: 'A seasoned player of the board', requirement: 'Play 15 matches' },
  { id: 'title_strategist', name: 'Strategist', description: 'Master of clever flanking and safe tactics', requirement: 'Capture 10 opponent tokens' },
  { id: 'title_conqueror', name: 'Conqueror', description: 'An absolute force on the boards', requirement: 'Win 10 matches' },
  { id: 'title_master', name: 'Master', description: 'Command respect with supreme knowledge', requirement: 'Reach Player Level 10' },
  { id: 'title_tourney_champ', name: 'Grand Emperor', description: 'Winner of the Grand Tournament bracket', requirement: 'Win a tournament' },
];

class PrestigeEngine {
  private static instance: PrestigeEngine;
  private state: PrestigeState;
  private isEvaluating = false;

  private constructor() {
    this.state = this.loadState();
    this.setupEventListeners();
  }

  public static getInstance(): PrestigeEngine {
    if (!PrestigeEngine.instance) {
      PrestigeEngine.instance = new PrestigeEngine();
    }
    return PrestigeEngine.instance;
  }

  /**
   * Returns current active prestige state
   */
  public getState(): PrestigeState {
    return { ...this.state };
  }

  /**
   * Helper to fetch current Rank details based on Level
   */
  public getRankInfo(level: number): PrestigeRankInfo {
    let activeRank = PRESTIGE_RANKS[0];
    for (const r of PRESTIGE_RANKS) {
      if (level >= r.minLevel) {
        activeRank = r;
      }
    }
    return activeRank;
  }

  /**
   * Load prestige state from local storage and align with actual player level
   */
  private loadState(): PrestigeState {
    const defaultState: PrestigeState = {
      level: 1,
      xp: 0,
      winStreak: 0,
      highestWinStreak: 0,
      unlockedBadgeIds: [],
      unlockedCrownIds: [],
      unlockedTitleIds: [],
      unlockedTrophyIds: [],
      selectedCrownId: 'gold_crown',
    };

    try {
      const stored = localStorage.getItem('ludo_prestige_state');
      const level = parseInt(localStorage.getItem('ludo_player_level') || '1', 10);
      const xp = parseInt(localStorage.getItem('ludo_player_xp') || '0', 10);

      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultState,
          ...parsed,
          level,
          xp
        };
      }
      return {
        ...defaultState,
        level,
        xp
      };
    } catch {
      return defaultState;
    }
  }

  /**
   * Persists state to local storage
   */
  private saveState() {
    try {
      localStorage.setItem('ludo_prestige_state', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save prestige state to localStorage', e);
    }
  }

  /**
   * Setup event listeners to automatically listen to gameplay triggers and award XP in real-time
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Listen to DICE_SIX
    eventBus.subscribe(ExperienceEventType.DICE_SIX, (event) => {
      const activeHumanColor = localStorage.getItem('ludo_human_color');
      if (activeHumanColor && event.payload.playerColor === activeHumanColor) {
        this.awardXP(10, 'Rolled a Six 🎲');
      }
    });

    // Listen to TOKEN_CAPTURED
    eventBus.subscribe(ExperienceEventType.TOKEN_CAPTURED, (event) => {
      const activeHumanColor = localStorage.getItem('ludo_human_color');
      if (activeHumanColor && event.payload.capturingColor === activeHumanColor) {
        this.awardXP(25, 'Captured Opponent Token ⚔️');
        this.incrementRealtimeStat('totalCaptures');
      }
    });

    // Listen to MATCH_WON
    eventBus.subscribe(ExperienceEventType.MATCH_WON, (event) => {
      const activeHumanColor = localStorage.getItem('ludo_human_color');
      if (activeHumanColor && event.payload.playerColor === activeHumanColor) {
        this.awardXP(500, 'Match Victory 🏆');
        this.incrementRealtimeStat('gamesWon');
        this.incrementRealtimeStat('gamesPlayed');
        this.evaluateAchievementsRealtime(true, true);
      }
    });

    // Listen to MATCH_LOST
    eventBus.subscribe(ExperienceEventType.MATCH_LOST, (event) => {
      const activeHumanColor = localStorage.getItem('ludo_human_color');
      if (activeHumanColor && event.payload.playerColor === activeHumanColor) {
        this.awardXP(100, 'Match Completed 🤝');
        this.incrementRealtimeStat('gamesPlayed');
        this.evaluateAchievementsRealtime(true, false);
      }
    });

    // Listen to TOURNAMENT_QUALIFIED
    eventBus.subscribe(ExperienceEventType.TOURNAMENT_QUALIFIED, (event) => {
      this.awardXP(2000, 'Tournament Qualified 🎯');
    });

    // Listen to TOURNAMENT_CHAMPION
    eventBus.subscribe(ExperienceEventType.TOURNAMENT_CHAMPION, (event) => {
      this.awardXP(2000, 'Tournament Champion 👑');
    });
  }

  /**
   * Helper to increment a stat inside localStorage in real-time
   */
  private incrementRealtimeStat(key: 'totalCaptures' | 'gamesWon' | 'gamesPlayed') {
    try {
      const statsStr = localStorage.getItem('ludo_stats');
      if (statsStr) {
        const stats = JSON.parse(statsStr);
        if (stats[key] !== undefined) {
          stats[key] += 1;
          localStorage.setItem('ludo_stats', JSON.stringify(stats));
        }
      }
    } catch (e) {
      console.error('Error incrementing real-time stat:', e);
    }
  }

  /**
   * Progressive cumulative XP thresholds for leveling up
   */
  public getNextLevelThreshold(level: number): number {
    let threshold = 0;
    for (let i = 1; i <= level; i++) {
      threshold += 1000 + (i - 1) * 500;
    }
    return threshold;
  }

  /**
   * Increments and awards player experience, triggering level ups and notifications
   */
  public awardXP(amount: number, reason: string): void {
    if (amount <= 0) return;

    let currentXp = this.state.xp;
    let currentLvl = this.state.level;

    currentXp += amount;
    this.state.xp = currentXp;

    // Emit XP_GAINED event
    eventBus.emit(ExperienceEventType.XP_GAINED, {
      amount,
      reason,
      totalXp: currentXp
    });

    let leveledUp = false;
    while (currentXp >= this.getNextLevelThreshold(currentLvl)) {
      currentLvl += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      this.state.level = currentLvl;

      // Award point bonus upon level up (e.g. 500 Points * Level)
      const pointsReward = currentLvl * 500;
      try {
        rewardEngine.awardPoints(pointsReward, `Level Up to ${currentLvl} Bonus 🎁`);
      } catch (err) {
        console.warn('Error awarding level up points bonus:', err);
      }

      // Check and auto-unlock Level 10 title requirement
      if (currentLvl >= 10 && !this.state.unlockedTitleIds.includes('title_master')) {
        this.state.unlockedTitleIds.push('title_master');
      }

      // Emit LEVEL_UP event
      eventBus.emit(ExperienceEventType.LEVEL_UP, {
        level: currentLvl,
        rewards: {
          points: pointsReward,
          title: currentLvl >= 10 ? 'Master' : undefined
        }
      });
    }

    localStorage.setItem('ludo_player_xp', this.state.xp.toString());
    localStorage.setItem('ludo_player_level', this.state.level.toString());
    this.saveState();

    // Re-evaluate achievements with the updated level/XP/state
    this.evaluateAchievementsRealtime(false, false);
  }

  /**
   * Real-time achievement evaluation from stats and history
   */
  public evaluateAchievementsRealtime(
    isMatchEnd = false,
    isWinner = false,
    customStats?: PlayerStats,
    customHistory?: GameHistoryEntry[]
  ): void {
    if (this.isEvaluating) return;
    this.isEvaluating = true;

    try {
      let stats: PlayerStats | null = customStats || null;
      let history: GameHistoryEntry[] = customHistory || [];

      if (!stats) {
        const statsStr = localStorage.getItem('ludo_stats');
        if (statsStr) {
          stats = JSON.parse(statsStr);
        }
      }

      if (history.length === 0) {
        const historyStr = localStorage.getItem('ludo_history');
        if (historyStr) {
          history = JSON.parse(historyStr);
        }
      }

      if (stats) {
        this.evaluateNewUnlocks(stats, history, isWinner, undefined, isMatchEnd);
      }
    } catch (e) {
      console.error('Error in evaluateAchievementsRealtime:', e);
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Evaluate and unlock achievements automatically based on stats, history, and active event
   */
  public evaluateNewUnlocks(
    stats: PlayerStats, 
    history: GameHistoryEntry[], 
    isWinner: boolean,
    hasCapturedCountInMatch?: number,
    isMatchEnd = true
  ): {
    newBadges: AchievementBadge[];
    newCrowns: PrestigeCrown[];
    newTitles: PlayerTitle[];
    rankUpgraded: boolean;
    streakIncreased: boolean;
  } {
    const prevUnlockedBadges = new Set(this.state.unlockedBadgeIds);
    const prevUnlockedCrowns = new Set(this.state.unlockedCrownIds);
    const prevUnlockedTitles = new Set(this.state.unlockedTitleIds);
    const prevRank = this.getRankInfo(this.state.level);

    // 1. Evaluate level-based attributes
    const currentLvl = this.state.level;
    const newRank = this.getRankInfo(currentLvl);
    const rankUpgraded = newRank.name !== prevRank.name;

    // 2. Evaluate win streak
    let streakIncreased = false;
    if (isMatchEnd) {
      if (isWinner) {
        const prevStreak = this.state.winStreak;
        this.state.winStreak += 1;
        this.state.highestWinStreak = Math.max(this.state.highestWinStreak, this.state.winStreak);
        if (this.state.winStreak > prevStreak) {
          streakIncreased = true;
        }
      } else {
        this.state.winStreak = 0;
      }
    }

    // 3. Evaluate Badges automatically
    const tournamentRound = parseInt(localStorage.getItem('ludo_tournament_round') || '0', 10);
    const tournamentResult = localStorage.getItem('ludo_tournament_result');

    const newlyUnlockedBadges: AchievementBadge[] = [];
    DEFAULT_BADGES.forEach(badge => {
      if (prevUnlockedBadges.has(badge.id)) return;

      let meetsRequirement = false;
      switch (badge.requirementType) {
        case 'wins_count':
          meetsRequirement = stats.gamesWon >= badge.requirementValue;
          break;
        case 'captures_count':
          meetsRequirement = stats.totalCaptures >= badge.requirementValue;
          break;
        case 'streak_count':
          meetsRequirement = this.state.highestWinStreak >= badge.requirementValue;
          break;
        case 'safe_spot_count':
          meetsRequirement = stats.totalTokensFinished >= badge.requirementValue / 6 || stats.totalRolls >= 250; // Approximations
          break;
        case 'sixes_count':
          meetsRequirement = stats.totalSixes >= badge.requirementValue;
          break;
        case 'tournament_qualified':
          meetsRequirement = tournamentRound >= 2 || tournamentResult === 'win';
          break;
        case 'tournament_won':
          meetsRequirement = tournamentRound === 4 || tournamentResult === 'win';
          break;
      }

      if (meetsRequirement) {
        badge.unlockedAt = new Date().toLocaleDateString();
        this.state.unlockedBadgeIds.push(badge.id);
        newlyUnlockedBadges.push(badge);

        // Emit celebration event for Badge Unlock
        eventBus.emit(ExperienceEventType.ACHIEVEMENT_UNLOCKED, {
          achievementId: badge.id,
          name: badge.name,
          description: badge.description,
          reward: '2,000 XP & 500 Points 🪙',
          badgeUnlocked: badge.emoji + ' ' + badge.name
        });

        // Award generous XP and points for achieving a badge!
        setTimeout(() => {
          this.awardXP(2000, `Unlocked Badge: ${badge.name} 🎖`);
          try {
            rewardEngine.awardPoints(500, `Unlocked Badge: ${badge.name} 🎖`);
          } catch {}
        }, 50);
      }
    });

    // 4. Evaluate Crowns automatically
    const newlyUnlockedCrowns: PrestigeCrown[] = [];
    DEFAULT_CROWNS.forEach(crown => {
      if (prevUnlockedCrowns.has(crown.id)) return;

      let meetsRequirement = false;
      if (crown.id === 'gold_crown') {
        meetsRequirement = stats.gamesWon >= 1;
      } else if (crown.id === 'diamond_crown') {
        meetsRequirement = this.state.highestWinStreak >= 5;
      } else if (crown.id === 'tourney_crown') {
        meetsRequirement = tournamentRound === 4 || tournamentResult === 'win';
      }

      if (meetsRequirement) {
        crown.unlockedAt = new Date().toLocaleDateString();
        this.state.unlockedCrownIds.push(crown.id);
        newlyUnlockedCrowns.push(crown);
      }
    });

    // Set active crown default if none selected
    if (!this.state.selectedCrownId && this.state.unlockedCrownIds.length > 0) {
      this.state.selectedCrownId = this.state.unlockedCrownIds[0];
    }

    // 5. Evaluate Titles automatically
    const newlyUnlockedTitles: PlayerTitle[] = [];
    DEFAULT_TITLES.forEach(title => {
      if (prevUnlockedTitles.has(title.id)) return;

      let meetsRequirement = false;
      switch (title.id) {
        case 'title_champ':
          meetsRequirement = stats.gamesWon >= 1;
          break;
        case 'title_veteran':
          meetsRequirement = stats.gamesPlayed >= 15;
          break;
        case 'title_strategist':
          meetsRequirement = stats.totalCaptures >= 10;
          break;
        case 'title_conqueror':
          meetsRequirement = stats.gamesWon >= 10;
          break;
        case 'title_master':
          meetsRequirement = currentLvl >= 10;
          break;
        case 'title_tourney_champ':
          meetsRequirement = tournamentRound === 4 || tournamentResult === 'win';
          break;
      }

      if (meetsRequirement) {
        title.unlockedAt = new Date().toLocaleDateString();
        this.state.unlockedTitleIds.push(title.id);
        newlyUnlockedTitles.push(title);
      }
    });

    // Set active title default if none selected
    if (!this.state.selectedTitleId && this.state.unlockedTitleIds.length > 0) {
      this.state.selectedTitleId = this.state.unlockedTitleIds[0];
    }

    this.saveState();

    return {
      newBadges: newlyUnlockedBadges,
      newCrowns: newlyUnlockedCrowns,
      newTitles: newlyUnlockedTitles,
      rankUpgraded,
      streakIncreased,
    };
  }

  /**
   * Set user preferred active crown
   */
  public selectCrown(crownId: string) {
    if (this.state.unlockedCrownIds.includes(crownId)) {
      this.state.selectedCrownId = crownId;
      this.saveState();
      try {
        eventBus.emit(ExperienceEventType.SUCCESS, { message: '👑 New Crown equipped successfully!' });
      } catch {}
    }
  }

  /**
   * Set user preferred active title
   */
  public selectTitle(titleId: string) {
    if (this.state.unlockedTitleIds.includes(titleId)) {
      this.state.selectedTitleId = titleId;
      this.saveState();
      try {
        eventBus.emit(ExperienceEventType.SUCCESS, { message: '🎖 Title updated successfully!' });
      } catch {}
    }
  }

  /**
   * Resets all unlocked achievements and streaks (for resets)
   */
  public resetPrestige() {
    this.state = {
      level: 1,
      xp: 0,
      winStreak: 0,
      highestWinStreak: 0,
      unlockedBadgeIds: [],
      unlockedCrownIds: [],
      unlockedTitleIds: [],
      unlockedTrophyIds: [],
      selectedCrownId: undefined,
      selectedTitleId: undefined,
    };
    this.saveState();
  }
}

export const prestigeEngine = PrestigeEngine.getInstance();
export default prestigeEngine;
