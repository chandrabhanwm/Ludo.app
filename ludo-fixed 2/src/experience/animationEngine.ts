import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

export class AnimationEngine implements ISubEngine {
  private config!: ExperienceConfig;
  private activeTweens: Map<string, any> = new Map();

  public init(config: ExperienceConfig): void {
    this.config = config;
    console.log('[AnimationEngine] Initialized with config:', this.config);
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[AnimationEngine] Config updated:', this.config);
  }

  /**
   * Handle animations based on incoming experience events
   */
  public handleEvent(event: ExperienceEvent): void {
    if (this.config.reducedMotion) {
      // Respect user's accessibility request for reduced motion
      return;
    }

    switch (event.type) {
      case ExperienceEventType.DICE_ROLLED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.DICE_ROLLED>).payload;
        this.animateDiceRoll(payload);
        break;
      }
      case ExperienceEventType.TOKEN_MOVED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOKEN_MOVED>).payload;
        this.animateTokenMove(payload);
        break;
      }
      case ExperienceEventType.TOKEN_SELECTED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOKEN_SELECTED>).payload;
        this.animateTokenSelect(payload);
        break;
      }
      default:
        // Other events can be handled or ignored by this engine
        break;
    }
  }

  private animateDiceRoll(payload: any): void {
    // Placeholder: Future implementations will trigger 3D/2D dice spin animations
    console.log(`[AnimationEngine] Future Animation: Spin dice for player ${payload.playerColor} with outcome ${payload.value}`);
  }

  private animateTokenMove(payload: any): void {
    // Placeholder: Future implementations will orchestrate smooth hopping transitions cell-by-cell
    console.log(`[AnimationEngine] Future Animation: Move token ${payload.tokenId} smoothly from ${payload.startPos} to ${payload.endPos}`);
  }

  private animateTokenSelect(payload: any): void {
    // Placeholder: Future implementations will trigger a pulse/bounce effect on select
    console.log(`[AnimationEngine] Future Animation: Pulse token ${payload.tokenId}`);
  }

  public destroy(): void {
    // Clean up active animations or timers
    this.activeTweens.clear();
    console.log('[AnimationEngine] Destroyed');
  }
}

export const animationEngine = new AnimationEngine();
export default animationEngine;
