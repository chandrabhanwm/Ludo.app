import { ISubEngine, ExperienceConfig, ExperienceEvent, ExperienceEventType } from './types';

/**
 * AmbientAtmosphere synthesizes a rich, soothing, slow-evolving background pad
 * using procedural detuned sine/triangle oscillators swept by a low-frequency oscillator (LFO)
 * through a resonant lowpass filter.
 */
class AmbientAtmosphere {
  private ctx: AudioContext;
  private destination: AudioNode;
  private masterGain: GainNode;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isRunning = false;
  private volume = 0.5;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.connect(destination);
  }

  public setVolume(volume: number) {
    this.volume = volume;
    if (this.isRunning) {
      // Smoothly ramp ambient pad master volume
      this.masterGain.gain.setTargetAtTime(this.volume * 0.035, this.ctx.currentTime, 0.5);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Create a resonant lowpass filter
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.Q.setValueAtTime(1.8, this.ctx.currentTime);
      this.filter.frequency.setValueAtTime(240, this.ctx.currentTime);
      this.filter.connect(this.masterGain);

      // 2. Create LFO to slowly sweep the filter cutoff (Lush evolving filter sweep)
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.06, this.ctx.currentTime); // ~16.6s full loop

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(95, this.ctx.currentTime); // Sweeps frequency up/down by 95Hz

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start();

      // 3. Generate a warm, rich pentatonic drone chord
      // Frequencies: C2 (65.41Hz), G2 (98.00Hz), C3 (130.81Hz), E3 (164.81Hz), G3 (196.00Hz)
      const droneFrequencies = [65.41, 98.00, 130.81, 164.81, 196.00];
      droneFrequencies.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const voiceGain = this.ctx.createGain();

        // Alternate waveforms for richer timber
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Add tiny random detuning for a wider, chorus-like acoustic space
        osc.detune.setValueAtTime((Math.random() * 2 - 1) * 7, this.ctx.currentTime);

        const volumeDistribution = (1 / droneFrequencies.length) * (idx === 0 ? 0.45 : 0.25);
        voiceGain.gain.setValueAtTime(volumeDistribution, this.ctx.currentTime);

        osc.connect(voiceGain);
        voiceGain.connect(this.filter!);
        osc.start();

        this.oscillators.push(osc);
        this.gains.push(voiceGain);
      });

      // 4. Smoothly fade-in pad over 3.0s to avoid audio pops
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.volume * 0.035, this.ctx.currentTime + 3.0);
    } catch (e) {
      console.warn('[AmbientAtmosphere] Failed to play procedural synth pad', e);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    try {
      const now = this.ctx.currentTime;
      // Smooth 1.2s fade-out to end cleanly
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.2);

      const oscs = [...this.oscillators];
      const lfoNode = this.lfo;

      this.oscillators = [];
      this.gains = [];
      this.filter = null;
      this.lfo = null;
      this.lfoGain = null;

      // Clean up nodes after fade out completes
      setTimeout(() => {
        try {
          oscs.forEach(osc => {
            try { osc.stop(); } catch {}
          });
          if (lfoNode) {
            try { lfoNode.stop(); } catch {}
          }
        } catch {}
      }, 1400);
    } catch (e) {
      console.warn('[AmbientAtmosphere] Error stopping background synth', e);
    }
  }
}

/**
 * SoundEngine is Ludo Royale's centralized presentation-only Audio Manager.
 * It manages audio settings, sub-mix Routing, procedural synthesis of all game elements,
 * overlapping playback prevention, preloading, and mobile haptic coordination.
 */
export class SoundEngine implements ISubEngine {
  private config!: ExperienceConfig;
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  // Mixing Node Hierarchy (Node Graph)
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;

  // Background Atmosphere Synth
  private ambientAtmosphere: AmbientAtmosphere | null = null;

  // Audio Spam Prevention & Playback Guard
  private lastTriggerTimes: Record<string, number> = {};
  private readonly TRIGGER_COOLDOWN_MS = 60; // minimum gap to avoid clipping/overlapping sound-spam

  public init(config: ExperienceConfig): void {
    // 1. Load persisted volumes
    let persisted: Partial<ExperienceConfig> = {};
    try {
      const stored = localStorage.getItem('ludo_audio_settings');
      if (stored) {
        persisted = JSON.parse(stored);
      } else {
        // Safe check for legacy muted flag
        const legacyMuted = localStorage.getItem('ludo_muted') === 'true';
        persisted = {
          masterVolume: legacyMuted ? 0 : 1.0,
          musicVolume: 0.5,
          effectsVolume: 0.8,
          reducedAudioMode: false,
        };
      }
    } catch (e) {
      console.warn('[SoundEngine] Could not load persisted audio config', e);
    }

    this.config = {
      ...config,
      masterVolume: persisted.masterVolume ?? 1.0,
      musicVolume: persisted.musicVolume ?? 0.5,
      effectsVolume: persisted.effectsVolume ?? 0.8,
      reducedAudioMode: persisted.reducedAudioMode ?? config.reducedMotion ?? false,
    };

    this.isMuted = this.config.soundVolume === 0 || this.config.masterVolume === 0;

    console.log('[SoundEngine] Initialized with Premium sub-mix ratios:', this.config);
  }

  public updateConfig(config: Partial<ExperienceConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.reducedMotion !== undefined && config.reducedAudioMode === undefined) {
      this.config.reducedAudioMode = config.reducedMotion;
    }

    this.isMuted = this.config.soundVolume === 0 || (this.config.masterVolume ?? 1.0) === 0;

    // Persist changes
    try {
      localStorage.setItem('ludo_audio_settings', JSON.stringify({
        masterVolume: this.config.masterVolume,
        musicVolume: this.config.musicVolume,
        effectsVolume: this.config.effectsVolume,
        reducedAudioMode: this.config.reducedAudioMode,
        isMuted: this.isMuted
      }));
      localStorage.setItem('ludo_muted', String(this.isMuted));
    } catch (e) {
      console.warn('[SoundEngine] Could not write persistent audio config', e);
    }

    this.updateNodeVolumes();
    this.handleAmbientState();

    console.log('[SoundEngine] Config updated. Live volumes:', this.config);
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  public setMute(mute: boolean): void {
    this.updateConfig({ 
      soundVolume: mute ? 0 : 0.5,
      masterVolume: mute ? 0 : 1.0
    });
  }

  public getConfig(): ExperienceConfig {
    return { ...this.config };
  }

  private initContext(): void {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioContext = new AudioCtx();
          
          // Instantiate gain nodes for separate mix channels (Sub-mixing Graph)
          this.masterGainNode = this.audioContext.createGain();
          this.musicGainNode = this.audioContext.createGain();
          this.effectsGainNode = this.audioContext.createGain();

          this.masterGainNode.connect(this.audioContext.destination);
          this.musicGainNode.connect(this.masterGainNode);
          this.effectsGainNode.connect(this.masterGainNode);

          // Instantiate background ambiance loop connected to music channel
          // Ambient disabled
          // this.ambientAtmosphere = new AmbientAtmosphere(this.audioContext, this.musicGainNode);
          
          console.log('[SoundEngine] AudioContext & mixing nodes created successfully');
        } catch (err) {
          console.error('[SoundEngine] Failed to create AudioContext', err);
        }
      }
    }

    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        try {
          this.audioContext.resume().then(() => {
            this.updateNodeVolumes();
            this.handleAmbientState();
          });
        } catch (e) {
          console.warn('[SoundEngine] Could not resume suspended AudioContext', e);
        }
      } else {
        this.updateNodeVolumes();
        this.handleAmbientState();
      }
    }
  }

  private updateNodeVolumes(): void {
    if (!this.audioContext) return;

    const masterVal = this.isMuted ? 0 : (this.config.masterVolume ?? 1.0);
    const musicVal = this.config.musicVolume ?? 0.5;
    const effectsVal = this.config.effectsVolume ?? 0.8;

    const now = this.audioContext.currentTime;

    try {
      if (this.masterGainNode) {
        this.masterGainNode.gain.setTargetAtTime(masterVal, now, 0.08);
      }
      if (this.musicGainNode) {
        this.musicGainNode.gain.setTargetAtTime(musicVal, now, 0.08);
      }
      if (this.effectsGainNode) {
        this.effectsGainNode.gain.setTargetAtTime(effectsVal, now, 0.08);
      }
    } catch (e) {
      console.warn('[SoundEngine] Error ramping channel gains', e);
    }
  }

  private handleAmbientState(): void {
    if (!this.audioContext) return;

    const isMusicMuted = this.isMuted || 
                          (this.config.masterVolume ?? 1.0) === 0 || 
                          (this.config.musicVolume ?? 0.5) === 0;

    if (isMusicMuted) {
      if (this.ambientAtmosphere) {
        this.ambientAtmosphere.stop();
      }
    } else {
      if (this.ambientAtmosphere) {
        // Ambient background sound disabled — too intrusive on mobile
        // this.ambientAtmosphere.start();
      }
    }
  }

  private getEffectsVolume(): number {
    let vol = this.config.effectsVolume ?? 0.8;
    if (this.config.reducedAudioMode) {
      vol *= 0.5; // lower SFX amplitude in reduced audio mode
    }
    return vol;
  }

  /**
   * Sound spam guard to prevent high-frequency clipping/memory leaks on rapid triggers.
   */
  private checkCooldown(soundId: string): boolean {
    const now = Date.now();
    const last = this.lastTriggerTimes[soundId] || 0;
    if (now - last < this.TRIGGER_COOLDOWN_MS) {
      return false; // skip playback to avoid harsh clipping
    }
    this.lastTriggerTimes[soundId] = now;
    return true;
  }

  /**
   * Routes general events from Ludo's central Event Bus into matching synthesized sound effects.
   */
  public handleEvent(event: ExperienceEvent): void {
    if (this.isMuted) return;

    switch (event.type) {
      case ExperienceEventType.DICE_ROLLED: {
        const payload = (event as ExperienceEvent<ExperienceEventType.DICE_ROLLED>).payload;
        const isSix = payload.value === 6;
        this.playDiceRollSequence(isSix);
        break;
      }
      case ExperienceEventType.BUTTON_CLICK: {
        const payload = (event as ExperienceEvent<ExperienceEventType.BUTTON_CLICK>).payload;
        if (payload.buttonId === 'dice-roll') {
          // Triggered by playDiceRollSequence
        } else {
          this.playClickSound();
        }
        break;
      }
      case ExperienceEventType.TOKEN_MOVED:
        this.playHopSound();
        break;
      case ExperienceEventType.TOKEN_CAPTURED:
        this.playCaptureSound();
        break;
      case ExperienceEventType.SAFE_CELL_REACHED:
        this.playSafeLandingSound();
        break;
      case ExperienceEventType.TOKEN_ENTERED_HOME:
        this.playGoalSound();
        break;
      case ExperienceEventType.MATCH_WON:
        this.playVictorySound();
        break;
      case ExperienceEventType.MATCH_LOST:
        this.playDefeatSound();
        break;
      case ExperienceEventType.COINS_EARNED:
      case ExperienceEventType.REWARD_REDEEMED:
      case ExperienceEventType.DAILY_REWARD:
      case ExperienceEventType.ACHIEVEMENT_UNLOCKED:
        this.playRewardRevealSound();
        break;
      case ExperienceEventType.XP_GAINED:
        this.playXpGainedSynthSound();
        break;
      case ExperienceEventType.LEVEL_UP:
        this.playLevelUpSynthSound();
        break;
      case ExperienceEventType.POPUP_OPEN:
      case ExperienceEventType.POPUP_CLOSE:
        this.playTransitionSound();
        break;
      case ExperienceEventType.ERROR:
        this.playErrorSound();
        break;
      default:
        break;
    }
  }

  // --- PREMIUM SFX SYNTHESIZERS ---

  public playXpGainedSynthSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('xp_gain')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Quick bubble/coin like sweep up (C5 to E5 to G5 in rapid succession)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + idx * 0.045 + 0.1);

        gain.gain.setValueAtTime(0.06 * this.getEffectsVolume(), now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.1);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.1);
      });
    } catch (e) {
      console.warn('[SoundEngine] XP Gained sound error', e);
    }
  }

  public playLevelUpSynthSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Grand major arpeggio sweep up followed by a full radiant block chord (C4-E4-G4 then C5-E5-G5-C6)
      const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      arpeggio.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.08 * this.getEffectsVolume(), now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });

      // Triumphant sustained high minor-to-major transition chord at 0.42s
      const chord = [523.25, 659.25, 783.99, 1318.51]; // C5, E5, G5, E6
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.42);
        osc.frequency.linearRampToValueAtTime(freq * 1.002, now + 0.42 + 0.8);

        gain.gain.setValueAtTime(0.05 * this.getEffectsVolume(), now + 0.42);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42 + 0.8);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + 0.42);
        osc.stop(now + 0.42 + 0.8);
      });
    } catch (e) {
      console.warn('[SoundEngine] Level Up sound error', e);
    }
  }

  public playClickSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('click')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

      gain.gain.setValueAtTime(0.08 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      console.warn('[SoundEngine] Click playback error', e);
    }
  }

  public playHoverSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('hover')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft high-frequency bell-like pluck
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(1380, now + 0.035);

      gain.gain.setValueAtTime(0.015 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {
      console.warn('[SoundEngine] Hover playback error', e);
    }
  }

  public playTransitionSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('transition')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Soft rising sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.16);

      gain.gain.setValueAtTime(0.035 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('[SoundEngine] Transition sweep playback error', e);
    }
  }

  public playDiceTap(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.05);

      gain.gain.setValueAtTime(0.18 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('[SoundEngine] Dice tap playback error', e);
    }
  }

  public playRattleSound(time: number, pitchOffset = 0): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;

      // Create noise buffer for rattling grains
      const bufferSize = ctx.sampleRate * 0.04; // 40ms micro-rattle
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + pitchOffset, time);
      filter.frequency.exponentialRampToValueAtTime(380 + pitchOffset, time + 0.04);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14 * this.getEffectsVolume(), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      noise.start(time);
    } catch (e) {
      console.warn('[SoundEngine] Rattle playback error', e);
    }
  }

  public playLandingSound(isSix: boolean): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const time = ctx.currentTime;

      // Heavy solid thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, time);
      osc.frequency.linearRampToValueAtTime(55, time + 0.18);

      gain.gain.setValueAtTime(0.55 * this.getEffectsVolume(), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(time);
      osc.stop(time + 0.18);

      // Rebound clack
      const clackOsc = ctx.createOscillator();
      const clackGain = ctx.createGain();
      clackOsc.type = 'sine';
      clackOsc.frequency.setValueAtTime(450, time + 0.04);
      clackOsc.frequency.linearRampToValueAtTime(200, time + 0.08);

      clackGain.gain.setValueAtTime(0.18 * this.getEffectsVolume(), time + 0.04);
      clackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      clackOsc.connect(clackGain);
      clackGain.connect(this.effectsGainNode || ctx.destination);
      clackOsc.start(time + 0.04);
      clackOsc.stop(time + 0.08);

      // Play major shimmer chime cascade if they scored a 6
      if (isSix) {
        setTimeout(() => {
          this.playRewardRevealSound();
        }, 120);
      }
    } catch (e) {
      console.warn('[SoundEngine] Landing thud playback error', e);
    }
  }

  public playDiceRollSequence(isSix: boolean): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // 1. Initial throw impact
      this.playDiceTap();

      // 2. Slowing tumble rattle grains (total ~500ms)
      const rattleTimes = [0.04, 0.09, 0.14, 0.20, 0.27, 0.34, 0.41];
      rattleTimes.forEach((offset, idx) => {
        const pitchOffset = -idx * 22;
        this.playRattleSound(now + offset, pitchOffset);
      });

      // 3. Final landing impact precisely coordinated with end of animation (460ms)
      setTimeout(() => {
        if (this.isMuted) return;
        this.playLandingSound(isSix);
      }, 460);
    } catch (e) {
      console.warn('[SoundEngine] Dice sequence execution failed', e);
    }
  }

  public playHopSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('hop')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Rising digital jumping swoop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);

      gain.gain.setValueAtTime(0.08 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('[SoundEngine] Hop playback error', e);
    }
  }

  public playCaptureSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      // 1. Heavy crash impact
      this.playCaptureImpactSound();

      // 2. Fast sweep returning token back to yard
      setTimeout(() => {
        if (this.isMuted) return;
        this.playReturnToYardSound();
      }, 150);

      // 3. Triumphant extra turn reward chime
      setTimeout(() => {
        if (this.isMuted) return;
        this.playExtraTurnRewardSound();
      }, 500);
    } catch (e) {
      console.warn('[SoundEngine] Capture process playback error', e);
    }
  }

  private playCaptureImpactSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Heavy sub-bass triangle thud
      const oscBass = ctx.createOscillator();
      const gainBass = ctx.createGain();
      oscBass.type = 'triangle';
      oscBass.frequency.setValueAtTime(150, now);
      oscBass.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      gainBass.gain.setValueAtTime(0.3 * this.getEffectsVolume(), now);
      gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      oscBass.connect(gainBass);
      gainBass.connect(this.effectsGainNode || ctx.destination);
      oscBass.start(now);
      oscBass.stop(now + 0.25);

      // Piercing high-clack sawtooth clash
      const oscClack = ctx.createOscillator();
      const gainClack = ctx.createGain();
      oscClack.type = 'sawtooth';
      oscClack.frequency.setValueAtTime(500, now);
      oscClack.frequency.linearRampToValueAtTime(200, now + 0.08);

      gainClack.gain.setValueAtTime(0.12 * this.getEffectsVolume(), now);
      gainClack.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscClack.connect(gainClack);
      gainClack.connect(this.effectsGainNode || ctx.destination);
      oscClack.start(now);
      oscClack.stop(now + 0.08);
    } catch (e) {
      console.warn('[SoundEngine] Capture impact play error', e);
    }
  }

  private playReturnToYardSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const oscSweep = ctx.createOscillator();
      const gainSweep = ctx.createGain();

      // Whizzing back swoop
      oscSweep.type = 'sine';
      oscSweep.frequency.setValueAtTime(380, now);
      oscSweep.frequency.exponentialRampToValueAtTime(130, now + 0.3);

      gainSweep.gain.setValueAtTime(0.12 * this.getEffectsVolume(), now);
      gainSweep.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      oscSweep.connect(gainSweep);
      gainSweep.connect(this.effectsGainNode || ctx.destination);

      oscSweep.start(now);
      oscSweep.stop(now + 0.3);
    } catch (e) {
      console.warn('[SoundEngine] Return sweep play error', e);
    }
  }

  private playExtraTurnRewardSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Light rising arpeggio (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.07 * this.getEffectsVolume(), now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.24);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.24);
      });
    } catch (e) {
      console.warn('[SoundEngine] Extra turn play error', e);
    }
  }

  public playSafeLandingSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Elegant perfect-fifth double chime (C5, G5)
      const freqs = [523.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + idx * 0.04 + 0.25);

        gain.gain.setValueAtTime(0.09 * this.getEffectsVolume(), now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.25);
      });
    } catch (e) {
      console.warn('[SoundEngine] Safe landing chime play error', e);
    }
  }

  public playGoalSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    const lastTrigger = this.lastTriggerTimes['piece_goal'] || 0;
    const nowMs = Date.now();
    if (nowMs - lastTrigger < 150) {
      return; // deduplicate rapid succession triggers
    }
    this.lastTriggerTimes['piece_goal'] = nowMs;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Rich triumphant major arpeggio cascade
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.12 * this.getEffectsVolume(), now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.32);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.32);
      });
    } catch (e) {
      console.warn('[SoundEngine] Goal arpeggio play error', e);
    }
  }

  public playVictorySound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Layered triumphant major chord march progression
      const chords = [
        [261.63, 329.63, 392.00, 523.25], // C Major
        [349.23, 440.00, 523.25, 698.46], // F Major
        [392.00, 493.88, 587.33, 783.99], // G Major
        [523.25, 659.25, 783.99, 1046.50] // C Major oct
      ];

      chords.forEach((chord, chordIdx) => {
        const chordTime = now + chordIdx * 0.24;
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, chordTime);

          gain.gain.setValueAtTime(0.07 * this.getEffectsVolume(), chordTime);
          gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.34);

          osc.connect(gain);
          gain.connect(this.effectsGainNode || ctx.destination);

          osc.start(chordTime);
          osc.stop(chordTime + 0.34);
        });
      });

      // Spawn diamond sparkle chimes after progression completes
      setTimeout(() => {
        if (this.isMuted) return;
        this.playRewardRevealSound();
      }, 1000);
    } catch (e) {
      console.warn('[SoundEngine] Victory parade play error', e);
    }
  }

  public playDefeatSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Dissonant minor/diminished falling progression
      const chords = [
        [311.13, 369.99, 440.0], // Eb dim
        [277.18, 329.63, 392.0], // C# dim
        [220.00, 261.63, 311.13] // A dim (descending gloom)
      ];

      chords.forEach((chord, chordIdx) => {
        const chordTime = now + chordIdx * 0.32;
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, chordTime);
          osc.frequency.linearRampToValueAtTime(freq - 35, chordTime + 0.38); // Weeping decay pitch sweep

          gain.gain.setValueAtTime(0.08 * this.getEffectsVolume(), chordTime);
          gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.38);

          osc.connect(gain);
          gain.connect(this.effectsGainNode || ctx.destination);

          osc.start(chordTime);
          osc.stop(chordTime + 0.38);
        });
      });
    } catch (e) {
      console.warn('[SoundEngine] Defeat sequence play error', e);
    }
  }

  public playRewardRevealSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('reward')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Rapid, shimmering crystal glass sweep (Em9 sparkling)
      const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98, 1975.53];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + idx * 0.035 + 0.16);

        gain.gain.setValueAtTime(0.05 * this.getEffectsVolume(), now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.16);

        osc.connect(gain);
        gain.connect(this.effectsGainNode || ctx.destination);

        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.16);
      });
    } catch (e) {
      console.warn('[SoundEngine] Sparkle chime play error', e);
    }
  }

  public playCardFlipSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;
    if (!this.checkCooldown('card_flip')) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Synthesize friction brush texture using bandpassed white noise slice
      const bufferSize = ctx.sampleRate * 0.12; // 120ms brush
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      filter.Q.setValueAtTime(1.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.045 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      noise.start(now);
    } catch (e) {
      console.warn('[SoundEngine] Card flip sound play error', e);
    }
  }

  public playErrorSound(): void {
    this.initContext();
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.16);

      gain.gain.setValueAtTime(0.12 * this.getEffectsVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.effectsGainNode || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('[SoundEngine] Error sound play error', e);
    }
  }

  // --- COMPATIBILITY MAPPINGS ---

  public playSound(soundId: string): void {
    if (this.isMuted) return;

    switch (soundId) {
      case 'dice_shake_roll':
      case 'dice_shake':
        this.playDiceRollSequence(false);
        break;
      case 'dice_thud':
        this.playLandingSound(false);
        break;
      case 'piece_hop':
        this.playHopSound();
        break;
      case 'capture_clash':
        this.playCaptureSound();
        break;
      case 'safe_landing':
        this.playSafeLandingSound();
        break;
      case 'piece_goal':
        this.playGoalSound();
        break;
      case 'ui_click':
      case 'click':
        this.playClickSound();
        break;
      case 'ui_hover':
      case 'hover':
        this.playHoverSound();
        break;
      case 'ui_error':
      case 'error':
        this.playErrorSound();
        break;
      case 'transition':
      case 'swipe':
        this.playTransitionSound();
        break;
      case 'reward':
      case 'reward_reveal':
      case 'sparkle':
        this.playRewardRevealSound();
        break;
      case 'card_flip':
      case 'slide':
        this.playCardFlipSound();
        break;
      case 'victory':
        this.playVictorySound();
        break;
      case 'defeat':
        this.playDefeatSound();
        break;
      default:
        console.log(`[SoundEngine] Unmapped legacy sound triggered: "${soundId}"`);
        break;
    }
  }

  public destroy(): void {
    if (this.ambientAtmosphere) {
      try {
        this.ambientAtmosphere.stop();
      } catch {}
      this.ambientAtmosphere = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.masterGainNode = null;
    this.musicGainNode = null;
    this.effectsGainNode = null;

    console.log('[SoundEngine] central audio manager released');
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
