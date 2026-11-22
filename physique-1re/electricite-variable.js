/* ==========================================================================
   Chapitre 6 — Électricité en régime variable : chronogrammes, écrans
   d'oscilloscope et banque de questions paramétrées.
   Inspirée de la fiche d'exercices « Régime variable » (exercice 1 : deux
   oscillogrammes sinusoïdaux ; exercice 2 : tracer deux chronogrammes ;
   exercice 3 : trois signaux, période, fréquence, valeurs moyenne et efficace ;
   exercice 5, type DS : un oscillogramme et un signal en créneaux) et des deux
   cours (grandeur périodique, période, fréquence, valeurs maximale et efficace ;
   tension sinusoïdale avec une composante continue).

   Les chronogrammes sont dessinés en SVG par chrono() et les écrans
   d'oscilloscope par oscillo() : les mêmes pour le cours, les exemples et les
   questions. Chaque générateur de question renvoie { type, ask, html, answer,
   unit, traps, solution } (ou, pour un QCM, { type, ask, html, choices, answer,
   solution }). Les « pièges » sont les erreurs fréquentes : elles sont
   expliquées à l'élève avant la solution complète.
   Utilisé par la page (window.ChapterBank) et par les tests (node --test).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../assets/core.js'));
  else root.ChapterBank = factory(root.CourseCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  var T = C.texNum;

  /* =====================================================================
     Dessins (SVG) : repère gradué, quadrillage, courbes, repères de lecture.
     La courbe d'une tension est orange (--q-u), d'une intensité verte (--q-I) ;
     la valeur moyenne est bleue (--q-moy), la valeur efficace verte (--q-eff).
     Les repères de lecture (T, Umax, divisions) sont à l'encre du texte.
     ===================================================================== */
  function r1(x) { return String(Math.round(x * 10) / 10); }
  function xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** Nombre affiché : 3 chiffres significatifs, virgule, vrai signe moins (−). */
  function fr(x, sig) { return Math.abs(x) < 1e-12 ? '0' : C.fmtNum(x, sig || 3).replace('-', '−'); }
  /** Graduation : la valeur exacte (0,5 ; 12,5 ; −10). */
  function tickText(v) { return fr(C.roundSig(v, 6), 6); }
  /** « U_max = 4 V » : symbole en italique, indice abaissé ; « u (V) », « T = 20 ms » : symbole en italique. */
  function rich(s) {
    var m = /^([A-Za-z])_([A-Za-z0-9,]+)(.*)$/.exec(s);
    if (m) return '<tspan class="q">' + m[1] + '</tspan><tspan class="sub" dx="1" dy="4">' + xml(m[2]) + '</tspan>' + (m[3] ? '<tspan dy="-4">' + xml(m[3]) + '</tspan>' : '');
    m = /^([A-Za-z])((?:\(t\))?(?:\s.*)?)$/.exec(s);
    if (m) return '<tspan class="q">' + m[1] + '</tspan>' + xml(m[2]);
    return xml(s);
  }
  /** Texte d'une ou plusieurs lignes (séparées par \n) ; la première ligne peut porter un symbole et un indice. */
  function text(x, y, s, anchor, cls, plain) {
    var lines = String(s).split('\n'), y0 = y - (lines.length - 1) * 8.5;
    var body = (plain ? xml(lines[0]) : rich(lines[0])) + lines.slice(1).map(function (l, i) { return '<tspan x="' + r1(x) + '" y="' + r1(y0 + 17 * (i + 1)) + '">' + xml(l) + '</tspan>'; }).join('');
    return '<text x="' + r1(x) + '" y="' + r1(y0) + '"' + (anchor && anchor !== 'start' ? ' text-anchor="' + anchor + '"' : '') +
      (cls ? ' class="' + cls + '"' : '') + '>' + body + '</text>';
  }
  /** Pointe de flèche en (x, y), direction (dx, dy) unitaire. */
  function head(x, y, dx, dy, s) {
    s = s || 8; var w = s * 0.55;
    return 'M' + r1(x) + ' ' + r1(y) + 'L' + r1(x - dx * s - dy * w) + ' ' + r1(y - dy * s + dx * w) + 'L' + r1(x - dx * s + dy * w) + ' ' + r1(y - dy * s - dx * w) + 'Z';
  }
  /** Cote horizontale (double flèche) de xa à xb, étiquette au-dessus (ou en dessous). */
  function dimH(xa, xb, y, s, below) {
    return '<g class="mk"><path d="M' + r1(xa) + ' ' + r1(y) + 'H' + r1(xb) + '"/><path class="hd" d="' + head(xa, y, -1, 0, 7) + head(xb, y, 1, 0, 7) + '"/>' +
      (s ? text((xa + xb) / 2, below ? y + 17 : y - 7, s, 'middle', 'lab') : '') + '</g>';
  }
  /** Flèche verticale de ya vers yb (double si both), étiquette à droite, à gauche (at = 'l'), au-dessus (t) ou en dessous (b) de la pointe. */
  function dimV(x, ya, yb, s, at, both) {
    var dir = yb < ya ? -1 : 1;
    return '<g class="mk"><path d="M' + r1(x) + ' ' + r1(ya) + 'V' + r1(yb) + '"/><path class="hd" d="' + head(x, yb, 0, dir, 7) + (both ? head(x, ya, 0, -dir, 7) : '') + '"/>' +
      (!s ? '' : at === 't' || at === 'b' ? text(x, at === 't' ? yb - 9 : yb + 20, s, 'middle', 'lab') : text(at === 'l' ? x - 7 : x + 7, (ya + yb) / 2 + 5, s, at === 'l' ? 'end' : 'start', 'lab')) + '</g>';
  }
  function poly(pts, X, Y) { return 'M' + pts.map(function (p) { return r1(X(p[0])) + ' ' + r1(Y(p[1])); }).join('L'); }
  /** Points d'une fonction : n intervalles réguliers, plus les instants clés (extremums) pour un tracé exact. */
  function samplePts(f, a, b, n, keys) {
    var ts = [];
    for (var i = 0; i <= n; i++) ts.push(a + (b - a) * i / n);
    (keys || []).forEach(function (k) { if (k > a && k < b) ts.push(k); });
    ts.sort(function (p, q) { return p - q; });
    return ts.map(function (t) { return [t, f(t)]; });
  }
  /** Largeur approchée d'une graduation (police 12,5). */
  function tickW(s) { return String(s).length * 7.2; }

  /**
   * Repère d'un chronogramme dans le rectangle (ox, oy, w, h).
   * o : { t0, t1, y0, y1 : fenêtre ; xs, ys : pas du quadrillage (graduations numérotées) ; xm, ym : quadrillage fin ;
   *       xt, yt : graduations numérotées imposées ; xl, yl : noms des axes ;
   *       curves: [{ f | pts, col, keys, from, to, dash }], hl: [{ y, col, s, at }],
   *       period: [{ a, b, y, s, below }], vmark: [{ t, a, b, s, at, both }], dots: [{ t, u, col }],
   *       band: { a, b, s }, areas: [{ pts, col }] }
   */
  function frame(o, ox, oy, w, h) {
    ox = ox || 0; oy = oy || 0;
    var t0 = o.t0, t1 = o.t1, y0 = o.y0, y1 = o.y1, mid = y0 < 0 && y1 > 0;
    var PL = o.pl !== undefined ? o.pl : 44, PR = o.pr !== undefined ? o.pr : 16, PT = o.pt !== undefined ? o.pt : 26, PB = o.pb !== undefined ? o.pb : (mid ? 10 : 24);
    var L = ox + PL, R = ox + w - PR, TOP = oy + PT, B = oy + h - PB;
    function X(t) { return L + (t - t0) / (t1 - t0) * (R - L); }
    function Y(u) { return TOP + (y1 - u) / (y1 - y0) * (B - TOP); }
    var ax = Y(mid ? 0 : y0), yAt0 = t0 <= 0 && t1 > 0, ay = X(yAt0 ? 0 : t0);
    var s = '', top = '';
    if (o.band) {
      s += '<rect class="band" x="' + r1(X(o.band.a)) + '" y="' + r1(TOP) + '" width="' + r1(X(o.band.b) - X(o.band.a)) + '" height="' + r1(B - TOP) + '"/>';
      if (o.band.s) top += text((X(o.band.a) + X(o.band.b)) / 2, TOP + 15, o.band.s, 'middle', 'lab', true);
    }
    function grid(sx, sy, cls) {
      var d = '', k;
      if (sx) for (k = Math.ceil(t0 / sx - 1e-9); k * sx <= t1 + 1e-9; k++) d += 'M' + r1(X(k * sx)) + ' ' + r1(TOP) + 'V' + r1(B);
      if (sy) for (k = Math.ceil(y0 / sy - 1e-9); k * sy <= y1 + 1e-9; k++) d += 'M' + r1(L) + ' ' + r1(Y(k * sy)) + 'H' + r1(R);
      return d ? '<path class="' + cls + '" d="' + d + '"/>' : '';
    }
    if (o.grid !== false) s += grid(o.xm, o.ym, 'g2') + grid(o.xs, o.ys, 'g1');
    (o.areas || []).forEach(function (a) {
      s += '<path class="area" style="--c: var(--q-' + a.col + ')" d="' + poly(a.pts, X, Y) + 'L' + r1(X(a.pts[a.pts.length - 1][0])) + ' ' + r1(Y(0)) + 'L' + r1(X(a.pts[0][0])) + ' ' + r1(Y(0)) + 'Z"/>';
    });
    // axes fléchés
    s += '<path class="axis" d="M' + r1(L) + ' ' + r1(ax) + 'H' + r1(R + 8) + 'M' + r1(ay) + ' ' + r1(B) + 'V' + r1(TOP - 12) + '"/>';
    s += '<path class="axis hd" d="' + head(R + 10, ax, 1, 0, 8) + head(ay, TOP - 14, 0, -1, 8) + '"/>';
    // graduations numérotées (assez espacées pour rester lisibles)
    // minPx(st) : écart minimal, en unités du dessin, entre deux graduations numérotées de pas st
    function values(lo, hi, step, list, minPx, scale) {
      if (list) return list;
      if (!step) return [];
      var st = step;
      while (st * scale < minPx(st)) st *= 2;
      var out = [];
      for (var k = Math.ceil(lo / st - 1e-9); k * st <= hi + 1e-9; k++) out.push(C.roundSig(k * st, 9));
      return out;
    }
    var pxX = (R - L) / (t1 - t0), pxY = (B - TOP) / (y1 - y0), marks = '';
    var xv = values(t0, t1, o.xs, o.xt, function (st) {
      var w = 0;
      for (var k = Math.ceil(t0 / st - 1e-9); k * st <= t1 + 1e-9; k++) w = Math.max(w, tickW(tickText(k * st)));
      return Math.max(28, w + 10);
    }, pxX).filter(function (v) { return Math.abs(v) > 1e-9 && v > t0 + 1e-9; });
    // 14 unités entre deux graduations : les chiffres (≈ 11 unités de haut, même en police de téléphone) ne se touchent pas
    var yv = values(y0, y1, o.ys, o.yt, function () { return 14; }, pxY).filter(function (v) { return Math.abs(v) > 1e-9 && (mid || v > y0 + 1e-9); });
    xv.forEach(function (v) { marks += 'M' + r1(X(v)) + ' ' + r1(ax - 3.5) + 'V' + r1(ax + 3.5); top += text(X(v), ax + 16, tickText(v), 'middle', 'tk tx', true); });
    yv.forEach(function (v) { marks += 'M' + r1(ay - 3.5) + ' ' + r1(Y(v)) + 'H' + r1(ay + 3.5); top += text(ay - 7, Y(v) + 4.5, tickText(v), 'end', 'tk ty', true); });
    if (marks) s += '<path class="axis" d="' + marks + '"/>';
    // « 0 » : graduation de l'axe des ordonnées, au niveau de l'axe des abscisses (jamais sur une autre graduation)
    if (o.origin !== false && (mid || Math.abs(y0) < 1e-12)) top += text(ay - 7, ax + 4.5, '0', 'end', 'tk ty', true);
    if (o.yl) top += text(ay + 10, oy + 15, o.yl, 'start', 'ax');
    if (o.xl) top += text(R + 10, ax - 9, o.xl, 'end', 'ax');
    // valeur moyenne, valeur efficace : droites horizontales
    (o.hl || []).forEach(function (l) {
      s += '<g class="hl" style="--c: var(--q-' + l.col + ')"><path d="M' + r1(L) + ' ' + r1(Y(l.y)) + 'H' + r1(R) + '"/></g>';
      if (l.s) top += text(l.x !== undefined ? X(l.x) : l.at === 'l' ? L + 6 : R - 4, Y(l.y) + (l.below ? 17 : -7), l.s, l.x !== undefined ? 'middle' : l.at === 'l' ? 'start' : 'end', 'lab');
    });
    (o.curves || []).forEach(function (c) {
      var pts = c.pts || samplePts(c.f, c.from !== undefined ? c.from : t0, c.to !== undefined ? c.to : t1, c.n || 360, c.keys);
      s += '<g class="sig' + (c.dash ? ' dash' : '') + '" style="--c: var(--q-' + (c.col || 'u') + ')"><path d="' + poly(pts, X, Y) + '"/></g>';
    });
    (o.dots || []).forEach(function (d) { s += '<circle class="pt" style="--c: var(--q-' + (d.col || 'u') + ')" cx="' + r1(X(d.t)) + '" cy="' + r1(Y(d.u)) + '" r="4"/>'; });
    (o.period || []).forEach(function (p) { top += dimH(X(p.a), X(p.b), Y(p.y), p.s, p.below); });
    (o.vmark || []).forEach(function (v) { top += dimV(X(v.t), Y(v.a), Y(v.b), v.s, v.at, v.both); });
    return { s: s + top, X: X, Y: Y };
  }
  function svg(w, h, label, body, cls) {
    return '<svg class="fig ' + (cls || 'chrono') + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + xml(label) + '">' + body + '</svg>';
  }
  /** Chronogramme complet (o : voir frame ; w, h : taille du dessin ; label : description pour les lecteurs d'écran). */
  function chrono(o) {
    var w = o.w || 400, h = o.h || 230;
    return svg(w, h, o.label || 'Chronogramme d’une grandeur variable', frame(o, 0, 0, w, h).s, 'chrono' + (o.mini ? ' mini' : ''));
  }

  /**
   * Écran d'oscilloscope : 10 divisions × 8, axes centraux gradués (5 sous-divisions).
   * o : { f: x (div) → y (div), keys, period: { a, b, y, s }, vmark: { x, a, b, s }, label }
   */
  var OSC = { D: 34, X0: 22, Y0: 10, NX: 10, NY: 8 };
  function oscillo(o) {
    var D = OSC.D, X0 = OSC.X0, Y0 = OSC.Y0, W = OSC.NX * D, H = OSC.NY * D, cy = Y0 + H / 2, cx = X0 + W / 2;
    function X(x) { return X0 + x * D; }
    function Y(y) { return cy - y * D; }
    var s = '<rect class="scr" x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + H + '" rx="6"/>', d = '', k;
    for (k = 1; k < OSC.NX; k++) d += 'M' + r1(X(k)) + ' ' + Y0 + 'V' + (Y0 + H);
    for (k = 1; k < OSC.NY; k++) d += 'M' + X0 + ' ' + r1(Y0 + k * D) + 'H' + (X0 + W);
    s += '<path class="g1" d="' + d + '"/>';
    d = '';
    for (k = 1; k < OSC.NX * 5; k++) d += 'M' + r1(X0 + k * D / 5) + ' ' + r1(cy - 3) + 'V' + r1(cy + 3);
    for (k = 1; k < OSC.NY * 5; k++) d += 'M' + r1(cx - 3) + ' ' + r1(Y0 + k * D / 5) + 'H' + r1(cx + 3);
    s += '<path class="g0" d="' + d + '"/>';
    var pts = samplePts(o.f, 0, OSC.NX, 500, o.keys);
    s += '<g class="sig" style="--c: var(--q-u)"><path d="' + poly(pts, X, Y) + '"/></g>';
    if (o.period) s += dimH(X(o.period.a), X(o.period.b), Y(o.period.y), o.period.s, o.period.below);
    if (o.vmark) s += dimV(X(o.vmark.x), Y(o.vmark.a), Y(o.vmark.b), o.vmark.s, o.vmark.at, o.vmark.both);
    return svg(X0 * 2 + W, Y0 * 2 + H, o.label || 'Écran d’oscilloscope : 10 divisions horizontales et 8 verticales', s, 'chrono osc');
  }

  /* ---------- signaux ---------- */
  /** Sinusoïde de valeur maximale off + A, maximum à l'instant ph. */
  function sinus(A, Tp, off, ph) { return function (t) { return (off || 0) + A * Math.cos(2 * Math.PI * (t - (ph || 0)) / Tp); }; }
  /** Instants des maximums et minimums d'une sinusoïde dans [a, b]. */
  function sinusKeys(Tp, ph, a, b) {
    var out = [], k0 = Math.floor((a - ph) / (Tp / 2)) - 1;
    for (var k = k0; ph + k * Tp / 2 <= b + 1e-9; k++) out.push(C.roundSig(ph + k * Tp / 2, 12));
    return out.filter(function (t) { return t >= a - 1e-9; });
  }
  /** Signal en paliers : motif [{ d: durée, v: valeur }] qui commence à shift, répété ; points du tracé (fronts verticaux). */
  function stepPts(motif, t0, t1, shift) {
    shift = shift || 0;
    var Tp = motif.reduce(function (s, x) { return s + x.d; }, 0);
    function at(t) {
      var p = ((t - shift) % Tp + Tp) % Tp, acc = 0;
      for (var i = 0; i < motif.length; i++) { acc += motif[i].d; if (p < acc - 1e-9) return motif[i].v; }
      return motif[motif.length - 1].v;
    }
    var cuts = [], k0 = Math.floor((t0 - shift) / Tp) - 1;
    for (var k = k0; shift + k * Tp <= t1 + 1e-9; k++) {
      var acc = shift + k * Tp;
      motif.forEach(function (seg) { var c = C.roundSig(acc, 12); if (c > t0 + 1e-9 && c < t1 - 1e-9) cuts.push(c); acc += seg.d; });
    }
    cuts.sort(function (a, b) { return a - b; });
    var pts = [[t0, at(t0)]];
    cuts.forEach(function (c) { var b = at(c - 1e-7), a = at(c + 1e-7); if (a !== b) { pts.push([c, b]); pts.push([c, a]); } });
    pts.push([t1, at(t1 - 1e-9)]);
    return pts;
  }
  /** Dents de scie : monte de a à b pendant T, redescend d'un coup ; motif qui commence à shift. */
  function rampPts(a, b, Tp, t0, t1, shift) {
    shift = shift || 0;
    function at(t) { var p = ((t - shift) % Tp + Tp) % Tp; return a + (b - a) * p / Tp; }
    var pts = [[t0, at(t0)]];
    for (var k = Math.floor((t0 - shift) / Tp); shift + k * Tp <= t1 + 1e-9; k++) {
      var c = C.roundSig(shift + k * Tp, 12);
      if (c > t0 + 1e-9 && c < t1 - 1e-9) { pts.push([c, b]); pts.push([c, a]); }
    }
    pts.push([t1, at(t1 - 1e-9)]);
    return pts;
  }
  /** Triangle : vaut lo à shift + kT, hi à shift + kT + T/2. */
  function trianglePts(lo, hi, Tp, t0, t1, shift) {
    shift = shift || 0;
    function at(t) { var p = ((t - shift) % Tp + Tp) % Tp / Tp; return p < 0.5 ? lo + (hi - lo) * 2 * p : hi - (hi - lo) * 2 * (p - 0.5); }
    var pts = [[t0, at(t0)]];
    for (var k = Math.floor((t0 - shift) / (Tp / 2)); shift + k * Tp / 2 <= t1 + 1e-9; k++) {
      var c = C.roundSig(shift + k * Tp / 2, 12);
      if (c > t0 + 1e-9 && c < t1 - 1e-9) pts.push([c, k % 2 === 0 ? lo : hi]);
    }
    pts.push([t1, at(t1)]);
    return pts;
  }
  /** Valeurs moyenne et efficace d'un motif en paliers. */
  function stepStats(motif) {
    var Tp = 0, s1 = 0, s2 = 0;
    motif.forEach(function (x) { Tp += x.d; s1 += x.v * x.d; s2 += x.v * x.v * x.d; });
    return { T: Tp, moy: s1 / Tp, eff: Math.sqrt(s2 / Tp) };
  }

  /* ---------- les dessins du chapitre (cours et exemples) ---------- */
  var FIG = {};
  /** Régime continu et régime variable, côte à côte. */
  FIG.regimes = function () {
    var a = frame({ t0: 0, t1: 10, y0: 0, y1: 15, ys: 3, yt: [12], xt: [], pl: 30, pb: 16, xl: 't', yl: 'U (V)', grid: false,
      curves: [{ pts: [[0, 12], [10, 12]] }] }, 0, 0, 198, 150);
    var b = frame({ t0: 0, t1: 10, y0: 0, y1: 15, ys: 3, yt: [12], xt: [], pl: 30, pb: 16, xl: 't', yl: 'u (V)', grid: false,
      curves: [{ f: function (t) { return 12 * (1 - Math.exp(-t / 2.2)); }, n: 120 }] }, 202, 0, 198, 150);
    return svg(400, 178, 'À gauche, régime continu : la tension U reste égale à 12 V. À droite, régime variable : la tension u(t) augmente au cours du temps.',
      a.s + b.s + text(108, 170, 'régime continu', 'middle', 'cap', true) + text(310, 170, 'régime variable', 'middle', 'cap', true));
  };
  /** Grandeur périodique : le motif qui se répète, la période. */
  FIG.motif = function () {
    var one = [[0, 0], [1, 6], [2, 6], [2, 0], [3, 0]], pts = [];
    for (var k = 0; k < 3; k++) one.forEach(function (p, i) { if (k === 0 || i > 0) pts.push([p[0] + 3 * k, p[1]]); });
    pts.push([9.6, 3.6]);
    return chrono({ t0: 0, t1: 9.8, y0: 0, y1: 8.6, xs: 1, ys: 2, xl: 't (ms)', yl: 'u (V)', curves: [{ pts: pts }], band: { a: 3, b: 6, s: 'motif' },
      period: [{ a: 6, b: 9, y: 7.4, s: 'T = 3 ms' }], h: 220,
      label: 'Une tension périodique : le même motif (une montée, un palier à 6 V, un retour à 0) se répète toutes les 3 ms. Le deuxième motif est surligné ; la période T = 3 ms est cotée sur le troisième.' });
  };
  /** Période : entre deux maximums, ou entre deux minimums. */
  FIG.periode = function () {
    var f = sinus(4, 20, 0, 5);
    return chrono({ t0: 0, t1: 50, y0: -6.6, y1: 6.6, xs: 10, xm: 5, ys: 2, xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(20, 5, 0, 50) }],
      dots: [{ t: 5, u: 4 }, { t: 25, u: 4 }, { t: 15, u: -4 }, { t: 35, u: -4 }],
      period: [{ a: 5, b: 25, y: 5, s: 'T = 20 ms' }, { a: 15, b: 35, y: -5, s: 'T = 20 ms', below: true }], h: 250,
      label: 'Tension sinusoïdale de valeur maximale 4 V : deux maximums successifs, à 5 ms et 25 ms, sont séparés d’une période T = 20 ms ; deux minimums successifs aussi.' });
  };
  /** Valeurs maximale et minimale. */
  FIG.valeurs = function () {
    var f = sinus(4, 20, 0, 5);
    return chrono({ t0: 0, t1: 40, y0: -6.2, y1: 6.2, xs: 10, xm: 5, ys: 2, ym: 1, xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(20, 5, 0, 40) }],
      vmark: [{ t: 5, a: 0, b: 4, s: 'U_max = 4 V', at: 't' }, { t: 15, a: 0, b: -4, s: 'U_min = −4 V', at: 'b' }], h: 250,
      label: 'Tension sinusoïdale : sa valeur maximale vaut 4 V (flèche du zéro au sommet), sa valeur minimale −4 V.' });
  };
  /** Lire un oscillogramme : nombre de divisions × réglage. */
  FIG.oscilloCours = function () {
    return oscillo({ f: function (x) { return 2 * Math.sin(2 * Math.PI * x / 4); }, keys: [1, 3, 5, 7, 9], period: { a: 1, b: 5, y: 2.6, s: '4 div' }, vmark: { x: 9, a: 0, b: 2, s: '2 div', at: 't' },
      label: 'Écran d’oscilloscope : une sinusoïde dont deux sommets successifs sont séparés de 4 divisions horizontales ; le sommet est à 2 divisions au-dessus de l’axe central.' });
  };
  /** Tracer une sinusoïde : cinq points par période. */
  FIG.tracer = function () {
    var f = sinus(6, 8, 0, 2), dots = [0, 2, 4, 6, 8].map(function (t) { return { t: t, u: Math.round(f(t) * 1e9) / 1e9 }; });
    return chrono({ t0: 0, t1: 17, y0: -9, y1: 8.6, xs: 2, xm: 1, ys: 2, xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(8, 2, 0, 17) }], dots: dots,
      period: [{ a: 0, b: 8, y: -7.6, s: 'T = 8 ms', below: true }], h: 250,
      label: 'Sinusoïde de période 8 ms et de valeur maximale 6 V tracée à partir de cinq points : 0 V à 0 ms, 6 V à 2 ms, 0 V à 4 ms, −6 V à 6 ms, 0 V à 8 ms.' });
  };
  /** Valeur moyenne d'un créneau : aires positive et négative. */
  FIG.moyenne = function () {
    var motif = [{ d: 1, v: 9 }, { d: 2, v: -3 }], pts = stepPts(motif, 0, 9.6, 0);
    return chrono({ t0: 0, t1: 9.6, y0: -5.4, y1: 11.4, xs: 1, ys: 3, xl: 't (ms)', yl: 'u (V)', curves: [{ pts: pts }], areas: [{ pts: pts, col: 'u' }],
      hl: [{ y: 1, col: 'moy', s: '⟨u⟩ = 1 V', x: 5 }], h: 250,
      label: 'Tension en créneaux : 9 V pendant 1 ms puis −3 V pendant 2 ms (période 3 ms). Les aires au-dessus et en dessous de l’axe sont coloriées ; la valeur moyenne, 1 V, est tracée en bleu.' });
  };
  /** Alternative ou non : deux créneaux qui changent de signe. */
  FIG.alternatif = function () {
    var A = [{ d: 2, v: 5 }, { d: 2, v: -5 }], B = [{ d: 2, v: 6 }, { d: 2, v: -2 }];
    var o = { t0: 0, t1: 9, y0: -7, y1: 8.4, xs: 2, ys: 5, yt: [-5, 5], xt: [], pl: 32, pb: 10, xl: 't', yl: 'u (V)', grid: false };
    var a = frame(Object.assign({}, o, { curves: [{ pts: stepPts(A, 0, 9) }], hl: [{ y: 0, col: 'moy' }] }), 0, 0, 198, 160);
    var b = frame(Object.assign({}, o, { yt: [-2, 6], curves: [{ pts: stepPts(B, 0, 9) }], hl: [{ y: 2, col: 'moy' }] }), 202, 0, 198, 160);
    return svg(400, 212, 'À gauche, un créneau qui vaut 5 V puis −5 V pendant des durées égales : sa valeur moyenne est nulle, il est alternatif. À droite, un créneau 6 V puis −2 V : il change de signe, mais sa valeur moyenne vaut 2 V, il n’est pas alternatif.',
      a.s + b.s + text(108, 186, 'alternative\n⟨u⟩ = 0', 'middle', 'cap', true) + text(310, 186, 'non alternative\n⟨u⟩ = 2 V', 'middle', 'cap', true));
  };
  /** Valeur efficace : la tension du secteur. */
  FIG.efficace = function () {
    var f = sinus(325, 20, 0, 5);
    return chrono({ t0: 0, t1: 45, y0: -420, y1: 420, xs: 10, xm: 5, ys: 100, pl: 48, xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(20, 5, 0, 45) }],
      hl: [{ y: 230, col: 'eff', s: 'U_eff = 230 V', x: 35 }], vmark: [{ t: 25, a: 0, b: 325, s: 'U_max = 325 V', at: 't' }], h: 260,
      label: 'La tension du secteur : sinusoïde de valeur maximale 325 V et de période 20 ms. La droite verte marque sa valeur efficace, 230 V.' });
  };
  /** s(t) = ⟨s⟩ + s_alt(t) : trois petits chronogrammes. */
  FIG.decomposition = function () {
    var o = { t0: 0, t1: 6.4, y0: -1.8, y1: 3.9, xt: [], yt: [], origin: false, pl: 12, pr: 14, pt: 26, pb: 10, grid: false, xl: 't' };
    var f = sinus(1.2, 2, 2.2, 0.5), g = sinus(1.2, 2, 0, 0.5), keys = sinusKeys(2, 0.5, 0, 6.4);
    var a = frame(Object.assign({}, o, { yl: 's(t)', curves: [{ f: f, keys: keys }] }), 0, 0, 120, 140);
    var b = frame(Object.assign({}, o, { yl: '⟨s⟩', curves: [{ pts: [[0, 2.2], [6.4, 2.2]], col: 'moy' }] }), 140, 0, 120, 140);
    var c = frame(Object.assign({}, o, { yl: 's_alt(t)', curves: [{ f: g, keys: keys }] }), 280, 0, 120, 140);
    return svg(400, 166, 'Le signal s(t) est égal à sa composante continue ⟨s⟩, une droite horizontale, plus sa composante alternative s_alt(t), une sinusoïde centrée sur zéro.',
      a.s + b.s + c.s + text(130, 82, '=', 'middle', 'sym', true) + text(270, 82, '+', 'middle', 'sym', true) +
      text(66, 160, 'signal', 'middle', 'cap', true) + text(206, 160, 'continue', 'middle', 'cap', true) + text(346, 160, 'alternative', 'middle', 'cap', true));
  };
  /** Exemple du cours 2 : u(t) = 2 + 3 cos t. */
  FIG.coursExemple = function () {
    var f = sinus(3, 2 * Math.PI, 2, 0);
    return chrono({ t0: 0, t1: 16.4, y0: -2, y1: 6.8, xs: 1, xt: [2, 4, 6, 8, 10, 12, 14, 16], ys: 1, xl: 't (s)', yl: 'U (V)', curves: [{ f: f, keys: sinusKeys(2 * Math.PI, 0, 0, 16.4) }],
      hl: [{ y: 2, col: 'moy', s: '⟨U⟩ = 2 V', below: true }], vmark: [{ t: 2 * Math.PI, a: 2, b: 5, s: 'U_m = 3 V', at: 't' }], h: 250,
      label: 'Exemple du cours : sinusoïde qui oscille entre −1 V et 5 V. Sa valeur moyenne, 2 V, est l’axe de symétrie (droite bleue) ; l’amplitude U_m = 3 V est l’écart entre cet axe et le sommet.' });
  };
  /** Exercice 1 : oscillogrammes 1 et 2 du livre. */
  FIG.osc1 = function (sol) {
    var f = sinus(4, 70, 0, 0);
    return chrono({ t0: 0, t1: 104, y0: -4.7, y1: sol ? 5.6 : 4.7, xs: 10, ys: 1, yt: [-4, -3, -2, -1, 1, 2, 3, 4], xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(70, 0, 0, 104) }],
      period: sol ? [{ a: 0, b: 70, y: 4.6, s: 'T = 70 ms' }] : [], dots: sol ? [{ t: 0, u: 4 }, { t: 70, u: 4 }] : [], h: 250,
      label: 'Oscillogramme 1 : tension sinusoïdale de valeur maximale 4 V ; maximums à 0 ms et 70 ms, minimum à 35 ms ; la fenêtre va jusqu’à 100 ms.' });
  };
  FIG.osc2 = function (sol) {
    var f = sinus(12, 2.2, 0, 0);
    return chrono({ t0: 0, t1: 5.2, y0: -13.6, y1: sol ? 16 : 13.6, xs: 0.5, ys: 4, ym: 2, yt: [-12, -8, -4, 4, 8, 12], xl: 't (ms)', yl: 'u (V)', curves: [{ f: f, keys: sinusKeys(2.2, 0, 0, 5.2) }],
      period: sol ? [{ a: 0, b: 2.2, y: 13.2, s: 'T' }, { a: 2.2, b: 4.4, y: 13.2, s: 'T' }] : [], dots: sol ? [{ t: 2.2, u: 12 }, { t: 4.4, u: 12 }] : [], h: 250,
      label: 'Oscillogramme 2 : tension sinusoïdale de valeur maximale 12 V ; maximums à 0 ms, 2,2 ms et 4,4 ms ; la fenêtre va jusqu’à 5 ms.' });
  };
  /** Exercice 2 : figures 10 (tension) et 11 (intensité), vides ou tracées. */
  FIG.fig10 = function (sol) {
    var f = sinus(25, 20, 0, 5);
    return chrono({ t0: 0, t1: 27.6, y0: -30, y1: 30, xs: 5, xm: 1, ys: 10, ym: 2, xl: 't (ms)', yl: 'u (V)',
      curves: sol ? [{ f: f, keys: sinusKeys(20, 5, 0, 27.6) }] : [], dots: sol ? [0, 5, 10, 15, 20, 25].map(function (t) { return { t: t, u: Math.round(f(t) * 1e9) / 1e9 }; }) : [],
      period: sol ? [{ a: 0, b: 20, y: -28, s: 'T = 20 ms', below: false }] : [], h: 260,
      label: sol ? 'Figure 10 tracée : tension sinusoïdale de période 20 ms et de valeur maximale 25 V ; elle vaut 0 V à 0 ms, 25 V à 5 ms, 0 V à 10 ms, −25 V à 15 ms, 0 V à 20 ms et 25 V à 25 ms.'
        : 'Figure 10 : repère vide, t en ms de 0 à 27 ms (graduations tous les 5 ms), u en V de −30 V à 30 V (graduations tous les 10 V).' });
  };
  FIG.fig11 = function (sol) {
    var f = sinus(0.3, 5, 0, 1.25);
    return chrono({ t0: 0, t1: 6.2, y0: -0.45, y1: 0.45, xs: 1, xm: 0.25, ys: 0.15, ym: 0.05, yt: [-0.3, 0.3], xl: 't (ms)', yl: 'i (A)',
      curves: sol ? [{ f: f, col: 'I', keys: sinusKeys(5, 1.25, 0, 6.2) }] : [], dots: sol ? [0, 1.25, 2.5, 3.75, 5].map(function (t) { return { t: t, u: Math.round(f(t) * 1e9) / 1e9, col: 'I' }; }) : [],
      period: sol ? [{ a: 0, b: 5, y: -0.4, s: 'T = 5 ms', below: false }] : [], h: 260,
      label: sol ? 'Figure 11 tracée : intensité sinusoïdale de période 5 ms et de valeur maximale 0,3 A ; elle vaut 0 A à 0 ms, 0,3 A à 1,25 ms, 0 A à 2,5 ms, −0,3 A à 3,75 ms et 0 A à 5 ms.'
        : 'Figure 11 : repère vide, t en ms de 0 à 6 ms, i en A de −0,45 A à 0,45 A (graduations à −0,3 A et 0,3 A).' });
  };
  /** Exercice 3 : signaux a, b et c du livre (sol : valeurs moyenne et efficace tracées). */
  var EX3 = {
    a: { motif: [{ d: 1, v: 6 }, { d: 4, v: -4 }], t1: 7.6, xs: 1, ys: 2, y0: -5.6, y1: 7.6, xl: 't (s)', T: 5 },
    b: { motif: [{ d: 10, v: 9 }, { d: 20, v: 6 }, { d: 10, v: -3 }, { d: 10, v: 0 }], t1: 92, xs: 10, xt: [20, 40, 60, 80], ys: 3, y0: -6.5, y1: 11, xl: 't (s)', T: 50 },
    c: { ramp: [-8, 12], t1: 76, xs: 10, xt: [20, 40, 60], ys: 4, y0: -10, y1: 14.5, xl: 't (ms)', T: 50 }
  };
  FIG.ex3 = function (k, sol) {
    var e = EX3[k], pts = e.motif ? stepPts(e.motif, 0, e.t1, 0) : rampPts(e.ramp[0], e.ramp[1], e.T, 0, e.t1, 0);
    var st = e.motif ? stepStats(e.motif) : { moy: (e.ramp[0] + e.ramp[1]) / 2, eff: Math.sqrt((e.ramp[0] * e.ramp[0] + e.ramp[0] * e.ramp[1] + e.ramp[1] * e.ramp[1]) / 3) };
    var desc = {
      a: 'Signal a : 6 V pendant 1 s, puis −4 V pendant 4 s ; le motif recommence à 5 s.',
      b: 'Signal b : 9 V pendant 10 s, 6 V pendant 20 s, −3 V pendant 10 s, 0 V pendant 10 s ; le motif recommence à 50 s.',
      c: 'Signal c : dents de scie, la tension monte de −8 V à 12 V en 50 ms puis redescend d’un coup à −8 V.'
    }[k];
    return chrono({ t0: 0, t1: e.t1, y0: e.y0, y1: e.y1, xs: e.xs, xt: e.xt, ys: e.ys, xl: e.xl, yl: 'u (V)', curves: [{ pts: pts }],
      hl: sol ? [{ y: st.moy, col: 'moy' }, { y: st.eff, col: 'eff' }] : [], h: 240,
      label: desc + (sol ? ' Valeur moyenne ' + fr(st.moy) + ' V (droite bleue), valeur efficace ' + fr(st.eff) + ' V (droite verte).' : '') });
  };
  /** Exercice 5 : l'oscillogramme (1re partie) et le signal en créneaux (2e partie). */
  FIG.ex5a = function (sol) {
    return oscillo({ f: function (x) { return 2.5 * Math.sin(Math.PI * x); }, keys: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5],
      period: sol ? { a: 2.5, b: 4.5, y: 3, s: '2 div' } : null, vmark: sol ? { x: 8.5, a: 0, b: 2.5, s: '2,5 div', at: 't' } : null,
      label: 'Exercice 5, 1re partie : sinusoïde sur l’écran ; ' + (sol ? 'deux sommets successifs sont séparés de 2 divisions et le sommet est à 2,5 divisions de l’axe central.' : 'cinq périodes sur les dix divisions, les sommets à deux divisions et demie de l’axe central.') });
  };
  FIG.ex5b = function (sol) {
    var motif = [{ d: 200, v: 3 }, { d: 200, v: -5 }];
    return chrono({ t0: 0, t1: 950, y0: -6.4, y1: sol ? 5.6 : 4.6, xs: 100, ys: 1, yt: [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4], pl: 40, xl: 't (µs)', yl: 'u (V)', curves: [{ pts: stepPts(motif, 0, 950, 20) }],
      hl: sol ? [{ y: -1, col: 'moy', s: '⟨u⟩ = −1 V', below: true }] : [], period: sol ? [{ a: 20, b: 420, y: 4, s: 'T = 400 µs' }] : [], h: 260,
      label: 'Exercice 5, 2e partie : tension en créneaux qui vaut 3 V pendant 200 µs puis −5 V pendant 200 µs ; les fronts montants sont à 20, 420 et 820 µs.' + (sol ? ' Valeur moyenne −1 V (droite bleue).' : '') });
  };

  /* =====================================================================
     Banque de questions
     ===================================================================== */
  function m(t) { return '\\(' + t + '\\)'; }
  /** « formule générale, soit valeur numérique » : deux formules courtes, qui passent à la ligne entre elles sur téléphone. */
  function soit(a, b) { return m(a) + ', soit ' + m(b); }
  function steps(list) { return '<ol class="steps-list">' + list.filter(Boolean).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }
  function fig(s) { return '<figure class="fig-wrap">' + s + '</figure>'; }
  var UNITW = { V: 'volts (V)', s: 'secondes (s)', ms: 'millisecondes (ms)', 'µs': 'microsecondes (µs)', Hz: 'hertz (Hz)' };
  var UNITK = { s: 1, ms: 1e-3, 'µs': 1e-6 };
  function ut(u) { return { V: '\\mathrm{V}', s: '\\mathrm{s}', ms: '\\mathrm{ms}', 'µs': '\\mu\\mathrm{s}', Hz: '\\mathrm{Hz}', A: '\\mathrm{A}' }[u]; }
  /** Grandeur avec unité, en LaTeX. */
  function Q(x, u, sig) { return T(x, sig || 3) + '\\ ' + ut(u); }
  // grandeurs colorées : période, fréquence, valeurs maximale, moyenne, efficace
  var TP = '\\QTp', FQ = '\\Qf', UMAX = '\\QUmax', MOY = '\\Qmoy', UEFF = '\\QUeff', UALT = '\\QUalt', UM = '\\q{u}{U_m}', UMIN = '\\q{u}{U_{\\min}}';
  var S2 = '\\sqrt{2}';
  function sig(x, n) { return C.roundSig(x, n || 3); }
  function isInt(x) { return Math.abs(x - Math.round(x)) < 1e-9; }

  function make(rng) {
    rng = rng || Math.random;
    function P(arr) { return arr[Math.floor(rng() * arr.length)]; }
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    /** Valeur au hasard entre a et b, par pas de step (sans bruit d'arrondi). */
    function between(a, b, step) { var n = Math.round((b - a) / step); return sig(a + step * Math.floor(rng() * (n + 1)), 6); }
    /** QCM : bonne réponse + distracteurs mélangés ; why = explication d'un distracteur. */
    function mcq(o, right, wrongs) {
      var all = shuffle([{ html: right, ok: true }].concat(wrongs.map(function (w) { return typeof w === 'string' ? { html: w } : w; })));
      o.choices = all.map(function (c) { return { html: c.html, why: c.why }; });
      o.answer = all.findIndex(function (c) { return c.ok; });
      o.ask = o.ask || 'Choisis la bonne réponse.';
      return o;
    }

    /* ---- données d'une sinusoïde lisible sur un quadrillage ---- */
    var XS = [{ xs: 0.5, u: 'ms' }, { xs: 1, u: 'ms' }, { xs: 2, u: 'ms' }, { xs: 5, u: 'ms' }, { xs: 10, u: 'ms' }, { xs: 20, u: 'µs' }, { xs: 50, u: 'µs' }, { xs: 100, u: 'µs' }, { xs: 1, u: 's' }];
    function sinusData(off) {
      var X = P(XS), q = P([2, 2.5, 3, 4, 5]), Tp = sig(q * X.xs, 6), ys = P([1, 2, 5, 10, 50]), p = P([1.5, 2, 2.5, 3, 3.5, 4]), A = sig(p * ys, 6);
      var ph = P(q === 2 || q === 4 ? [0, Tp / 4, Tp / 2] : [0, Tp / 2]);
      off = off || 0;
      var hi = off + A, lo = off - A, y1 = (Math.floor(Math.max(hi, 0) / ys + 1e-9) + 1) * ys, y0 = -(Math.floor(Math.max(-lo, 0) / ys + 1e-9) + 1) * ys;
      var t1 = 10 * X.xs;
      // deux maximums successifs, loin de l'axe des ordonnées si possible
      var maxima = [];
      for (var t = ph; t <= t1 + 1e-9; t += Tp) maxima.push(sig(t, 9));
      var m1 = maxima[0] < 1e-9 && maxima.length > 2 ? maxima[1] : maxima[0];
      return { X: X, q: q, Tp: Tp, ys: ys, A: A, ph: ph, off: off, t1: t1, y0: y0, y1: y1, m1: m1, m2: sig(m1 + Tp, 9) };
    }
    function sinusFig(d, extra) {
      return chrono(Object.assign({ t0: 0, t1: d.t1 * 1.04, y0: d.y0, y1: d.y1, xs: d.X.xs, xm: d.X.xs / 2, ys: d.ys, ym: d.ys / 2, pl: d.ys >= 50 ? 48 : 44,
        xl: 't (' + d.X.u + ')', yl: 'u (V)', curves: [{ f: sinus(d.A, d.Tp, d.off, d.ph), keys: sinusKeys(d.Tp, d.ph, 0, d.t1 * 1.04) }], h: 250,
        label: 'Chronogramme d’une tension sinusoïdale tracée sur un quadrillage gradué : t en ' + d.X.u + ', u en volts.' }, extra || {}));
    }
    function readT(d) {
      return 'Deux maximums successifs sont aux instants ' + m(Q(d.m1, d.X.u, 6)) + ' et ' + m(Q(d.m2, d.X.u, 6)) + ' : ' + m(TP + ' = ' + T(d.m2, 6) + ' - ' + T(d.m1, 6) + ' = ' + Q(d.Tp, d.X.u, 6)) + '.';
    }

    /* ---- continu, variable, périodique (cours, I) ---- */
    function nature() {
      var v = P(['continu', 'variable', 'periodique', 'periodique']), U = P([3, 4.5, 6, 9, 12]), o = { t0: 0, t1: 10.4, y0: 0, y1: 15, xs: 1, ys: 3, xl: 't (s)', yl: 'u (V)', h: 220 };
      if (v === 'continu') o.curves = [{ pts: [[0, U], [10.4, U]] }];
      else if (v === 'variable') {
        var tau = P([1.5, 2, 3]), up = rng() < 0.5;
        o.curves = [{ f: function (t) { return up ? 12 * (1 - Math.exp(-t / tau)) : 12 * Math.exp(-t / tau); }, n: 160 }];
      } else {
        var shape = P(['sin', 'cren', 'tri']), Tp = P([2, 2.5, 4]);
        o.curves = [shape === 'sin' ? { f: sinus(4, Tp, 7, 0), keys: sinusKeys(Tp, 0, 0, 10.4) } : shape === 'cren' ? { pts: stepPts([{ d: Tp / 2, v: 10 }, { d: Tp / 2, v: 3 }], 0, 10.4) } : { pts: trianglePts(2, 11, Tp, 0, 10.4) }];
      }
      o.label = 'Chronogramme d’une tension, t en secondes, u en volts.';
      var C1 = 'régime continu : la tension ne varie pas', C2 = 'régime variable, tension périodique', C3 = 'régime variable, tension non périodique';
      var why = {
        continu: 'La tension garde la même valeur au cours du temps : le circuit fonctionne en <b>régime continu</b>.',
        variable: 'La tension change au cours du temps, mais aucun motif ne se répète : elle est variable et <b>non périodique</b>.',
        periodique: 'La tension change au cours du temps, et le même motif se répète à intervalles réguliers : elle est <b>périodique</b>.'
      };
      var right = { continu: C1, variable: C3, periodique: C2 }[v];
      var wrongs = [C1, C2, C3].filter(function (c) { return c !== right; }).map(function (c) { return { html: c, why: why[v] }; });
      return mcq({ type: 'Régime continu ou variable', ref: v === 'periodique' ? 'c-periodique' : 'c-regimes', ask: 'Choisis la bonne description.',
        html: '<p>Comment qualifier la tension représentée ci-dessous ?</p>' + fig(chrono(o)), solution: '<p>' + why[v] + '</p>' }, right, wrongs);
    }

    /* ---- f = 1/T (cours, II.2) ---- */
    function frequence() {
      var v = P(['Tf', 'Tf', 'fT']);
      if (v === 'Tf') {
        var c = P([{ u: 'ms', list: [0.5, 1, 2, 2.5, 4, 5, 8, 10, 12.5, 16, 20, 25, 40, 50, 70, 80] }, { u: 'µs', list: [10, 20, 25, 40, 50, 80, 125, 200, 250, 400, 500] }, { u: 's', list: [0.2, 0.25, 0.4, 2, 4, 5, 10, 50] }]);
        var Tv = P(c.list), Ts = sig(Tv * UNITK[c.u], 9), f = 1 / Ts, traps = [];
        if (c.u !== 's') traps.push({ value: 1 / Tv, msg: 'Convertis d’abord la période en <b>secondes</b> : ' + m(TP + ' = ' + Q(Tv, c.u) + ' = ' + T(Ts, 4) + '\\ \\mathrm{s}') + '. La fréquence s’obtient en hertz avec une période en secondes.' });
        if (c.u !== 's') traps.push({ value: 1 / (Tv / UNITK[c.u]), msg: 'La conversion est à l’envers : ' + m('1\\ ' + ut(c.u) + ' = ' + T(UNITK[c.u]) + '\\ \\mathrm{s}') + ', on <b>multiplie</b> par ' + m(T(UNITK[c.u])) + '.' });
        traps.push({ value: Tv, msg: 'La fréquence est l’<b>inverse</b> de la période : ' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + '.' });
        traps.push({ value: Ts, msg: 'Tu as converti la période en secondes ; il reste à prendre l’inverse : ' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + '.' });
        return {
          type: 'Fréquence et période', ask: ask('la fréquence', 'hertz (Hz)'), unit: 'Hz', answer: f, traps: traps,
          html: '<p>Une tension périodique a pour période ' + m(TP + ' = ' + Q(Tv, c.u)) + '.</p><p>Calcule sa fréquence ' + m(FQ) + '.</p>',
          solution: steps([c.u !== 's' ? 'Conversion : ' + m(TP + ' = ' + Q(Tv, c.u) + ' = ' + T(Ts, 4) + '\\ \\mathrm{s}') + '.' : null,
            soit(FQ + ' = \\dfrac{1}{' + TP + '}', '\\dfrac{1}{' + T(Ts, 4) + '} = ' + Q(f, 'Hz')) + '.'])
        };
      }
      var fv = P([20, 25, 40, 50, 60, 100, 125, 200, 250, 400, 500, 1000, 2000, 2500, 5000]), Tms = 1000 / fv;
      return {
        type: 'Fréquence et période', ask: ask('la période', 'millisecondes (ms)'), unit: 'ms', answer: Tms,
        traps: [{ value: 1 / fv, msg: 'Tu as trouvé la période en <b>secondes</b>. Elle est demandée en millisecondes : ' + m('1\\ \\mathrm{s} = 1\\,000\\ \\mathrm{ms}') + ', on multiplie par 1 000.' },
          { value: fv, msg: 'La période est l’<b>inverse</b> de la fréquence : ' + m(TP + ' = \\dfrac{1}{' + FQ + '}') + '.' },
          { value: 1e6 / fv, msg: m('1\\ \\mathrm{s} = 1\\,000\\ \\mathrm{ms}') + ' : on multiplie par 1 000, pas par 1 000 000.' }],
        html: '<p>Une tension sinusoïdale a pour fréquence ' + m(FQ + ' = ' + Q(fv, 'Hz')) + '.</p><p>Calcule sa période ' + m(TP) + '.</p>',
        solution: steps([soit(TP + ' = \\dfrac{1}{' + FQ + '}', '\\dfrac{1}{' + T(fv, 4) + '} = ' + T(1 / fv, 4) + '\\ \\mathrm{s}') + '.', 'Conversion : ' + m(TP + ' = ' + T(1 / fv, 4) + ' \\times 1\\,000\\ \\mathrm{ms} = ' + Q(Tms, 'ms')) + '.'])
      };
    }

    /* ---- lire un chronogramme sinusoïdal (exercice 1) ---- */
    function lectureSinus() {
      var d = sinusData(), v = P(['Umax', 'T', 'f', 'Ueff']), Ts = d.Tp * UNITK[d.X.u], f = 1 / Ts, o, read = readT(d);
      var html = '<p>Voici le chronogramme d’une tension sinusoïdale.</p>' + fig(sinusFig(d));
      var top = 'Le sommet de la courbe est à ' + m(Q(d.A, 'V')) + ' : ' + m(UMAX + ' = ' + Q(d.A, 'V')) + '.';
      if (v === 'Umax') o = {
        ask: ask('la valeur maximale', 'volts (V)'), unit: 'V', answer: d.A, ref: 'c-umax', q: 'sa valeur maximale ' + m(UMAX),
        traps: [{ value: 2 * d.A, msg: 'Tu as mesuré l’écart entre le sommet et le creux (la valeur crête à crête). La valeur maximale se lit du zéro jusqu’au sommet.' },
          { value: d.A / Math.SQRT2, msg: 'Ça, c’est la valeur efficace. La valeur maximale se lit directement : la plus grande valeur prise par la tension.' }],
        solution: steps([top])
      };
      else if (v === 'T') o = {
        ask: ask('la période', UNITW[d.X.u]), unit: d.X.u, answer: d.Tp, ref: 'c-periode', q: 'sa période ' + m(TP),
        traps: [{ value: d.Tp / 2, msg: 'Entre un sommet et le creux suivant, il ne s’écoule qu’une <b>demi</b>-période. La période sépare deux sommets successifs.' },
          { value: 2 * d.Tp, msg: 'La période est la durée d’<b>un seul</b> motif : entre deux sommets successifs.' }],
        solution: steps([read])
      };
      else if (v === 'f') o = {
        ask: ask('la fréquence', 'hertz (Hz)'), unit: 'Hz', answer: f, ref: 'c-frequence', q: 'sa fréquence ' + m(FQ),
        traps: [{ value: 1 / d.Tp, msg: 'Convertis la période en <b>secondes</b> avant de prendre l’inverse : ' + m(TP + ' = ' + Q(d.Tp, d.X.u, 6) + ' = ' + T(Ts, 4) + '\\ \\mathrm{s}') + '.' },
          { value: 2 * f, msg: 'Tu as lu une demi-période (d’un sommet au creux suivant). La période sépare deux sommets successifs.' },
          { value: d.Tp, msg: 'La fréquence est l’inverse de la période : ' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + '.' }],
        solution: steps([read, d.X.u !== 's' ? 'Conversion : ' + m(TP + ' = ' + T(Ts, 4) + '\\ \\mathrm{s}') + '.' : null, soit(FQ + ' = \\dfrac{1}{' + TP + '}', '\\dfrac{1}{' + T(Ts, 4) + '} = ' + Q(f, 'Hz')) + '.'])
      };
      else o = {
        ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: d.A / Math.SQRT2, ref: 'c-efficace', q: 'sa valeur efficace ' + m(UEFF),
        traps: [{ value: d.A / 2, msg: 'On divise par ' + m(S2 + ' \\approx 1{,}41') + ', pas par 2.' }, { value: d.A * Math.SQRT2, msg: 'La valeur efficace est plus petite que la valeur maximale : on <b>divise</b> par ' + m(S2) + '.' },
          { value: d.A, msg: 'Ça, c’est la valeur maximale. Pour une sinusoïde, ' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}') + '.' }],
        solution: steps([top, soit(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}', '\\dfrac{' + T(d.A) + '}{' + S2 + '} = ' + Q(d.A / Math.SQRT2, 'V')) + '.'])
      };
      return { type: 'Lire un chronogramme', ask: o.ask, unit: o.unit, answer: o.answer, ref: o.ref, traps: o.traps, solution: o.solution, html: html + '<p>Détermine ' + o.q + '.</p>' };
    }

    /* ---- lire un oscillogramme (exercice 5, 1re partie) ---- */
    var BAL = [{ v: 0.1, u: 'ms' }, { v: 0.2, u: 'ms' }, { v: 0.5, u: 'ms' }, { v: 1, u: 'ms' }, { v: 2, u: 'ms' }, { v: 5, u: 'ms' }, { v: 10, u: 'µs' }, { v: 20, u: 'µs' }, { v: 50, u: 'µs' }, { v: 100, u: 'µs' }];
    function oscData() {
      var sens = P([0.5, 1, 2, 5, 10]), B = P(BAL), na = P([1, 1.5, 2, 2.5, 3, 3.5]), nt = P([2, 2.5, 3, 4, 5]), x0 = P([0, 0.5, 1]);
      var keys = [];
      for (var x = x0 - nt; x <= 10 + 1e-9; x += nt / 2) if (x >= 0) keys.push(sig(x, 9));
      return { sens: sens, B: B, na: na, nt: nt, x0: x0, keys: keys, A: sig(na * sens, 6), Tp: sig(nt * B.v, 6) };
    }
    function oscSettings(d) {
      return '<p class="osc-set">Balayage horizontal : <b>' + tickText(d.B.v) + ' ' + d.B.u + '/div</b> · sensibilité verticale : <b>' + tickText(d.sens) + ' V/div</b></p>';
    }
    function oscillogramme() {
      var d = oscData(), v = P(['Umax', 'T', 'f', 'Ueff']), Ts = d.Tp * UNITK[d.B.u], f = 1 / Ts, o;
      var html = '<p>Une tension sinusoïdale est visualisée à l’oscilloscope.</p>' + fig(oscillo({ f: sinus(d.na, d.nt, 0, d.x0), keys: d.keys })) + oscSettings(d);
      var stA = 'Le sommet est à ' + m(T(d.na) + '\\ \\text{div}') + ' de l’axe central : ' + m(UMAX + ' = ' + T(d.na) + ' \\times ' + T(d.sens) + ' = ' + Q(d.A, 'V')) + '.';
      var stT = 'Deux sommets successifs sont séparés de ' + m(T(d.nt) + '\\ \\text{div}') + ' : ' + m(TP + ' = ' + T(d.nt) + ' \\times ' + T(d.B.v) + ' = ' + Q(d.Tp, d.B.u)) + '.';
      if (v === 'Umax') o = { ask: ask('la valeur maximale', 'volts (V)'), unit: 'V', answer: d.A, ref: 'c-oscillo', q: 'la valeur maximale ' + m(UMAX),
        traps: [{ value: d.na, msg: 'Tu as compté les divisions : multiplie-les par la sensibilité verticale (' + tickText(d.sens) + ' V/div).' },
          { value: 2 * d.A, msg: 'Tu as compté du creux au sommet (valeur crête à crête). La valeur maximale se compte depuis l’axe central.' }],
        solution: steps([stA]) };
      else if (v === 'T') o = { ask: ask('la période', UNITW[d.B.u]), unit: d.B.u, answer: d.Tp, ref: 'c-oscillo', q: 'la période ' + m(TP),
        traps: [{ value: d.nt, msg: 'Tu as compté les divisions : multiplie-les par le balayage (' + tickText(d.B.v) + ' ' + d.B.u + '/div).' },
          { value: d.Tp / 2, msg: 'D’un sommet au creux suivant, il n’y a qu’une demi-période. Compte les divisions entre deux sommets successifs.' }],
        solution: steps([stT]) };
      else if (v === 'f') o = { ask: ask('la fréquence', 'hertz (Hz)'), unit: 'Hz', answer: f, ref: 'c-oscillo', q: 'la fréquence ' + m(FQ),
        traps: [{ value: 1 / d.Tp, msg: 'Convertis la période en <b>secondes</b> avant de prendre l’inverse : ' + m(Q(d.Tp, d.B.u) + ' = ' + T(Ts, 4) + '\\ \\mathrm{s}') + '.' },
          { value: 1 / d.nt, msg: 'Le nombre de divisions n’est pas une durée : ' + m(TP + ' = ' + T(d.nt) + '\\ \\text{div} \\times ' + T(d.B.v) + '\\ ' + ut(d.B.u) + '/\\text{div}') + '.' },
          { value: 2 * f, msg: 'Tu as lu une demi-période. La période sépare deux sommets successifs.' }],
        solution: steps([stT, soit(FQ + ' = \\dfrac{1}{' + TP + '}', '\\dfrac{1}{' + T(Ts, 4) + '\\ \\mathrm{s}} = ' + Q(f, 'Hz')) + '.']) };
      else o = { ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: d.A / Math.SQRT2, ref: 'c-efficace', q: 'la valeur efficace ' + m(UEFF),
        traps: [{ value: d.na / Math.SQRT2, msg: 'Convertis d’abord les divisions en volts : ' + m(UMAX + ' = ' + T(d.na) + ' \\times ' + T(d.sens) + ' = ' + Q(d.A, 'V')) + '.' },
          { value: d.A / 2, msg: 'On divise par ' + m(S2) + ', pas par 2.' }, { value: d.A, msg: 'Ça, c’est la valeur maximale : ' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}') + '.' }],
        solution: steps([stA, soit(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}', '\\dfrac{' + T(d.A) + '}{' + S2 + '} = ' + Q(d.A / Math.SQRT2, 'V')) + '.']) };
      return { type: 'Lire un oscillogramme', ask: o.ask, unit: o.unit, answer: o.answer, ref: o.ref, traps: o.traps, solution: o.solution, html: html + '<p>Détermine ' + o.q + '.</p>' };
    }

    /* ---- Ueff = Umax / √2 (cours, II.4) ---- */
    function efficace() {
      var v = P(['eff', 'eff', 'max', 'secteur']);
      if (v === 'eff') {
        var A = P([5, 6, 10, 12, 15, 20, 24, 50, 100, 400]);
        return {
          type: 'Valeur efficace d’une sinusoïde', ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: A / Math.SQRT2,
          traps: [{ value: A / 2, msg: 'On divise par ' + m(S2 + ' \\approx 1{,}41') + ', pas par 2.' }, { value: A * Math.SQRT2, msg: 'La valeur efficace est plus petite que la valeur maximale : on <b>divise</b> par ' + m(S2) + '.' },
            { value: A, msg: 'La valeur efficace n’est pas la valeur maximale : ' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}') + '.' }],
          html: '<p>Une tension sinusoïdale alternative a pour valeur maximale ' + m(UMAX + ' = ' + Q(A, 'V')) + '.</p><p>Calcule sa valeur efficace ' + m(UEFF) + '.</p>',
          solution: steps([soit(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}', '\\dfrac{' + T(A) + '}{' + S2 + '} = ' + Q(A / Math.SQRT2, 'V')) + '.'])
        };
      }
      var E = v === 'secteur' ? 230 : P([6, 9, 12, 24, 48, 110, 120, 400]), U = E * Math.SQRT2;
      return {
        type: 'Valeur efficace d’une sinusoïde', ask: ask('la valeur maximale', 'volts (V)'), unit: 'V', answer: U,
        traps: [{ value: E / Math.SQRT2, msg: 'La valeur maximale est plus grande que la valeur efficace : ' + m(UMAX + ' = ' + UEFF + ' \\times ' + S2) + '.' },
          { value: 2 * E, msg: 'On multiplie par ' + m(S2 + ' \\approx 1{,}41') + ', pas par 2.' }, { value: E, msg: 'La valeur maximale n’est pas la valeur efficace : ' + m(UMAX + ' = ' + UEFF + ' \\times ' + S2) + '.' }],
        html: v === 'secteur' ? '<p>La tension du secteur (une prise de courant) est sinusoïdale, de valeur efficace ' + m(UEFF + ' = ' + Q(230, 'V')) + ' et de fréquence 50 Hz.</p><p>Calcule sa valeur maximale ' + m(UMAX) + '.</p>'
          : '<p>Un voltmètre en mode AC indique ' + m(UEFF + ' = ' + Q(E, 'V')) + ' aux bornes d’un générateur de tension sinusoïdale alternative.</p><p>Calcule la valeur maximale ' + m(UMAX) + ' de cette tension.</p>',
        solution: steps(['Pour une sinusoïde : ' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}') + ', donc ' + m(UMAX + ' = ' + UEFF + ' \\times ' + S2) + '.', m(UMAX + ' = ' + T(E) + ' \\times ' + S2 + ' = ' + Q(U, 'V')) + '.'])
      };
    }

    /* ---- signal en créneaux (exercice 3 a et b, exercice 5, 2e partie) ---- */
    var CREN = [{ xs: 1, u: 'ms' }, { xs: 2, u: 'ms' }, { xs: 1, u: 's' }, { xs: 10, u: 's' }, { xs: 100, u: 'µs' }, { xs: 50, u: 'µs' }];
    function creneauData() {
      var X = P(CREN), n = P([2, 3, 4, 5]), nh = between(1, n - 1, 1), big = rng() < 0.4, ys = big ? 2 : 1, hi, lo, st, tries = 0;
      do {
        hi = ys * between(1, 6, 1); lo = ys * between(-5, hi / ys - 1, 1);
        st = stepStats([{ d: nh, v: hi }, { d: n - nh, v: lo }]);
      } while ((Math.abs(st.moy) < 0.1 * Math.max(Math.abs(hi), Math.abs(lo)) || (lo >= 0 && rng() < 0.6)) && ++tries < 60);
      var th = sig(nh * X.xs, 6), tl = sig((n - nh) * X.xs, 6), Tp = sig(n * X.xs, 6), first = rng() < 0.7 ? 'hi' : 'lo';
      var motif = first === 'hi' ? [{ d: th, v: hi }, { d: tl, v: lo }] : [{ d: tl, v: lo }, { d: th, v: hi }];
      var t1 = Math.min(12, 2 * n + 2) * X.xs;
      return { X: X, hi: hi, lo: lo, th: th, tl: tl, Tp: Tp, motif: motif, ys: ys, t1: t1, moy: (hi * th + lo * tl) / Tp, eff: Math.sqrt((hi * hi * th + lo * lo * tl) / Tp) };
    }
    function creneauFig(d) {
      var y1 = (Math.max(d.hi, 0) / d.ys + 1.6) * d.ys, y0 = (Math.min(d.lo, 0) / d.ys - 1.2) * d.ys;
      return chrono({ t0: 0, t1: d.t1 * 1.04, y0: y0, y1: y1, xs: d.X.xs, ys: d.ys, pl: 40, xl: 't (' + d.X.u + ')', yl: 'u (V)', curves: [{ pts: stepPts(d.motif, 0, d.t1 * 1.04) }], h: 250,
        label: 'Chronogramme d’une tension en créneaux tracée sur un quadrillage gradué : t en ' + d.X.u + ', u en volts.' });
    }
    function readCren(d) {
      return 'Lecture : le motif dure ' + m(TP + ' = ' + Q(d.Tp, d.X.u, 6)) + ' ; la tension vaut ' + m(Q(d.hi, 'V')) + ' pendant ' + m(Q(d.th, d.X.u, 6)) + ' et ' + m(Q(d.lo, 'V')) + ' pendant ' + m(Q(d.tl, d.X.u, 6)) + '.';
    }
    function moyenneCreneau() {
      var d = creneauData(), traps = [];
      traps.push({ value: -d.moy, msg: 'Attention au signe : une tension négative compte <b>en moins</b> dans la moyenne.' });
      traps.push({ value: (d.hi + d.lo) / 2, msg: 'Les deux paliers ne durent pas le même temps : chaque valeur compte proportionnellement à sa <b>durée</b>. ' + m(MOY + ' = \\dfrac{U_1 t_1 + U_2 t_2}{' + TP + '}') + '.' });
      traps.push({ value: d.hi * d.th + d.lo * d.tl, msg: 'Divise par la période : ' + m(MOY + ' = \\dfrac{U_1 t_1 + U_2 t_2}{' + TP + '}') + '.' });
      if (d.lo < 0) traps.push({ value: (d.hi * d.th - d.lo * d.tl) / d.Tp, msg: 'Le palier à ' + m(Q(d.lo, 'V')) + ' est négatif : son aire compte en moins.' });
      return {
        type: 'Valeur moyenne d’un créneau', ask: ask('la valeur moyenne', 'volts (V)'), unit: 'V', answer: d.moy, traps: traps,
        html: '<p>Voici le chronogramme d’une tension en créneaux.</p>' + fig(creneauFig(d)) + '<p>Détermine sa valeur moyenne ' + m(MOY) + '.</p>',
        solution: steps([readCren(d), 'La valeur moyenne est l’aire sous la courbe pendant une période, divisée par la période (une aire sous l’axe compte en moins) :',
          m(MOY + ' = \\dfrac{' + T(d.hi) + ' \\times ' + T(d.th) + (d.lo < 0 ? ' + (' + T(d.lo) + ') \\times ' : ' + ' + T(d.lo) + ' \\times ') + T(d.tl) + '}{' + T(d.Tp) + '} = ' + Q(d.moy, 'V')) + '.'])
      };
    }
    function efficaceCreneau() {
      var d = creneauData();
      var traps = [{ value: Math.abs(d.moy), msg: 'Ça, c’est la valeur moyenne. La valeur efficace se calcule avec les <b>carrés</b> : ' + m(UEFF + ' = \\sqrt{\\dfrac{U_1^2 t_1 + U_2^2 t_2}{' + TP + '}}') + '.' },
        { value: d.eff * d.eff, msg: 'Il manque la racine carrée : ' + m(UEFF + '^2') + ' est la moyenne des carrés.' },
        { value: Math.max(Math.abs(d.hi), Math.abs(d.lo)) / Math.SQRT2, msg: 'La formule ' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}') + ' ne vaut que pour une <b>sinusoïde</b>. Ici, calcule la moyenne des carrés.' },
        { value: (Math.abs(d.hi) + Math.abs(d.lo)) / 2, msg: 'Chaque palier compte selon sa durée, et on fait la moyenne des <b>carrés</b> avant de prendre la racine.' }];
      return {
        type: 'Valeur efficace d’un créneau', ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: d.eff, traps: traps,
        html: '<p>Voici le chronogramme d’une tension en créneaux.</p>' + fig(creneauFig(d)) + '<p>Calcule sa valeur efficace ' + m(UEFF) + '.</p>',
        solution: steps([readCren(d), 'Le carré de la valeur efficace est la moyenne de ' + m('u^2') + ' sur une période :',
          m(UEFF + '^2 = \\dfrac{' + T(d.hi) + '^2 \\times ' + T(d.th) + ' + ' + (d.lo < 0 ? '(' + T(d.lo) + ')' : T(d.lo)) + '^2 \\times ' + T(d.tl) + '}{' + T(d.Tp) + '} = ' + T(d.eff * d.eff, 4)) + '.',
          m(UEFF + ' = \\sqrt{' + T(d.eff * d.eff, 4) + '} = ' + Q(d.eff, 'V')) + '.'])
      };
    }

    /* ---- sinusoïde avec une composante continue (cours 2) ---- */
    function composanteData() {
      var d, tries = 0;
      do {
        var X = P(XS.filter(function (x) { return x.u !== 'µs'; })), q = P([2, 4]), Tp = sig(q * X.xs, 6), ys = P([1, 2, 5]), off = ys * P([-2, -1, 1, 2, 3, 4]), A = ys * P([1, 1.5, 2, 3, 4]);
        d = { X: X, q: q, Tp: Tp, ys: ys, off: off, A: A, ph: P([0, Tp / 4, Tp / 2]), t1: 10 * X.xs };
      } while (Math.abs(Math.abs(d.off) - d.A) < 1e-9 && ++tries < 20);
      d.hi = d.off + d.A; d.lo = d.off - d.A;
      d.y1 = (Math.floor(Math.max(d.hi, 0) / d.ys + 1e-9) + 1) * d.ys; d.y0 = -(Math.floor(Math.max(-d.lo, 0) / d.ys + 1e-9) + 1) * d.ys;
      d.alt = d.A / Math.SQRT2; d.eff = Math.sqrt(d.off * d.off + d.alt * d.alt);
      return d;
    }
    function composante() {
      var v = P(['moy', 'Um', 'eff', 'eff', 'multi']);
      if (v === 'multi') {
        var dc = between(0.5, 12, 0.5) * (rng() < 0.25 ? -1 : 1), ac = between(0.5, 12, 0.5), eff = Math.sqrt(dc * dc + ac * ac);
        return {
          type: 'Composante continue et alternative', ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: eff, ref: 'c-multimetre',
          traps: [{ value: Math.abs(dc) + ac, msg: 'Les deux composantes ne s’additionnent pas directement : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' },
            { value: ac, msg: 'En position AC, le multimètre ne mesure que la composante <b>alternative</b>. Il faut y ajouter la composante continue : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' },
            { value: dc * dc + ac * ac, msg: 'Il manque la racine carrée.' }],
          html: '<p>Un multimètre branché aux bornes d’un dipôle indique ' + m(Q(dc, 'V')) + ' en position DC et ' + m(Q(ac, 'V')) + ' en position AC.</p><p>Calcule la valeur efficace ' + m(UEFF) + ' de la tension.</p>',
          solution: steps(['Position DC : la valeur moyenne, ' + m(MOY + ' = ' + Q(dc, 'V')) + '. Position AC : la valeur efficace de la composante alternative, ' + m(UALT + ' = ' + Q(ac, 'V')) + '.',
            m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2} = \\sqrt{' + (dc < 0 ? '(' + T(dc) + ')' : T(dc)) + '^2 + ' + T(ac) + '^2} = ' + Q(eff, 'V')) + '.'])
        };
      }
      var d = composanteData(), html = '<p>Voici le chronogramme d’une tension sinusoïdale avec une composante continue.</p>' + fig(sinusFig(d, { curves: [{ f: sinus(d.A, d.Tp, d.off, d.ph), keys: sinusKeys(d.Tp, d.ph, 0, d.t1 * 1.04) }],
        label: 'Chronogramme d’une tension sinusoïdale décalée, tracée sur un quadrillage gradué : t en ' + d.X.u + ', u en volts.' }));
      var lect = 'Lecture : ' + m(UMAX + ' = ' + Q(d.hi, 'V')) + ' et ' + m(UMIN + ' = ' + Q(d.lo, 'V')) + '.';
      var sMoy = soit(MOY + ' = \\dfrac{' + UMAX + ' + ' + UMIN + '}{2}', '\\dfrac{' + T(d.hi) + (d.lo < 0 ? ' - ' + T(-d.lo) : ' + ' + T(d.lo)) + '}{2} = ' + Q(d.off, 'V')) + ' : c’est l’axe de symétrie de la courbe.';
      var sUm = m(UM + ' = ' + UMAX + ' - ' + MOY + ' = ' + T(d.hi) + ' - ' + (d.off < 0 ? '(' + T(d.off) + ')' : T(d.off)) + ' = ' + Q(d.A, 'V')) + '.';
      if (v === 'moy') return {
        type: 'Composante continue et alternative', ask: ask('la valeur moyenne', 'volts (V)'), unit: 'V', answer: d.off, ref: 'c-composante-exemple',
        traps: [{ value: d.A, msg: m('\\dfrac{' + UMAX + ' - ' + UMIN + '}{2}') + ' donne l’amplitude ' + m(UM) + '. La valeur moyenne est la <b>demi-somme</b> : ' + m('\\dfrac{' + UMAX + ' + ' + UMIN + '}{2}') + '.' },
          { value: d.hi + d.lo, msg: 'Divise par 2 : ' + m(MOY + ' = \\dfrac{' + UMAX + ' + ' + UMIN + '}{2}') + '.' },
          { value: -d.off, msg: 'Attention au signe de ' + m(UMIN) + '.' }],
        html: html + '<p>Détermine la valeur moyenne ' + m(MOY) + ' de cette tension (sa composante continue).</p>', solution: steps([lect, sMoy])
      };
      if (v === 'Um') return {
        type: 'Composante continue et alternative', ask: ask('l’amplitude', 'volts (V)'), unit: 'V', answer: d.A, ref: 'c-composante-exemple',
        traps: [{ value: d.hi, msg: 'L’amplitude se mesure à partir de l’axe de symétrie ' + m(MOY) + ', pas à partir de zéro : ' + m(UM + ' = ' + UMAX + ' - ' + MOY) + '.' },
          { value: d.hi - d.lo, msg: 'Tu as mesuré du creux au sommet : c’est deux fois l’amplitude.' }],
        html: html + '<p>Détermine l’amplitude ' + m(UM) + ' de sa composante alternative.</p>', solution: steps([lect, sMoy, sUm])
      };
      return {
        type: 'Composante continue et alternative', ask: ask('la valeur efficace', 'volts (V)'), unit: 'V', answer: d.eff, ref: 'c-composante-exemple',
        traps: [{ value: d.hi / Math.SQRT2, msg: m('\\dfrac{' + UMAX + '}{' + S2 + '}') + ' ne vaut que pour une sinusoïde <b>sans</b> composante continue. Suis les trois étapes : ' + m(MOY) + ', puis ' + m(UALT) + ', puis ' + m(UEFF) + '.' },
          { value: Math.abs(d.off) + d.alt, msg: 'Les deux composantes ne s’additionnent pas : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' },
          { value: d.alt, msg: 'Ça, c’est la valeur efficace de la seule composante alternative. Ajoute la composante continue : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' },
          { value: Math.sqrt(d.off * d.off + d.A * d.A), msg: 'Prends la valeur <b>efficace</b> de la composante alternative, ' + m(UALT + ' = \\dfrac{' + UM + '}{' + S2 + '}') + ', pas son amplitude.' }],
        html: html + '<p>Calcule la valeur efficace ' + m(UEFF) + ' de cette tension.</p>',
        solution: steps([lect, 'Étape 1 : ' + sMoy, 'Étape 2 : ' + sUm + ' ' + m(UALT + ' = \\dfrac{' + UM + '}{' + S2 + '} = ' + Q(d.alt, 'V')) + '.',
          'Étape 3 : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2} = \\sqrt{' + (d.off < 0 ? '(' + T(d.off) + ')' : T(d.off)) + '^2 + ' + T(d.alt, 3) + '^2} = ' + Q(d.eff, 'V')) + '.'])
      };
    }

    /* ---- tension alternative ou non (exercices 3 et 5) ---- */
    function alternatif() {
      var v = P(['sinus0', 'sinusOff', 'crenSym', 'cren0', 'crenOff', 'crenOff', 'pos']), o = { t0: 0, t1: 10.4, xs: 1, xl: 't (ms)', yl: 'u (V)', h: 230 }, moy, sign = true, sinusoid = false;
      if (v === 'sinus0' || v === 'sinusOff') {
        var A = P([3, 4, 5, 6]), off = v === 'sinus0' ? 0 : P([-2, -1, 1, 2, 3]), Tp = P([2, 4]);
        moy = off; sinusoid = true; sign = off - A < 0 && off + A > 0;
        o.curves = [{ f: sinus(A, Tp, off, 0), keys: sinusKeys(Tp, 0, 0, 10.4) }]; o.y0 = Math.min(-1, off - A) - 1.4; o.y1 = off + A + 1.6; o.ys = 2;
      } else {
        var c = v === 'crenSym' ? P([[4, 2, -4, 2], [6, 1, -6, 1], [3, 2, -3, 2]]) : v === 'cren0' ? P([[6, 1, -2, 3], [4, 1, -1, 4], [3, 2, -2, 3], [9, 1, -3, 3], [2, 3, -3, 2], [8, 1, -2, 4]])
          : v === 'crenOff' ? P([[3, 2, -5, 2], [6, 1, -4, 4], [6, 2, -2, 2], [4, 1, -2, 1], [5, 3, -3, 2]]) : P([[6, 2, 2, 2], [5, 1, 0, 3], [8, 2, 3, 2]]);
        var st = stepStats([{ d: c[1], v: c[0] }, { d: c[3], v: c[2] }]);
        moy = st.moy; sign = c[2] < 0;
        o.curves = [{ pts: stepPts([{ d: c[1], v: c[0] }, { d: c[3], v: c[2] }], 0, 10.4) }]; o.y0 = Math.min(-1, c[2]) - 1.4; o.y1 = c[0] + 1.6; o.ys = c[0] > 6 || c[2] < -6 ? 2 : 1;
      }
      o.label = 'Chronogramme d’une tension périodique tracée sur un quadrillage gradué : t en millisecondes, u en volts.';
      var alt = Math.abs(moy) < 1e-9, mv = m(MOY + ' = ' + Q(moy, 'V'));
      var right = alt ? 'Oui : sa valeur moyenne est nulle' : 'Non : sa valeur moyenne vaut ' + m(Q(moy, 'V')) + ', elle n’est pas nulle';
      var wrongs = [];
      if (alt) {
        wrongs.push(sinusoid ? { html: 'Non : elle prend des valeurs négatives', why: 'Une tension alternative prend justement des valeurs positives et négatives, qui se compensent : sa valeur moyenne est nulle.' }
          : { html: 'Non : elle n’est pas sinusoïdale', why: 'Une tension alternative n’est pas forcément sinusoïdale : il suffit que sa valeur moyenne soit nulle.' });
        wrongs.push(v === 'cren0' ? { html: 'Non : ses valeurs maximale et minimale ne sont pas opposées', why: 'Ce qui compte, ce sont les <b>aires</b> : le palier haut dure moins longtemps, et les aires positive et négative se compensent. La valeur moyenne est nulle.' }
          : { html: 'Oui : elle est périodique', why: 'Elle est bien alternative, mais pas parce qu’elle est périodique : c’est sa valeur moyenne <b>nulle</b> qui la rend alternative.' });
      } else {
        if (sign) wrongs.push({ html: 'Oui : elle prend des valeurs positives et des valeurs négatives', why: 'Changer de signe ne suffit pas : une tension alternative a une valeur moyenne <b>nulle</b>. Ici ' + mv + '.' });
        wrongs.push({ html: 'Oui : elle est périodique', why: 'Une tension périodique n’est alternative que si sa valeur moyenne est nulle. Ici ' + mv + '.' });
        if (!sign) wrongs.push({ html: 'Oui : elle varie au cours du temps', why: 'Varier ne suffit pas : une tension alternative a une valeur moyenne nulle. Celle-ci reste positive, ' + mv + '.' });
      }
      return mcq({ type: 'Tension alternative ?', ref: 'c-alternatif', ask: 'Choisis la réponse correctement justifiée.',
        html: '<p>Cette tension est-elle alternative ?</p>' + fig(chrono(o)),
        solution: '<p>' + (sinusoid ? 'La courbe est symétrique par rapport à la droite ' + mv + ' (la demi-somme de ' + m(UMAX) + ' et ' + m(UMIN) + ').' : 'Valeur moyenne : aire sous la courbe pendant une période, divisée par la période : ' + mv + '.') +
          ' ' + (alt ? 'Elle est nulle : la tension est <b>alternative</b>.' : 'Elle n’est pas nulle : la tension n’est <b>pas alternative</b>.') + '</p>' }, right, wrongs);
    }

    /* ---- le multimètre : DC, AC (cours 1 et 2) ---- */
    function multimetre() {
      var v = P(['dc', 'ac', 'acMeasure', 'combine']);
      if (v === 'dc') return mcq({ type: 'Le multimètre', ref: 'c-multimetre', html: '<p>Pour mesurer la valeur moyenne ' + m(MOY) + ' d’une tension variable, on règle le voltmètre en position :</p>', solution: '<p>En position <b>DC</b>, le multimètre mesure la valeur moyenne (la composante continue).</p>' },
        'DC', [{ html: 'AC', why: 'En position AC, il mesure la valeur efficace de la composante <b>alternative</b>.' }, { html: 'Ω', why: 'La position Ω sert à mesurer une résistance, hors tension.' }]);
      if (v === 'ac') return mcq({ type: 'Le multimètre', ref: 'c-efficace', html: '<p>Pour mesurer la valeur efficace ' + m(UEFF) + ' d’une tension sinusoïdale alternative, on règle le voltmètre en position :</p>', solution: '<p>En position <b>AC</b> : pour une tension alternative (sans composante continue), le voltmètre affiche directement ' + m(UEFF) + '.</p>' },
        'AC', [{ html: 'DC', why: 'En position DC, il mesure la valeur moyenne, nulle pour une tension alternative.' }, { html: 'Ω', why: 'La position Ω sert à mesurer une résistance.' }]);
      if (v === 'acMeasure') return mcq({ type: 'Le multimètre', ref: 'c-multimetre', html: '<p>Branché aux bornes d’un dipôle, un multimètre en position AC mesure :</p>', solution: '<p>La valeur efficace de la composante <b>alternative</b> ' + m(UALT) + ' (sans la composante continue).</p>' },
        'la valeur efficace de la composante alternative', [{ html: 'la valeur moyenne', why: 'La valeur moyenne se mesure en position <b>DC</b>.' }, { html: 'la valeur maximale', why: 'Un multimètre ne mesure pas la valeur maximale : on la lit sur un oscilloscope.' }]);
      var dc = P([3, 6, 5, 8]), ac = { 3: 4, 6: 8, 5: 12, 8: 6 }[dc], eff = Math.sqrt(dc * dc + ac * ac);
      return mcq({ type: 'Le multimètre', ref: 'c-multimetre', html: '<p>Un multimètre indique ' + m(Q(dc, 'V')) + ' en position DC et ' + m(Q(ac, 'V')) + ' en position AC. La valeur efficace de la tension vaut :</p>',
        solution: '<p>' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2} = \\sqrt{' + dc + '^2 + ' + ac + '^2} = ' + Q(eff, 'V')) + '.</p>' },
        m(Q(eff, 'V')), [{ html: m(Q(dc + ac, 'V')), why: 'Les deux composantes ne s’additionnent pas : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' },
          { html: m(Q(ac, 'V')), why: 'En position AC, le multimètre ne voit que la composante alternative : il faut y ajouter la composante continue.' }]);
    }

    /* ---- tracer un chronogramme (exercice 2) ---- */
    function tracer() {
      var c = P([{ T: 20, f: 50, xs: 5 }, { T: 10, f: 100, xs: 2.5 }, { T: 5, f: 200, xs: 1 }, { T: 4, f: 250, xs: 1 }, { T: 40, f: 25, xs: 10 }]);
      var a = { A: P([25, 12, 6, 3, 10, 20]) }, byF = rng() < 0.5, T2 = rng() < 0.5 ? 2 * c.T : c.T / 2;
      function draw(A, Tp) {
        // graduations numérotées à ±Umax, quadrillage tous les Umax/2 : la valeur maximale se lit directement
        return chrono({ t0: 0, t1: 2.6 * c.T, y0: -1.3 * a.A, y1: 1.3 * a.A, xs: c.xs, ys: a.A / 2, yt: [-a.A, a.A], w: 260, h: 160, pl: 34, mini: true, xl: 't (ms)', yl: 'u (V)',
          curves: [{ f: sinus(A, Tp, 0, Tp / 4), keys: sinusKeys(Tp, Tp / 4, 0, 2.6 * c.T) }],
          label: 'Sinusoïde de période ' + fr(Tp) + ' ms et de valeur maximale ' + fr(A) + ' V.' });
      }
      var given = byF ? 'de fréquence ' + m(FQ + ' = ' + Q(c.f, 'Hz')) : 'de période ' + m(TP + ' = ' + Q(c.T, 'ms'));
      return mcq({
        type: 'Tracer un chronogramme', ref: 'c-tracer', ask: 'Choisis le bon tracé.',
        html: '<p>Quel chronogramme représente une tension sinusoïdale ' + given + ' et de valeur maximale ' + m(UMAX + ' = ' + Q(a.A, 'V')) + ' ?</p>',
        solution: steps([byF ? soit(TP + ' = \\dfrac{1}{' + FQ + '}', '\\dfrac{1}{' + T(c.f) + '} = ' + T(c.T / 1000, 3) + '\\ \\mathrm{s} = ' + Q(c.T, 'ms')) + '.' : null,
          'Deux sommets successifs sont séparés de ' + m(Q(c.T, 'ms')) + ', et la courbe monte jusqu’à ' + m(Q(a.A, 'V')) + ' et descend jusqu’à ' + m(Q(-a.A, 'V')) + '.'])
      }, draw(a.A, c.T), [
        { html: draw(a.A, T2), why: 'Ce tracé a une période de ' + m(Q(T2, 'ms')) + ' : compte la durée entre deux sommets successifs.' + (byF ? ' Rappel : ' + m(TP + ' = \\dfrac{1}{' + FQ + '}') + '.' : '') },
        { html: draw(a.A / 2, c.T), why: 'Ce tracé ne monte qu’à ' + m(Q(a.A / 2, 'V')) + ' : la valeur maximale se compte du zéro au sommet, pas du creux au sommet.' }
      ]);
    }

    /* ---- vocabulaire et énoncés du cours ---- */
    var CONCEPTS = [
      function () { return mcq({ type: 'Période', ref: 'c-periode', html: '<p>La période ' + m(TP) + ' d’une grandeur périodique est :</p>', solution: '<p>La <b>durée</b> au bout de laquelle le motif se répète, en secondes.</p>' },
        'la durée au bout de laquelle le motif se répète', [{ html: 'le nombre de motifs répétés par seconde', why: 'Ça, c’est la <b>fréquence</b> ' + m(FQ) + '.' }, { html: 'la plus grande valeur prise par la grandeur', why: 'Ça, c’est la <b>valeur maximale</b>.' }]); },
      function () { return mcq({ type: 'Fréquence', ref: 'c-frequence', html: '<p>La fréquence ' + m(FQ) + ' d’une grandeur périodique est :</p>', solution: '<p>Le <b>nombre de motifs</b> répétés par seconde, en hertz (Hz) : ' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + '.</p>' },
        'le nombre de motifs répétés par seconde', [{ html: 'la durée d’un motif', why: 'Ça, c’est la <b>période</b> ' + m(TP) + '.' }, { html: 'l’écart entre la valeur maximale et la valeur minimale', why: 'Ça, c’est la valeur crête à crête.' }]); },
      function () { return mcq({ type: 'Unités', ref: 'c-frequence', html: '<p>La fréquence s’exprime en :</p>', solution: '<p>En <b>hertz</b> (Hz). Une fréquence de 1 Hz correspond à un motif par seconde.</p>' },
        'hertz (Hz)', [{ html: 'secondes (s)', why: 'La seconde est l’unité de la <b>période</b>.' }, { html: 'volts (V)', why: 'Le volt est l’unité de la tension.' }]); },
      function () { return mcq({ type: 'Fréquence et période', ref: 'c-frequence', html: '<p>La relation entre la fréquence et la période s’écrit :</p>', solution: '<p>' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + ', avec ' + m(TP) + ' en secondes et ' + m(FQ) + ' en hertz.</p>' },
        m(FQ + ' = \\dfrac{1}{' + TP + '}'), [{ html: m(FQ + ' = ' + TP), why: 'Fréquence et période varient en sens contraires : plus les motifs sont courts, plus il y en a par seconde. ' + m(FQ + ' = \\dfrac{1}{' + TP + '}') + '.' },
          { html: m(FQ + ' = 2 \\times ' + TP), why: m(FQ + ' = \\dfrac{1}{' + TP + '}') + ' : la fréquence est l’inverse de la période.' }]); },
      function () { return mcq({ type: 'Motif', ref: 'c-periodique', html: '<p>La partie d’une grandeur périodique qui se répète s’appelle :</p>', solution: '<p>Le <b>motif</b>. Sa durée est la période ' + m(TP) + '.</p>' },
        'le motif', [{ html: 'la période', why: 'La période est la <b>durée</b> du motif.' }, { html: 'la fréquence', why: 'La fréquence est le nombre de motifs par seconde.' }]); },
      function () { return mcq({ type: 'Notations', ref: 'c-regimes', html: '<p>En régime variable, la tension se note :</p>', solution: '<p>' + m('u(t)') + ', en minuscule : sa valeur dépend de l’instant ' + m('t') + '. En régime continu, on écrit ' + m('U') + ', en majuscule.</p>' },
        m('u(t)') + ', en minuscule', [{ html: m('U') + ', en majuscule', why: 'La majuscule est réservée au régime continu, où la tension ne varie pas.' }, { html: m(UEFF), why: 'C’est la valeur efficace, une valeur particulière de la tension.' }]); },
      function () { return mcq({ type: 'Valeur efficace', ref: 'c-efficace', html: '<p>La valeur efficace d’une tension variable est :</p>', solution: '<p>La valeur de la tension <b>continue</b> qui produirait le même éclairement dans une lampe.</p>' },
        'la tension continue qui produirait le même éclairement dans une lampe', [{ html: 'la moyenne de la tension sur une période', why: 'Ça, c’est la valeur <b>moyenne</b>.' }, { html: 'la plus grande valeur prise par la tension', why: 'Ça, c’est la valeur <b>maximale</b>.' }]); },
      function () { return mcq({ type: 'Valeur efficace', ref: 'c-efficace', html: '<p>Pour une tension sinusoïdale alternative, la valeur efficace vaut :</p>', solution: '<p>' + m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '} \\approx 0{,}71 \\times ' + UMAX) + '.</p>' },
        m(UEFF + ' = \\dfrac{' + UMAX + '}{' + S2 + '}'), [{ html: m(UEFF + ' = \\dfrac{' + UMAX + '}{2}'), why: 'On divise par ' + m(S2 + ' \\approx 1{,}41') + ', pas par 2.' }, { html: m(UEFF + ' = ' + UMAX + ' \\times ' + S2), why: 'La valeur efficace est plus petite que la valeur maximale : on divise.' }]); },
      function () { return mcq({ type: 'Tension alternative', ref: 'c-alternatif', html: '<p>Une tension périodique est alternative lorsque :</p>', solution: '<p>Sa <b>valeur moyenne est nulle</b> : les aires positive et négative se compensent.</p>' },
        'sa valeur moyenne est nulle', [{ html: 'elle prend des valeurs positives et des valeurs négatives', why: 'Changer de signe ne suffit pas : le créneau 3 V / −5 V de l’exercice 5 change de signe, mais sa valeur moyenne vaut −1 V.' }, { html: 'elle est sinusoïdale', why: 'Un créneau ou un triangle peut aussi être alternatif : il suffit que sa valeur moyenne soit nulle.' }]); },
      function () { return mcq({ type: 'Composante continue', ref: 'c-composante', html: '<p>La composante continue d’un signal périodique est :</p>', solution: '<p>Sa <b>valeur moyenne</b> ' + m(MOY) + ' (l’« offset »).</p>' },
        'sa valeur moyenne', [{ html: 'sa valeur efficace', why: 'La valeur efficace mêle les deux composantes : ' + m(UEFF + ' = \\sqrt{' + MOY + '^2 + ' + UALT + '^2}') + '.' }, { html: 'sa valeur maximale', why: 'La composante continue est la valeur moyenne, l’axe de symétrie d’une sinusoïde décalée.' }]); },
      function () { return mcq({ type: 'Tension du secteur', ref: 'c-efficace', html: '<p>La tension d’une prise de courant en France a pour valeur efficace 230 V et pour fréquence :</p>', solution: '<p><b>50 Hz</b> : 50 motifs par seconde, soit une période de 20 ms.</p>' },
        '50 Hz', [{ html: '230 Hz', why: '230 V est la valeur efficace, pas la fréquence.' }, { html: '325 Hz', why: '325 V est la valeur maximale de la tension, pas la fréquence.' }]); },
      function () { return mcq({ type: 'Régime continu', ref: 'c-regimes', html: '<p>Un circuit fonctionne en régime continu lorsque ses tensions et ses intensités :</p>', solution: '<p>Ne varient <b>pas</b> au cours du temps.</p>' },
        'ne varient pas au cours du temps', [{ html: 'se répètent à intervalles de temps réguliers', why: 'Ça, c’est une grandeur <b>périodique</b>, en régime variable.' }, { html: 'ont une valeur moyenne nulle', why: 'Ça, c’est une grandeur <b>alternative</b>.' }]); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = {
      nature: nature, frequence: frequence, lectureSinus: lectureSinus, oscillogramme: oscillogramme, efficace: efficace, moyenneCreneau: moyenneCreneau,
      efficaceCreneau: efficaceCreneau, composante: composante, alternatif: alternatif, multimetre: multimetre, tracer: tracer, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      nature: 'c-regimes', frequence: 'c-frequence', lectureSinus: 'c-periode', oscillogramme: 'c-oscillo', efficace: 'c-efficace', moyenneCreneau: 'c-moyenne',
      efficaceCreneau: 'c-efficace-creneau', composante: 'c-composante-exemple', alternatif: 'c-alternatif', multimetre: 'c-multimetre', tracer: 'c-tracer', concept: 'c-periodique'
    };
    /**
     * Type, carte du cours à revoir, et pièges exploitables : une erreur fréquente à moins de 3 % de la
     * bonne réponse se confondrait avec un simple arrondi, on ne la signale pas.
     */
    function tag(kind, o) {
      o.kind = kind; o.ref = o.ref || REF[kind];
      if (o.traps) o.traps = o.traps.filter(function (t) { return isFinite(t.value) && Math.abs(t.value - o.answer) > 0.03 * Math.abs(o.answer) + (o.tol || 0); });
      return o;
    }
    var KINDS = {};
    Object.keys(RAW).forEach(function (k) { KINDS[k] = function () { return tag(k, RAW[k]()); }; });
    var WEIGHTS = {
      nature: 1, frequence: 3, lectureSinus: 3, oscillogramme: 3, efficace: 2, moyenneCreneau: 3,
      efficaceCreneau: 2, composante: 3, alternatif: 2, multimetre: 1, tracer: 2, concept: 2
    };
    var last = null;
    function training() {
      var keys = Object.keys(WEIGHTS).filter(function (k) { return k !== last; });
      var total = keys.reduce(function (s, k) { return s + WEIGHTS[k]; }, 0), r = rng() * total, pick = keys[0];
      for (var i = 0; i < keys.length; i++) { r -= WEIGHTS[keys[i]]; if (r < 0) { pick = keys[i]; break; } }
      last = pick;
      return KINDS[pick]();
    }
    /** Copie d'évaluation : 8 questions, 20 points. */
    function exam() {
      function pts(kind, p) { var o = KINDS[kind](); o.points = p; return o; }
      return [
        pts(P(['concept', 'nature', 'multimetre']), 2), pts('frequence', 2), pts(P(['lectureSinus', 'oscillogramme']), 3), pts('efficace', 2),
        pts('moyenneCreneau', 3), pts('alternatif', 2), pts('efficaceCreneau', 3), pts(P(['composante', 'tracer']), 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return { make: make, EXAM_QUESTIONS: 8, FIG: FIG, chrono: chrono, oscillo: oscillo, sinus: sinus, sinusKeys: sinusKeys, stepPts: stepPts, stepStats: stepStats, OSC: OSC, isInt: isInt };
});
