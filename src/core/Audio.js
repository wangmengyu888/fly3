/* =========================================================================
 * Audio.js —— 程序化音效与 BGM（Web Audio API，零音频资源）
 * 必须在首次用户交互后 init()，以符合浏览器自动播放策略。
 * ========================================================================= */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.noiseBuf = null;
    this.ready = false;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.currentBgm = null;
    this.bgmPatterns = {
      menu:   [55, 0, 82, 0, 65, 0, 98, 0],
      battle: [82, 82, 110, 82, 98, 98, 123, 98],
      boss:   [55, 65, 82, 65, 55, 65, 98, 73]
    };
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1.0;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = CONFIG.AUDIO.sfx;
    this.sfxGain.connect(this.master);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = CONFIG.AUDIO.bgm;
    this.bgmGain.connect(this.master);

    // 白噪声缓冲（爆炸/受击用）
    const len = this.ctx.sampleRate * 1.0;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.ready = true;
    this.setBgmVolume(CONFIG.AUDIO.bgm);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setSfxVolume(v) { if (this.sfxGain) this.sfxGain.gain.value = v; }
  setBgmVolume(v) { if (this.bgmGain) this.bgmGain.gain.value = v; }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1.0;
  }

  /* ---------------------------------------------------- 合成原语 */
  _tone(freq, dur, type, vol, sweepTo, delay) {
    if (!this.ready || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFrom, filterTo) {
    if (!this.ready || this.muted) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFrom || 1800, t0);
    f.frequency.exponentialRampToValueAtTime(filterTo || 160, t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  /* ---------------------------------------------------- 事件音效 */
  play(name) {
    if (!this.ready || this.muted) return;
    switch (name) {
      case 'shoot':    this._tone(880, 0.055, 'square', 0.05, 520); break;
      case 'laser':    this._tone(1400, 0.07, 'sawtooth', 0.045, 900); break;
      case 'missile':  this._tone(320, 0.16, 'sawtooth', 0.07, 160); break;
      case 'hit':      this._noise(0.045, 0.10, 2600, 800); break;
      case 'explode':  this._noise(0.32, 0.34, 1600, 90); this._tone(120, 0.28, 'sawtooth', 0.10, 40); break;
      case 'bigboom':  this._noise(0.7, 0.5, 1200, 60); this._tone(80, 0.6, 'sawtooth', 0.18, 30); break;
      case 'pickup':   this._tone(660, 0.09, 'sine', 0.12, 1320); break;
      case 'coin':     this._tone(1200, 0.06, 'square', 0.08, 1600); break;
      case 'hurt':     this._tone(240, 0.28, 'sawtooth', 0.20, 70); break;
      case 'graze':    this._tone(1800, 0.05, 'sine', 0.05, 2400); break;
      case 'skill':    this._tone(300, 0.5, 'sine', 0.16, 1600); break;
      case 'railgun':  this._tone(180, 0.6, 'sawtooth', 0.22, 40); this._noise(0.5, 0.3, 3000, 300); break;
      case 'alarm':    this._tone(520, 0.3, 'square', 0.13, 300); this._tone(520, 0.3, 'square', 0.13, 300, 0.35); break;
      case 'bossdie':  this._tone(140, 1.0, 'sawtooth', 0.20, 30); this._noise(1.1, 0.45, 1400, 50); break;
      case 'levelup':  this._tone(523, 0.1, 'square', 0.12); this._tone(659, 0.1, 'square', 0.12, null, 0.09); this._tone(784, 0.16, 'square', 0.12, null, 0.18); break;
      case 'ui':       this._tone(760, 0.06, 'square', 0.08, 1000); break;
      case 'start':    this._tone(440, 0.12, 'square', 0.12); this._tone(660, 0.18, 'square', 0.12, null, 0.1); break;
    }
  }

  /* ---------------------------------------------------- BGM（极简循环音序器） */
  startBgm(name) {
    if (!this.ready) return;
    if (this.currentBgm === name && this.bgmTimer) return;
    this.stopBgm();
    this.currentBgm = name;
    const pattern = this.bgmPatterns[name] || this.bgmPatterns.battle;
    this.bgmStep = 0;
    const stepMs = name === 'boss' ? 150 : 190;
    this.bgmTimer = setInterval(() => {
      if (!this.ready || this.muted || !this.bgmGain) return;
      const note = pattern[this.bgmStep % pattern.length];
      this.bgmStep++;
      if (note > 0) this._bgmNote(note, stepMs / 1000 * 0.9);
    }, stepMs);
  }

  _bgmNote(freq, dur) {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.bgmGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  stopBgm() {
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    this.currentBgm = null;
  }
}