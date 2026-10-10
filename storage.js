// Хранилище прогресса игрока (localStorage)
const Storage = (() => {
  const KEY = 'puzzleGameProgress_v1';

  // Сохранённый прогресс лежит в браузере, и его можно подменить руками.
  // Поэтому при чтении приводим всё к ожидаемому виду: иначе, например,
  // звёзды со значением в миллиард подвесили бы страницу на '★'.repeat().
  function sanitize(raw) {
    const clean = {};
    if (!raw || typeof raw !== 'object') return clean;

    const num = (v, min, max, def) => {
      const n = Math.floor(Number(v));
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };

    // Уровней в теме ровно столько, сколько задано в themes.js —
    // всё, что выше, пришло не из игры.
    const maxLevel = (typeof LEVELS_PER_THEME === 'number' && LEVELS_PER_THEME > 0)
      ? LEVELS_PER_THEME : 12;

    Object.keys(raw).forEach(themeId => {
      const t = raw[themeId];
      if (!t || typeof t !== 'object') return;
      const levels = {};
      const src = (t.levels && typeof t.levels === 'object') ? t.levels : {};
      Object.keys(src).forEach(key => {
        // Несуществующие номера уровней не подгоняем под диапазон, а отбрасываем
        const lvl = Math.floor(Number(key));
        if (!Number.isFinite(lvl) || lvl < 1 || lvl > maxLevel) return;
        const l = src[key];
        if (!l || typeof l !== 'object') return;
        levels[lvl] = {
          timeMs: num(l.timeMs, 0, 1e9, 0),
          moves: num(l.moves, 0, 1e6, 0),
          stars: num(l.stars, 0, 3, 0),
          completed: true
        };
      });
      clean[themeId] = { unlockedLevel: num(t.unlockedLevel, 1, maxLevel + 1, 1), levels };
    });
    return clean;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : {};
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* ignore quota errors */ }
  }

  let data = load();

  function getTheme(themeId) {
    if (!data[themeId]) {
      data[themeId] = { unlockedLevel: 1, levels: {} };
    }
    return data[themeId];
  }

  function isUnlocked(themeId, level) {
    const t = getTheme(themeId);
    return level <= t.unlockedLevel;
  }

  function completeLevel(themeId, level, { timeMs, moves, stars }) {
    const t = getTheme(themeId);
    const prev = t.levels[level];
    if (!prev || stars > prev.stars || timeMs < prev.timeMs) {
      t.levels[level] = {
        timeMs: prev ? Math.min(prev.timeMs, timeMs) : timeMs,
        moves,
        stars: prev ? Math.max(prev.stars, stars) : stars,
        completed: true
      };
    }
    if (level === t.unlockedLevel) {
      t.unlockedLevel = level + 1;
    }
    save(data);
  }

  function themeStats(themeId) {
    const t = getTheme(themeId);
    const completed = Object.keys(t.levels).length;
    return { completed, unlockedLevel: t.unlockedLevel };
  }

  function globalStats(allThemeIds) {
    let totalCompleted = 0;
    let totalStars = 0;
    allThemeIds.forEach(id => {
      const t = getTheme(id);
      Object.values(t.levels).forEach(l => {
        totalCompleted++;
        totalStars += l.stars;
      });
    });
    return { totalCompleted, totalStars };
  }

  return { getTheme, isUnlocked, completeLevel, themeStats, globalStats };
})();
