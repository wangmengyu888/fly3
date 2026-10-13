/* =========================================================================
 * SkillSystem.js —— 大招 / CD
 * 见 GDD 6.6：时空停滞 + 轨道炮。
 * ========================================================================= */

class SkillSystem {
  update(dt, scene) {
    const p = scene.player;
    const input = scene.game.input;
    if (p.active && p.skillCooldown <= 0 && input.take('KeyK')) this.activate('timeStop', scene);
    if (p.active && p.railgunCooldown <= 0 && input.take('KeyL')) this.activate('railgun', scene);
  }

  /** 供 HUD 点击按钮调用 */
  activate(type, scene) {
    const p = scene.player;
    if (!p.active) return false;
    if (type === 'timeStop') {
      if (p.skillCooldown > 0) return false;
      p.skillCooldown = CONFIG.SKILLS.timeStop.cd * (1 - Math.min(0.6, p.grazeEnergy));
      scene.slowTimer = CONFIG.SKILLS.timeStop.duration;
      scene.slowFactor = CONFIG.SKILLS.timeStop.slowFactor;
      p.invincible = Math.max(p.invincible, CONFIG.SKILLS.timeStop.duration);
      scene.flash(0.5, '#00f5ff');
      scene.shake(10, 0.5);
      scene.particles.floatText('时空停滞', p.x, p.y - 46, '#00f5ff', 26);
      scene.audio.play('skill');
      return true;
    }
    if (type === 'railgun') {
      if (p.railgunCooldown > 0) return false;
      p.railgunCooldown = CONFIG.SKILLS.railgun.cd * (1 - Math.min(0.6, p.grazeEnergy));
      const SK = CONFIG.SKILLS.railgun;
      scene.beams.push({ x: p.x, t: 0, dur: SK.duration, width: SK.width, damage: SK.damage * (p.damageMul || 1) });
      p.invincible = Math.max(p.invincible, SK.duration + 0.2);
      scene.flash(0.85, '#ffe600');
      scene.shake(22, 0.7);
      scene.particles.floatText('轨道炮', p.x, p.y - 46, '#ffe600', 26);
      scene.audio.play('railgun');
      this._applyRailgunDamage(p.x, SK, scene);
      return true;
    }
    return false;
  }

  _applyRailgunDamage(x, SK, scene) {
    const half = SK.width / 2;
    scene.enemies.each((e) => {
      if (Math.abs(e.x - x) <= half + e.radius) {
        if (e.takeDamage(SK.damage, scene)) { /* 已死亡并结算 */ }
      }
      return false;
    });
    if (scene.boss && scene.boss.active) {
      const b = scene.boss;
      if (Math.abs(b.x - x) <= half + b.radius) b.takeDamage(SK.damage * 3, scene);
      for (let i = 0; i < b.parts.length; i++) {
        const pt = b.parts[i];
        if (!pt.destroyed && Math.abs(pt.x - x) <= half + pt.radius) b.damagePart(i, SK.damage, scene);
      }
    }
  }
}