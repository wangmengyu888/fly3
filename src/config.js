/* =========================================================================
 * config.js —— 全篇唯一数值来源
 * 所有可调参数集中于此，业务代码禁止硬编码数值。
 * ========================================================================= */

/* 武器条目构造器：cd 秒 / dmg 伤害 / count 弹数 / spread 散射角(度) / speed 像素秒 / size 尺寸 */
function _W(cd, dmg, count, spread, speed, size, extra) {
  return Object.assign({
    cd: cd, dmg: dmg, count: count, spread: spread,
    speed: speed, size: size, pierce: 0, pattern: 'straight'
  }, extra || {});
}

/* 敌机条目构造器 */
function _E(hp, speed, radius, move, fireInterval, bulletPattern, score, dropRate, dropTable, color, size) {
  return {
    hp: hp, speed: speed, radius: radius, movePattern: move,
    fireInterval: fireInterval, bulletPattern: bulletPattern,
    scoreValue: score, dropRate: dropRate, dropTable: dropTable,
    color: color, size: size
  };
}

const CONFIG = {

  /* ---------------------------------------------------------------- 画布 */
  CANVAS: { W: 720, H: 1280, MAX_DT: 1 / 60 },

  /* 可活动战区（避开顶栏/底栏） */
  BOUNDS: { left: 26, right: 694, top: 172, bottom: 1120 },

  /* ---------------------------------------------------------------- 玩家 */
  PLAYER: {
    speed: 430,              // px/s（键盘）
    radius: 7,               // 判定半径（核心）
    grazeRadius: 30,         // 擦弹外环半径
    lives: 3,                // 剩余生命
    invincibleHit: 1.5,      // 受击无敌
    invincibleRespawn: 2.5,  // 重生无敌
    startBombs: 2,
    startWeapon: 'vulcan',
    startLevel: 1,
    respawnY: 980
  },

  /* ---------------------------------------------------------------- 武器
   * 每个武器 8 个等级（下标 0..7 对应 Lv1..Lv8）
   */
  WEAPON_TABLE: {
    /* 机炮：高射速、直线、弹道数随等级增加 */
    vulcan: [
      _W(0.15, 10, 1, 0, 980, 5),
      _W(0.145, 11, 1, 0, 990, 5),
      _W(0.14, 12, 2, 5, 1000, 5),
      _W(0.135, 14, 3, 6, 1010, 6),
      _W(0.125, 16, 3, 8, 1020, 6),
      _W(0.12, 18, 5, 9, 1040, 6),
      _W(0.11, 20, 5, 11, 1060, 7),
      _W(0.10, 22, 7, 13, 1080, 7)
    ],
    /* 激光：高伤、穿透、细长、极快（视觉近似光柱） */
    laser: [
      _W(0.20, 18, 1, 0, 1500, 7, { pierce: 3 }),
      _W(0.19, 22, 1, 0, 1550, 7, { pierce: 3 }),
      _W(0.18, 26, 2, 3, 1600, 8, { pierce: 4 }),
      _W(0.17, 30, 2, 4, 1650, 8, { pierce: 4 }),
      _W(0.16, 34, 3, 5, 1700, 9, { pierce: 5 }),
      _W(0.15, 39, 3, 6, 1750, 9, { pierce: 5 }),
      _W(0.14, 44, 4, 7, 1800, 10, { pierce: 6 }),
      _W(0.13, 50, 4, 8, 1850, 10, { pierce: 6 })
    ],
    /* 导弹：追踪、高伤、低频 */
    missile: [
      _W(0.62, 60, 1, 0, 560, 10, { pattern: 'homing' }),
      _W(0.58, 68, 1, 0, 580, 10, { pattern: 'homing' }),
      _W(0.55, 76, 2, 8, 600, 11, { pattern: 'homing' }),
      _W(0.52, 84, 2, 9, 620, 11, { pattern: 'homing' }),
      _W(0.49, 94, 3, 10, 640, 12, { pattern: 'homing' }),
      _W(0.46, 104, 3, 11, 660, 12, { pattern: 'homing' }),
      _W(0.43, 115, 4, 12, 680, 13, { pattern: 'homing' }),
      _W(0.40, 128, 4, 13, 700, 13, { pattern: 'homing' })
    ]
  },
  /* 每级升级所需 power 数量（满级后转化分数） */
  WEAPON_UP_COST: 1,

  /* ---------------------------------------------------------------- 敌机 */
  ENEMY_TABLE: {
    scout:    _E(10,  200, 18, 'dive',   0,    'none',   100,  0.05, ['coin'],                '#7de2ff', 26),
    fighter:  _E(30,  160, 20, 'sin',    1.25, 'aimed',  200,  0.12, ['power', 'coin'],       '#ff7a3d', 30),
    bomber:   _E(120, 90,  34, 'hover',  1.8,  'spread', 500,  0.40, ['power', 'shield'],     '#ff4d6d', 46),
    turret:   _E(200, 0,   30, 'hover',  1.6,  'ring',   600,  0.50, ['power', 'bomb'],       '#c06bff', 42),
    kamikaze: _E(20,  320, 20, 'charge', 0,    'none',   300,  0.10, ['coin'],                '#ff2bd6', 28),
    carrier:  _E(800, 60,  60, 'hover',  1.2,  'spread', 2000, 1.00, ['power', 'shield', 'bomb'], '#ff2e4d', 80)
  },
  /* 敌方子弹 */
  ENEMY_BULLET: { speed: 240, radius: 7, damage: 1, color: '#ff2bd6', colorAlt: '#ff8a2b' },

  /* ---------------------------------------------------------------- Boss
   * phases: 每个阶段使用的弹幕 pattern 与间隔
   */
  BOSS_TABLE: {
    OVERLORD_MK1: {
      name: 'OVERLORD MK-I', subtitle: '铁翼领主', hp: 5200, radius: 96,
      color: '#ff4d6d', accent: '#ffe600', scoreValue: 8000,
      thresholds: [0.7, 0.35],
      phases: [
        { patterns: ['fan'],            interval: 1.5 },
        { patterns: ['ring', 'fan'],    interval: 1.2 },
        { patterns: ['ring', 'spread'], interval: 0.9 }
      ]
    },
    TEMPEST_CORE: {
      name: 'TEMPEST CORE', subtitle: '风暴核心', hp: 7200, radius: 92,
      color: '#8a2bff', accent: '#00f5ff', scoreValue: 12000,
      thresholds: [0.65, 0.3],
      phases: [
        { patterns: ['spiral'],               interval: 1.0 },
        { patterns: ['spiral', 'laserSweep'], interval: 0.85 },
        { patterns: ['ring', 'spiral', 'laserSweep'], interval: 0.6 }
      ]
    },
    OMEGA_SERAPH: {
      name: 'OMEGA SERAPH', subtitle: '终焉炽天使', hp: 11000, radius: 108,
      color: '#ff2e4d', accent: '#ffcf3d', scoreValue: 30000,
      thresholds: [0.72, 0.45, 0.2],
      phases: [
        { patterns: ['summon', 'fan'],                    interval: 1.3 },
        { patterns: ['spiral', 'ring'],                   interval: 1.0 },
        { patterns: ['laserSweep', 'wall'],               interval: 0.8 },
        { patterns: ['ring', 'spiral', 'fan', 'wall'],    interval: 0.5 }
      ]
    }
  },

  /* ---------------------------------------------------------------- 掉落 */
  DROP_TABLE: {
    power:  { color: '#00f5ff', label: 'P' },
    shield: { color: '#39ff88', label: 'S' },
    bomb:   { color: '#ffe600', label: 'B' },
    heal:   { color: '#39ff88', label: '+' },
    coin:   { color: '#ffcf3d', label: '$' }
  },
  POWERUP: { speed: 130, ttl: 9, radius: 20, magnetRange: 220, magnetSpeed: 620 },

  /* ---------------------------------------------------------------- 连击 */
  COMBO: { window: 2.5, tiers: [10, 25, 50, 100], mults: [1, 1.5, 2, 3] },

  /* ---------------------------------------------------------------- 技能 */
  SKILLS: {
    timeStop: { name: '时空停滞', key: 'timeStop', cd: 25, duration: 3, slowFactor: 0.3, color: '#00f5ff' },
    railgun:  { name: '轨道炮',   key: 'railgun',  cd: 30, duration: 0.55, width: 130, damage: 900, color: '#ffe600' }
  },

  /* ---------------------------------------------------------------- 增益库（≥12） */
  BUFF_POOL: [
    { id: 'rapid_fire',  name: '超频射击', desc: '射速 +25%',        rarity: 'common',    maxStack: 5, apply: p => p.fireRateMul *= 1.25 },
    { id: 'warhead',     name: '强化弹头', desc: '伤害 +20%',        rarity: 'common',    maxStack: 5, apply: p => p.damageMul *= 1.20 },
    { id: 'shield_cap',  name: '护盾充能', desc: '最大护盾 +30 并充满', rarity: 'common', maxStack: 4, apply: p => { p.maxShield += 30; p.shield = p.maxShield; } },
    { id: 'wing_add',    name: '僚机编队', desc: '增加 1 架僚机',     rarity: 'rare',      maxStack: 2, apply: p => p.pendingWing = (p.pendingWing || 0) + 1 },
    { id: 'magnet',      name: '磁力吸附', desc: '道具自动吸附',      rarity: 'common',    maxStack: 1, apply: p => p.magnet = true },
    { id: 'graze_master',name: '擦弹大师', desc: '擦弹加速大招充能',  rarity: 'rare',      maxStack: 3, apply: p => p.grazeEnergy += 0.15 },
    { id: 'split_shot',  name: '分身弹',   desc: '额外 2 枚侧向弹',   rarity: 'rare',      maxStack: 3, apply: p => p.extraBullets += 2 },
    { id: 'lifesteal',   name: '能量汲取', desc: '击杀 6% 概率回护盾', rarity: 'epic',     maxStack: 3, apply: p => p.lifesteal += 0.06 },
    { id: 'crit',        name: '暴击核心', desc: '暴击率 +15%（双倍）', rarity: 'rare',     maxStack: 4, apply: p => p.critChance += 0.15 },
    { id: 'dodge',       name: '相位闪避', desc: '10% 概率完全免伤',  rarity: 'epic',      maxStack: 3, apply: p => p.dodgeChance += 0.10 },
    { id: 'ammo_speed',  name: '弹药加速', desc: '子弹速度 +30%',     rarity: 'common',    maxStack: 3, apply: p => p.bulletSpeedMul *= 1.30 },
    { id: 'time_weave',  name: '时间编织', desc: '敌方子弹 -12% 速度', rarity: 'rare',     maxStack: 3, apply: p => p.enemyBulletSlow *= 0.88 },
    { id: 'weapon_laser',name: '武器改造·激光', desc: '切换为激光武器', rarity: 'epic',   maxStack: 1, apply: p => p.weaponType = 'laser' },
    { id: 'weapon_missile',name:'武器改造·导弹', desc: '切换为导弹武器', rarity: 'epic',   maxStack: 1, apply: p => p.weaponType = 'missile' },
    { id: 'bomb_add',    name: '弹药补给',  desc: '炸弹 +1',          rarity: 'common',    maxStack: 5, apply: p => p.bombs += 1 },
    { id: 'life_add',    name: '备用机体',  desc: '生命 +1',          rarity: 'legendary', maxStack: 2, apply: p => p.lives += 1 }
  ],
  BUFF_RARITY_WEIGHT: { common: 60, rare: 28, epic: 10, legendary: 2 },
  BUFF_TRIGGER_KILLS: 18,       // 每击杀 N 个触发一次三选一
  BUFF_TRIGGER_TIME: 45,        // 或每 N 秒至少触发一次

  /* ---------------------------------------------------------------- 波次脚本 */
  WAVES: {
    stage1: [
      { t: 1.0,  spawn: 'scout',    count: 5, pattern: 'lineV' },
      { t: 5.0,  spawn: 'scout',    count: 6, pattern: 'vee' },
      { t: 10.0, spawn: 'fighter',  count: 3, pattern: 'vee' },
      { t: 16.0, spawn: 'scout',    count: 8, pattern: 'lineH' },
      { t: 22.0, spawn: 'kamikaze', count: 2 },
      { t: 27.0, spawn: 'fighter',  count: 4, pattern: 'lineV' },
      { t: 34.0, spawn: 'bomber',   count: 1 },
      { t: 42.0, boss: 'OVERLORD_MK1' }
    ],
    stage2: [
      { t: 1.0,  spawn: 'fighter',  count: 3, pattern: 'vee' },
      { t: 5.0,  spawn: 'turret',   count: 2, pattern: 'sides' },
      { t: 11.0, spawn: 'kamikaze', count: 3 },
      { t: 16.0, spawn: 'bomber',   count: 2 },
      { t: 23.0, spawn: 'fighter',  count: 6, pattern: 'lineH' },
      { t: 29.0, spawn: 'scout',    count: 10, pattern: 'vee' },
      { t: 36.0, spawn: 'carrier',  count: 1 },
      { t: 48.0, boss: 'TEMPEST_CORE' }
    ],
    stage3: [
      { t: 1.0,  spawn: 'fighter',  count: 4, pattern: 'vee' },
      { t: 5.0,  spawn: 'turret',   count: 3, pattern: 'sides' },
      { t: 11.0, spawn: 'kamikaze', count: 4 },
      { t: 17.0, spawn: 'bomber',   count: 3 },
      { t: 24.0, spawn: 'carrier',  count: 1 },
      { t: 32.0, spawn: 'fighter',  count: 8, pattern: 'lineH' },
      { t: 38.0, spawn: 'scout',    count: 12, pattern: 'vee' },
      { t: 46.0, boss: 'OMEGA_SERAPH' }
    ]
  },
  STAGE_LIST: ['stage1', 'stage2', 'stage3'],
  STAGE_NAMES: ['第一关 · 铁翼领空', '第二关 · 风暴之核', '最终关 · 终焉降临'],

  /* ---------------------------------------------------------------- 无尽模式 */
  ENDLESS: {
    diffInterval: 60,        // 每 N 秒难度 +1
    baseInterval: 1.1,       // 初始刷怪间隔
    minInterval: 0.35,
    hpScale: 0.12,           // 每档 hp 增长比例
    speedScale: 0.05
  },

  /* ---------------------------------------------------------------- 视觉 */
  COLORS: {
    bg0: '#05010f', bg1: '#0a0420', bg2: '#001018',
    cyan: '#00f5ff', magenta: '#ff2bd6', yellow: '#ffe600',
    red: '#ff2e4d', green: '#39ff88', white: '#ffffff',
    orange: '#ff8a2b', purple: '#b14bff',
    rarity: { common: '#00f5ff', rare: '#3da9ff', epic: '#b14bff', legendary: '#ffcf3d' }
  },
  FONT: { family: "'Orbitron','Rajdhani','Segoe UI',monospace" },

  /* ---------------------------------------------------------------- 操作模式
   * pc     —— 电脑模式：与原版完全一致（键盘操作，触屏拖拽同样可用）
   * mobile —— 手机模式：为大屏触屏适配（放大虚拟按钮、强制自动开火）
   */
  CONTROL: {
    defaultMode: 'pc',
    mobile: {
      forceAutoFire: true      // 手机模式强制自动开火（拖动即射击）
    }
  },

  /* ---------------------------------------------------------------- 音频 */
  AUDIO: { sfx: 0.55, bgm: 0.32 },

  /* ---------------------------------------------------------------- 调试 */
  DEBUG: { showHitbox: false, invincible: false, fps: false, showFps: false }
};