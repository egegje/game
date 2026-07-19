/* Банкир — симулятор банка: вклады, кредиты, дефолты, викторина, инструменты. */
(function(){
  var A = App, LS = A.LS, sfx = A.sfx, fmt = A.fmt, rub = A.rub, esc = A.esc;

  /* ---------- данные ---------- */
  var MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  var DEP_NAMES = ['ООО «Полюс»','ИП Смирнова','«АгроДом»','«Вектор»','ООО «Северный ветер»','«Меркурий»','ИП Козлов',
    '«Тёплый дом»','ООО «Аврора»','«Байкал»','ИП Орлова','«Гранит»','«Летний сад»','ООО «Маяк»','«Спутник+»','ИП Фадеева'];
  var CRED_NAMES = ['Олег В.','Мария К.','ООО «Тайга»','Иван П.','Анна С.','ИП Гусев','Пётр Н.','ООО «Нива»','Дарья М.',
    'Сергей Л.','ООО «Кедр»','Ольга Т.','Максим Д.','ИП Белова','Николай Ф.','ООО «Дельта»'];
  var AVA_COLORS = [
    ['#DCE9FF','#3D5DA8','#223354','#9FC0FF'], ['#FFE7D6','#B05E1E','#3A2A1C','#FFB37E'],
    ['#E4DBFF','#6A4BBF','#2C2347','#C0A8FF'], ['#E4F4E9','#157A4B','#1C3328','#6FD8A2'],
    ['#FFE9F0','#B03A6B','#3A2230','#FF9CC0'], ['#FFF6D2','#8A6D00','#3A331C','#FFD86B']
  ];
  var PRODUCTS = {
    mortgage: { nm:'Ипотека',        risk:'lo',  base:.004, minT:18, maxT:36, k:2.2, collateral:true },
    auto:     { nm:'Автокредит',     risk:'lo',  base:.007, minT:10, maxT:24, k:1.4, collateral:true },
    consumer: { nm:'Потребительский',risk:'mid', base:.012, minT:6,  maxT:18, k:.7,  collateral:false },
    business: { nm:'Бизнес',         risk:'mid', base:.015, minT:8,  maxT:24, k:1.8, collateral:false },
    micro:    { nm:'Микрозайм',      risk:'hi',  base:.03,  minT:2,  maxT:6,  k:.25, collateral:false },
    edu:      { nm:'Образование',    risk:'mid', base:.009, minT:6,  maxT:18, k:.5,  collateral:false }
  };
  var RISK_RU = { lo:'риск низкий', mid:'риск средний', hi:'риск высокий' };
  var QUIZ = [
    { q:'Что такое вклад?', o:['Деньги, которые банк даёт тебе','Деньги, которые ты доверяешь банку под процент','Подарок от банка'], a:1 },
    { q:'На чём банк зарабатывает?', o:['На разнице ставок: кредиты дороже вкладов','Печатает деньги сам','Берёт деньги у государства бесплатно'], a:0 },
    { q:'Что такое процентная ставка?', o:['Размер комнаты в банке','Цена денег: сколько платят за их использование в год','Количество вкладчиков'], a:1 },
    { q:'Чем выше риск кредита, тем ставка обычно…', o:['Ниже','Такая же','Выше'], a:2 },
    { q:'Что такое залог?', o:['Имущество, которое банк заберёт, если кредит не вернут','Первый платёж по кредиту','Название вклада'], a:0 },
    { q:'Что значит «дефолт» заёмщика?', o:['Он досрочно вернул кредит','Он перестал платить по кредиту','Он открыл вклад'], a:1 },
    { q:'Зачем банку резерв денег?', o:['Чтобы вернуть вклады, когда попросят','Чтобы платить меньше налогов','Резерв не нужен'], a:0 },
    { q:'Что такое маржа банка?', o:['Комиссия за перевод','Разница между ставкой по кредитам и по вкладам','Штраф за просрочку'], a:1 },
    { q:'Инфляция — это когда…', o:['Цены растут, деньги дешевеют','Цены падают','Банки закрываются'], a:0 },
    { q:'Диверсификация — это…', o:['Вложить всё в одно место','Раскладывать деньги по разным вложениям','Быстро тратить деньги'], a:1 },
    { q:'Ставка ЦБ влияет на…', o:['Только на погоду','Стоимость денег для всех банков','Цены в одном магазине'], a:1 },
    { q:'Страховка кредита нужна, чтобы…', o:['Кредит стал бесплатным','Снизить потери, если заёмщик не заплатит','Увеличить ставку'], a:1 }
  ];

  /* ---------- состояние ---------- */
  var S = null;          // партия
  var active = false;    // экран банкира открыт (гасит отложенные rerender после ухода)
  var ui = { headOpen:false, showDeps:false, showLoans:false, expApp:{}, chartSel:-1 };

  function save(){ try { if (S) LS.setItem('game_banker_save', JSON.stringify(S)); } catch(e){} }
  function load(){ try { return JSON.parse(LS.getItem('game_banker_save') || 'null'); } catch(e){ return null; } }
  function wipe(){ LS.removeItem('game_banker_save'); }

  function rnd(a, b){ return a + Math.random() * (b - a); }
  function rndi(a, b){ return Math.round(rnd(a, b)); }
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function round1000(n){ return Math.round(n / 1000) * 1000; }

  function initials(nm){
    var w = nm.replace(/ООО |ИП |«|»|\+/g, '').trim().split(/\s+/);
    var s = (w[0] || '??').slice(0, 2).toUpperCase();
    if (w.length > 1) s = w[0][0].toUpperCase() + w[1][0].toUpperCase();
    return s;
  }
  function avaColor(nm){
    var h = 0; for (var i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) % 997;
    return AVA_COLORS[h % AVA_COLORS.length];
  }
  function ava(nm, cls){
    var c = avaColor(nm);
    var dark = document.body.classList.contains('dark');
    return '<div class="b-ava ' + (cls || '') + '" style="background:' + (dark ? c[2] : c[0]) + ';color:' + (dark ? c[3] : c[1]) + '">' + esc(initials(nm)) + '</div>';
  }

  /* ---------- генерация заявок ---------- */
  var appSeq = 1;
  function genDepApp(){
    var nm = pick(DEP_NAMES);
    var vip = Math.random() < .18;
    var amount = round1000(vip ? rnd(400000, 1200000) : rnd(80000, 500000));
    var term = pick([3, 6, 9, 12]);
    var wanted = Math.max(4, Math.round(S.cbRate - rnd(1, 4)));
    return { id: 'd' + (appSeq++), nm: nm, vip: vip, rep: !vip && Math.random() < .2,
             amount: amount, term: term, wanted: wanted, rate: wanted, quizDone: false };
  }
  function genCredApp(){
    var keys = Object.keys(PRODUCTS).filter(function(k){ return S.products[k]; });
    if (!keys.length) keys = ['consumer'];
    var pk = pick(keys), p = PRODUCTS[pk];
    var nm = pick(CRED_NAMES);
    var amount = round1000(rnd(80000, 400000) * p.k + rnd(0, 200000));
    var term = rndi(p.minT, p.maxT);
    var scoring = rndi(1, 5);
    var maxRate = Math.round(S.cbRate + 2 + (p.risk === 'hi' ? rnd(8, 16) : p.risk === 'mid' ? rnd(4, 9) : rnd(2, 6)));
    return { id: 'c' + (appSeq++), nm: nm, prod: pk, amount: amount, term: term,
             scoring: scoring, revealed: false, insured: false, maxRate: maxRate,
             rate: Math.min(maxRate, S.creditRate) };
  }

  /* ---------- новая партия ---------- */
  function newGame(strategy){
    var caps = { safe: 1000000, mid: 750000, bold: 500000 };
    S = {
      strategy: strategy, month: 1, cash: caps[strategy],
      depositRate: 8, creditRate: 14, cbRate: 12,
      economy: 'Норма', ratingScore: strategy === 'bold' ? 62 : 70,
      deposits: [], depApps: [], loans: [], credApps: [], defaults: [],
      bonds: 0, cbDebt: 0, staff: { coll: 0, sec: 0 },
      marketing: {}, products: { mortgage:true, auto:true, consumer:true, business:true, micro:false, edu:true },
      history: [], lastProfit: 0, lastBreak: null, checksUsed: 0
    };
    for (var i = 0; i < (strategy === 'safe' ? 2 : 3); i++) S.depApps.push(genDepApp());
    for (var j = 0; j < (strategy === 'bold' ? 3 : 2); j++) S.credApps.push(genCredApp());
    ui = { headOpen:false, showDeps:false, showLoans:false, expApp:{}, chartSel:-1 };
    save();
  }

  /* ---------- рейтинг ---------- */
  function ratingLetter(){
    var s = S.ratingScore;
    if (s >= 85) return 'A+'; if (s >= 75) return 'A'; if (s >= 65) return 'A−';
    if (s >= 55) return 'B+'; if (s >= 45) return 'B'; if (s >= 35) return 'B−';
    return 'C';
  }
  function ratingWord(){
    var s = S.ratingScore;
    return s >= 65 ? 'надёжный' : s >= 45 ? 'обычный' : 'шаткий';
  }

  /* ---------- месяц ---------- */
  function nextMonth(){
    var br = { depInt:0, loanInt:0, loanBody:0, depBack:0, bonds:0, cbInt:0, salaries:0, mkt:0, defLoss:0, newDef:[] };
    var econF = S.economy === 'Рост' ? .7 : S.economy === 'Кризис' ? 2.1 : 1;
    var secF = Math.max(.55, 1 - S.staff.sec * .22);

    // кредиты: платежи и дефолты
    S.loans.forEach(function(l){
      if (l.left <= 0) return;
      var p = PRODUCTS[l.prod];
      var pDef = p.base * (6 - l.scoring) / 3 * econF * secF;
      if (Math.random() < pDef){
        l.defaulted = true;
        var lost = l.remaining, rec = lost;
        if (l.insured){ var comp = Math.round(lost * .7); S.cash += comp; br.defLoss -= comp; rec = lost - comp; }
        br.defLoss += lost;
        S.defaults.push({ id: l.id, nm: l.nm, prod: l.prod, lost: rec, collateral: p.collateral });
        br.newDef.push(l.nm);
        S.ratingScore -= 4;
        return;
      }
      var interest = Math.round(l.remaining * (l.rate / 100) / 12);
      var body = Math.min(l.remaining, Math.round(l.principal / l.term));
      S.cash += interest + body;
      l.remaining -= body; l.left--;
      br.loanInt += interest; br.loanBody += body;
      if (l.left <= 0 || l.remaining <= 0){ l.done = true; }
    });
    S.loans = S.loans.filter(function(l){ return !l.done && !l.defaulted; });

    // вклады: проценты и возвраты
    S.deposits.forEach(function(d){
      var interest = Math.round(d.amount * (d.rate / 100) / 12);
      S.cash -= interest; br.depInt += interest;
      d.left--;
      if (d.left <= 0){ S.cash -= d.amount; br.depBack += d.amount; d.done = true; }
    });
    S.deposits = S.deposits.filter(function(d){ return !d.done; });

    // облигации
    if (S.bonds > 0){
      var by = Math.round(S.bonds * ((S.cbRate - 2) / 100) / 12);
      S.cash += by; br.bonds = by;
    }
    // долг ЦБ
    if (S.cbDebt > 0){
      var ci = Math.round(S.cbDebt * ((S.cbRate + 2) / 100) / 12);
      var cb = Math.min(S.cbDebt, Math.round((S.cbDebtStart || S.cbDebt) / 12));
      S.cash -= ci + cb; S.cbDebt -= cb;
      br.cbInt = ci; br.cbBody = cb;
    }
    // зарплаты
    br.salaries = S.staff.coll * 15000 + S.staff.sec * 20000;
    S.cash -= br.salaries;

    // маркетинг: продлить кампании
    Object.keys(S.marketing).forEach(function(k){
      S.marketing[k]--;
      if (S.marketing[k] <= 0) delete S.marketing[k];
    });

    // экономика и ставка ЦБ
    var r = Math.random();
    if (S.economy === 'Норма'){ if (r < .12) S.economy = 'Кризис'; else if (r < .35) S.economy = 'Рост'; }
    else if (S.economy === 'Рост'){ if (r < .25) S.economy = 'Норма'; }
    else { if (r < .35) S.economy = 'Норма'; }
    S.cbRate = Math.max(6, Math.min(20, S.cbRate + pick([-1, 0, 0, 0, 1]) + (S.economy === 'Кризис' ? 1 : 0)));

    // новые заявки
    var depN = 1 + (Math.random() < .5 ? 1 : 0) + (S.marketing.social ? 2 : 0) + (S.marketing.tv ? 2 : 0);
    var credN = 1 + (Math.random() < .5 ? 1 : 0) + (S.marketing.outdoor ? 2 : 0) + (S.marketing.tv ? 2 : 0);
    if (S.economy === 'Рост'){ credN++; }
    if (S.economy === 'Кризис'){ depN = Math.max(0, depN - 1); }
    if (S.ratingScore < 45){ depN = Math.max(0, depN - 1); }
    S.depApps = S.depApps.slice(-2);
    S.credApps = S.credApps.slice(-2);
    for (var i = 0; i < Math.min(depN, 3); i++) S.depApps.push(genDepApp());
    for (var j = 0; j < Math.min(credN, 3); j++) S.credApps.push(genCredApp());

    // прибыль месяца
    var profit = br.loanInt + br.bonds - br.depInt - br.salaries - br.cbInt - br.defLoss;
    S.lastProfit = profit;
    S.history.push({ m: S.month, p: profit });
    if (S.history.length > 12) S.history.shift();
    S.lastBreak = br;

    // рейтинг
    S.ratingScore += profit > 0 ? 1 : -1;
    if (S.cbDebt > 0) S.ratingScore -= 1;
    S.ratingScore = Math.max(10, Math.min(98, S.ratingScore));

    S.month++;
    ui.chartSel = -1;
    save();
    if (br.newDef.length) sfx.warn(); else if (profit > 0) sfx.cash(); else sfx.bad();

    // банкротство
    if (S.cash < -300000){
      renderMain();
      A.sheet(
        '<div class="icn" style="background:rgba(229,72,77,.14);color:var(--ertx)">!</div>' +
        '<div class="h">Банк разорился</div>' +
        '<div class="p">Наличность ушла глубоко в минус, и ЦБ отозвал лицензию. Ты продержался ' + (S.month - 1) + ' мес. Попробуй ещё раз — теперь зная, как работают ставки.</div>' +
        '<div class="btn ac" id="bk-new">Новая партия</div>' +
        '<div class="btn dim" id="bk-exit">В меню</div>');
      wipe(); S = null;
      document.getElementById('bk-new').onclick = function(){ A.closeSheet(); renderStart(); };
      document.getElementById('bk-exit').onclick = function(){ A.closeSheet(); A.go('home'); };
      return;
    }
    renderMain();
    if (S.cash < 0){
      toast('Наличность в минусе — возьми заём ЦБ или жди платежи');
    }
  }

  /* ---------- тост ---------- */
  var toastTimer = null;
  function toast(msg){
    var t = document.querySelector('.toast');
    if (!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(function(){ t.classList.add('on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('on'); }, 2600);
  }

  /* ---------- экран: старт ---------- */
  function renderStart(){
    var bs = load();
    var contHtml = '';
    if (bs){
      var pr = bs.lastProfit || 0;
      contHtml = '<div class="bs-cont" id="bs-cont"><div style="flex:1">' +
        '<div class="t">Продолжить</div>' +
        '<div class="s">Месяц ' + bs.month + ' · прибыль <b>' + (pr >= 0 ? '+' : '') + rub(pr) + '</b></div></div>' +
        '<div class="play" style="width:46px;height:46px;border-radius:15px;background:#FFC91F;display:flex;align-items:center;justify-content:center"><div class="tri-r"></div></div></div>';
    }
    function dots(n, color){
      var h = '<span class="risk-dots">';
      for (var i = 0; i < 3; i++) h += '<i' + (i < n ? ' style="background:' + color + '"' : '') + '></i>';
      return h + '</span>';
    }
    document.getElementById('app').innerHTML =
      '<div class="scr bs-scr">' +
        '<div class="bs-top"><div class="ib" id="bs-back"><div class="back-ch"></div></div>' +
          '<div class="bs-how" id="bs-how">Как играть</div></div>' +
        '<div style="margin-top:26px"><div class="bs-logo">₽</div>' +
          '<div class="bs-name">БАНКИР</div>' +
          '<div class="bs-slogan">Принимай вклады, выдавай кредиты, зарабатывай на разнице ставок.</div></div>' +
        contHtml +
        '<div class="bs-div"><i></i><span>' + (bs ? 'или новая партия' : 'выбери стратегию') + '</span><i></i></div>' +
        '<div class="bs-strat" data-s="safe"><div style="flex:1">' +
          '<div><span class="nm">Осторожная</span>' + dots(1, 'var(--ok)') + '</div>' +
          '<div class="ds">Большой запас, скромные ставки, ровный рост</div></div>' +
          '<div style="text-align:right"><div class="cap">1 000 000 ₽</div><div class="rk" style="color:var(--oktx)">риск низкий</div></div></div>' +
        '<div class="bs-strat" data-s="mid"><div style="flex:1">' +
          '<div><span class="nm">Сбалансированная</span>' + dots(2, 'var(--wa)') + '</div>' +
          '<div class="ds">Золотая середина: умеренный риск и доход</div></div>' +
          '<div style="text-align:right"><div class="cap">750 000 ₽</div><div class="rk" style="color:var(--watx)">риск средний</div></div></div>' +
        '<div class="bs-strat" data-s="bold"><div style="flex:1">' +
          '<div><span class="nm">Агрессивная</span>' + dots(3, 'var(--er)') + '</div>' +
          '<div class="ds">Мало денег — смелые ставки и быстрые решения</div></div>' +
          '<div style="text-align:right"><div class="cap">500 000 ₽</div><div class="rk" style="color:var(--ertx)">риск высокий</div></div></div>' +
        '<div class="bs-foot">Обучающие вопросы о деньгах — по ходу игры</div>' +
      '</div>';
    document.getElementById('bs-back').onclick = function(){ A.go('home'); };
    document.getElementById('bs-how').onclick = showHelp;
    if (bs) document.getElementById('bs-cont').onclick = function(){ S = bs; sfx.click(); renderMain(); };
    Array.prototype.forEach.call(document.querySelectorAll('.bs-strat'), function(el){
      el.onclick = function(){
        var st = el.getAttribute('data-s');
        if (bs){
          A.sheet(
            '<div class="icn" style="background:rgba(229,72,77,.14);color:var(--ertx)">!</div>' +
            '<div class="h">Начать заново?</div>' +
            '<div class="p">Текущая партия (месяц ' + bs.month + ') будет удалена.</div>' +
            '<div class="btn danger" id="ny">Начать новую</div><div class="btn dim" id="nn">Отмена</div>');
          document.getElementById('ny').onclick = function(){ A.closeSheet(); newGame(st); sfx.cash(); renderMain(); };
          document.getElementById('nn').onclick = A.closeSheet;
        } else { newGame(st); sfx.cash(); renderMain(); }
      };
    });
  }

  /* ---------- экран: главный ---------- */
  function scrollKeep(fn){
    var y = window.scrollY;
    fn();
    window.scrollTo(0, y);
  }
  function rerender(){ if (!active) return; scrollKeep(renderMain); save(); }

  function renderMain(){
    if (!active) return;
    if (!S){ renderStart(); return; }
    var margin = S.creditRate - S.depositRate;
    var depSum = S.deposits.reduce(function(a, d){ return a + d.amount; }, 0);
    var loanSum = S.loans.reduce(function(a, l){ return a + l.remaining; }, 0);
    var pr = S.lastProfit || 0;
    var mName = MONTHS[(S.month - 1) % 12], yr = Math.floor((S.month - 1) / 12) + 1;

    var h = '<div class="b-scr scr">';
    /* шапка */
    h += '<div class="bh"><div class="bh-row">' +
      '<div class="ib" id="b-back"><div class="back-ch"></div></div>' +
      '<div class="bh-m"><div class="t">Месяц ' + S.month + '</div><div class="s">' + mName + ' · ' + yr + '-й год</div></div>' +
      '<div class="bh-rate" id="b-ratechip"><div class="star"></div><b>' + ratingLetter() + '</b></div>' +
      '<div class="ib" id="b-theme" style="width:38px;height:38px;border-radius:12px"><div style="width:15px;height:15px;border-radius:50%;background:var(--ac);box-shadow:inset -4px -4px 0 rgba(25,27,32,.2)"></div></div>' +
    '</div>' +
    '<div class="bh-cash-row"><div><div class="bh-cash-cap">НАЛИЧНОСТЬ</div><div class="bh-cash">' + rub(S.cash) + '</div></div>' +
      '<div class="bh-prof ' + (pr >= 0 ? 'pos' : 'neg') + '">' + (pr >= 0 ? '+' : '') + rub(pr) + ' / мес</div></div>';
    if (ui.headOpen){
      h += '<div class="bh-stats">' +
        '<div class="bh-stat"><div class="c">СУММА ВКЛАДОВ</div><div class="v">' + rub(depSum) + '</div></div>' +
        '<div class="bh-stat"><div class="c">СУММА КРЕДИТОВ</div><div class="v">' + rub(loanSum) + '</div></div>' +
        '<div class="bh-stat"><div class="c">СТАВКА ЦБ</div><div class="v">' + S.cbRate + '%</div></div>' +
        '<div class="bh-stat"><div class="c">ЭКОНОМИКА</div><div class="v ' + (S.economy === 'Рост' ? 'ok' : S.economy === 'Кризис' ? 'er' : '') + '">' +
          (S.economy === 'Рост' ? 'Рост ↑' : S.economy === 'Кризис' ? 'Кризис ↓' : 'Норма') + '</div></div>' +
        '<div class="bh-stat"><div class="c">ОБЛИГАЦИИ</div><div class="v">' + rub(S.bonds) + '</div></div>' +
        '<div class="bh-stat"><div class="c">СОТРУДНИКИ</div><div class="v">' + (S.staff.coll + S.staff.sec) + '</div></div>' +
        '<div class="bh-stat"><div class="c">ДОЛГ ПЕРЕД ЦБ</div><div class="v' + (S.cbDebt > 0 ? ' er' : '') + '">' + rub(S.cbDebt) + '</div></div>' +
        '<div class="bh-stat"><div class="c">РЕЙТИНГ БАНКА</div><div class="v ac">' + ratingLetter() + ' · ' + ratingWord() + '</div></div>' +
      '</div><div class="bh-more" id="b-more">свернуть ⌃</div>';
    } else {
      h += '<div class="bh-more" id="b-more">подробнее ⌄</div>';
    }
    h += '</div>';

    h += '<div class="b-inner">';
    /* ставки */
    h += '<div class="b-card">' +
      '<div class="b-rate-head"><span class="nm">По вкладам</span><span class="b-tag exp">ваш расход</span><span class="val">' + S.depositRate + '%</span></div>' +
      slider('dep', S.depositRate) +
      '<div class="b-margin"><span>маржа = ' + S.creditRate + '% − ' + S.depositRate + '% =</span><b' + (margin < 0 ? ' class="neg"' : '') + '>' + margin + '%</b></div>' +
      '<div class="b-rate-head"><span class="nm">По кредитам</span><span class="b-tag inc">ваш доход</span><span class="val">' + S.creditRate + '%</span></div>' +
      slider('cred', S.creditRate) +
    '</div>';
    /* следующий месяц */
    h += '<div class="b-next-row"><div class="b-next" id="b-next">Следующий месяц<i></i></div>' +
      '<div class="b-balance" id="b-balance">Баланс</div></div>';
    /* инструменты */
    var mkN = Object.keys(S.marketing).length;
    h += '<div class="b-tools">' +
      tool('products', 'Продукты', '▦') +
      tool('marketing', 'Маркетинг', '◨', mkN ? mkN : 0) +
      tool('staff', 'Сотрудники', '◉', (S.staff.coll + S.staff.sec) || 0) +
      tool('bonds', 'Облигации', '▤') +
      tool('cb', 'Заём ЦБ', '▲') +
      tool('help', 'Как играть', '?') +
    '</div>';

    /* вкладчики */
    h += '<div class="b-sec"><span class="h">Вкладчики</span><span class="r">вклады ' + rub(depSum) + '</span></div>';
    h += '<div class="b-lab">НОВЫЕ ЗАЯВКИ · ' + S.depApps.length + '</div>';
    if (!S.depApps.length) h += '<div class="b-list"><div class="rec-empty">Заявок нет — придут в следующем месяце</div></div>';
    S.depApps.forEach(function(app, i){
      h += (i === 0 || ui.expApp[app.id]) ? depAppFull(app) : depAppCompact(app);
    });
    h += '<div class="b-lab" style="padding-top:4px">ТЕКУЩИЕ ВКЛАДЫ · ' + S.deposits.length + '</div>';
    h += '<div class="b-list">';
    if (!S.deposits.length) h += '<div class="rec-empty">Пока нет вкладов</div>';
    var depShow = ui.showDeps ? S.deposits : S.deposits.slice(0, 2);
    depShow.forEach(function(d){
      h += '<div class="b-lrow">' + ava(d.nm, 'xs') +
        '<div class="mid"><div class="nm">' + esc(d.nm) + '</div><div class="sub">ещё ' + d.left + ' мес</div></div>' +
        '<div><div class="amt">' + rub(d.amount) + ' · ' + d.rate + '%</div>' +
        '<div class="pay exp">−' + fmt(Math.round(d.amount * d.rate / 100 / 12)) + ' ₽/мес</div></div></div>';
    });
    if (S.deposits.length > 2) h += '<div class="b-more" id="b-depmore">' + (ui.showDeps ? 'свернуть ⌃' : 'ещё ' + (S.deposits.length - 2) + ' ⌄') + '</div>';
    h += '</div>';

    /* кредиты */
    h += '<div class="b-sec"><span class="h">Кредиты</span><span class="r">выдано ' + rub(loanSum) + '</span></div>';
    h += '<div class="b-lab">ЗАЯВКИ · ' + S.credApps.length + '</div>';
    if (!S.credApps.length) h += '<div class="b-list"><div class="rec-empty">Заявок нет — помогает маркетинг</div></div>';
    S.credApps.forEach(function(app, i){
      h += (i === 0 || ui.expApp[app.id]) ? credAppFull(app) : credAppCompact(app);
    });
    h += '<div class="b-lab" style="padding-top:4px">АКТИВНЫЕ · ' + S.loans.length + '</div>';
    h += '<div class="b-list">';
    if (!S.loans.length) h += '<div class="rec-empty">Кредитов пока нет</div>';
    var loanShow = ui.showLoans ? S.loans : S.loans.slice(0, 2);
    loanShow.forEach(function(l){
      var paid = l.principal - l.remaining;
      var pc = Math.round(paid / l.principal * 100);
      h += '<div class="b-loanrow"><div class="top"><span class="nm">' + esc(l.nm) + '</span>' +
        '<span class="tp">' + PRODUCTS[l.prod].nm.toLowerCase() + ' · ' + l.rate + '%</span>' +
        '<span class="amt">' + fmt(paid) + ' / ' + fmt(l.principal) + ' ₽</span></div>' +
        '<div class="bar-row"><div class="bar"><i style="width:' + pc + '%"></i></div><span class="left">ещё ' + l.left + ' мес</span></div></div>';
    });
    if (S.loans.length > 2) h += '<div class="b-more" id="b-loanmore">' + (ui.showLoans ? 'свернуть ⌃' : 'ещё ' + (S.loans.length - 2) + ' ⌄') + '</div>';
    h += '</div>';

    /* дефолты */
    if (S.defaults.length){
      h += '<div class="b-lab er" id="b-defs" style="padding-top:4px">ДЕФОЛТЫ · ' + S.defaults.length + '</div>';
      S.defaults.forEach(function(d){
        h += '<div class="b-def"><div class="b-prow">' + ava(d.nm) +
          '<div style="flex:1"><div class="b-pname"><span class="nm">' + esc(d.nm) + '</span></div>' +
          '<div class="lost">потеряно ' + rub(d.lost) + '</div></div>' +
          '<span class="prodtag">' + PRODUCTS[d.prod].nm.toLowerCase() + '</span></div>' +
          '<div class="b-def-acts">' +
            '<div class="b-def-act' + (d.collateral ? '' : ' na') + '" data-a="pledge" data-id="' + d.id + '">Изъять залог</div>' +
            '<div class="b-def-act" data-a="restr" data-id="' + d.id + '">Реструктуризация</div>' +
            '<div class="b-def-act" data-a="court" data-id="' + d.id + '">Суд</div>' +
            '<div class="b-def-act" data-a="coll" data-id="' + d.id + '">Коллекторам</div>' +
            '<div class="b-def-act dim" data-a="writeoff" data-id="' + d.id + '">Списать</div>' +
          '</div></div>';
      });
    }

    /* график */
    h += chartHtml();

    /* баннер просрочки */
    if (S.defaults.length){
      var d0 = S.defaults[0];
      h += '<div class="b-overdue" id="b-overdue"><div class="ic">!</div>' +
        '<div><div class="t">Просрочка (' + S.defaults.length + ')</div>' +
        '<div class="s">' + esc(d0.nm) + ' · ' + rub(d0.lost) + '</div></div>' +
        '<div class="act">Взыскать</div></div>';
    }
    h += '</div></div>';

    document.getElementById('app').innerHTML = h;
    bindMain();
  }

  function tool(id, nm, icon, badge){
    return '<div class="b-tool" data-tool="' + id + '">' +
      (badge ? '<div class="badge">' + badge + '</div>' : '') +
      '<div class="ic">' + icon + '</div><span>' + nm + '</span></div>';
  }
  function slider(kind, val){
    var min = 1, max = 30;
    var pc = (val - min) / (max - min) * 100;
    return '<div class="b-slider" data-k="' + kind + '"><div class="tr"><div class="fill" style="width:' + pc + '%"></div></div>' +
      '<div class="knob" style="left:' + pc + '%"></div></div>';
  }
  function depAppFull(app){
    return '<div class="b-app" data-app="' + app.id + '">' +
      '<div class="b-prow">' + ava(app.nm) +
        '<div style="flex:1"><div class="b-pname"><span class="nm">' + esc(app.nm) + '</span>' +
          (app.vip ? '<span class="b-badge vip">VIP</span>' : '') +
          (app.rep ? '<span class="b-badge rep">повторный</span>' : '') + '</div>' +
        '<div class="b-cond">' + rub(app.amount) + ' · ' + app.term + ' мес · хочет ' + app.wanted + '%</div></div></div>' +
      '<div class="b-stepper"><span class="lb">Ваша ставка</span><div class="v">' +
        '<div class="b-step" data-st="-1" data-id="' + app.id + '">−</div>' +
        '<span class="b-rateval">' + app.rate + '%</span>' +
        '<div class="b-step" data-st="1" data-id="' + app.id + '">+</div></div></div>' +
      '<div class="b-quiz' + (app.quizDone ? ' done' : '') + '" data-quiz="' + app.id + '">' +
        '<div class="q">?</div><span class="t">' + (app.quizDone ? 'Викторина пройдена' : 'Викторина: верный ответ — ставка вкладчику вдвое ниже') + '</span>' +
        '<div class="chev-r" style="border-color:var(--acink)"></div></div>' +
      '<div class="b-acts"><div class="b-accept" data-acc="' + app.id + '">Принять под ' + app.rate + '%</div>' +
      '<div class="b-decline" data-dec="' + app.id + '">Отклонить</div></div></div>';
  }
  function depAppCompact(app){
    return '<div class="b-capp">' + ava(app.nm, 'sm') +
      '<div class="mid" data-exp="' + app.id + '"><div class="b-pname"><span class="nm sm">' + esc(app.nm) + '</span>' +
        (app.vip ? '<span class="b-badge vip">VIP</span>' : '') + (app.rep ? '<span class="b-badge rep">повторный</span>' : '') + '</div>' +
      '<div class="b-cond" style="font-size:12px">' + rub(app.amount) + ' · ' + app.term + ' мес · хочет ' + app.wanted + '%</div></div>' +
      '<div class="b-qbtn ok" data-acc="' + app.id + '" data-quick="1"><i></i></div>' +
      '<div class="b-qbtn no" data-dec="' + app.id + '">✕</div></div>';
  }
  function credAppFull(app){
    var p = PRODUCTS[app.prod];
    var bars = '';
    for (var i = 1; i <= 5; i++) bars += '<i' + (i <= app.scoring ? ' class="on"' : '') + '></i>';
    return '<div class="b-app" data-app="' + app.id + '">' +
      '<div class="b-prow">' + ava(app.nm) +
        '<div style="flex:1"><div class="b-pname"><span class="nm">' + esc(app.nm) + '</span>' +
          '<span class="b-badge prod">' + p.nm + '</span><span class="b-risk ' + p.risk + '">' + RISK_RU[p.risk] + '</span></div>' +
        '<div class="b-cond">' + rub(app.amount) + ' · ' + app.term + ' мес</div></div></div>' +
      '<div class="b-scoring"><span class="lb">Скоринг</span><div class="bars">' + bars + '</div>' +
        '<span class="n">' + app.scoring + '/5</span></div>' +
      (app.revealed ? '<div class="bm-warn" style="padding:8px 12px"><div class="i">i</div><span class="t">Проверка: шанс невозврата ≈ ' +
        Math.round(p.base * (6 - app.scoring) / 3 * 100 * app.term / 10) * 10 / 10 + '% за срок</span></div>' : '') +
      '<div class="b-mini-acts">' +
        '<div class="b-mini-act' + (app.revealed ? ' used' : '') + '" data-check="' + app.id + '">' + (app.revealed ? 'Проверено' : 'Проверить · 5 000 ₽') + '</div>' +
        '<div class="b-mini-act' + (app.insured ? ' used' : '') + '" data-ins="' + app.id + '">' + (app.insured ? 'Застраховано' : 'Застраховать · 2%') + '</div></div>' +
      '<div class="b-stepper"><span class="lb">Ваша ставка</span><div class="v">' +
        '<div class="b-step" data-st="-1" data-id="' + app.id + '">−</div>' +
        '<span class="b-rateval">' + app.rate + '%</span>' +
        '<div class="b-step" data-st="1" data-id="' + app.id + '">+</div></div></div>' +
      '<div class="b-acts"><div class="b-accept" data-acc="' + app.id + '">Выдать под ' + app.rate + '%</div>' +
      '<div class="b-decline" data-dec="' + app.id + '">Отклонить</div></div></div>';
  }
  function credAppCompact(app){
    var p = PRODUCTS[app.prod];
    return '<div class="b-capp">' + ava(app.nm, 'sm') +
      '<div class="mid" data-exp="' + app.id + '"><div class="b-pname"><span class="nm sm">' + esc(app.nm) + '</span>' +
        '<span class="b-badge prod">' + p.nm + '</span></div>' +
      '<div class="b-cond" style="font-size:12px">' + rub(app.amount) + ' · ' + app.term + ' мес · скоринг ' + app.scoring + '/5</div></div>' +
      '<div class="b-qbtn ok" data-exp2="' + app.id + '"><i style="border:none;width:auto;height:auto;transform:none;margin:0;font:700 12px Golos Text;color:var(--oktx)">⌄</i></div>' +
      '<div class="b-qbtn no" data-dec="' + app.id + '">✕</div></div>';
  }
  function chartHtml(){
    var hist = S.history;
    var maxAbs = 1;
    hist.forEach(function(r){ maxAbs = Math.max(maxAbs, Math.abs(r.p)); });
    var pos = '', neg = '', lab = '';
    var slots = [];
    for (var i = 0; i < 12; i++){
      slots.push(hist[hist.length - 12 + i] || null);
    }
    var selIdx = ui.chartSel >= 0 ? ui.chartSel : (hist.length ? 11 : -1);
    slots.forEach(function(r, i){
      var sel = i === selIdx && r;
      if (r && r.p > 0){
        pos += '<div data-ch="' + i + '" class="' + (sel ? 'sel' : '') + '" style="height:' + Math.max(6, Math.round(r.p / maxAbs * 84)) + 'px"></div>';
        neg += '<div class="empty"></div>';
      } else if (r && r.p < 0){
        pos += '<div class="empty"></div>';
        neg += '<div data-ch="' + i + '" style="height:' + Math.max(5, Math.round(-r.p / maxAbs * 20)) + 'px"></div>';
      } else {
        pos += '<div class="empty"></div>'; neg += '<div class="empty"></div>';
      }
      lab += '<div class="' + (sel ? 'sel' : '') + '">' + (r ? r.m : '·') + '</div>';
    });
    var tipR = selIdx >= 0 && slots[selIdx] ? slots[selIdx] : null;
    var tip = tipR ? '<div class="b-tip">мес ' + tipR.m + ' · ' + (tipR.p >= 0 ? '+' : '') + rub(tipR.p) + '</div>' : '';
    return '<div class="b-chart-card"><div class="b-chart-head"><span class="h">История прибыли</span><span class="r">12 мес</span></div>' +
      '<div class="b-chart">' + tip +
        '<div class="b-bars-pos" id="b-chart-pos">' + pos + '</div>' +
        '<div class="b-axis"></div>' +
        '<div class="b-bars-neg" id="b-chart-neg">' + neg + '</div>' +
        '<div class="b-xlab">' + lab + '</div>' +
      '</div><div class="b-chart-note">Тап по столбику показывает сумму месяца</div></div>';
  }

  /* ---------- обработчики главного ---------- */
  function findApp(id){
    var list = id[0] === 'd' ? S.depApps : S.credApps;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function removeApp(id){
    if (id[0] === 'd') S.depApps = S.depApps.filter(function(a){ return a.id !== id; });
    else S.credApps = S.credApps.filter(function(a){ return a.id !== id; });
    delete ui.expApp[id];
  }

  function bindMain(){
    document.getElementById('b-back').onclick = function(){ save(); A.go('home'); };
    document.getElementById('b-theme').onclick = function(){ sfx.click(); A.toggleTheme(); rerender(); };
    document.getElementById('b-more').onclick = function(){ ui.headOpen = !ui.headOpen; sfx.click(); rerender(); };
    document.getElementById('b-ratechip').onclick = function(){
      toast('Рейтинг ' + ratingLetter() + ' (' + ratingWord() + ') — влияет на поток вкладчиков');
    };
    document.getElementById('b-next').onclick = function(){ sfx.click(); nextMonth(); };
    document.getElementById('b-balance').onclick = showBalance;
    var dm = document.getElementById('b-depmore'); if (dm) dm.onclick = function(){ ui.showDeps = !ui.showDeps; rerender(); };
    var lm = document.getElementById('b-loanmore'); if (lm) lm.onclick = function(){ ui.showLoans = !ui.showLoans; rerender(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function(el){
      el.onclick = function(){ sfx.click(); openTool(el.getAttribute('data-tool')); };
    });
    /* слайдеры: во время жеста обновляем только эту карточку, полный rerender — по отпусканию */
    Array.prototype.forEach.call(document.querySelectorAll('.b-slider'), function(el){
      var kind = el.getAttribute('data-k');
      var rect = null;
      function liveUpdate(){
        var margin = S.creditRate - S.depositRate;
        Array.prototype.forEach.call(document.querySelectorAll('.b-slider'), function(s){
          var k = s.getAttribute('data-k');
          var v = k === 'dep' ? S.depositRate : S.creditRate;
          var pc = (v - 1) / 29 * 100;
          s.querySelector('.fill').style.width = pc + '%';
          s.querySelector('.knob').style.left = pc + '%';
        });
        var heads = document.querySelectorAll('.b-rate-head .val');
        if (heads[0]) heads[0].textContent = S.depositRate + '%';
        if (heads[1]) heads[1].textContent = S.creditRate + '%';
        var mg = document.querySelector('.b-margin');
        if (mg) mg.innerHTML = '<span>маржа = ' + S.creditRate + '% − ' + S.depositRate + '% =</span><b' +
          (margin < 0 ? ' class="neg"' : '') + '>' + margin + '%</b>';
      }
      function setFromX(clientX){
        var r = rect || el.getBoundingClientRect();
        var pc = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        var val = Math.round(1 + pc * 29);
        if (kind === 'dep') S.depositRate = val; else S.creditRate = val;
        liveUpdate();
      }
      el.addEventListener('touchstart', function(){ rect = el.getBoundingClientRect(); }, { passive:true });
      el.addEventListener('touchmove', function(e){ e.preventDefault(); if (e.touches[0]) setFromX(e.touches[0].clientX); }, { passive:false });
      el.addEventListener('touchend', function(){ rect = null; sfx.click(); save(); }, { passive:true });
      el.addEventListener('click', function(e){ setFromX(e.clientX); sfx.click(); save(); });
    });
    /* степперы ставок заявок */
    Array.prototype.forEach.call(document.querySelectorAll('.b-step'), function(el){
      el.onclick = function(){
        var app = findApp(el.getAttribute('data-id'));
        if (!app) return;
        app.rate = Math.max(1, Math.min(40, app.rate + parseInt(el.getAttribute('data-st'), 10)));
        sfx.click(); rerender();
      };
    });
    /* раскрыть компактную заявку */
    Array.prototype.forEach.call(document.querySelectorAll('[data-exp],[data-exp2]'), function(el){
      el.onclick = function(){
        var id = el.getAttribute('data-exp') || el.getAttribute('data-exp2');
        ui.expApp[id] = true; sfx.click(); rerender();
      };
    });
    /* викторина */
    Array.prototype.forEach.call(document.querySelectorAll('[data-quiz]'), function(el){
      el.onclick = function(){ openQuiz(el.getAttribute('data-quiz')); };
    });
    /* проверка и страховка кредита */
    Array.prototype.forEach.call(document.querySelectorAll('[data-check]'), function(el){
      el.onclick = function(){
        var app = findApp(el.getAttribute('data-check'));
        if (!app || app.revealed) return;
        if (S.cash < 5000){ toast('Не хватает денег на проверку'); return; }
        S.cash -= 5000; app.revealed = true; sfx.click(); rerender();
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ins]'), function(el){
      el.onclick = function(){
        var app = findApp(el.getAttribute('data-ins'));
        if (!app || app.insured) return;
        var cost = Math.round(app.amount * .02);
        if (S.cash < cost){ toast('Не хватает денег на страховку'); return; }
        S.cash -= cost; app.insured = true; sfx.click(); rerender();
      };
    });
    /* принять / отклонить */
    Array.prototype.forEach.call(document.querySelectorAll('[data-acc]'), function(el){
      el.onclick = function(){ accept(el.getAttribute('data-acc'), el.hasAttribute('data-quick')); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dec]'), function(el){
      el.onclick = function(){ removeApp(el.getAttribute('data-dec')); sfx.click(); rerender(); };
    });
    /* дефолты */
    Array.prototype.forEach.call(document.querySelectorAll('.b-def-act'), function(el){
      el.onclick = function(){ resolveDefault(el.getAttribute('data-id'), el.getAttribute('data-a')); };
    });
    /* график */
    Array.prototype.forEach.call(document.querySelectorAll('[data-ch]'), function(el){
      el.onclick = function(){ ui.chartSel = parseInt(el.getAttribute('data-ch'), 10); rerender(); };
    });
    /* баннер просрочки */
    var ob = document.getElementById('b-overdue');
    if (ob) ob.onclick = function(){
      var t = document.getElementById('b-defs');
      if (t) t.scrollIntoView({ behavior:'smooth', block:'center' });
    };
  }

  function accept(id, quick){
    var app = findApp(id);
    if (!app) return;
    if (id[0] === 'd'){
      var r = quick ? app.wanted : app.rate;
      if (r < app.wanted){
        var pAgree = 1 - (app.wanted - r) * .25;
        if (Math.random() > pAgree){
          removeApp(id); sfx.bad(); toast(app.nm + ' отказался: ставка слишком низкая'); rerender(); return;
        }
      }
      S.deposits.push({ nm: app.nm, amount: app.amount, rate: r, left: app.term });
      S.cash += app.amount;
      removeApp(id); sfx.cash(); rerender();
    } else {
      if (S.cash < app.amount){ toast('Не хватает наличности — возьми заём ЦБ'); sfx.bad(); return; }
      if (app.rate > app.maxRate){
        var pA = 1 - (app.rate - app.maxRate) * .3;
        if (Math.random() > pA){
          removeApp(id); sfx.bad(); toast(app.nm + ' отказался: ставка слишком высокая'); rerender(); return;
        }
      }
      S.loans.push({ id: 'l' + (appSeq++), nm: app.nm, prod: app.prod, principal: app.amount, remaining: app.amount,
        rate: app.rate, term: app.term, left: app.term, scoring: app.scoring, insured: app.insured });
      S.cash -= app.amount;
      removeApp(id); sfx.cash(); rerender();
    }
  }

  function resolveDefault(id, action){
    var d = null;
    S.defaults.forEach(function(x){ if (x.id === id) d = x; });
    if (!d) return;
    var got = 0, msg = '';
    var collBonus = 1 + S.staff.coll * .15;
    if (action === 'pledge'){ got = Math.round(d.lost * .6); msg = 'Залог продан: вернули ' + rub(got); }
    else if (action === 'restr'){
      S.loans.push({ id: 'l' + (appSeq++), nm: d.nm, prod: d.prod, principal: Math.round(d.lost * .7),
        remaining: Math.round(d.lost * .7), rate: S.creditRate, term: 6, left: 6, scoring: 2, insured: false });
      msg = 'Реструктуризация: 70% долга вернулись в график';
    }
    else if (action === 'court'){
      if (S.cash < 10000){ toast('На суд нужно 10 000 ₽'); return; }
      S.cash -= 10000; got = Math.round(d.lost * .5 * collBonus); msg = 'Суд выигран: вернули ' + rub(got);
    }
    else if (action === 'coll'){ got = Math.round(d.lost * .4 * collBonus); msg = 'Коллекторы выкупили долг: ' + rub(got); }
    else { msg = 'Долг списан'; }
    got = Math.min(got, d.lost);
    S.cash += got;
    S.defaults = S.defaults.filter(function(x){ return x.id !== id; });
    S.ratingScore += 2;
    if (got > 0) sfx.cash(); else sfx.click();
    toast(msg);
    rerender();
  }

  /* ---------- викторина ---------- */
  function openQuiz(id){
    var app = findApp(id);
    if (!app || app.quizDone) return;
    var q = pick(QUIZ);
    var oh = '';
    q.o.forEach(function(o, i){ oh += '<div class="bm-quiz-opt" data-o="' + i + '">' + esc(o) + '</div>'; });
    A.sheet(
      '<div class="bm-head"><div><div class="h">Викторина</div><div class="s">Ответишь верно — ' + esc(app.nm) + ' согласится на ставку вдвое ниже</div></div>' +
      '<div class="bm-x" id="q-x">✕</div></div>' +
      '<div class="bm-quiz-q">' + esc(q.q) + '</div>' + oh);
    document.getElementById('q-x').onclick = A.closeSheet;
    Array.prototype.forEach.call(document.querySelectorAll('.bm-quiz-opt'), function(el){
      el.onclick = function(){
        var i = parseInt(el.getAttribute('data-o'), 10);
        app.quizDone = true;
        Array.prototype.forEach.call(document.querySelectorAll('.bm-quiz-opt'), function(x, xi){
          x.style.pointerEvents = 'none';
          if (xi === q.a) x.classList.add('right');
        });
        if (i === q.a){
          app.wanted = Math.max(2, Math.round(app.wanted / 2));
          app.rate = Math.min(app.rate, app.wanted);
          sfx.cash();
          setTimeout(function(){ A.closeSheet(); toast('Верно! Теперь ' + app.nm + ' хочет всего ' + app.wanted + '%'); rerender(); }, 900);
        } else {
          el.classList.add('wrong');
          sfx.bad();
          setTimeout(function(){ A.closeSheet(); toast('Неверно. Правильный ответ подсвечен'); rerender(); }, 1400);
        }
      };
    });
  }

  /* ---------- инструменты ---------- */
  function openTool(t){
    if (t === 'help') return showHelp();
    if (t === 'marketing') return showMarketing();
    if (t === 'cb') return showCB();
    if (t === 'bonds') return showBonds();
    if (t === 'staff') return showStaff();
    if (t === 'products') return showProducts();
  }
  function bmHead(h, s){
    return '<div class="bm-head"><div style="flex:1"><div class="h">' + h + '</div><div class="s">' + s + '</div></div>' +
      '<div class="bm-x" id="bm-x">✕</div></div>';
  }
  function bindX(){ document.getElementById('bm-x').onclick = A.closeSheet; }

  function showMarketing(){
    function row(key, icon, iconBg, nm, eff, price){
      var active = S.marketing[key];
      return '<div class="bm-row"><div class="ic" style="background:' + iconBg + '">' + icon + '</div>' +
        '<div style="flex:1"><div class="t">' + nm +
          (active ? '<span class="b-badge" style="background:var(--okbg);color:var(--oktx)">активна · ещё ' + active + ' мес</span>' : '') + '</div>' +
        '<div class="s">' + eff + '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><div class="price">' + rub(price) + '</div>' +
        (active ? '<div style="font:600 11px Golos Text;color:var(--ghost)">идёт</div>'
                : '<div class="bm-go' + (S.cash < price ? ' off' : '') + '" data-mk="' + key + '" data-pr="' + price + '">Запустить</div>') +
        '</div></div>';
    }
    A.sheet(bmHead('Маркетинг', 'Кампания действует 3 месяца') +
      row('social', '▶', '#DCE9FF', 'Соцсети', '+2 заявки вкладчиков в месяц', 25000) +
      row('outdoor', '▧', '#FFE7D6', 'Наружная реклама', '+2 заявки на кредиты в месяц', 60000) +
      row('tv', '▣', '#E4DBFF', 'ТВ-кампания', '+4 заявки в месяц и +2 к рейтингу', 150000) +
      '<div class="bm-note">Списание сразу · эффект со следующего месяца</div>');
    bindX();
    Array.prototype.forEach.call(document.querySelectorAll('[data-mk]'), function(el){
      el.onclick = function(){
        var k = el.getAttribute('data-mk'), pr = parseInt(el.getAttribute('data-pr'), 10);
        if (S.cash < pr) return;
        S.cash -= pr; S.marketing[k] = 3;
        if (k === 'tv') S.ratingScore = Math.min(98, S.ratingScore + 2);
        sfx.cash(); A.closeSheet(); rerender();
      };
    });
  }

  var cbPick = 500000;
  function showCB(){
    function amts(){
      return [250000, 500000, 1000000].map(function(a){
        return '<div class="bm-amt' + (a === cbPick ? ' on' : '') + '" data-cba="' + a + '">' + fmt(a) + '</div>';
      }).join('');
    }
    var pay = Math.round(cbPick * ((S.cbRate + 2) / 100) / 12 + cbPick / 12);
    A.sheet(bmHead('Заём ЦБ', 'Быстрые деньги под ставку ЦБ + 2%') +
      '<div class="bm-grid2">' +
        '<div class="bm-cell"><div class="c">СТАВКА ДЛЯ ВАС</div><div class="v">' + S.cbRate + '% + 2% = ' + (S.cbRate + 2) + '%</div></div>' +
        '<div class="bm-cell"><div class="c">ТЕКУЩИЙ ДОЛГ</div><div class="v">' + rub(S.cbDebt) + '</div></div></div>' +
      '<div style="font:600 12px Golos Text;color:var(--sec)">Сумма займа</div>' +
      '<div class="bm-amts" id="cb-amts">' + amts() + '</div>' +
      '<div class="bm-big">' + rub(cbPick) + '</div>' +
      '<div class="bm-sub">платёж ≈ ' + fmt(pay) + ' ₽/мес · вернуть за 12 мес</div>' +
      '<div class="bm-warn"><div class="i">!</div><span class="t">Долг перед ЦБ снижает рейтинг банка, пока не погашен</span></div>' +
      '<div class="btn ac" id="cb-take">Взять ' + rub(cbPick) + '</div>' +
      '<div class="btn dim' + (S.cbDebt > 0 ? '' : ' disabled') + '" id="cb-repay">' +
        (S.cbDebt > 0 ? 'Погасить ' + rub(Math.min(S.cbDebt, Math.max(0, S.cash))) : 'Погасить долг — нечего гасить') + '</div>');
    bindX();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cba]'), function(el){
      el.onclick = function(){ cbPick = parseInt(el.getAttribute('data-cba'), 10); sfx.click(); showCB(); };
    });
    document.getElementById('cb-take').onclick = function(){
      S.cbDebt += cbPick; S.cbDebtStart = S.cbDebt; S.cash += cbPick;
      sfx.cash(); A.closeSheet(); rerender();
    };
    document.getElementById('cb-repay').onclick = function(){
      var pay = Math.min(S.cbDebt, Math.max(0, S.cash));
      if (pay <= 0) return;
      S.cbDebt -= pay; S.cash -= pay;
      sfx.cash(); A.closeSheet(); rerender();
    };
  }

  var bondPick = 100000;
  function showBonds(){
    function amts(){
      return [100000, 250000, 500000].map(function(a){
        return '<div class="bm-amt' + (a === bondPick ? ' on' : '') + '" data-ba="' + a + '">' + fmt(a) + '</div>';
      }).join('');
    }
    var y = (S.cbRate - 2);
    A.sheet(bmHead('Облигации', 'Свободные деньги работают под ' + y + '% годовых') +
      '<div class="bm-grid2">' +
        '<div class="bm-cell"><div class="c">ВЛОЖЕНО</div><div class="v">' + rub(S.bonds) + '</div></div>' +
        '<div class="bm-cell"><div class="c">ДОХОД</div><div class="v">≈ ' + fmt(Math.round(S.bonds * y / 100 / 12)) + ' ₽/мес</div></div></div>' +
      '<div style="font:600 12px Golos Text;color:var(--sec)">Сумма</div>' +
      '<div class="bm-amts">' + amts() + '</div>' +
      '<div class="btn ac' + (S.cash < bondPick ? ' disabled' : '') + '" id="bo-buy">Вложить ' + rub(bondPick) + '</div>' +
      '<div class="btn dim' + (S.bonds > 0 ? '' : ' disabled') + '" id="bo-sell">' + (S.bonds > 0 ? 'Продать все (' + rub(S.bonds) + ')' : 'Продавать нечего') + '</div>' +
      '<div class="bm-note">Надёжно: облигации всегда можно продать по номиналу</div>');
    bindX();
    Array.prototype.forEach.call(document.querySelectorAll('[data-ba]'), function(el){
      el.onclick = function(){ bondPick = parseInt(el.getAttribute('data-ba'), 10); sfx.click(); showBonds(); };
    });
    document.getElementById('bo-buy').onclick = function(){
      if (S.cash < bondPick) return;
      S.cash -= bondPick; S.bonds += bondPick; sfx.cash(); A.closeSheet(); rerender();
    };
    document.getElementById('bo-sell').onclick = function(){
      if (S.bonds <= 0) return;
      S.cash += S.bonds; S.bonds = 0; sfx.cash(); A.closeSheet(); rerender();
    };
  }

  function showStaff(){
    function row(key, nm, eff, price, count, max){
      return '<div class="bm-row"><div class="ic" style="background:var(--chip)">' + (key === 'coll' ? '◍' : '◈') + '</div>' +
        '<div style="flex:1"><div class="t">' + nm + (count ? '<span class="b-badge" style="background:var(--okbg);color:var(--oktx)">' + count + ' в штате</span>' : '') + '</div>' +
        '<div class="s">' + eff + '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><div class="price">' + rub(price) + '/мес</div>' +
        '<div style="display:flex;gap:6px">' +
          (count > 0 ? '<div class="bm-go" style="background:var(--btn2);color:var(--ink)" data-fire="' + key + '">−</div>' : '') +
          (count < max ? '<div class="bm-go" data-hire="' + key + '">Нанять</div>' : '') +
        '</div></div></div>';
    }
    A.sheet(bmHead('Сотрудники', 'Зарплата списывается каждый месяц') +
      row('coll', 'Коллектор', 'Возврат долгов при взыскании +15%', 15000, S.staff.coll, 3) +
      row('sec', 'Служба безопасности', 'Риск дефолтов −22% с каждого', 20000, S.staff.sec, 2));
    bindX();
    Array.prototype.forEach.call(document.querySelectorAll('[data-hire]'), function(el){
      el.onclick = function(){ S.staff[el.getAttribute('data-hire')]++; sfx.click(); A.closeSheet(); rerender(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-fire]'), function(el){
      el.onclick = function(){ var k = el.getAttribute('data-fire'); if (S.staff[k] > 0) S.staff[k]--; sfx.click(); A.closeSheet(); rerender(); };
    });
  }

  function showProducts(){
    var rows = '';
    Object.keys(PRODUCTS).forEach(function(k){
      var p = PRODUCTS[k];
      rows += '<div class="bm-row"><div style="flex:1"><div class="t">' + p.nm +
        '<span class="b-risk ' + p.risk + '">' + RISK_RU[p.risk] + '</span></div>' +
        '<div class="s">срок ' + p.minT + '–' + p.maxT + ' мес</div></div>' +
        '<div class="toggle' + (S.products[k] ? ' on' : '') + '" data-pk="' + k + '"><i></i></div></div>';
    });
    A.sheet(bmHead('Продукты', 'Какие кредиты выдаёт твой банк') + rows +
      '<div class="bm-note">Выключенные продукты не приходят в заявках</div>');
    bindX();
    Array.prototype.forEach.call(document.querySelectorAll('[data-pk]'), function(el){
      el.onclick = function(){
        var k = el.getAttribute('data-pk');
        S.products[k] = !S.products[k];
        el.classList.toggle('on', S.products[k]);
        save(); sfx.click();
      };
    });
  }

  function showBalance(){
    var br = S.lastBreak;
    if (!br){ toast('Баланс появится после первого месяца'); return; }
    function row(l, v, forceSign){
      if (!v) return '';
      var pos = v > 0;
      return '<div class="bm-bal-row"><span class="l">' + l + '</span>' +
        '<span class="v ' + (pos ? 'pos' : 'neg') + '">' + (pos ? '+' : '−') + rub(Math.abs(v)) + '</span></div>';
    }
    A.sheet(bmHead('Баланс за месяц ' + (S.month - 1), 'Откуда пришли и куда ушли деньги') +
      row('Проценты по кредитам', br.loanInt) +
      row('Возврат тела кредитов', br.loanBody) +
      row('Доход по облигациям', br.bonds) +
      row('Проценты вкладчикам', -br.depInt) +
      row('Возврат вкладов', -br.depBack) +
      row('Зарплаты', -br.salaries) +
      row('Платёж ЦБ', -(br.cbInt + (br.cbBody || 0))) +
      row('Потери от дефолтов', -br.defLoss) +
      '<div class="bm-bal-row total"><span class="l">Прибыль месяца</span>' +
      '<span class="v ' + (S.lastProfit >= 0 ? 'pos' : 'neg') + '">' + (S.lastProfit >= 0 ? '+' : '−') + rub(Math.abs(S.lastProfit)) + '</span></div>');
    bindX();
  }

  function showHelp(){
    A.sheet(bmHead('Как играть', 'Банкир за одну минуту') +
      '<div class="bm-help">' +
      '<b>1. Принимай вклады.</b> Вкладчики дают тебе деньги под процент — это твой расход, но и твой капитал для кредитов.<br><br>' +
      '<b>2. Выдавай кредиты.</b> Ставка по кредитам выше ставки по вкладам — на этой разнице (марже) банк зарабатывает.<br><br>' +
      '<b>3. Следи за риском.</b> Смотри скоринг заёмщика, проверяй и страхуй сомнительных. Должников взыскивай.<br><br>' +
      '<b>4. Развивайся.</b> Маркетинг приводит клиентов, сотрудники защищают от потерь, облигации хранят свободные деньги, заём ЦБ выручит в трудный месяц.<br><br>' +
      '<b>5. Жми «Следующий месяц»</b> — и смотри, как растёт (или тает) капитал. Не уходи в минус: ЦБ отзовёт лицензию.</div>' +
      '<div class="btn ac" id="hp-ok">Понятно</div>');
    bindX();
    document.getElementById('hp-ok').onclick = A.closeSheet;
  }

  /* ---------- регистрация ---------- */
  A.reg('banker', {
    enter: function(){
      active = true;
      S = load();
      ui = { headOpen:false, showDeps:false, showLoans:false, expApp:{}, chartSel:-1 };
      /* отладка скринов: ?go=banker&strat=mid[&months=5][&head=1] */
      var st = A.qs && A.qs.get('strat');
      if (st){
        newGame(st === 'safe' || st === 'bold' ? st : 'mid');
        var mn = parseInt(A.qs.get('months') || '0', 10);
        for (var i = 0; i < Math.min(mn, 24); i++){
          if (S.depApps[0]) accept(S.depApps[0].id, true);
          if (S.credApps[0] && S.cash > S.credApps[0].amount) accept(S.credApps[0].id, false);
          nextMonth();
          if (!S) return;
        }
        if (A.qs.get('head') === '1') ui.headOpen = true;
        renderMain();
        return;
      }
      renderStart();
    },
    leave: function(){
      active = false;
      if (S) save();
      clearTimeout(toastTimer);
      var t = document.querySelector('.toast'); if (t) t.classList.remove('on');
    }
  });
})();
