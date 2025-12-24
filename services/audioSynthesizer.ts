
class JingleBellsPlayer {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private currentTimeout: any = null;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  private notes: { [key: string]: number } = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00
  };

  private melody = [
    ['E5', 0.25], ['E5', 0.25], ['E5', 0.5],
    ['E5', 0.25], ['E5', 0.25], ['E5', 0.5],
    ['E5', 0.25], ['G5', 0.25], ['C5', 0.25], ['D5', 0.25], ['E5', 1.0],
    ['F5', 0.25], ['F5', 0.25], ['F5', 0.375], ['F5', 0.125],
    ['F5', 0.25], ['E5', 0.25], ['E5', 0.25], ['E5', 0.125], ['E5', 0.125],
    ['E5', 0.25], ['D5', 0.25], ['D5', 0.25], ['E5', 0.25], ['D5', 0.5], ['G5', 0.5],
    ['E5', 0.25], ['E5', 0.25], ['E5', 0.5],
    ['E5', 0.25], ['E5', 0.25], ['E5', 0.5],
    ['E5', 0.25], ['G5', 0.25], ['C5', 0.25], ['D5', 0.25], ['E5', 1.0],
    ['F5', 0.25], ['F5', 0.25], ['F5', 0.375], ['F5', 0.125],
    ['F5', 0.25], ['E5', 0.25], ['E5', 0.25], ['E5', 0.125], ['E5', 0.125],
    ['G5', 0.25], ['G5', 0.25], ['F5', 0.25], ['D5', 0.25], ['C5', 1.0],
  ];

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playNote(frequency: number, duration: number, startTime: number) {
    if (!this.audioCtx || !this.isPlaying) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
    
    const node = { osc, gain };
    this.activeNodes.push(node);
    osc.onended = () => {
      this.activeNodes = this.activeNodes.filter(n => n !== node);
    };
  }

  public async toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      await this.start();
    }
  }

  public async start() {
    this.init();
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.isPlaying = true;
    this.playMelody();
  }

  public stop() {
    this.isPlaying = false;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    // Stop all active notes immediately
    this.activeNodes.forEach(node => {
      try {
        node.osc.stop();
        node.gain.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  private playMelody() {
    if (!this.isPlaying || !this.audioCtx) return;

    let currentTime = this.audioCtx.currentTime + 0.1;
    const tempo = 1.0; 

    this.melody.forEach(([note, duration]) => {
      const freq = this.notes[note as string];
      const dur = (duration as number) * tempo;
      this.playNote(freq, dur, currentTime);
      currentTime += dur;
    });

    const totalDuration = this.melody.reduce((acc, curr) => acc + (curr[1] as number) * tempo, 0);
    this.currentTimeout = setTimeout(() => {
      if (this.isPlaying) this.playMelody();
    }, totalDuration * 1000);
  }
}

export const jingleBells = new JingleBellsPlayer();
