// ==== Защита от встраивания в чужую страницу (кликджекинг) ====
// Правильное место для такой защиты — HTTP-заголовок frame-ancestors, но
// GitHub Pages не даёт задавать свои заголовки, а в мета-теге браузеры этот
// параметр игнорируют. Поэтому проверяем из кода.
//
// Портфолио открывает игру обычной ссылкой в новой вкладке, в рамку её не
// вставляет. Если когда-нибудь понадобится встроить игру на свой сайт —
// допишите его адрес в ALLOWED_FRAME_PARENTS.
(() => {
  'use strict';
  const ALLOWED_FRAME_PARENTS = [];

  const reveal = () => { document.documentElement.style.visibility = 'visible'; };

  if (window.top === window.self) { reveal(); return; } // обычное открытие

  let parentOrigin = '';
  try { parentOrigin = document.referrer ? new URL(document.referrer).origin : ''; } catch (e) {}
  if (parentOrigin && ALLOWED_FRAME_PARENTS.indexOf(parentOrigin) !== -1) { reveal(); return; }

  // Пробуем выйти из рамки. С чужого сайта браузер это запретит — тогда
  // показываем заглушку, чтобы нажимать было не на что.
  // Переход может быть заблокирован и БЕЗ ошибки, поэтому заглушку готовим
  // в любом случае: выйдем из рамки — она просто не успеет показаться.
  try { window.top.location.replace(window.location.href); } catch (e) {}

  const showBlock = () => {
    document.body.textContent = '';
    const box = document.createElement('div');
    box.style.cssText = 'font:600 16px/1.6 system-ui,sans-serif;color:#1b2130;' +
      'max-width:420px;margin:15vh auto;padding:0 24px;text-align:center';
    const h = document.createElement('p');
    h.textContent = 'Игра открыта внутри чужой страницы.';
    const a = document.createElement('a');
    a.href = window.location.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Открыть игру по настоящему адресу';
    a.style.cssText = 'color:#3b6fed;font-weight:800';
    box.appendChild(h);
    box.appendChild(a);
    document.body.appendChild(box);
    document.documentElement.style.visibility = 'visible';
  };

  // Если разметка уже готова — показываем сразу, иначе дожидаемся её.
  // Раньше здесь был только обработчик события: сработай он позже загрузки —
  // заглушка бы не появилась, и игра осталась бы доступной внутри рамки.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBlock);
  } else {
    showBlock();
  }
})();

// ==== Главный контроллер приложения ====
(() => {
  'use strict';

  // Ссылка на портфолио автора. Пусто — блок на экране победы не показывается.
  const AUTHOR_URL = '';
  const AUTHOR_NAME = '';

  const screens = {
    themes: document.getElementById('screen-themes'),
    levels: document.getElementById('screen-levels'),
    game: document.getElementById('screen-game'),
    win: document.getElementById('screen-win')
  };
  const $ = (id) => document.getElementById(id);

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // Короткое сообщение вместо alert: не блокирует игру и не выглядит как ошибка браузера
  function toast(text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);' +
      'background:#1b2130;color:#fff;padding:12px 20px;border-radius:12px;z-index:3000;' +
      'font:700 .82rem Manrope,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.35);max-width:88vw;text-align:center';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>';
  }

  // Карточки делаем обычными блоками, а не <button>: браузер заворачивает
  // содержимое кнопки в собственный контейнер, и абсолютно позиционированные
  // фото с подписью внутри неё разъезжаются. Доступность добавляем руками.
  function makeCard(className, label, onActivate, disabled) {
    const el = document.createElement('div');
    el.className = className;
    if (label) el.setAttribute('aria-label', label);
    if (disabled) {
      el.setAttribute('aria-disabled', 'true');
      return el;
    }
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.addEventListener('click', onActivate);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onActivate();
    });
    return el;
  }
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  let currentTheme = null;
  let currentLevel = 1;
  let puzzle = null;
  let timerId = null;
  let elapsedMs = 0;
  let startTs = 0;

  // ---------- ТЕМЫ ----------
  // Часть карточек делаем широкими: ровная сетка из одинаковых плиток
  // выглядит как заготовка, разные размеры — как продукт.
  const WIDE_CARDS = new Set([0, 5, 10]);

  function renderThemeGrid() {
    const grid = $('theme-grid');
    grid.textContent = '';

    THEMES.forEach((theme, i) => {
      const stats = Storage.themeStats(theme.id);
      const done = stats.unlockedLevel - 1;
      const totalStars = Object.values(Storage.getTheme(theme.id).levels)
        .reduce((s, l) => s + l.stars, 0);
      const pct = Math.min(100, Math.round((done / LEVELS_PER_THEME) * 100));

      const card = makeCard(
        'theme-card' + (WIDE_CARDS.has(i) ? ' wide' : ''),
        theme.name + ', пройдено ' + done + ' из ' + LEVELS_PER_THEME,
        () => openTheme(theme)
      );
      card.style.animationDelay = Math.min(i * 35, 420) + 'ms';

      // Главный приём: на карточке настоящая фотография из темы,
      // а не иконка. Содержимое игры и есть её оформление.
      const photo = document.createElement('img');
      photo.className = 'theme-photo';
      photo.src = imageForLevel(theme, 1);
      photo.alt = '';
      // Первый экран грузим сразу: ленивая загрузка видимых карточек
      // оставляет пустые прямоугольники в момент, когда человек впервые
      // смотрит на игру. Остальное — лениво.
      photo.loading = i < 6 ? 'eager' : 'lazy';
      photo.decoding = 'async';
      if (i < 3) photo.fetchPriority = 'high';
      card.appendChild(photo);

      const veil = document.createElement('div');
      veil.className = 'theme-veil';
      card.appendChild(veil);

      const body = document.createElement('div');
      body.className = 'theme-body';

      const name = document.createElement('div');
      name.className = 'theme-name';
      name.textContent = theme.name;
      body.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'theme-meta';
      const metaText = document.createElement('span');
      metaText.textContent = done + ' / ' + LEVELS_PER_THEME;
      meta.appendChild(metaText);
      if (totalStars > 0) {
        const st = document.createElement('span');
        st.className = 'star';
        st.textContent = '★ ' + totalStars;
        meta.appendChild(st);
      }
      body.appendChild(meta);

      const bar = document.createElement('div');
      bar.className = 'theme-bar';
      const fill = document.createElement('i');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      body.appendChild(bar);

      card.appendChild(body);

      if (done >= LEVELS_PER_THEME) {
        const badge = document.createElement('div');
        badge.className = 'theme-done';
        badge.innerHTML = svg('<path d="M20 6L9 17l-5-5"/>');
        card.appendChild(badge);
      }

      grid.appendChild(card);
    });

    updateGlobalStats();
  }

  function updateGlobalStats() {
    const g = Storage.globalStats(THEMES.map(t => t.id));
    const box = $('global-stats');
    box.textContent = '';
    if (g.totalCompleted === 0) return;
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '★';
    box.appendChild(star);
    const txt = document.createElement('span');
    txt.textContent = g.totalStars + ' · ' + g.totalCompleted + ' ' +
      plural(g.totalCompleted, 'уровень', 'уровня', 'уровней');
    box.appendChild(txt);
  }

  // ---------- УРОВНИ ----------
  function openTheme(theme) {
    currentTheme = theme;
    $('levels-theme-title').textContent = theme.name;
    const stats = Storage.themeStats(theme.id);
    const done = stats.unlockedLevel - 1;
    $('levels-theme-sub').textContent = done === 0
      ? 'Начните с первого уровня — дальше откроются следующие'
      : 'Пройдено ' + done + ' из ' + LEVELS_PER_THEME;
    renderLevelGrid(theme);
    showScreen('levels');
  }

  function renderLevelGrid(theme) {
    const grid = $('level-grid');
    grid.textContent = '';
    const tstats = Storage.getTheme(theme.id);

    for (let lvl = 1; lvl <= LEVELS_PER_THEME; lvl++) {
      const unlocked = Storage.isUnlocked(theme.id, lvl);
      const info = tstats.levels[lvl];
      const { rows, cols } = gridForLevel(lvl);

      const label = unlocked
        ? 'Уровень ' + lvl + ', ' + (rows * cols) + ' ' + plural(rows * cols, 'деталь', 'детали', 'деталей')
        : 'Уровень ' + lvl + ' ещё закрыт';
      const card = makeCard(
        'level-card' + (unlocked ? '' : ' locked'),
        label,
        () => startLevel(theme, lvl),
        !unlocked
      );

      if (unlocked) {
        const num = document.createElement('span');
        num.className = 'lv-num';
        num.textContent = String(lvl);
        card.appendChild(num);

        const size = document.createElement('span');
        size.className = 'lv-size';
        size.textContent = cols + '×' + rows;
        card.appendChild(size);

        const stars = document.createElement('span');
        stars.className = 'lv-stars';
        stars.textContent = info ? '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars) : '';
        card.appendChild(stars);
      } else {
        const lock = document.createElement('span');
        lock.className = 'lv-lock';
        lock.innerHTML = svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
        card.appendChild(lock);
      }
      grid.appendChild(card);
    }
  }

  // ---------- ИГРА ----------
  function startLevel(theme, level) {
    currentTheme = theme;
    currentLevel = level;
    const src = imageForLevel(theme, level);
    if (!src) { toast('Для этой темы ещё нет картинок'); return; }

    const { rows, cols } = gridForLevel(level);
    $('game-title').textContent = theme.name + ' · уровень ' + level;
    $('game-progress').textContent = '0 / ' + (rows * cols);
    $('game-timer').textContent = '00:00';
    showScreen('game');

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => buildPuzzle(img, level);
    img.onerror = () => {
      toast('Не удалось открыть картинку этого уровня');
      renderLevelGrid(theme);
      showScreen('levels');
    };
    img.src = src;
  }

  function buildPuzzle(img, level) {
    const boardEl = $('board');
    const playfield = boardEl.parentElement;
    if (puzzle) puzzle.destroy();

    const { rows, cols } = gridForLevel(level);
    const maxW = Math.min(playfield.getBoundingClientRect().width - 16, 560);
    // Размер поля кратен размеру детали в целых пикселях — иначе крайние детали
    // не совпадают с краем поля, а между соседними видны щели.
    const pieceSize = Math.floor(maxW / cols);

    puzzle = new JigsawPuzzle({
      playfield,
      board: boardEl,
      image: img,
      rows, cols,
      boardSize: { w: pieceSize * cols, h: pieceSize * rows },
      onProgress: (placed, total) => {
        $('game-progress').textContent = placed + ' / ' + total;
      },
      onWin: (moves) => finishLevel(moves, rows * cols)
    });

    elapsedMs = 0;
    startTs = Date.now();
    clearInterval(timerId);
    timerId = setInterval(() => {
      elapsedMs = Date.now() - startTs;
      $('game-timer').textContent = fmtTime(elapsedMs);
    }, 1000);

    $('preview-img').src = img.src;
  }

  function stopGame() {
    clearInterval(timerId);
    if (puzzle) { puzzle.destroy(); puzzle = null; }
  }

  function finishLevel(moves, pieceCount) {
    clearInterval(timerId);
    const timeMs = elapsedMs;
    let stars = 1;
    if (timeMs <= pieceCount * 3500) stars = 3;
    else if (timeMs <= pieceCount * 7000) stars = 2;

    Storage.completeLevel(currentTheme.id, currentLevel, { timeMs, moves, stars });
    FX.playWin();
    FX.vibrate([20, 60, 20, 60, 40]);

    $('win-stats').textContent = fmtTime(timeMs) + ' · ' + pieceCount + ' ' +
      plural(pieceCount, 'деталь', 'детали', 'деталей');
    $('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    // Говорим, чего не хватило до трёх звёзд — иначе звёзды выглядят случайными
    const hint = $('win-next-hint');
    if (stars === 3) {
      hint.textContent = 'Лучший результат — три звезды';
    } else {
      const target = stars === 1 ? pieceCount * 7000 : pieceCount * 3500;
      hint.textContent = 'Соберите быстрее ' + fmtTime(target) + ' — будет больше звёзд';
    }

    const isLast = currentLevel >= LEVELS_PER_THEME;
    $('btn-win-next').style.display = isLast ? 'none' : '';
    showScreen('win');
  }

  // ---------- ПОДПИСЬ АВТОРА ----------
  // Единственный коммерческий элемент внутри игры: человек только что
  // получил удовольствие — это уместный момент, чтобы показать, кто сделал.
  function renderAuthorNote() {
    const box = $('author-note');
    if (!AUTHOR_URL) return;
    box.hidden = false;
    box.textContent = '';
    if (AUTHOR_NAME) box.appendChild(document.createTextNode('Игру сделал ' + AUTHOR_NAME + '. '));
    const a = document.createElement('a');
    a.href = AUTHOR_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Нужно такое же приложение';
    box.appendChild(a);
  }

  // ---------- ОВЕРЛЕИ ----------
  function openOverlay(id) { $(id).classList.add('active'); }
  function closeOverlay(id) { $(id).classList.remove('active'); }

  function buildCredits() {
    const list = $('credits-list');
    if (list.childElementCount) return;
    THEMES.forEach(theme => {
      const items = CREDITS[theme.id];
      if (!items || !items.length) return;
      const h = document.createElement('div');
      h.className = 'credits-theme';
      h.textContent = theme.name;
      list.appendChild(h);
      items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'credits-item';
        // Только textContent: данные не попадают в разметку как код
        const b = document.createElement('b');
        b.textContent = it.title;
        row.appendChild(b);
        row.appendChild(document.createTextNode(' — ' + it.author + ' (' + it.license + ')'));
        list.appendChild(row);
      });
    });
  }

  // ---------- НАВИГАЦИЯ ----------
  $('btn-back-to-themes').addEventListener('click', () => {
    renderThemeGrid();
    showScreen('themes');
  });
  $('btn-back-to-levels').addEventListener('click', () => {
    stopGame();
    renderLevelGrid(currentTheme);
    showScreen('levels');
  });
  $('btn-win-menu').addEventListener('click', () => {
    stopGame();
    renderLevelGrid(currentTheme);
    showScreen('levels');
  });
  $('btn-win-replay').addEventListener('click', () => startLevel(currentTheme, currentLevel));
  $('btn-win-next').addEventListener('click', () => startLevel(currentTheme, currentLevel + 1));
  $('btn-hint').addEventListener('click', () => { if (puzzle) puzzle.hint(); });
  $('btn-shuffle').addEventListener('click', () => { if (puzzle) puzzle.reshuffle(); });

  $('btn-preview').addEventListener('click', () => openOverlay('preview-overlay'));
  $('preview-overlay').addEventListener('click', () => closeOverlay('preview-overlay'));

  $('btn-rules').addEventListener('click', () => openOverlay('rules-overlay'));
  $('btn-rules-close').addEventListener('click', () => closeOverlay('rules-overlay'));
  $('rules-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'rules-overlay') closeOverlay('rules-overlay');
  });

  $('btn-credits').addEventListener('click', () => { buildCredits(); openOverlay('credits-overlay'); });
  $('btn-credits-close').addEventListener('click', () => closeOverlay('credits-overlay'));
  $('credits-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'credits-overlay') closeOverlay('credits-overlay');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['preview-overlay', 'rules-overlay', 'credits-overlay'].forEach(closeOverlay);
  });

  // Пересобираем поле под новый размер окна, но не чаще, чем раз в 200 мс
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!puzzle || !screens.game.classList.contains('active')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => buildPuzzle(puzzle.image, currentLevel), 200);
  });

  // ---------- ИНИЦИАЛИЗАЦИЯ ----------
  renderThemeGrid();
  renderAuthorNote();
  showScreen('themes');

  // В сборке «одним файлом» всё уже внутри страницы: отдельный sw.js там
  // отсутствует, и попытка его зарегистрировать только сыпала бы ошибками.
  const isSingleFile = !!window.EMBEDDED_IMAGES;

  if ('serviceWorker' in navigator && !isSingleFile) {
    // Когда приходит обновлённая версия игры — перезагружаем страницу один раз,
    // иначе браузер мог бы бесконечно показывать старую версию из кэша.
    // Перезагружаем только когда новая версия СМЕНЯЕТ работающую. При первом
    // визите управление захватывается впервые — тогда перезагрузка лишняя,
    // человек увидел бы непонятный скачок страницы сразу после открытия.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.update();
        setInterval(() => reg.update(), 60 * 60 * 1000);
      }).catch(() => { /* по file:// недоступен — это нормально */ });
    });
  }
})();
