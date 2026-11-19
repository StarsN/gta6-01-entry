// All sound is synthesized with WebAudio: engine hum, sirens, gunshots, UI clicks and a music loop.
export function createAudio() {
  let ctx = null, master = null, muted = false, musicTimer = 0, sirenOsc = null, engineOsc = null, engineGain = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master); engineOsc.start();
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.3, freq = 1200) {
    if (!ensure() || muted) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    get muted() { return muted; },
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    click() { tone(700, 0.06, 'square', 0.08); },
    cash() { tone(880, 0.09, 'sine', 0.18); tone(1320, 0.14, 'sine', 0.18, null, 0.08); },
    shot() { noise(0.12, 0.5, 900); tone(160, 0.08, 'square', 0.25, 60); },
    punch() { noise(0.07, 0.3, 400); },
    reload() { tone(300, 0.05, 'square', 0.12); tone(500, 0.05, 'square', 0.12, null, 0.14); },
    crash() { noise(0.25, 0.5, 300); tone(90, 0.2, 'sawtooth', 0.2, 40); },
    hurt() { tone(200, 0.12, 'sawtooth', 0.2, 120); },
    mission() { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, null, i * 0.11)); },
    busted() { [400, 350, 300, 220].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, null, i * 0.15)); },
    setEngine(speedRatio, driving) {
      if (!ctx || !engineOsc) return;
      const target = driving && !muted ? 0.05 + Math.abs(speedRatio) * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 110, ctx.currentTime, 0.1);
    },
    setSiren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc && !muted) {
        sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
        const g = ctx.createGain(); g.gain.value = 0.035;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.7;
        const lg = ctx.createGain(); lg.gain.value = 180;
        lfo.connect(lg); lg.connect(sirenOsc.frequency); sirenOsc.frequency.value = 750;
        sirenOsc.connect(g); g.connect(master); sirenOsc.start(); lfo.start();
        sirenOsc._lfo = lfo; sirenOsc._g = g;
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); sirenOsc._lfo.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
      }
    },
    updateMusic(dt, playing) {
      if (!playing || muted || !ctx) return;
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 2.4;
        const bass = [110, 110, 130.8, 98];
        const idx = Math.floor(Math.random() * bass.length);
        tone(bass[idx], 0.5, 'triangle', 0.10);
        tone(bass[idx] * 2, 0.3, 'sine', 0.05, null, 0.25);
        tone(bass[idx] * 3, 0.2, 'sine', 0.03, null, 0.6);
      }
    },
  };
}
