// ==== Звук + вибрация ====
const FX = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freqStart, freqEnd, dur, type, vol) {
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ac.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  function playSnap() {
    tone(520, 780, 0.11, 'sine', 0.22);
    setTimeout(() => tone(900, 1200, 0.09, 'triangle', 0.10), 40);
  }

  function playWin() {
    [0, 110, 220, 330].forEach((delay, i) => {
      setTimeout(() => tone(440 + i * 130, 660 + i * 130, 0.22, 'sine', 0.18), delay);
    });
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  function unlock() { ensure(); }

  return { playSnap, playWin, vibrate, unlock };
})();

// ==== Генератор фигурных деталей пазла ====
class JigsawPuzzle {
  constructor({ playfield, board, image, rows, cols, boardSize, onProgress, onWin }) {
    this.playfield = playfield;
    this.board = board;
    this.image = image;
    this.rows = rows;
    this.cols = cols;
    this.boardSize = boardSize; // {w,h} px
    this.onProgress = onProgress || (() => {});
    this.onWin = onWin || (() => {});
    this.pieces = [];
    this.placedCount = 0;
    this.moves = 0;
    this._activePointerId = null; // какую деталь сейчас тащат
    this._zTop = 10;              // счётчик для подъёма детали наверх
    // Целые пиксели: при дробных размерах браузер округляет каждую деталь
    // отдельно и между соседними деталями появляются щели.
    this.pieceSize = Math.round(boardSize.w / cols);
    this.bump = Math.round(this.pieceSize * 0.28);
    this._buildEdges();
    this._buildBoard();
    this._buildPieces();
    this._scatterPieces();
  }

  _buildEdges() {
    const rows = this.rows, cols = this.cols;
    this.H = []; // horizontal neighbor edges: H[r][c] between (r,c)-(r,c+1)
    this.V = []; // vertical neighbor edges: V[r][c] between (r,c)-(r+1,c)
    for (let r = 0; r < rows; r++) {
      this.H.push(new Array(cols - 1).fill(0).map(() => (Math.random() < 0.5 ? 1 : -1)));
    }
    for (let r = 0; r < rows - 1; r++) {
      this.V.push(new Array(cols).fill(0).map(() => (Math.random() < 0.5 ? 1 : -1)));
    }
  }

  edgeDirs(r, c) {
    const top = r === 0 ? 0 : -this.V[r - 1][c];
    const bottom = r === this.rows - 1 ? 0 : this.V[r][c];
    const left = c === 0 ? 0 : -this.H[r][c - 1];
    const right = c === this.cols - 1 ? 0 : this.H[r][c];
    return { top, right, bottom, left };
  }

  _buildBoard() {
    this.board.style.width = this.boardSize.w + 'px';
    this.board.style.height = this.boardSize.h + 'px';
    // margin:auto может дать дробную позицию (например 139.5px) — центрируем
    // сами целым числом пикселей, чтобы детали ложились ровно по краям поля.
    const avail = this.playfield.clientWidth;
    this.board.style.marginLeft = Math.max(0, Math.floor((avail - this.boardSize.w) / 2)) + 'px';
    this.board.style.marginRight = '0px';
    this.board.innerHTML = '';
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const g = document.createElement('div');
        g.className = 'slot-guide';
        g.style.left = c * this.pieceSize + 'px';
        g.style.top = r * this.pieceSize + 'px';
        g.style.width = this.pieceSize + 'px';
        g.style.height = this.pieceSize + 'px';
        this.board.appendChild(g);
      }
    }
  }

  _tabPath(ctx, p0, p1, dir) {
    if (dir === 0) { ctx.lineTo(p1.x, p1.y); return; }
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux;
    const r = len * 0.16;
    const pt = (t, n) => ({ x: p0.x + ux * t + nx * n, y: p0.y + uy * t + ny * n });
    const A = pt(len * 0.35, 0);
    const B = pt(len * 0.65, 0);
    const amp = dir * r * 1.3;
    ctx.lineTo(A.x, A.y);
    const c1 = pt(len * 0.35, amp * 0.5);
    const c2 = pt(len * 0.5 - r, amp);
    const peakL = pt(len * 0.5, amp);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, peakL.x, peakL.y);
    const c3 = pt(len * 0.5 + r, amp);
    const c4 = pt(len * 0.65, amp * 0.5);
    ctx.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, B.x, B.y);
    ctx.lineTo(p1.x, p1.y);
  }

  _piecePath(ctx, W, H, B, dirs) {
    const TL = { x: B, y: B };
    const TR = { x: B + W, y: B };
    const BR = { x: B + W, y: B + H };
    const BL = { x: B, y: B + H };
    ctx.beginPath();
    ctx.moveTo(TL.x, TL.y);
    this._tabPath(ctx, TL, TR, dirs.top);
    this._tabPath(ctx, TR, BR, dirs.right);
    this._tabPath(ctx, BR, BL, dirs.bottom);
    this._tabPath(ctx, BL, TL, dirs.left);
    ctx.closePath();
  }

  _buildPieces() {
    const img = this.image;
    const bw = this.boardSize.w, bh = this.boardSize.h;
    // Целый dpr — иначе размеры canvas получаются дробными и по краям деталей
    // остаётся недорисованная половина пикселя (видно как щель между деталями).
    const dpr = Math.min(Math.round(window.devicePixelRatio || 1), 2);
    const W = this.pieceSize, H = this.pieceSize, B = this.bump;
    const canvasSize = W + 2 * B;

    // Предварительно уменьшаем исходную картинку один раз (иначе каждая деталь
    // тянула бы пиксели из огромного оригинала — лаги). Берём с запасом в B px
    // со всех сторон, чтобы "хвостики" крайних деталей не вылезали за пределы
    // картинки (иначе там были бы пустые белые куски).
    const extW = bw + 2 * B, extH = bh + 2 * B;
    const srcScale = Math.max(extW / img.naturalWidth, extH / img.naturalHeight);
    const drawW = img.naturalWidth * srcScale, drawH = img.naturalHeight * srcScale;
    const fitted = document.createElement('canvas');
    fitted.width = extW * dpr;
    fitted.height = extH * dpr;
    const fctx = fitted.getContext('2d');
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(img, (extW - drawW) / 2 * dpr, (extH - drawH) / 2 * dpr, drawW * dpr, drawH * dpr);

    // Маска формы детали. Заливка + обводка наружу делает деталь на ~1px шире
    // номинальной формы, поэтому соседние детали слегка перекрываются и
    // сглаженные края не оставляют между собой светлого шва.
    const mask = document.createElement('canvas');
    mask.width = canvasSize * dpr;
    mask.height = canvasSize * dpr;
    const mctx = mask.getContext('2d');
    mctx.scale(dpr, dpr);

    const fragment = document.createDocumentFragment();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const dirs = this.edgeDirs(r, c);

        mctx.clearRect(0, 0, canvasSize, canvasSize);
        mctx.fillStyle = '#000';
        mctx.strokeStyle = '#000';
        mctx.lineWidth = 2;
        mctx.lineJoin = 'round';
        this._piecePath(mctx, W, H, B, dirs);
        mctx.fill();
        mctx.stroke();

        const canvas = document.createElement('canvas');
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = canvasSize + 'px';
        canvas.style.height = canvasSize + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.drawImage(
          fitted,
          c * W * dpr, r * H * dpr, canvasSize * dpr, canvasSize * dpr,
          0, 0, canvasSize, canvasSize
        );
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0, canvasSize, canvasSize);
        ctx.globalCompositeOperation = 'source-over';

        // Кромка рисуется внутри детали (внешняя половина линии срезается clip),
        // чтобы не залезать на соседнюю деталь и не выглядеть зазором.
        ctx.save();
        this._piecePath(ctx, W, H, B, dirs);
        ctx.clip();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,.22)';
        ctx.stroke();
        ctx.restore();

        const div = document.createElement('div');
        div.className = 'piece';
        div.style.width = canvasSize + 'px';
        div.style.height = canvasSize + 'px';
        div.appendChild(canvas);
        fragment.appendChild(div);

        const piece = {
          r, c, div, canvas,
          homeX: c * W - B, homeY: r * H - B,
          placed: false
        };
        div.addEventListener('pointerdown', (e) => this._onPointerDown(e, piece));
        this.pieces.push(piece);
      }
    }
    this.playfield.appendChild(fragment);
  }

  _boardOffset() {
    const pf = this.playfield.getBoundingClientRect();
    const bd = this.board.getBoundingClientRect();
    // style.left/top отсчитываются от нескроллированного начала поля, а
    // getBoundingClientRect уже учитывает прокрутку — компенсируем.
    // Округляем, чтобы уложенные детали стояли ровно по пикселям.
    return {
      x: Math.round(bd.left - pf.left + this.playfield.scrollLeft),
      y: Math.round(bd.top - pf.top + this.playfield.scrollTop)
    };
  }

  _scatterPieces(subset) {
    const pf = this.playfield.getBoundingClientRect();
    const trayTop = this.boardSize.h + 24;
    const size = this.pieceSize + 2 * this.bump;
    const cols = Math.max(1, Math.floor(pf.width / (size * 0.72)));
    const order = [...(subset || this.pieces)].sort(() => Math.random() - 0.5);
    order.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (Math.random() - 0.5) * size * 0.3;
      const jitterY = (Math.random() - 0.5) * size * 0.3;
      const x = col * (size * 0.72) + 8 + jitterX;
      const y = trayTop + (row % 6) * (size * 0.62) + jitterY;
      p.curX = x; p.curY = y;
      p.div.style.left = x + 'px';
      p.div.style.top = y + 'px';
    });
  }

  _onPointerDown(e, piece) {
    if (piece.placed) return;
    if (this._activePointerId !== null) return; // уже тащим другую деталь
    e.preventDefault();
    FX.unlock();

    const div = piece.div;
    const pointerId = e.pointerId;
    this._activePointerId = pointerId;

    try { div.setPointerCapture(pointerId); } catch (err) { /* не критично */ }
    div.classList.add('dragging');
    // Поднимаем деталь наверх через z-index. Раньше здесь был appendChild,
    // но перестановка узла в DOM сбрасывает захват указателя: события
    // переставали доходить до детали, обработчики не снимались и потом
    // срабатывали повторно при наведении — деталь улетала за экран,
    // а счётчик собранных деталей рос по нескольку раз за одну деталь.
    div.style.zIndex = ++this._zTop;

    const startX = e.clientX, startY = e.clientY;
    const origX = piece.curX, origY = piece.curY;
    let rafId = null;

    const move = (ev) => {
      if (ev.pointerId !== pointerId) return;
      piece.curX = origX + (ev.clientX - startX);
      piece.curY = origY + (ev.clientY - startY);
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          div.style.left = piece.curX + 'px';
          div.style.top = piece.curY + 'px';
          rafId = null;
        });
      }
    };

    const finish = (ev) => {
      if (ev && ev.pointerId !== pointerId) return;
      // Слушаем окно, а не саму деталь: кнопку можно отпустить где угодно,
      // и обработчики всё равно снимутся — «залипших» не остаётся.
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      this._activePointerId = null;
      try { div.releasePointerCapture(pointerId); } catch (err) { /* уже снят */ }

      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      div.style.left = piece.curX + 'px';
      div.style.top = piece.curY + 'px';
      div.classList.remove('dragging');

      if (piece.placed || this._destroyed) return; // засчитываем деталь ровно один раз
      this.moves++;

      const off = this._boardOffset();
      const targetX = off.x + piece.homeX;
      const targetY = off.y + piece.homeY;
      const dist = Math.hypot(piece.curX - targetX, piece.curY - targetY);
      if (dist < this.pieceSize * 0.32) {
        piece.curX = targetX; piece.curY = targetY;
        div.style.left = targetX + 'px';
        div.style.top = targetY + 'px';
        div.style.zIndex = 1; // уложенные детали — под свободными
        div.classList.add('placed', 'snap-pop');
        setTimeout(() => div.classList.remove('snap-pop'), 300);
        piece.placed = true;
        this.placedCount++;
        FX.playSnap();
        FX.vibrate(18);
        this.onProgress(this.placedCount, this.pieces.length, this.moves);
        if (this.placedCount === this.pieces.length) {
          setTimeout(() => this.onWin(this.moves), 250);
        }
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }

  // Подсказка должна подсказывать: раньше деталь просто увеличивалась,
  // и было непонятно, куда её нести. Теперь подсвечиваем и саму деталь,
  // и то место на поле, которому она принадлежит.
  hint() {
    const remaining = this.pieces.filter(p => !p.placed);
    if (!remaining.length) return;

    const piece = remaining[Math.floor(Math.random() * remaining.length)];
    const slot = this.board.children[piece.r * this.cols + piece.c];

    piece.div.classList.remove('hint-glow');
    void piece.div.offsetWidth; // перезапуск анимации, если жать подряд
    piece.div.classList.add('hint-glow');

    if (slot) {
      slot.classList.remove('hint');
      void slot.offsetWidth;
      slot.classList.add('hint');
    }

    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      piece.div.classList.remove('hint-glow');
      if (slot) slot.classList.remove('hint');
    }, 3400);

    // Деталь может лежать ниже видимой части — подводим её к глазам
    if (piece.div.scrollIntoView) {
      piece.div.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  reshuffle() {
    // Уложенные детали не трогаем — перемешиваем только оставшиеся.
    this._scatterPieces(this.pieces.filter(p => !p.placed));
  }

  destroy() {
    // Если уровень закрыли прямо во время перетаскивания, отпускание мыши
    // не должно достучаться до уже несуществующего пазла.
    this._destroyed = true;
    this._activePointerId = null;
    clearTimeout(this._hintTimer);
    this.playfield.querySelectorAll('.piece').forEach(el => el.remove());
    this.board.innerHTML = '';
  }
}
