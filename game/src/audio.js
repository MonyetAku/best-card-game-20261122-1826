// Sound, synthesized in code (Web Audio, no files): a soft pluck when a card is played, a low
// thud when damage lands, a bright chime for a chain, a rising arpeggio for a win and a falling
// one for a loss. Nothing plays until the first user gesture, so the audio context starts
// unlocked only after the player has touched the game.

export function createAudio() {
  let context = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = AudioContext === undefined ? null : new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, seconds, type, gain, when) {
    const audio = ensure();
    if (audio === null) return;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, audio.currentTime + when);
    envelope.gain.linearRampToValueAtTime(gain, audio.currentTime + when + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + when + seconds);
    oscillator.connect(envelope);
    envelope.connect(audio.destination);
    oscillator.start(audio.currentTime + when);
    oscillator.stop(audio.currentTime + when + seconds + 0.05);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    playCard() {
      tone(520, 0.12, 'triangle', 0.12, 0);
      tone(780, 0.1, 'triangle', 0.08, 0.05);
    },
    damage() {
      tone(140, 0.25, 'sine', 0.2, 0);
      tone(90, 0.3, 'sine', 0.16, 0.04);
    },
    chain() {
      tone(660, 0.1, 'triangle', 0.1, 0);
      tone(880, 0.1, 'triangle', 0.1, 0.07);
      tone(1320, 0.16, 'triangle', 0.1, 0.14);
    },
    turn() {
      tone(440, 0.08, 'sine', 0.06, 0);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.35, 'triangle', 0.12, index * 0.12));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.35, 'sine', 0.12, index * 0.14));
    },
  };
}
