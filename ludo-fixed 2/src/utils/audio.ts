/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundEngine } from '../experience/soundEngine';

class AudioEngineBridge {
  public toggleMute(): boolean {
    const isMuted = soundEngine.getMuteState();
    soundEngine.setMute(!isMuted);
    return !isMuted;
  }

  public getMuteState(): boolean {
    return soundEngine.getMuteState();
  }

  public playClick(): void {
    soundEngine.playSound('ui_click');
  }

  public playHover(): void {
    soundEngine.playSound('ui_hover');
  }

  public playDiceShake(): void {
    soundEngine.playSound('dice_shake');
  }

  public playDiceThud(): void {
    soundEngine.playSound('dice_thud');
  }

  public playTokenHop(): void {
    soundEngine.playSound('piece_hop');
  }

  public playTokenCapture(): void {
    soundEngine.playSound('capture_clash');
  }

  public playTokenHome(): void {
    soundEngine.playSound('piece_goal');
  }

  public playVictory(): void {
    soundEngine.playSound('victory');
  }

  public playDefeat(): void {
    soundEngine.playSound('defeat');
  }

  public playTransition(): void {
    soundEngine.playSound('transition');
  }

  public playRewardReveal(): void {
    soundEngine.playSound('reward_reveal');
  }

  public playCardFlip(): void {
    soundEngine.playSound('card_flip');
  }
}

export const audio = new AudioEngineBridge();
export default audio;
