import { ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';
import { eventBus } from './eventBus';
import { animationEngine } from './animationEngine';
import { soundEngine } from './soundEngine';
import { particleEngine } from './particleEngine';
import { celebrationEngine } from './celebrationEngine';
import { ambientEngine } from './ambientEngine';
import { feedbackEngine } from './feedbackEngine';

export class ExperienceEngine {
  private static instance: ExperienceEngine;
  private config: ExperienceConfig = {
    animationIntensity: 'high',
    soundVolume: 0.5,
    particleQuality: 'high',
    reducedMotion: false,
    performanceMode: false,
  };

  private unsubscribeList: (() => void)[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ExperienceEngine {
    if (!ExperienceEngine.instance) {
      ExperienceEngine.instance = new ExperienceEngine();
    }
    return ExperienceEngine.instance;
  }

  /**
   * Initializes the Experience Engine and all sub-modules
   */
  public init(customConfig?: Partial<ExperienceConfig>): void {
    if (this.isInitialized) {
      this.updateConfig(customConfig || {});
      return;
    }

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Initialize all modular engines
    animationEngine.init(this.config);
    soundEngine.init(this.config);
    particleEngine.init(this.config);
    celebrationEngine.init(this.config);
    ambientEngine.init(this.config);
    feedbackEngine.init(this.config);

    // Set up wildcard event subscription to routing mechanism
    this.setupSubscriptions();

    this.isInitialized = true;
  }

  /**
   * Automatically routes every event published to the Event Bus into our engines
   */
  private setupSubscriptions(): void {
    // Clear any existing subscriptions first
    this.unsubscribeList.forEach(unsub => unsub());
    this.unsubscribeList = [];

    // Subscribe to all event types
    Object.values(ExperienceEventType).forEach((eventType) => {
      const unsub = eventBus.subscribe(eventType, (event: ExperienceEvent) => {
        this.routeEvent(event);
      });
      this.unsubscribeList.push(unsub);
    });
  }

  /**
   * Dispatches the event to each of the targeted engines
   */
  private routeEvent(event: ExperienceEvent): void {
    if (!this.isInitialized) return;

    // Route event safely through each registered sub-system
    try {
      animationEngine.handleEvent(event);
      soundEngine.handleEvent(event);
      particleEngine.handleEvent(event);
      celebrationEngine.handleEvent(event);
      ambientEngine.handleEvent(event);
      feedbackEngine.handleEvent(event);
    } catch (error) {
      console.error('[ExperienceEngine] Error routing event:', event.type, error);
    }
  }

  /**
   * Dynamically update the experience configuration and notify all engines
   */
  public updateConfig(newConfig: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    animationEngine.updateConfig(this.config);
    soundEngine.updateConfig(this.config);
    particleEngine.updateConfig(this.config);
    celebrationEngine.updateConfig(this.config);
    ambientEngine.updateConfig(this.config);
    feedbackEngine.updateConfig(this.config);
  }

  /**
   * Quick utility to toggle game sound on or off
   */
  public setMute(mute: boolean): void {
    this.updateConfig({ soundVolume: mute ? 0 : 0.5 });
  }

  /**
   * Quick utility to set animation density
   */
  public setReducedMotion(reduced: boolean): void {
    this.updateConfig({
      reducedMotion: reduced,
      animationIntensity: reduced ? 'low' : 'high',
      particleQuality: reduced ? 'low' : 'high'
    });
  }

  /**
   * Gets the current live configuration
   */
  public getConfig(): ExperienceConfig {
    return { ...this.config };
  }

  /**
   * Destroys the Experience Engine, clearing subscribers and releasing memory
   */
  public destroy(): void {
    this.unsubscribeList.forEach(unsub => unsub());
    this.unsubscribeList = [];

    animationEngine.destroy();
    soundEngine.destroy();
    particleEngine.destroy();
    celebrationEngine.destroy();
    ambientEngine.destroy();
    feedbackEngine.destroy();

    this.isInitialized = false;
  }
}

export const experienceEngine = ExperienceEngine.getInstance();
export default experienceEngine;
