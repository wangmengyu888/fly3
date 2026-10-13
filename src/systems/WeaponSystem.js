/* =========================================================================
 * WeaponSystem.js —— 武器与升级（vulcan / laser / missile，各 8 级）
 * 见 GDD 6.5。子弹生成完全由 config.WEAPON_TABLE 驱动。
 * ========================================================================= */

class WeaponSystem {
  update(dt, scene) {
    const p = scene.player;
    if (!p.active) return;
    const input = scene.game.input;
    const wantFire = scene.autoFire || input.keys['Space'] || input.keys['KeyJ'] || input.pointerActive;
    if (!wantFire) return;
    if (p.fireCooldown > 0) return;
    this.fire(p, scene);
  }

  fire(player, scene) {
    const type = CONFIG.WEAPON_TABLE[player.weaponType] ? player.weaponType : 'vulcan';
    const tbl = CONFIG.WEAPON_TABLE[type];
    const lv = clamp(player.weaponLevel, 1, 8) - 1;
    const w = tbl[lv];

    player.fireCooldown = w.cd / (player.fireRateMul || 1);

    const speed = w.speed * (player.bulletSpeedMul || 1);
    const count = w.count + (player.extraBullets || 0);
    const spreadRad = w.spread * Math.PI / 180;
    const pierce = (w.pierce || 0) + (player.bulletPierceBonus || 0);
    const muzzleY = player.y - 24;

    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : (i - (count - 1) / 2) / ((count - 1) / 2); // -1..1
      const ang = -Math.PI / 2 + spreadRad * off;
      let dmg = w.dmg * (player.damageMul || 1);
      let isCrit = false;
      if (player.critChance > 0 && Math.random() < player.critChance) { dmg *= 2; isCrit = true; }

      const bx = player.x + off * 12;
      const opts = {
        damage: dmg, color: this._color(type), size: w.size, radius: w.size + 1,
        pierce: pierce, pattern: w.pattern, crit: isCrit
      };
      if (w.pattern === 'homing') {
        opts.homingTarget = scene.getNearestEnemy(bx, muzzleY);
        opts.turnRate = 6;
        opts.color = '#ff8a2b';
      }
      scene.spawnPlayerBullet(bx, muzzleY, Math.cos(ang) * speed, Math.sin(ang) * speed, opts);
    }

    scene.audio.play(type === 'laser' ? 'laser' : (type === 'missile' ? 'missile' : 'shoot'));
  }

  _color(type) {
    if (type === 'laser') return '#39ff88';
    if (type === 'missile') return '#ff8a2b';
    return '#00f5ff';
  }
}