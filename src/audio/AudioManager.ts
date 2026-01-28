/**
 * AudioManager - Procedural audio system for HU! roguelike mahjong
 * Generates all sounds using Web Audio API (no external audio files)
 */

export type SoundEffect =
  | 'tileClick'
  | 'tilePlace'
  | 'tileDiscard'
  | 'scoreCount'
  | 'winJingle'
  | 'loseSound'
  | 'shopPurchase'
  | 'bossAppear'
  | 'fanAnnounce'
  | 'buttonClick';

export type MusicTrack =
  | 'menu'
  | 'gameplay'
  | 'shop'
  | 'boss';

export interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number;    // 0-1
  musicVolume: number;  // 0-1
  muted: boolean;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private musicGain: GainNode;

  private settings: AudioSettings = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    muted: false
  };

  private currentMusicTrack: MusicTrack | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicLoopInterval: number | null = null;

  private constructor() {
    // Initialize Web Audio API
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create gain nodes for volume control
    this.masterGain = this.audioContext.createGain();
    this.sfxGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();

    // Connect gain hierarchy: sfx/music → master → destination
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);

    // Load settings from localStorage
    this.loadSettings();
    this.applySettings();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Resume audio context (required after user interaction on some browsers)
   */
  public async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // ============================================================
  // SOUND EFFECT GENERATORS
  // ============================================================

  /**
   * Play a sound effect
   */
  public playSFX(effect: SoundEffect): void {
    if (this.settings.muted) return;

    switch (effect) {
      case 'tileClick':
        this.playTileClick();
        break;
      case 'tilePlace':
        this.playTilePlace();
        break;
      case 'tileDiscard':
        this.playTileDiscard();
        break;
      case 'scoreCount':
        this.playScoreCount();
        break;
      case 'winJingle':
        this.playWinJingle();
        break;
      case 'loseSound':
        this.playLoseSound();
        break;
      case 'shopPurchase':
        this.playShopPurchase();
        break;
      case 'bossAppear':
        this.playBossAppear();
        break;
      case 'fanAnnounce':
        this.playFanAnnounce();
        break;
      case 'buttonClick':
        this.playButtonClick();
        break;
    }
  }

  /**
   * Tile click/select - short crisp tap
   */
  private playTileClick(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Tile place - soft thud
   */
  private playTilePlace(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Tile discard - similar to place but slightly different pitch
   */
  private playTileDiscard(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Score counting - rapid ticking
   */
  private playScoreCount(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Win jingle - ascending happy notes
   */
  private playWinJingle(): void {
    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);

      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  }

  /**
   * Lose sound - descending sad notes
   */
  private playLoseSound(): void {
    const now = this.audioContext.currentTime;
    const notes = [523.25, 466.16, 392.00, 329.63]; // C5, Bb4, G4, E4

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);

      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.4);
    });
  }

  /**
   * Shop purchase - coin/cha-ching sound
   */
  private playShopPurchase(): void {
    const now = this.audioContext.currentTime;

    // High ping
    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, now); // C6

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    osc1.start(now);
    osc1.stop(now + 0.3);

    // Mid ping (delayed)
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.1); // E6

    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  }

  /**
   * Boss appear - dramatic low rumble
   */
  private playBossAppear(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now); // Low A
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * Fan pattern announce - dramatic flourish
   */
  private playFanAnnounce(): void {
    const now = this.audioContext.currentTime;

    // Ascending sweep
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Button click - UI feedback
   */
  private playButtonClick(): void {
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // ============================================================
  // BACKGROUND MUSIC GENERATORS
  // ============================================================

  /**
   * Start playing a music track
   */
  public playMusic(track: MusicTrack): void {
    if (this.currentMusicTrack === track) return; // Already playing

    this.stopMusic();
    this.currentMusicTrack = track;

    if (this.settings.muted) return;

    switch (track) {
      case 'menu':
        this.playMenuMusic();
        break;
      case 'gameplay':
        this.playGameplayMusic();
        break;
      case 'shop':
        this.playShopMusic();
        break;
      case 'boss':
        this.playBossMusic();
        break;
    }
  }

  /**
   * Stop current music
   */
  public stopMusic(): void {
    // Stop all oscillators
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.musicOscillators = [];

    // Clear loop interval
    if (this.musicLoopInterval !== null) {
      clearInterval(this.musicLoopInterval);
      this.musicLoopInterval = null;
    }

    this.currentMusicTrack = null;
  }

  /**
   * Menu music - calm ambient loop (pentatonic scale, Chinese-inspired)
   * Uses pentatonic scale: C, D, E, G, A
   */
  private playMenuMusic(): void {
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4
    const melody = [
      { note: 4, duration: 1.0 },  // A4
      { note: 3, duration: 0.5 },  // G4
      { note: 2, duration: 0.5 },  // E4
      { note: 1, duration: 1.0 },  // D4
      { note: 2, duration: 0.5 },  // E4
      { note: 0, duration: 0.5 },  // C4
      { note: 1, duration: 1.0 },  // D4
      { note: 2, duration: 1.0 },  // E4
    ];

    const loopDuration = melody.reduce((sum, note) => sum + note.duration, 0);

    const playLoop = () => {
      const now = this.audioContext.currentTime;
      let offset = 0;

      melody.forEach(({ note, duration }) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pentatonic[note], now + offset);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.05);
        gain.gain.linearRampToValueAtTime(0.08, now + offset + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0.01, now + offset + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now + offset);
        osc.stop(now + offset + duration);

        this.musicOscillators.push(osc);

        offset += duration;
      });
    };

    playLoop();
    this.musicLoopInterval = window.setInterval(() => {
      if (!this.settings.muted) {
        playLoop();
      }
    }, loopDuration * 1000);
  }

  /**
   * Gameplay music - subtle rhythmic loop
   */
  private playGameplayMusic(): void {
    const bassNote = 130.81; // C3
    const beatDuration = 0.5;
    const pattern = [1, 0, 1, 0, 1, 1, 0, 1]; // Rhythm pattern

    const loopDuration = pattern.length * beatDuration;

    const playLoop = () => {
      const now = this.audioContext.currentTime;

      pattern.forEach((hit, i) => {
        if (hit) {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bassNote, now + i * beatDuration);

          gain.gain.setValueAtTime(0.08, now + i * beatDuration);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * beatDuration + 0.3);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now + i * beatDuration);
          osc.stop(now + i * beatDuration + 0.3);

          this.musicOscillators.push(osc);
        }
      });
    };

    playLoop();
    this.musicLoopInterval = window.setInterval(() => {
      if (!this.settings.muted) {
        playLoop();
      }
    }, loopDuration * 1000);
  }

  /**
   * Shop music - relaxed browsing music
   */
  private playShopMusic(): void {
    const chordNotes = [
      [261.63, 329.63, 392.00], // C major: C4, E4, G4
      [293.66, 369.99, 440.00], // D minor: D4, F4, A4
    ];

    const playLoop = () => {
      const now = this.audioContext.currentTime;

      chordNotes.forEach((chord, chordIndex) => {
        const startTime = now + chordIndex * 2.0;

        chord.forEach(freq => {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.06, startTime + 0.1);
          gain.gain.linearRampToValueAtTime(0.04, startTime + 1.8);
          gain.gain.linearRampToValueAtTime(0.01, startTime + 2.0);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(startTime);
          osc.stop(startTime + 2.0);

          this.musicOscillators.push(osc);
        });
      });
    };

    playLoop();
    this.musicLoopInterval = window.setInterval(() => {
      if (!this.settings.muted) {
        playLoop();
      }
    }, 4000); // 4 second loop
  }

  /**
   * Boss music - tense dramatic loop
   */
  private playBossMusic(): void {
    const bassNote = 65.41; // C2
    const tension = [0, 7, 5, 7]; // Intervals in semitones
    const beatDuration = 0.4;

    const loopDuration = tension.length * beatDuration;

    const playLoop = () => {
      const now = this.audioContext.currentTime;

      tension.forEach((semitone, i) => {
        const freq = bassNote * Math.pow(2, semitone / 12);

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * beatDuration);

        gain.gain.setValueAtTime(0.15, now + i * beatDuration);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * beatDuration + beatDuration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now + i * beatDuration);
        osc.stop(now + i * beatDuration + beatDuration);

        this.musicOscillators.push(osc);
      });
    };

    playLoop();
    this.musicLoopInterval = window.setInterval(() => {
      if (!this.settings.muted) {
        playLoop();
      }
    }, loopDuration * 1000);
  }

  // ============================================================
  // SETTINGS & VOLUME CONTROL
  // ============================================================

  /**
   * Get current audio settings
   */
  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Update audio settings
   */
  public updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
    this.saveSettings();

    // Restart music if unmuted
    if (!this.settings.muted && this.currentMusicTrack) {
      const track = this.currentMusicTrack;
      this.currentMusicTrack = null; // Force restart
      this.playMusic(track);
    }

    // Stop music if muted
    if (this.settings.muted) {
      this.stopMusic();
    }
  }

  /**
   * Toggle mute
   */
  public toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.applySettings();
    this.saveSettings();

    if (this.settings.muted) {
      this.stopMusic();
    } else if (this.currentMusicTrack) {
      const track = this.currentMusicTrack;
      this.currentMusicTrack = null;
      this.playMusic(track);
    }

    return this.settings.muted;
  }

  /**
   * Apply current settings to gain nodes
   */
  private applySettings(): void {
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setValueAtTime(master, this.audioContext.currentTime);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.audioContext.currentTime);
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.audioContext.currentTime);
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('audioSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save audio settings:', e);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('audioSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load audio settings:', e);
    }
  }

  /**
   * Cleanup (call when game is destroyed)
   */
  public destroy(): void {
    this.stopMusic();
    this.audioContext.close();
  }
}
