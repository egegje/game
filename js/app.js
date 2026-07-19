/* Game — оболочка: темы, звук, роутер, главный экран, настройки. */
var App = (function(){
  var LS = window.localStorage;
  var app = document.getElementById('app');

  /* ---------- настройки ---------- */
  var theme = LS.getItem('game_theme') || 'system';
  var sound = LS.getItem('game_sound') !== '0';

  function applyTheme(){
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark', dark);
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* ---------- звук (WebAudio-синтез, без файлов) ---------- */
  var actx = null;
  function beep(freq, dur, type, vol, when){
    if (!sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime + (when || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || .06, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }
  var sfx = {
    move:   function(){ beep(220, .04, 'square', .03); },
    rotate: function(){ beep(330, .05, 'square', .04); },
    drop:   function(){ beep(140, .09, 'square', .07); },
    line:   function(){ beep(523, .09, 'square', .06); beep(659, .09, 'square', .06, .07); },
    tetris: function(){ [523,659,784,1047].forEach(function(f,i){ beep(f, .1, 'square', .06, i*.07); }); },
    over:   function(){ [392,330,262,196].forEach(function(f,i){ beep(f, .14, 'square', .06, i*.12); }); },
    record: function(){ [523,659,784,1047,1319].forEach(function(f,i){ beep(f, .12, 'triangle', .07, i*.09); }); },
    cash:   function(){ beep(880, .06, 'triangle', .06); beep(1175, .08, 'triangle', .06, .06); },
    click:  function(){ beep(440, .03, 'square', .03); },
    bad:    function(){ beep(196, .12, 'sawtooth', .05); },
    warn:   function(){ beep(311, .09, 'square', .05); beep(233, .12, 'square', .05, .09); }
  };

  /* ---------- формат ---------- */
  function fmt(n){
    n = Math.round(n);
    var neg = n < 0; n = Math.abs(n);
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + s;
  }
  function rub(n){ return fmt(n) + ' ₽'; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* ---------- роутер ---------- */
  var screens = {};
  var current = null;
  function reg(name, fns){ screens[name] = fns; }
  function go(name, arg){
    if (current && screens[current].leave) screens[current].leave();
    current = name;
    app.innerHTML = '';
    window.scrollTo(0, 0);
    screens[name].enter(arg);
  }

  /* ---------- шторка и модалка ---------- */
  var ovl = document.getElementById('sheet-ovl');
  function sheet(html, onclose){
    ovl.innerHTML = '<div class="sheet"><div class="handle"></div>' + html + '</div>';
    ovl.classList.add('on');
    ovl.onclick = function(e){ if (e.target === ovl){ closeSheet(); if (onclose) onclose(); } };
  }
  function closeSheet(){ ovl.classList.remove('on'); ovl.innerHTML = ''; }

  function cmod(html){
    var d = document.createElement('div');
    d.className = 'cmod-ovl'; d.id = 'cmod';
    d.innerHTML = '<div class="cmod">' + html + '</div>';
    document.body.appendChild(d);
  }
  function closeCmod(){ var d = document.getElementById('cmod'); if (d) d.remove(); }

  /* ---------- главный экран ---------- */
  reg('home', { enter: function(){
    var best = 0;
    try { var sc = JSON.parse(LS.getItem('game_tetris_scores') || '[]'); if (sc.length) best = sc[0].s; } catch(e){}
    var bs = null;
    try { bs = JSON.parse(LS.getItem('game_banker_save') || 'null'); } catch(e){}
    var tetProg = best > 0
      ? '<div class="star"></div><span>Рекорд · ' + fmt(best) + '</span>'
      : '<span>Ещё нет рекорда</span>';
    var bankProg = bs
      ? '<span>Месяц ' + bs.month + ' · ' + rub(bs.cash) + '</span>'
      : '<span>Новая партия</span>';
    app.innerHTML =
      '<div class="scr">' +
        '<div class="home-top">' +
          '<div class="logo"><div class="logo-grid"><i></i><i></i><i></i><i></i></div><div class="logo-name">GAME</div></div>' +
          '<div class="ib" id="btn-set" style="flex-direction:column;gap:4px">' +
            '<div class="gear-l"><i style="left:1px"></i></div>' +
            '<div class="gear-l"><i style="right:1px"></i></div>' +
          '</div>' +
        '</div>' +
        '<div class="home-sub">Во что сыграем сегодня?</div>' +
        '<div class="carts">' +
          '<div class="cart tet" id="cart-tet"><div class="grid-bg"></div>' +
            '<div class="deco-tet">' +
              '<i style="grid-area:1/2;background:#B96BFF"></i>' +
              '<i style="grid-area:2/1;background:#B96BFF"></i><i style="grid-area:2/2;background:#B96BFF"></i><i style="grid-area:2/3;background:#B96BFF"></i>' +
              '<i style="grid-area:3/1;background:#3FC9E0"></i><i style="grid-area:3/2;background:#3FC9E0"></i>' +
              '<i style="grid-area:3/3;background:#FFC91F"></i><i style="grid-area:3/4;background:#FFC91F"></i>' +
              '<i style="grid-area:2/4;background:#FFC91F"></i>' +
            '</div>' +
            '<div class="nm">Тетрис</div>' +
            '<div class="ds">Классика на реакцию и ритм. Для всех.</div>' +
            '<div class="foot"><div class="prog">' + tetProg + '</div><div class="play"><div class="tri-r"></div></div></div>' +
          '</div>' +
          '<div class="cart bank" id="cart-bank"><div class="grid-bg"></div>' +
            '<div class="deco-bank"><div class="deco-bill">100</div>' +
              '<div class="deco-coin" style="top:26px;left:-26px">₽</div>' +
              '<div class="deco-coin" style="top:46px;left:-14px">₽</div>' +
            '</div>' +
            '<div class="nm">Банкир</div>' +
            '<div class="ds">Вклады, кредиты и большая маржа. 8+</div>' +
            '<div class="foot"><div class="prog">' + bankProg + '</div><div class="play"><div class="tri-r"></div></div></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('btn-set').onclick = function(){ sfx.click(); go('settings'); };
    document.getElementById('cart-tet').onclick = function(){ sfx.click(); go('tetris'); };
    document.getElementById('cart-bank').onclick = function(){ sfx.click(); go('banker'); };
  }});

  /* ---------- настройки ---------- */
  reg('settings', { enter: function(){
    function render(){
      app.innerHTML =
        '<div class="scr">' +
          '<div class="dethead"><div class="ib" id="btn-back"><div class="back-ch"></div></div><div class="ttl">Настройки</div></div>' +
          '<div class="set-block"><div class="seclab">ОФОРМЛЕНИЕ</div>' +
            '<div class="seg3" id="seg-theme">' +
              '<div data-v="light"' + (theme==='light' ? ' class="on"' : '') + '>Светлая</div>' +
              '<div data-v="dark"' + (theme==='dark' ? ' class="on"' : '') + '>Тёмная</div>' +
              '<div data-v="system"' + (theme==='system' ? ' class="on"' : '') + '>Система</div>' +
            '</div>' +
            '<div class="set-note">Выбор запоминается на этом устройстве</div>' +
          '</div>' +
          '<div class="set-block"><div class="seclab">ЗВУК</div>' +
            '<div class="set-card" id="card-sound">' +
              '<div style="flex:1"><div class="t">Звук в играх</div><div class="s">Эффекты падения фигур и кассы</div></div>' +
              '<div class="toggle' + (sound ? ' on' : '') + '"><i></i></div>' +
            '</div>' +
          '</div>' +
          '<div class="set-block"><div class="seclab">ДАННЫЕ</div>' +
            '<div class="set-card" id="card-reset">' +
              '<div style="flex:1"><div class="t danger">Сбросить прогресс</div><div class="s">Рекорды Тетриса и партия Банкира</div></div>' +
              '<div class="chev-r"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ver">Game 1.0 · game.eg.je</div>' +
        '</div>';
      document.getElementById('btn-back').onclick = function(){ sfx.click(); go('home'); };
      document.getElementById('seg-theme').onclick = function(e){
        var v = e.target.getAttribute('data-v');
        if (!v) return;
        theme = v; LS.setItem('game_theme', v); applyTheme(); sfx.click(); render();
      };
      document.getElementById('card-sound').onclick = function(){
        sound = !sound; LS.setItem('game_sound', sound ? '1' : '0'); sfx.click(); render();
      };
      document.getElementById('card-reset').onclick = function(){
        sfx.warn();
        sheet(
          '<div class="icn" style="background:rgba(229,72,77,.14);color:var(--ertx)">!</div>' +
          '<div class="h">Сбросить прогресс?</div>' +
          '<div class="p">Рекорды Тетриса и сохранённая партия Банкира будут удалены навсегда. Настройки останутся.</div>' +
          '<div class="btn danger" id="btn-wipe">Удалить всё</div>' +
          '<div class="btn dim" id="btn-cancel">Отмена</div>');
        document.getElementById('btn-wipe').onclick = function(){
          LS.removeItem('game_tetris_scores');
          LS.removeItem('game_banker_save');
          closeSheet(); sfx.bad(); render();
        };
        document.getElementById('btn-cancel').onclick = closeSheet;
      };
    }
    render();
  }});

  /* ---------- запуск ---------- */
  function boot(){ applyTheme(); go('home'); }

  function toggleTheme(){
    var dark = document.body.classList.contains('dark');
    theme = dark ? 'light' : 'dark';
    LS.setItem('game_theme', theme);
    applyTheme();
  }

  return {
    boot: boot, go: go, reg: reg,
    sheet: sheet, closeSheet: closeSheet, cmod: cmod, closeCmod: closeCmod,
    fmt: fmt, rub: rub, esc: esc, sfx: sfx, LS: LS,
    toggleTheme: toggleTheme,
    isSound: function(){ return sound; }
  };
})();
