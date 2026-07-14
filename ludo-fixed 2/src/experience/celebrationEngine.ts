import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

export class CelebrationEngine implements ISubEngine {
  private config!: ExperienceConfig;
  private activeCelebration: any = null;

  public init(config: ExperienceConfig): void {
    this.config = config;
    console.log('[CelebrationEngine] Initialized');
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[CelebrationEngine] Config updated:', this.config);
  }

  /**
   * Listen for major milestone/victory events to begin full scale celebratory sequences
   */
  public handleEvent(event: ExperienceEvent): void {
    switch (event.type) {
      case ExperienceEventType.MATCH_WON: {
        const payload = (event as ExperienceEvent<ExperienceEventType.MATCH_WON>).payload;
        this.startCelebration('match_victory', payload);
        break;
      }
      case ExperienceEventType.TOURNAMENT_QUALIFIED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOURNAMENT_QUALIFIED>).payload;
        this.startCelebration('tournament_qualify', payload);
        break;
      }
      case ExperienceEventType.TOURNAMENT_CHAMPION: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOURNAMENT_CHAMPION>).payload;
        this.startCelebration('grand_champion', payload);
        break;
      }
      case ExperienceEventType.ACHIEVEMENT_UNLOCKED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.ACHIEVEMENT_UNLOCKED>).payload;
        this.startCelebration('achievement_banner', payload);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Triggers the celebration logic
   */
  public startCelebration(type: string, payload: any): void {
    if (this.config.reducedMotion) {
      console.log(`[CelebrationEngine] Celebration "${type}" bypassed due to reducedMotion`);
      return;
    }

    // Placeholder: Future complex overlay sequence with confetti emitters & full screen modals
    console.log(`[CelebrationEngine] Future Celebration: Triggering "${type}" with details ${JSON.stringify(payload)}`);
  }

  public destroy(): void {
    this.activeCelebration = null;
    console.log('[CelebrationEngine] Destroyed');
  }
}

export const celebrationEngine = new CelebrationEngine();
export default celebrationEngine;
