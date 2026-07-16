import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

/**
 * FeedbackEngine is responsible solely for micro-interactions, low-latency UI feedback,
 * and future mobile haptic integrations. It ensures tactile and immediate response
 * during gameplay without triggering full-screen or high-overhead celebrations.
 */
export class FeedbackEngine implements ISubEngine {
  private config!: ExperienceConfig;

  public init(config: ExperienceConfig): void {
    this.config = config;
    console.log('[FeedbackEngine] Initialized');
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[FeedbackEngine] Config updated:', this.config);
  }

  /**
   * Listen for micro-events to trigger tactile feedback (sound clicks, haptics, micro-animations)
   */
  public handleEvent(event: ExperienceEvent): void {
    switch (event.type) {
      case ExperienceEventType.BUTTON_CLICK: {
        const payload = (event as ExperienceEvent<ExperienceEventType.BUTTON_CLICK>).payload;
        this.triggerMicroInteraction('button_press', payload);
        this.triggerHaptic('selection');
        break;
      }
      case ExperienceEventType.TOKEN_SELECTED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.TOKEN_SELECTED>).payload;
        this.triggerMicroInteraction('token_select', payload);
        this.triggerHaptic('light_tap');
        break;
      }
      case ExperienceEventType.DICE_ROLLED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.DICE_ROLLED>).payload;
        this.triggerMicroInteraction('dice_tap', payload);
        this.triggerHaptic('medium_impact');
        break;
      }
      case ExperienceEventType.POPUP_OPEN: {
        const payload = (event as ExperienceEvent<ExperienceEventType.POPUP_OPEN>).payload;
        this.triggerMicroInteraction('popup_open', payload);
        this.triggerHaptic('success');
        break;
      }
      case ExperienceEventType.POPUP_CLOSE: {
        const payload = (event as ExperienceEvent<ExperienceEventType.POPUP_CLOSE>).payload;
        this.triggerMicroInteraction('popup_close', payload);
        this.triggerHaptic('selection');
        break;
      }
      case ExperienceEventType.SUCCESS: {
        const payload = (event as ExperienceEvent<ExperienceEventType.SUCCESS>).payload;
        this.triggerMicroInteraction('toast_success', payload);
        this.triggerHaptic('success');
        break;
      }
      case ExperienceEventType.ERROR: {
        const payload = (event as ExperienceEvent<ExperienceEventType.ERROR>).payload;
        this.triggerMicroInteraction('toast_error', payload);
        this.triggerHaptic('warning');
        break;
      }
      default:
        break;
    }
  }

  /**
   * Triggers lightweight UI animations/effects for a micro-interaction
   */
  public triggerMicroInteraction(type: string, payload: any): void {
    if (this.config.reducedMotion && (type.includes('pulse') || type.includes('bounce'))) {
      return;
    }

    // Placeholder: Future CSS micro-transforms or instant hover scaling logic
    console.log(`[FeedbackEngine] Future Micro-Interaction: "${type}" with details ${JSON.stringify(payload)}`);
  }

  /**
   * Interface for haptic feedback hooks (e.g. navigator.vibrate or Native wrappers)
   */
  public triggerHaptic(type: 'light_tap' | 'medium_impact' | 'selection' | 'success' | 'warning'): void {
    if (this.config.performanceMode) return;

    // Web Vibration API for mobile haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch (type) {
          case 'light_tap':
            navigator.vibrate(12);
            break;
          case 'medium_impact':
            navigator.vibrate(25);
            break;
          case 'selection':
            navigator.vibrate(8);
            break;
          case 'success':
            navigator.vibrate([15, 45, 20]);
            break;
          case 'warning':
            navigator.vibrate([35, 60, 35]);
            break;
        }
      } catch (e) {
        // Gracefully ignore browser permission or security constraints
      }
    }

    console.log(`[FeedbackEngine] Mobile Haptic Hook triggered: "${type}"`);
  }

  public destroy(): void {
    console.log('[FeedbackEngine] Destroyed');
  }
}

export const feedbackEngine = new FeedbackEngine();
export default feedbackEngine;
