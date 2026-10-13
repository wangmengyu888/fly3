/* =========================================================================
 * main.js —— 启动引导：创建 Game，注册场景，进入 Boot
 * ========================================================================= */

(function () {
  function boot() {
    const canvas = document.getElementById('game');
    if (!canvas) { console.error('[main] 找不到 #game'); return; }

    const game = new Game(canvas);

    game.register('boot', new BootScene(game));
    game.register('modeSelect', new ModeSelectScene(game));
    game.register('menu', new MenuScene(game));
    game.register('game', new GameScene(game));
    game.register('result', new ResultScene(game));

    game.setScene('boot');
    game.start();

    window.__GAME__ = game; // 便于调试
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }
})();