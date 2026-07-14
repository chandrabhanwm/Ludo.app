import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

export class ParticleEngine implements ISubEngine {
  private config!: ExperienceConfig;
  private activeEmitters: Set<any> = new Set();

  public init(config: ExperienceConfig): void {
    this.config = config;
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Spawns particle systems based on game milestones
   */
  public handleEvent(event: ExperienceEvent): void {
    if (this.config.performanceMode || this.config.reducedMotion) {
      // Disable particle systems entirely on ultra performance mode or reduced motion
      return;
    }

    switch (event.type) {
      case ExperienceEventType.TOKEN_CAPTURED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOKEN_CAPTURED>).payload;
        this.spawnBurst(payload.position, 'clash_burst');
        break;
      }
      case ExperienceEventType.SAFE_CELL_REACHED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.SAFE_CELL_REACHED>).payload;
        this.spawnBurst(payload.position, 'gold_sparkles');
        break;
      }
      case ExperienceEventType.TOKEN_ENTERED_HOME: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOKEN_ENTERED_HOME>).payload;
        this.spawnBurst(payload.tokenId, 'rainbow_splash');
        break;
      }
      case ExperienceEventType.ACHIEVEMENT_UNLOCKED:
        this.spawnBurst(0, 'achievement_spark');
        break;
      default:
        break;
    }
  }

  /**
   * Spawn a burst of particles at a given spatial reference or anchor
   */
  public spawnBurst(anchor: any, style: string): void {
    const particleCount = this.getAdjustedParticleCount(style);
    
    // Placeholder: Future canvas particle rendering loop
  }

  private getAdjustedParticleCount(style: string): number {
    let baseCount = 30;
    if (style === 'clash_burst') baseCount = 50;
    
    // Scale particles based on config settings
    if (this.config.particleQuality === 'low') {
      return Math.floor(baseCount * 0.4);
    } else if (this.config.particleQuality === 'medium') {
      return Math.floor(baseCount * 0.7);
    }
    return baseCount;
  }

  public destroy(): void {
    this.activeEmitters.clear();
  }
}

export const particleEngine = new ParticleEngine();
export default particleEngine;
