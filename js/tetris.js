/* Тетрис — играбельный, свайпы + кнопки, пауза, рекорды. */
(function(){
  var A = App, LS = A.LS, sfx = A.sfx;
  var COLS = 10, ROWS = 20;
  var COLORS = { I:'#3FC9E0', J:'#5B7CFF', L:'#FF9330', O:'#FFC91F', S:'#45C96E', T:'#B96BFF', Z:'#FF5A64' };
  var SHAPES = {
    I: [[0,1],[1,1],[2,1],[3,1]],
    J: [[0,0],[0,1],[1,1],[2,1]],
    L: [[2,0],[0,1],[1,1],[2,1]],
    O: [[1,0],[2,0],[1,1],[2,1]],
    S: [[1,0],[2,0],[0,1],[1,1]],
    T: [[1,0],[0,1],[1,1],[2,1]],
    Z: [[0,0],[1,0],[1,1],[2,1]]
  };
  var SIZE = { I:4, O:4, J:3, L:3, S:3, T:3, Z:3 };

  /* --- рекорды --- */
  function loadScores(){ try { return JSON.parse(LS.getItem('game_tetris_scores') || '[]'); } catch(e){ return []; } }
  function saveScore(s){
    var list = loadScores();
    var d = new Date();
    var ds = ('0'+d.getDate()).slice(-2) + '.' + ('0'+(d.getMonth()+1)).slice(-2) + '.' + d.getFullYear();
    list.push({ s: s, d: ds, n: 1 });
    list.forEach(function(r,i){ if (r.n && r !== list[list.length-1]) delete r.n; });
    list.sort(function(a,b){ return b.s - a.s; });
    list = list.slice(0, 10);
    LS.setItem('game_tetris_scores', JSON.stringify(list));
    return list;
  }

  /* --- состояние партии --- */
  var G = null, rafId = null, dropTimer = null;
  var ctrl = LS.getItem('game_tetris_ctrl') || 'swipe';

  function bag(){
    var t = ['I','J','L','O','S','T','Z'];
    for (var i = t.length - 1; i > 0; i--){ var j = Math.floor(Math.random()*(i+1)); var x=t[i]; t[i]=t[j]; t[j]=x; }
    return t;
  }
  function newGame(){
    G = { grid: [], score: 0, lines: 0, level: 1, queue: bag().concat(bag()),
          cur: null, hold: null, holdUsed: false, over: false, paused: false, prevBest: best() };
    for (var r = 0; r < ROWS; r++){ G.grid.push(new Array(COLS).fill(null)); }
    spawn();
  }
  function best(){ var l = loadScores(); return l.length ? l[0].s : 0; }
  function spawn(){
    if (G.queue.length < 7) G.queue = G.queue.concat(bag());
    var k = G.queue.shift();
    G.cur = { k: k, cells: SHAPES[k].map(function(c){ return c.slice(); }), x: 3, y: k === 'I' ? -1 : 0, size: SIZE[k] };
    G.holdUsed = false;
    if (collides(G.cur.cells, G.cur.x, G.cur.y)) gameOver();
  }
  function collides(cells, x, y){
    for (var i = 0; i < cells.length; i++){
      var cx = x + cells[i][0], cy = y + cells[i][1];
      if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
      if (cy >= 0 && G.grid[cy][cx]) return true;
    }
    return false;
  }
  function move(dx){
    if (!G || G.over || G.paused) return;
    if (!collides(G.cur.cells, G.cur.x + dx, G.cur.y)){ G.cur.x += dx; sfx.move(); draw(); }
  }
  function rotate(){
    if (!G || G.over || G.paused) return;
    if (G.cur.k === 'O') return; // квадрат не крутится (иначе сдвигается)
    var s = G.cur.size;
    var rc = G.cur.cells.map(function(c){ return [s - 1 - c[1], c[0]]; });
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++){
      if (!collides(rc, G.cur.x + kicks[i], G.cur.y)){
        G.cur.cells = rc; G.cur.x += kicks[i]; sfx.rotate(); draw(); return;
      }
    }
  }
  function soft(){
    if (!G || G.over || G.paused) return;
    if (!collides(G.cur.cells, G.cur.x, G.cur.y + 1)){ G.cur.y++; G.score += 1; draw(); }
    else lock();
  }
  function hard(){
    if (!G || G.over || G.paused) return;
    var n = 0;
    while (!collides(G.cur.cells, G.cur.x, G.cur.y + 1)){ G.cur.y++; n++; }
    G.score += n * 2;
    sfx.drop();
    lock();
  }
  function doHold(){
    if (!G || G.over || G.paused || G.holdUsed) return;
    var k = G.cur.k;
    if (G.hold){ var h = G.hold; G.hold = k; G.cur = { k: h, cells: SHAPES[h].map(function(c){ return c.slice(); }), x: 3, y: h === 'I' ? -1 : 0, size: SIZE[h] }; }
    else { G.hold = k; if (G.queue.length < 7) G.queue = G.queue.concat(bag()); var nk = G.queue.shift();
           G.cur = { k: nk, cells: SHAPES[nk].map(function(c){ return c.slice(); }), x: 3, y: nk === 'I' ? -1 : 0, size: SIZE[nk] }; }
    G.holdUsed = true; sfx.rotate(); renderMinis(); draw();
    if (collides(G.cur.cells, G.cur.x, G.cur.y)) gameOver(); // поле забито — обменянной фигуре некуда встать
  }
  function lock(){
    for (var i = 0; i < G.cur.cells.length; i++){
      var cx = G.cur.x + G.cur.cells[i][0], cy = G.cur.y + G.cur.cells[i][1];
      if (cy < 0){ gameOver(); return; }
      G.grid[cy][cx] = COLORS[G.cur.k];
    }
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--){
      if (G.grid[r].every(function(c){ return c; })){
        G.grid.splice(r, 1); G.grid.unshift(new Array(COLS).fill(null)); cleared++; r++;
      }
    }
    if (cleared){
      G.lines += cleared;
      G.score += [0, 100, 300, 500, 800][cleared] * G.level;
      var nl = Math.floor(G.lines / 10) + 1;
      if (nl > G.level){ G.level = nl; restartDrop(); }
      if (cleared === 4) sfx.tetris(); else sfx.line();
    }
    spawn(); renderHud(); renderMinis(); draw();
  }
  function tickDrop(){
    if (!G || G.over || G.paused) return;
    if (!collides(G.cur.cells, G.cur.x, G.cur.y + 1)){ G.cur.y++; draw(); }
    else lock();
  }
  function dropInterval(){ return Math.max(90, 800 - (G.level - 1) * 65); }
  function restartDrop(){ clearInterval(dropTimer); dropTimer = setInterval(tickDrop, dropInterval()); }

  /* --- отрисовка --- */
  var cvs, ctx, cell, dpr;
  function setupField(){
    var wrap = document.getElementById('t-field-wrap');
    var availW = wrap.clientWidth - 8, availH = wrap.clientHeight - 8;
    var w = Math.min(availW, Math.floor(availH / 2), 340);
    var h = w * 2;
    var f = document.getElementById('t-field');
    f.style.width = w + 'px'; f.style.height = h + 'px';
    cvs = document.getElementById('t-cvs');
    dpr = window.devicePixelRatio || 1;
    cvs.width = w * dpr; cvs.height = h * dpr;
    cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
    ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr);
    cell = w / COLS;
  }
  function rrect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function tile(cx, cy, color, ghost){
    var m = Math.max(1.5, cell * .05);
    var x = cx * cell + m, y = cy * cell + m, s = cell - m * 2;
    if (ghost){
      ctx.strokeStyle = 'rgba(242,239,231,.28)'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]); rrect(x + 1, y + 1, s - 2, s - 2, 4); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle = color; rrect(x, y, s, s, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(x, y, s, s * .22, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)'; rrect(x, y + s * .8, s, s * .2, 3); ctx.fill();
  }
  function draw(){
    if (!ctx || !G) return;
    var w = cvs.width / dpr, h = cvs.height / dpr;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(242,239,231,.045)'; ctx.lineWidth = 1;
    for (var c = 1; c < COLS; c++){ ctx.beginPath(); ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, h); ctx.stroke(); }
    for (var r = 1; r < ROWS; r++){ ctx.beginPath(); ctx.moveTo(0, r * cell); ctx.lineTo(w, r * cell); ctx.stroke(); }
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (G.grid[y][x]) tile(x, y, G.grid[y][x]);
    if (G.cur && !G.over){
      var gy = G.cur.y;
      while (!collides(G.cur.cells, G.cur.x, gy + 1)) gy++;
      G.cur.cells.forEach(function(cc){ if (gy + cc[1] >= 0 && gy > G.cur.y) tile(G.cur.x + cc[0], gy + cc[1], null, true); });
      G.cur.cells.forEach(function(cc){ if (G.cur.y + cc[1] >= 0) tile(G.cur.x + cc[0], G.cur.y + cc[1], COLORS[G.cur.k]); });
    }
  }
  function miniHtml(k, px){
    if (!k) return '';
    var cells = SHAPES[k];
    var maxX = Math.max.apply(null, cells.map(function(c){ return c[0]; })) + 1;
    var maxY = Math.max.apply(null, cells.map(function(c){ return c[1]; })) + 1;
    var h = '<div style="display:grid;grid-template-columns:repeat(' + maxX + ',' + px + 'px);grid-template-rows:repeat(' + maxY + ',' + px + 'px);gap:1.5px">';
    cells.forEach(function(c){
      h += '<div style="grid-area:' + (c[1]+1) + '/' + (c[0]+1) + ';background:' + COLORS[k] + ';border-radius:2px"></div>';
    });
    return h + '</div>';
  }
  function renderHud(){
    var el = document.getElementById('t-score'); if (el) el.textContent = A.fmt(G.score);
    var lv = document.getElementById('t-lv'); if (lv) lv.textContent = G.level;
    var ln = document.getElementById('t-ln'); if (ln) ln.textContent = G.lines;
  }
  function renderMinis(){
    var hd = document.getElementById('t-hold'); if (hd) hd.innerHTML = miniHtml(G.hold, 9);
    var n = [document.getElementById('t-n0'), document.getElementById('t-n1'), document.getElementById('t-n2')];
    for (var i = 0; i < 3; i++){ if (n[i]) n[i].innerHTML = miniHtml(G.queue[i], i === 0 ? 8 : 7); }
  }

  /* --- жесты --- */
  function bindGestures(f){
    var sx, sy, st, lastStepX, moved, softSteps;
    f.addEventListener('touchstart', function(e){
      var t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now();
      lastStepX = 0; moved = false; softSteps = 0;
    }, { passive: true });
    f.addEventListener('touchmove', function(e){
      if (!G || G.over || G.paused) return;
      e.preventDefault();
      var t = e.touches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > Math.abs(dy)){
        var step = Math.round(dx / (cell * .9));
        while (lastStepX < step){ move(1); lastStepX++; moved = true; }
        while (lastStepX > step){ move(-1); lastStepX--; moved = true; }
      } else if (dy > 24){
        var sSteps = Math.floor(dy / 28);
        while (softSteps < sSteps){ soft(); softSteps++; moved = true; }
      }
    }, { passive: false });
    f.addEventListener('touchend', function(e){
      if (!G || G.over || G.paused) return;
      // гасим синтетический click после touch, иначе тап крутил фигуру дважды (180°)
      e.preventDefault();
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy, dt = Date.now() - st;
      if (dy > 70 && dt < 240 && Math.abs(dx) < Math.abs(dy)){ hard(); return; }
      if (!moved && Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) rotate();
    }, { passive: false });
    // мышь на десктопе: клик — поворот (после touch click погашен preventDefault-ом)
    f.addEventListener('click', function(){ rotate(); });
  }
  function keyHandler(e){
    if (!G || G.over) return;
    if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowUp') rotate();
    else if (e.key === 'ArrowDown') soft();
    else if (e.key === ' ') { e.preventDefault(); hard(); }
    else if (e.key === 'c' || e.key === 'C') doHold();
    else if (e.key === 'Escape') showPause();
  }

  /* --- экраны --- */
  function screenHtml(){
    var btns = ctrl === 'btn';
    var h = '<div class="scr t-scr">' +
      '<div class="t-head">' +
        '<div class="ib" id="t-pause"><div class="pause-bars"><i></i><i></i></div></div>' +
        '<div class="t-score-wrap"><div class="t-score-cap">СЧЁТ</div><div class="t-score" id="t-score">0</div></div>' +
        '<div class="t-side"><div>УР <b class="lv" id="t-lv">1</b></div><div>ЛН <b id="t-ln">0</b></div></div>' +
      '</div>';
    if (btns){
      h += '<div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:2px 2px 8px">' +
        '<div style="display:flex;align-items:center;gap:6px"><div class="t-mini-cap">ЗАПАС</div><div class="t-mini" id="t-hold" style="width:42px;height:42px;border-radius:12px"></div></div>' +
        '<div style="width:1px;height:30px;background:var(--bd)"></div>' +
        '<div style="display:flex;align-items:center;gap:6px"><div class="t-mini-cap">ДАЛЕЕ</div><div class="t-mini" id="t-n0" style="width:42px;height:42px;border-radius:12px"></div>' +
        '<div class="t-mini sm" id="t-n1" style="width:36px;height:36px;opacity:.7"></div><div class="t-mini sm" id="t-n2" style="display:none"></div></div>' +
      '</div>';
    } else {
      h += '<div class="t-mini-row">' +
        '<div class="t-mini-col"><div class="t-mini-cap">ЗАПАС</div><div class="t-mini" id="t-hold"></div></div>' +
        '<div class="t-mini-col r"><div class="t-mini-cap">ДАЛЕЕ</div><div class="t-next-row">' +
          '<div class="t-mini" id="t-n0"></div><div class="t-mini sm" id="t-n1" style="opacity:.75"></div><div class="t-mini sm" id="t-n2" style="opacity:.5"></div>' +
        '</div></div>' +
      '</div>';
    }
    h += '<div class="t-field-wrap" id="t-field-wrap"><div class="t-field" id="t-field"><canvas id="t-cvs"></canvas></div></div>';
    if (btns){
      h += '<div class="t-btns">' +
        '<div class="t-btn" id="t-bl"><div class="t-tri-l"></div></div>' +
        '<div class="t-btn" id="t-br"><div class="t-tri-r"></div></div>' +
        '<div class="t-btn" id="t-brot"><div class="t-rot"><i></i></div></div>' +
        '<div class="t-btn ac" id="t-bd"><div class="t-tri-d"></div></div>' +
      '</div>' +
      '<div class="t-caption">Удержи ▼ — мгновенный сброс · тап по запасу — обмен</div>';
    } else {
      h += '<div class="t-caption">Свайпы: ← → движение · тап поворот · вниз падение · тап по запасу — обмен</div>';
    }
    return h + '</div>';
  }

  function enterGame(){
    document.getElementById('app').innerHTML = screenHtml();
    setupField();
    document.getElementById('t-pause').onclick = showPause;
    document.getElementById('t-hold').parentElement.onclick = function(e){ doHold(); e.stopPropagation(); };
    var f = document.getElementById('t-field');
    if (ctrl === 'btn'){
      var hold = null;
      var bd = document.getElementById('t-bd');
      document.getElementById('t-bl').onclick = function(){ move(-1); };
      document.getElementById('t-br').onclick = function(){ move(1); };
      document.getElementById('t-brot').onclick = function(){ rotate(); };
      bd.addEventListener('touchstart', function(e){ e.preventDefault();
        soft(); hold = setTimeout(function(){ hard(); hold = null; }, 350); }, { passive: false });
      bd.addEventListener('touchend', function(){ if (hold){ clearTimeout(hold); hold = null; } });
      bd.onclick = function(){ soft(); };
      f.addEventListener('click', function(){ rotate(); });
    } else {
      bindGestures(f);
    }
    renderHud(); renderMinis(); draw();
    restartDrop();
  }

  function showPause(){
    if (!G || G.over) return;
    G.paused = true;
    sfx.click();
    A.cmod(
      '<div class="t-cup" style="width:56px;height:56px;border-radius:17px"><div class="pause-bars"><i style="width:5px;height:18px;background:#191B20"></i><i style="width:5px;height:18px;background:#191B20"></i></div></div>' +
      '<div style="font:800 22px \'Golos Text\';color:var(--ink)">Пауза</div>' +
      '<div class="t-stats"><span>Счёт <b>' + A.fmt(G.score) + '</b></span><span>Уровень <b>' + G.level + '</b></span><span>Линии <b>' + G.lines + '</b></span></div>' +
      '<div class="seclab" style="margin:2px 0 -8px">УПРАВЛЕНИЕ</div>' +
      '<div class="t-ctl-seg" id="t-ctl">' +
        '<div data-v="swipe"' + (ctrl === 'swipe' ? ' class="on"' : '') + '>Свайпы</div>' +
        '<div data-v="btn"' + (ctrl === 'btn' ? ' class="on"' : '') + '>Кнопки</div>' +
      '</div>' +
      '<div class="btn ac" id="t-resume" style="height:56px;border-radius:17px;margin-top:4px">Продолжить</div>' +
      '<div class="btn dim" id="t-restart" style="height:56px;border-radius:17px">Заново</div>' +
      '<div class="btn ghost" id="t-exit">Выйти в меню</div>');
    document.getElementById('t-ctl').onclick = function(e){
      var v = e.target.getAttribute('data-v');
      if (!v || v === ctrl) return;
      ctrl = v; LS.setItem('game_tetris_ctrl', v);
      A.closeCmod(); G.paused = false; enterGame(); showPause();
    };
    document.getElementById('t-resume').onclick = function(){ A.closeCmod(); G.paused = false; sfx.click(); };
    document.getElementById('t-restart').onclick = function(){ A.closeCmod(); clearInterval(dropTimer); newGame(); enterGame(); };
    document.getElementById('t-exit').onclick = function(){ A.closeCmod(); leave(); A.go('home'); };
  }

  function gameOver(){
    G.over = true;
    clearInterval(dropTimer);
    var isRec = G.score > G.prevBest && G.score > 0;
    saveScore(G.score);
    if (isRec) sfx.record(); else sfx.over();
    var conf = '';
    if (isRec){
      var cs = ['#3FC9E0','#FF5A64','#45C96E','#FFC91F','#B96BFF','#5B7CFF','#FF9330'];
      for (var i = 0; i < 14; i++){
        var sz = 10 + Math.round(Math.random() * 7);
        conf += '<div class="t-conf" style="top:' + (6 + Math.random() * 46) + '%;left:' + (4 + Math.random() * 88) + '%;' +
          'width:' + sz + 'px;height:' + sz + 'px;background:' + cs[i % 7] + ';transform:rotate(' + Math.round(Math.random() * 60 - 30) + 'deg)"></div>';
      }
    }
    var sub = isRec
      ? 'прошлый ' + A.fmt(G.prevBest) + ' · <b>+' + A.fmt(G.score - G.prevBest) + '</b>'
      : (G.prevBest ? 'рекорд ' + A.fmt(G.prevBest) : 'первая партия');
    document.getElementById('app').innerHTML =
      '<div class="scr"><div class="t-over">' + conf +
        '<div class="t-cup' + (isRec ? ' glow' : '') + '"><i></i></div>' +
        '<div class="t-over-cap ' + (isRec ? 'rec' : 'plain') + '">' + (isRec ? 'НОВЫЙ РЕКОРД' : 'Игра окончена') + '</div>' +
        '<div class="t-over-score">' + A.fmt(G.score) + '</div>' +
        '<div class="t-over-sub">' + sub + '</div>' +
        '<div class="t-chips"><div class="t-chip">Уровень ' + G.level + '</div><div class="t-chip">' + G.lines + ' линий</div></div>' +
        '<div class="t-over-btns">' +
          '<div class="btn ac" id="t-again">Ещё раз</div>' +
          '<div class="btn card" id="t-recs">Таблица рекордов</div>' +
          '<div class="btn card" id="t-menu">Выйти в меню</div>' +
        '</div>' +
      '</div></div>';
    document.getElementById('t-again').onclick = function(){ newGame(); enterGame(); };
    document.getElementById('t-recs').onclick = function(){ A.go('tetrisRecords'); };
    document.getElementById('t-menu').onclick = function(){ leave(); A.go('home'); };
  }

  function leave(){
    clearInterval(dropTimer); dropTimer = null;
    A.closeCmod();
    G = null;
    document.removeEventListener('keydown', keyHandler);
  }

  A.reg('tetris', {
    enter: function(){
      newGame(); enterGame();
      document.addEventListener('keydown', keyHandler);
    },
    leave: leave
  });

  A.reg('tetrisRecords', {
    enter: function(){
      var list = loadScores();
      var rows = '';
      if (!list.length) rows = '<div class="rec-empty">Рекордов пока нет — сыграй первую партию</div>';
      list.forEach(function(r, i){
        var p = i + 1;
        var posCls = p === 1 ? 'p1' : (p <= 3 ? 'p23' : '');
        rows += '<div class="rec-row' + (p <= 3 ? ' top' : '') + (p === 1 ? ' gold' : '') + '">' +
          '<div class="rec-pos ' + posCls + '">' + p + '</div>' +
          '<div class="rec-score' + (p <= 3 ? ' top3' : '') + '">' + A.fmt(r.s) +
            (r.n ? '<span class="rec-new">НОВЫЙ</span>' : '') + '</div>' +
          '<div class="rec-date">' + r.d + '</div>' +
        '</div>';
      });
      document.getElementById('app').innerHTML =
        '<div class="scr">' +
          '<div class="dethead"><div class="ib" id="r-back"><div class="back-ch"></div></div>' +
            '<div class="ttl">Рекорды</div><div class="rec-badge">Тетрис</div></div>' +
          '<div class="rec-card">' + rows + '</div>' +
        '</div>';
      document.getElementById('r-back').onclick = function(){ A.go('home'); };
    }
  });
})();
