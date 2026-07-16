import { ExperienceEventType, ExperienceEvent, ExperienceEventListener, ExperienceEventPayloads } from './types';

export class ExperienceEventBus {
  private static instance: ExperienceEventBus;
  private listeners: Map<ExperienceEventType, Set<ExperienceEventListener<any>>> = new Map();
  private eventHistory: ExperienceEvent[] = [];
  private readonly maxHistorySize = 100;

  private constructor() {}

  public static getInstance(): ExperienceEventBus {
    if (!ExperienceEventBus.instance) {
      ExperienceEventBus.instance = new ExperienceEventBus();
    }
    return ExperienceEventBus.instance;
  }

  /**
   * Subscribe to a specific experience event type
   */
  public subscribe<T extends ExperienceEventType>(
    type: T,
    listener: ExperienceEventListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(listener);

    // Return an unsubscribe function
    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * Emit an experience event, notifying all subscribed listeners
   */
  public emit<T extends ExperienceEventType>(type: T, payload: ExperienceEventPayloads[T]): void {
    const event: ExperienceEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const targetListeners = this.listeners.get(type);
    if (targetListeners) {
      targetListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in Experience Event listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Get the history of emitted events
   */
  public getHistory(): ExperienceEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear all registered listeners and event history
   */
  public clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}

export const eventBus = ExperienceEventBus.getInstance();
export default eventBus;
