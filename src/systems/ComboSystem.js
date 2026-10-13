/* =========================================================================
 * ComboSystem.js —— 连击 / 得分倍率
 * 见 GDD 6.11。
 * ========================================================================= */

class ComboSystem {
  constructor() {
    this.combo = 0;
    this.timer = 0;
    this.mult = 1;
  }

  reset() { this.combo = 0; this.timer = 0; this.mult = 1; }

  onKill() {
    this.combo++;
    this.timer = CONFIG.COMBO.window;
    this._updateMult();
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        if (this.combo > 0) {
          this.combo = 0;
          this.mult = 1;
        }
      }
    }
  }

  _updateMult() {
    const tiers = CONFIG.COMBO.tiers;
    const mults = CONFIG.COMBO.mults;
    let m = 1;
    for (let i = 0; i < tiers.length; i++) if (this.combo >= tiers[i]) m = mults[i + 1] !== undefined ? mults[i + 1] : mults[mults.length - 1];
    this.mult = m;
  }

  ratio() { return this.timer > 0 ? this.timer / CONFIG.COMBO.window : 0; }
}