/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty, AIConfiguration } from './types';
import { PlayerColor } from '../types';

/**
 * Global default AI Configuration settings
 */
export const DEFAULT_AI_CONFIG: AIConfiguration = {
  rollDelayMs: 1000,
  moveDelayMs: 1100,
  defaultDifficulty: AIDifficulty.EASY,
  difficulties: {
    red: AIDifficulty.EASY,
    green: AIDifficulty.MEDIUM,
    yellow: AIDifficulty.HARD,
    blue: AIDifficulty.MEDIUM,
  },
};

/**
 * AI Configuration manager class
 */
export class AIConfigManager {
  private currentConfig: AIConfiguration;

  constructor(config: AIConfiguration = DEFAULT_AI_CONFIG) {
    this.currentConfig = { ...config };
  }

  /**
   * Retrieves the current AI configuration
   */
  public getConfig(): AIConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Updates specific parts of the AI configuration
   */
  public updateConfig(updates: Partial<AIConfiguration>): void {
    this.currentConfig = {
      ...this.currentConfig,
      ...updates,
    };
  }

  /**
   * Retrieves the assigned difficulty level for a specific player color
   */
  public getDifficultyForColor(color: PlayerColor): AIDifficulty {
    return this.currentConfig.difficulties[color] || this.currentConfig.defaultDifficulty;
  }

  /**
   * Assigns a difficulty level to a specific player color
   */
  public setDifficultyForColor(color: PlayerColor, difficulty: AIDifficulty): void {
    this.currentConfig.difficulties = {
      ...this.currentConfig.difficulties,
      [color]: difficulty,
    };
  }
}

// Export a singleton instance of the configuration manager
export const aiConfigManager = new AIConfigManager();
