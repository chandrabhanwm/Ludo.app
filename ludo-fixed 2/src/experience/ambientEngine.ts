import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

export class AmbientEngine implements ISubEngine {
  private config!: ExperienceConfig;
  private animFrameId: number | null = null;

  public init(config: ExperienceConfig): void {
    this.config = config;
    this.startAmbientLoop();
    console.log('[AmbientEngine] Initialized');
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.performanceMode) {
      this.stopAmbientLoop();
    } else {
      this.startAmbientLoop();
    }
    console.log('[AmbientEngine] Config updated:', this.config);
  }

  /**
   * Listen for background or dynamic status changes
   */
  public handleEvent(event: ExperienceEvent): void {
    switch (event.type) {
      case ExperienceEventType.POPUP_OPEN:
        this.applyVignette(true);
        break;
      case ExperienceEventType.POPUP_CLOSE:
        this.applyVignette(false);
        break;
      default:
        break;
    }
  }

  private startAmbientLoop(): void {
    if (this.animFrameId) return;
    if (this.config.performanceMode) return;

    // Placeholder: Future ambient loop for dynamic gradients, cloud shadows, dynamic lighting
    console.log('[AmbientEngine] Ambient render loop prepared');
  }

  private stopAmbientLoop(): void {
    if (this.animFrameId) {
      this.animFrameId = null;
    }
    console.log('[AmbientEngine] Ambient loop stopped for performance mode');
  }

  private applyVignette(active: boolean): void {
    // Placeholder: Future dynamically faded backdrop layer behind popups
    console.log(`[AmbientEngine] Vignette backdrop filter set to active: ${active}`);
  }

  public destroy(): void {
    this.stopAmbientLoop();
    console.log('[AmbientEngine] Destroyed');
  }
}

export const ambientEngine = new AmbientEngine();
export default ambientEngine;
