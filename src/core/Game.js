/* =========================================================================
 * Game.js —— 游戏主控（场景状态机 + 主循环调度 + 音频解锁 + 自动暂停）
 * ========================================================================= */

class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas, this.renderer);
    this.audio = new AudioManager();
    this.save = new SaveManager();

    this.scenes = {};
    this.current = null;
    this.currentName = '';

    // 操作模式：'pc'（原版键盘）/ 'mobile'（手机触屏适配）
    this.controlMode = CONFIG.CONTROL.defaultMode;

    this.loop = new Loop(
      (dt) => this.update(dt),
      (ft) => this.render(ft)
    );

    this._bindAudioUnlock();
    this._bindVisibility();
  }

  register(name, scene) { this.scenes[name] = scene; }

  /** 当前是否手机模式 */
  isMobile() { return this.controlMode === 'mobile'; }

  /** 切换操作模式 */
  setControlMode(mode) { this.controlMode = (mode === 'mobile') ? 'mobile' : 'pc'; }

  setScene(name, params) {
    const next = this.scenes[name];
    if (!next) { console.warn('[Game] 场景不存在:', name); return; }
    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentName = name;
    if (next.enter) next.enter(params || {});
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
    this.input.endFrame();
  }

  render(ft) {
    const R = this.renderer;
    R.clear();
    R.begin();
    if (this.current && this.current.draw) this.current.draw(R.ctx, R);
  }

  start() { this.loop.start(); }
  stop() { this.loop.stop(); }

  /* ---------------------------------------------------- 音频解锁（浏览器策略） */
  _bindAudioUnlock() {
    const unlock = () => {
      this.audio.init();
      this.audio.resume();
      const s = this.save.get();
      this.audio.setMuted(!!this.save.getSetting('muted'));
      this.audio.setSfxVolume(this.save.getSetting('sfx'));
      this.audio.setBgmVolume(this.save.getSetting('bgm'));
      if (this.currentName === 'menu' || this.currentName === 'modeSelect') this.audio.startBgm('menu');
      else if (this.currentName === 'game') this.audio.startBgm('battle');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /* ---------------------------------------------------- 失焦自动暂停 */
  _bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const s = this.current;
        if (s && s.state === 'playing') s.state = 'paused';
        if (this.audio.ctx && this.audio.ctx.suspend) this.audio.ctx.suspend();
      } else {
        this.audio.resume();
      }
    });
  }
}