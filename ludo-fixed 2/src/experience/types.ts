/**
 * Experience Engine Types & Configuration
 */

export enum ExperienceEventType {
  DICE_ROLLED = 'DICE_ROLLED',
  DICE_SIX = 'DICE_SIX',
  TOKEN_SELECTED = 'TOKEN_SELECTED',
  TOKEN_MOVED = 'TOKEN_MOVED',
  TOKEN_CAPTURED = 'TOKEN_CAPTURED',
  SAFE_CELL_REACHED = 'SAFE_CELL_REACHED',
  TOKEN_ENTERED_HOME = 'TOKEN_ENTERED_HOME',
  FINAL_TOKEN_HOME = 'FINAL_TOKEN_HOME',
  MATCH_WON = 'MATCH_WON',
  MATCH_LOST = 'MATCH_LOST',
  TOURNAMENT_QUALIFIED = 'TOURNAMENT_QUALIFIED',
  TOURNAMENT_CHAMPION = 'TOURNAMENT_CHAMPION',
  COINS_EARNED = 'COINS_EARNED',
  REWARD_REDEEMED = 'REWARD_REDEEMED',
  DAILY_REWARD = 'DAILY_REWARD',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  BUTTON_CLICK = 'BUTTON_CLICK',
  POPUP_OPEN = 'POPUP_OPEN',
  POPUP_CLOSE = 'POPUP_CLOSE',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  XP_GAINED = 'XP_GAINED',
  LEVEL_UP = 'LEVEL_UP'
}

export interface ExperienceEventPayloads {
  [ExperienceEventType.DICE_ROLLED]: { playerColor: string; value: number };
  [ExperienceEventType.DICE_SIX]: { playerColor: string };
  [ExperienceEventType.TOKEN_SELECTED]: { playerColor: string; tokenId: string };
  [ExperienceEventType.TOKEN_MOVED]: { playerColor: string; tokenId: string; startPos: number | 'yard'; endPos: number; isSafe: boolean };
  [ExperienceEventType.TOKEN_CAPTURED]: { capturingColor: string; capturedColor: string; tokenId: string; position: number };
  [ExperienceEventType.SAFE_CELL_REACHED]: { playerColor: string; tokenId: string; position: number };
  [ExperienceEventType.TOKEN_ENTERED_HOME]: { playerColor: string; tokenId: string };
  [ExperienceEventType.FINAL_TOKEN_HOME]: { playerColor: string; tokenId: string };
  [ExperienceEventType.MATCH_WON]: { playerColor: string; stats?: { turns: number; captures: number } };
  [ExperienceEventType.MATCH_LOST]: { playerColor: string };
  [ExperienceEventType.TOURNAMENT_QUALIFIED]: { tournamentId: string; rank: number };
  [ExperienceEventType.TOURNAMENT_CHAMPION]: { tournamentId: string; rewardAmount: number };
  [ExperienceEventType.COINS_EARNED]: { amount: number; source: string };
  [ExperienceEventType.REWARD_REDEEMED]: { rewardId: string; cost: number };
  [ExperienceEventType.DAILY_REWARD]: { dayCount: number; amount: number };
  [ExperienceEventType.ACHIEVEMENT_UNLOCKED]: { achievementId: string; name: string; description: string; reward?: string; badgeUnlocked?: string };
  [ExperienceEventType.BUTTON_CLICK]: { buttonId: string; context?: string };
  [ExperienceEventType.POPUP_OPEN]: { popupId: string };
  [ExperienceEventType.POPUP_CLOSE]: { popupId: string };
  [ExperienceEventType.SUCCESS]: { message: string };
  [ExperienceEventType.ERROR]: { code: string; message: string };
  [ExperienceEventType.XP_GAINED]: { amount: number; reason: string; totalXp: number };
  [ExperienceEventType.LEVEL_UP]: { level: number; rewards?: { points?: number; title?: string } };
}

export type AnimationIntensity = 'low' | 'medium' | 'high';
export type ParticleQuality = 'low' | 'medium' | 'high';

export interface ExperienceConfig {
  animationIntensity: AnimationIntensity;
  soundVolume: number; // 0.0 to 1.0
  particleQuality: ParticleQuality;
  reducedMotion: boolean;
  performanceMode: boolean;
  masterVolume?: number;
  musicVolume?: number;
  effectsVolume?: number;
  reducedAudioMode?: boolean;
}

export interface ExperienceEvent<T extends ExperienceEventType = ExperienceEventType> {
  type: T;
  payload: ExperienceEventPayloads[T];
  timestamp: number;
}

export type ExperienceEventListener<T extends ExperienceEventType> = (event: ExperienceEvent<T>) => void;

export interface ISubEngine {
  init(config: ExperienceConfig): void;
  updateConfig(config: Partial<ExperienceConfig>): void;
  destroy(): void;
}
