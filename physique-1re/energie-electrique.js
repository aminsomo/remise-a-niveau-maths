/* ==========================================================================
   Chapitre 7 — Puissance électrique : schémas, chronogrammes et banque de
   questions paramétrées.
   Inspirée de la fiche d'exercices « Puissance électrique » (exercice 1 : générateur
   réversible, U = −12 V et P = −48 W ; exercice 2 : batterie en convention récepteur ;
   exercice 3 : loi des nœuds, loi des mailles et puissance de D₂ ; exercice 4 : R₁ en
   série avec R₂ // R₃, puissance reçue par le dipôle AB ; exercice 5, type DS : G, R₁,
   D₂ et D₃, P₃ = −0,18 W) et du cours (P = U × I, p(t) = u(t) × i(t), puissance moyenne,
   P = k × Ueff × Ieff, conventions générateur et récepteur, E = P × Δt, dipôles passifs
   résistifs, P = R × I² et effet Joule).

   Les schémas (circuit, dipole) reprennent le dessin du chapitre 5, les chronogrammes
   (frame) celui du chapitre 6 : les mêmes pour le cours, les exemples, les graphiques à
   manipuler et les questions.
   Chaque générateur de question renvoie { type, ask, html, answer, unit, traps, solution }
   (ou, pour un QCM, { type, ask, html, choices, answer, solution }).
   Les « pièges » sont les erreurs fréquentes : elles sont expliquées à l'élève
   avant la solution complète.
   Utilisé par la page (window.ChapterBank) et par les tests (node --test).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../assets/core.js'));
  else root.ChapterBank = factory(root.CourseCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  var T = C.texNum;

  /* =====================================================================
     Texte des dessins (SVG)
     ===================================================================== */
  function r1(x) { return String(Math.round(x * 10) / 10); }
  function xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** Nombre affiché : 3 chiffres significatifs, virgule, vrai signe moins (−). */
  function fr(x, sig) { return Math.abs(x) < 1e-12 ? '0' : C.fmtNum(x, sig || 3).replace('-', '−'); }
  /** Graduation : la valeur exacte (0,5 ; 12,5 ; −10). */
  function tickText(v) { return fr(C.roundSig(v, 6), 6); }
  /** « U_1 = 3 V » : symbole en italique, indice abaissé ; « U = 4 V », « p(t) » : symbole en italique. */
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
  /** Texte à distance d d'un point : à gauche (l), à droite (r), au-dessus (a), en dessous (b). */
  function side(x, y, where, d, s, cls, plain) {
    if (where === 'l') return text(x - d, y + 5, s, 'end', cls, plain);
    if (where === 'r') return text(x + d, y + 5, s, 'start', cls, plain);
    if (where === 'a') return text(x, y - d, s, 'middle', cls, plain);
    return text(x, y + d + 11, s, 'middle', cls, plain);
  }

  /* =====================================================================
     Schémas électriques (repris du chapitre 5). Fils horizontaux ou verticaux ;
     chaque dipôle coupe son fil. Toutes les tensions en orange (--q-u), toutes les
     intensités en vert (--q-I) : la convention se lit sur le sens des flèches,
     jamais sur leur couleur.
     ===================================================================== */
  var DIM = { R: 44, C: 36 }; // longueur de chaque dipôle le long de son fil (R : résistance ; C : dipôle rond, G, D, M…)
  function wire(horiz, f, u, v) {
    if (v - u < 0.5) return '';
    return '<path class="w" d="M' + (horiz ? r1(u) + ' ' + r1(f) + 'H' + r1(v) : r1(f) + ' ' + r1(u) + 'V' + r1(v)) + '"/>';
  }
  /** Fil à angles droits : [[x, y], …]. */
  function path(pts) { return '<path class="w" d="M' + pts.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + '"/>'; }
  function dot(x, y) { return '<circle class="dot" cx="' + r1(x) + '" cy="' + r1(y) + '" r="3.5"/>'; }
  /** Nom d'un point (A, B…) : lettre droite, en gras. */
  function pt(x, y, name, where) { return side(x, y, where, where === 'a' || where === 'b' ? 7 : 9, name, 'pt', true); }
  /**
   * Un dipôle centré en (cx, cy) sur un fil horizontal ou vertical.
   * p : { t: 'R' | 'C', sym: lettre dans le rond ('G', 'D_2', 'M'…), name, at: côté du nom (l, r, a, b, in) }
   */
  function dipole(p, cx, cy, horiz) {
    var t = p.t, L = DIM[t], s = '', r = L / 2;
    if (t === 'R') {
      var w = horiz ? L : 16, h = horiz ? 16 : L;
      s += '<rect class="cp" x="' + r1(cx - w / 2) + '" y="' + r1(cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="2"/>';
    } else {
      s += '<circle class="cp" cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r + '"/>';
      if (p.sym) s += text(cx - (/_/.test(p.sym) ? 3 : 0), cy + 5, p.sym, 'middle', 'sym');
    }
    if (p.name) {
      if (p.at === 'in') s += text(cx, cy + 4.5, p.name, 'middle', 'nm in');
      else s += side(cx, cy, p.at || (horiz ? 'a' : 'r'), (t === 'R' ? 8 : r) + 6, p.name, 'nm');
    }
    return s;
  }
  /** Fil de (x1, y1) à (x2, y2) portant des dipôles ; chaque partie a sa position c le long du fil. */
  function branch(x1, y1, x2, y2, parts) {
    var horiz = Math.abs(y1 - y2) < 1e-9, a = horiz ? Math.min(x1, x2) : Math.min(y1, y2), b = horiz ? Math.max(x1, x2) : Math.max(y1, y2);
    var f = horiz ? y1 : x1, s = '', cur = a;
    (parts || []).slice().sort(function (u, v) { return u.c - v.c; }).forEach(function (p) {
      var h = DIM[p.t] / 2;
      s += wire(horiz, f, cur, p.c - h);
      s += dipole(p, horiz ? p.c : f, horiz ? f : p.c, horiz);
      cur = p.c + h;
    });
    return s + wire(horiz, f, cur, b);
  }
  /** Flèche de (x1, y1) vers (x2, y2), couleur de la grandeur col (u, I). */
  function arrow(x1, y1, x2, y2, s, col, where) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, hl = 9, hw = 4.6;
    var bx = x2 - ux * hl, by = y2 - uy * hl;
    var out = '<g class="arr" style="--c: var(--q-' + col + ')"><path d="M' + r1(x1) + ' ' + r1(y1) + 'L' + r1(bx) + ' ' + r1(by) + '"/>' +
      '<path class="hd" d="M' + r1(x2) + ' ' + r1(y2) + 'L' + r1(bx - uy * hw) + ' ' + r1(by + ux * hw) + 'L' + r1(bx + uy * hw) + ' ' + r1(by - ux * hw) + 'Z"/>';
    if (s) out += side((x1 + x2) / 2, (y1 + y2) / 2, where || (Math.abs(dx) > Math.abs(dy) ? 'b' : 'r'), 8, s, 'lab');
    return out + '</g>';
  }
  /**
   * Flèche de tension le long d'un dipôle centré en (cx, cy) : du côté where (l, r, a, b),
   * pointe vers head (a : vers le haut, b : vers le bas, l : vers la gauche, r : vers la droite).
   */
  function uArrow(t, cx, cy, where, head, s) {
    var off = (t === 'R' ? 8 : DIM[t] / 2) + 12, half = DIM[t] / 2 + 6;
    if (where === 'l' || where === 'r') {
      var x = cx + (where === 'l' ? -off : off), up = head === 'a';
      return arrow(x, cy + (up ? half : -half), x, cy + (up ? -half : half), s, 'u', where);
    }
    var y = cy + (where === 'a' ? -off : off), right = head === 'r';
    return arrow(cx + (right ? -half : half), y, cx + (right ? half : -half), y, s, 'u', where);
  }
  /** Flèche d'intensité sur un fil, au point (x, y), dans la direction dir (r, l, a, b). */
  function iArrow(x, y, dir, s, where) {
    var v = { r: [1, 0], l: [-1, 0], b: [0, 1], a: [0, -1] }[dir], ux = v[0], uy = v[1], a = 6, w = 5.2;
    var d = 'M' + r1(x + ux * a) + ' ' + r1(y + uy * a) + 'L' + r1(x - ux * a - uy * w) + ' ' + r1(y - uy * a + ux * w) + 'L' + r1(x - ux * a + uy * w) + ' ' + r1(y - uy * a - ux * w) + 'Z';
    return '<g class="arr cur" style="--c: var(--q-I)"><path class="hd" d="' + d + '"/>' +
      (s ? side(x, y, where || (ux ? 'a' : 'r'), 10, s, 'lab') : '') + '</g>';
  }
  function svgCircuit(w, h, label, body) {
    return '<svg class="fig circuit" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + xml(label) + '">' + body + '</svg>';
  }

  /* =====================================================================
     Chronogrammes (repris du chapitre 6) : repère gradué, quadrillage, courbes.
     u(t) en orange, i(t) en vert, p(t) en rose, jamais sur le même graphique que u et i.
     ===================================================================== */
  function head(x, y, dx, dy, s) {
    s = s || 8; var w = s * 0.55;
    return 'M' + r1(x) + ' ' + r1(y) + 'L' + r1(x - dx * s - dy * w) + ' ' + r1(y - dy * s + dx * w) + 'L' + r1(x - dx * s + dy * w) + ' ' + r1(y - dy * s - dx * w) + 'Z';
  }
  function poly(pts, X, Y) { return 'M' + pts.map(function (p) { return r1(X(p[0])) + ' ' + r1(Y(p[1])); }).join('L'); }
  function samplePts(f, a, b, n) {
    var out = [];
    for (var i = 0; i <= n; i++) { var t = a + (b - a) * i / n; out.push([t, f(t)]); }
    return out;
  }
  function tickW(s) { return String(s).length * 7.2; }
  /**
   * Repère dans le rectangle (ox, oy, w, h).
   * o : { t0, t1, y0, y1 : fenêtre ; xs, ys : pas des graduations numérotées ; xm, ym : quadrillage fin ;
   *       xt, yt : graduations imposées ; xl, yl : noms des axes ; origin : « 0 » sur l'axe des ordonnées ;
   *       curves: [{ f | pts, col, from, to }], areas: [{ pts, col }], hl: [{ y, col, s, x, below }],
   *       vl: [{ t }] (instant marqué), dots: [{ t, u, col }] }
   */
  function frame(o, ox, oy, w, h) {
    ox = ox || 0; oy = oy || 0;
    var t0 = o.t0, t1 = o.t1, y0 = o.y0, y1 = o.y1, mid = y0 < 0 && y1 > 0;
    var PL = o.pl !== undefined ? o.pl : 44, PR = o.pr !== undefined ? o.pr : 16, PT = o.pt !== undefined ? o.pt : 26, PB = o.pb !== undefined ? o.pb : (mid ? 10 : 24);
    var L = ox + PL, R = ox + w - PR, TOP = oy + PT, B = oy + h - PB;
    function X(t) { return L + (t - t0) / (t1 - t0) * (R - L); }
    function Y(u) { return TOP + (y1 - u) / (y1 - y0) * (B - TOP); }
    var ax = Y(mid ? 0 : y0), ay = X(t0 <= 0 && t1 > 0 ? 0 : t0);
    var s = '', top = '';
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
    s += '<path class="axis" d="M' + r1(L) + ' ' + r1(ax) + 'H' + r1(R + 8) + 'M' + r1(ay) + ' ' + r1(B) + 'V' + r1(TOP - 12) + '"/>';
    s += '<path class="axis hd" d="' + head(R + 10, ax, 1, 0, 8) + head(ay, TOP - 14, 0, -1, 8) + '"/>';
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
      var wd = 0;
      for (var k = Math.ceil(t0 / st - 1e-9); k * st <= t1 + 1e-9; k++) wd = Math.max(wd, tickW(tickText(k * st)));
      return Math.max(28, wd + 10);
    }, pxX).filter(function (v) { return Math.abs(v) > 1e-9 && v > t0 + 1e-9; });
    var yv = values(y0, y1, o.ys, o.yt, function () { return 14; }, pxY).filter(function (v) { return Math.abs(v) > 1e-9 && (mid || v > y0 + 1e-9); });
    xv.forEach(function (v) { marks += 'M' + r1(X(v)) + ' ' + r1(ax - 3.5) + 'V' + r1(ax + 3.5); top += text(X(v), ax + 16, tickText(v), 'middle', 'tk tx', true); });
    yv.forEach(function (v) { marks += 'M' + r1(ay - 3.5) + ' ' + r1(Y(v)) + 'H' + r1(ay + 3.5); top += text(ay - 7, Y(v) + 4.5, tickText(v), 'end', 'tk ty', true); });
    if (marks) s += '<path class="axis" d="' + marks + '"/>';
    if (o.origin !== false && (mid || Math.abs(y0) < 1e-12)) top += text(ay - 7, ax + 4.5, '0', 'end', 'tk ty', true);
    if (o.yl) top += text(ay + 10, oy + 15, o.yl, 'start', 'ax');
    if (o.xl) top += text(R + 10, ax - 9, o.xl, 'end', 'ax');
    (o.vl || []).forEach(function (v) {
      s += '<g class="hl" style="--c: var(--muted)"><path d="M' + r1(X(v.t)) + ' ' + r1(TOP - 4) + 'V' + r1(B) + '"/></g>';
    });
    (o.hl || []).forEach(function (l) {
      s += '<g class="hl" style="--c: var(--q-' + l.col + ')"><path d="M' + r1(L) + ' ' + r1(Y(l.y)) + 'H' + r1(R) + '"/></g>';
      if (l.s) top += text(l.x !== undefined ? X(l.x) : R - 4, Y(l.y) + (l.below ? 17 : -7), l.s, l.x !== undefined ? 'middle' : 'end', 'lab');
    });
    (o.curves || []).forEach(function (c) {
      var pts = c.pts || samplePts(c.f, c.from !== undefined ? c.from : t0, c.to !== undefined ? c.to : t1, c.n || 360);
      s += '<g class="sig" style="--c: ' + cssCol(c.col) + '"><path d="' + poly(pts, X, Y) + '"/></g>';
    });
    (o.dots || []).forEach(function (d) { s += '<circle class="pt" style="--c: ' + cssCol(d.col) + '" cx="' + r1(X(d.t)) + '" cy="' + r1(Y(d.u)) + '" r="4"/>'; });
    return { s: s + top, X: X, Y: Y };
  }
  /** Couleur d'un tracé : une grandeur ('u' → var(--q-u)) ou l'encre neutre ('--muted'). */
  function cssCol(col) { col = col || 'u'; return col.indexOf('--') === 0 ? 'var(' + col + ')' : 'var(--q-' + col + ')'; }
  function svgChrono(w, h, label, body) {
    return '<svg class="fig chrono" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + xml(label) + '">' + body + '</svg>';
  }

  /* =====================================================================
     Physique du régime sinusoïdal (50 Hz, t en ms) : u(t), i(t), p(t) = u(t) × i(t).
     Le courant est en retard de φ sur la tension, avec k = cos φ (facteur de puissance).
     ===================================================================== */
  var PERIOD = 20; // ms
  var PHYS = {
    u: function (U, t) { return U * Math.SQRT2 * Math.sin(2 * Math.PI * t / PERIOD); },
    i: function (I, k, t) { return I * Math.SQRT2 * Math.sin(2 * Math.PI * t / PERIOD - Math.acos(Math.min(1, Math.max(-1, k)))); },
    p: function (U, I, k, t) { return PHYS.u(U, t) * PHYS.i(I, k, t); },
    /** Puissance moyenne : P = k × Ueff × Ieff. */
    mean: function (U, I, k) { return k * U * I; },
    /** Valeurs extrêmes de p(t) : Ueff × Ieff × (k ± 1). */
    max: function (U, I, k) { return U * I * (k + 1); },
    min: function (U, I, k) { return U * I * (k - 1); }
  };

  /* =====================================================================
     Les dessins du chapitre
     ===================================================================== */
  var FIG = {};
  /**
   * Un dipôle seul sur un fil, sa tension et son intensité fléchées.
   * o : { t: 'C' | 'R', sym, name, iDir: 'r' | 'l', uDir: 'r' | 'l', i, u : étiquettes, ix : flèche de I à droite ('r') ou à gauche ('l') du dipôle, label }
   */
  FIG.dipole = function (o) {
    // dessin resserré (300 unités) : dans une carte de téléphone, ses textes restent au-dessus de 11 px
    var t = o.t || 'C', Y = 52, cx = 150, iDir = o.iDir || 'r', uDir = o.uDir || 'l', same = iDir === uDir;
    var ix = o.ix === 'r' ? 228 : o.ix === 'l' ? 72 : iDir === 'l' ? 228 : 72;
    var s = branch(16, Y, 284, Y, [{ t: t, c: cx, sym: t === 'C' ? (o.sym || 'D') : null, name: o.name, at: 'a' }]);
    s += iArrow(ix, Y, iDir, o.i === undefined ? 'I' : o.i, 'a');
    s += uArrow(t, cx, Y, 'b', uDir, o.u === undefined ? 'U' : o.u);
    return svgCircuit(300, 112, o.label || ('Un dipôle traversé par le courant I, fléché vers la ' + (iDir === 'r' ? 'droite' : 'gauche') +
      ' ; la flèche de la tension U est ' + (same ? 'dans le même sens' : 'dans le sens opposé') + ' : convention ' + (same ? 'générateur' : 'récepteur') + '.'), s);
  };
  /** Convention générateur et convention récepteur, côte à côte (le tableau du cours). */
  FIG.conventions = function () {
    var s = branch(8, 52, 158, 52, [{ t: 'R', c: 92 }]) + iArrow(32, 52, 'r', 'I', 'a') + uArrow('R', 92, 52, 'b', 'r', 'U');
    s += text(82, 130, 'convention générateur\nI et U dans le même sens', 'middle', 'cap', true);
    s += branch(172, 52, 322, 52, [{ t: 'R', c: 256 }]) + iArrow(196, 52, 'r', 'I', 'a') + uArrow('R', 256, 52, 'b', 'l', 'U');
    s += text(248, 130, 'convention récepteur\nI et U de sens opposés', 'middle', 'cap', true);
    return svgCircuit(330, 150, 'À gauche, convention générateur : la flèche de la tension U est dans le même sens que celle du courant I. À droite, convention récepteur : les deux flèches sont de sens opposés.', s);
  };
  /** Exercice 1 : générateur réversible, fléché en convention générateur. */
  FIG.ex1 = function (v) {
    v = v || {};
    return FIG.dipole({ sym: 'G', iDir: 'r', uDir: 'r', ix: 'r', i: v.i || 'I', u: v.u || 'U',
      label: 'Exercice 1 : le générateur réversible G ; la flèche du courant I, à droite de G, pointe vers la droite ; la flèche de la tension U, sous G, pointe aussi vers la droite.' });
  };
  /** Exercice 2 : batterie, fléchée en convention récepteur. */
  FIG.ex2 = function (v) {
    v = v || {};
    return FIG.dipole({ sym: 'B', name: 'batterie', iDir: 'r', uDir: 'l', ix: 'r', i: v.i || 'I', u: v.u || 'U',
      label: 'Exercice 2 : la batterie B ; la flèche du courant I, à droite de la batterie, pointe vers la droite ; la flèche de la tension U, sous la batterie, pointe vers la gauche.' });
  };
  /**
   * Exercice 3 : D₁ à gauche (tension U), R₁ et D₂ en dérivation en haut (tension U₁, courants I₁ et I₂),
   * R₃ à droite (tension U₃), courant I₃ dans la branche principale. v : étiquettes (par défaut, les noms).
   */
  FIG.ex3 = function (v) {
    v = v || {};
    var XL = 110, XA = 175, XB = 305, XR = 385, YT = 90, Yu = 55, Yd = 125, YB = 255, Ym = 175, s = '';
    s += branch(XL, YT, XL, YB, [{ t: 'C', sym: 'D_1', c: Ym }]);
    s += path([[XL, YT], [XA, YT]]) + path([[XA, Yu], [XA, Yd]]) + path([[XB, Yu], [XB, Yd]]) + path([[XB, YT], [XR, YT]]);
    s += branch(XA, Yu, XB, Yu, [{ t: 'R', c: 240, name: 'R_1', at: 'in' }]);
    s += branch(XA, Yd, XB, Yd, [{ t: 'C', sym: 'D_2', c: 240 }]);
    s += branch(XR, YT, XR, YB, [{ t: 'R', c: Ym, name: 'R_3', at: 'l' }]);
    s += path([[XL, YB], [XR, YB]]) + dot(XA, YT) + dot(XB, YT);
    s += uArrow('C', XL, Ym, 'l', 'a', v.U || 'U');
    s += uArrow('R', 240, Yu, 'a', 'l', v.U1 || 'U_1') + uArrow('C', 240, Yd, 'b', 'l', v.U1b || 'U_1');
    s += uArrow('R', XR, Ym, 'r', 'a', v.U3 || 'U_3');
    s += iArrow(283, Yu, 'r', v.I1 || 'I_1', 'b') + iArrow(283, Yd, 'r', v.I2 || 'I_2', 'a') + iArrow(345, YT, 'r', v.I3 || 'I_3', 'a');
    return svgCircuit(440, 290, 'Exercice 3 : le dipôle D1 à gauche, de tension U fléchée vers le haut. En haut, la résistance R1 et le dipôle D2 sont en dérivation : tension U1 fléchée vers la gauche, courants I1 et I2 vers la droite. À droite, la résistance R3, de tension U3 fléchée vers le haut ; le courant I3 circule vers la droite dans le fil du haut.', s);
  };
  /**
   * Exercice 4 : entre A et B, R₁ puis R₂ // R₃ ; le générateur G en bas, de tension U.
   * U₁ est fléchée vers A (convention récepteur) : sur la fiche, la flèche était dans le sens du courant.
   */
  FIG.ex4 = function (v) {
    v = v || {};
    var XA = 50, XN = 195, XM = 335, XB = 390, YT = 80, Yu = 45, Yd = 115, YB = 215, s = '';
    s += branch(XA, YT, XN, YT, [{ t: 'R', c: 125, name: 'R_1', at: 'a' }]);
    s += path([[XN, Yu], [XN, Yd]]) + path([[XM, Yu], [XM, Yd]]) + path([[XM, YT], [XB, YT]]);
    s += branch(XN, Yu, XM, Yu, [{ t: 'R', c: 260, name: 'R_2', at: 'in' }]);
    s += branch(XN, Yd, XM, Yd, [{ t: 'R', c: 260, name: 'R_3', at: 'in' }]);
    s += path([[XA, YT], [XA, YB]]) + path([[XB, YT], [XB, YB]]) + branch(XA, YB, XB, YB, [{ t: 'C', sym: 'G', c: 220 }]);
    s += dot(XA, YT) + dot(XB, YT) + dot(XN, YT) + dot(XM, YT) + pt(XA, YT, 'A', 'l') + pt(XB, YT, 'B', 'r');
    s += iArrow(80, YT, 'r', v.I1 || 'I_1', 'a') + iArrow(310, Yu, 'r', v.I2 || 'I_2', 'a') + iArrow(310, Yd, 'r', v.I3 || 'I_3', 'b');
    s += uArrow('R', 125, YT, 'b', 'l', v.U1 || 'U_1');
    s += arrow(292, YT, 228, YT, v.U2 || 'U_2', 'u', 'a');
    s += uArrow('C', 220, YB, 'b', 'l', v.U || 'U');
    return svgCircuit(440, 276, 'Exercice 4 : entre A et B, la résistance R1 parcourue par I1, puis R2 (courant I2) et R3 (courant I3) en dérivation, de tension U2 fléchée vers la gauche. La tension U1 de R1 est fléchée vers A. Le générateur G, en bas, relie B à A ; sa tension U est fléchée vers la gauche.', s);
  };
  /** Exercice 5 (type DS) : G à gauche, R₁ en haut, D₂ et D₃ en dérivation. */
  FIG.ex5 = function (v) {
    v = v || {};
    var XL = 100, XM = 270, XR = 370, YT = 50, YB = 225, Ym = 140, s = '';
    s += branch(XL, YT, XL, YB, [{ t: 'C', sym: 'G', c: Ym }]);
    s += branch(XL, YT, XM, YT, [{ t: 'R', c: 185, name: 'R_1', at: 'in' }]) + path([[XM, YT], [XR, YT]]);
    s += branch(XM, YT, XM, YB, [{ t: 'C', sym: 'D_2', c: Ym }]);
    s += branch(XR, YT, XR, YB, [{ t: 'C', sym: 'D_3', c: Ym }]);
    s += path([[XL, YB], [XR, YB]]) + dot(XM, YT) + dot(XM, YB);
    s += uArrow('C', XL, Ym, 'l', 'a', v.U || 'U') + uArrow('R', 185, YT, 'a', 'l', v.U1 || 'U_1');
    s += uArrow('C', XM, Ym, 'l', 'a', v.U2 || 'U_2') + uArrow('C', XR, Ym, 'r', 'a', v.U3 || 'U_3');
    s += iArrow(XL, 88, 'a', v.I1 || 'I_1', 'r') + iArrow(XM, 88, 'b', v.I2 || 'I_2', 'r') + iArrow(325, YT, 'l', v.I3 || 'I_3', 'a');
    return svgCircuit(440, 262, 'Exercice 5 : le générateur G à gauche, de tension U fléchée vers le haut, parcouru par I1 vers le haut. En haut, la résistance R1, de tension U1 fléchée vers la gauche. Au nœud, le courant I2 descend dans D2 (tension U2 fléchée vers le haut) ; le courant I3 arrive de D3 (tension U3 fléchée vers le haut, courant vers le haut).', s);
  };
  /**
   * Tension u(t) et intensité i(t) d'un dipôle en régime sinusoïdal (50 Hz), à la même échelle relative
   * (comme deux voies d'oscilloscope) ; t0 : instant marqué. o : { k, t0, label }
   */
  FIG.ui = function (o) {
    o = o || {};
    var k = o.k === undefined ? 1 : o.k, phi = Math.acos(Math.min(1, Math.max(0, k))), A = 0.7;
    function u(t) { return Math.sin(2 * Math.PI * t / PERIOD); }
    function i(t) { return A * Math.sin(2 * Math.PI * t / PERIOD - phi); }
    var fr0 = { t0: 0, t1: 41, y0: -1.3, y1: 1.3, xs: 10, xm: 5, yt: [], origin: false, pl: 22, xl: 't (ms)', yl: 'u, i',
      curves: [{ f: u, col: 'u' }, { f: i, col: 'I' }] };
    if (o.t0 !== undefined) { fr0.vl = [{ t: o.t0 }]; fr0.dots = [{ t: o.t0, u: u(o.t0), col: 'u' }, { t: o.t0, u: i(o.t0), col: 'I' }]; }
    return svgChrono(400, 170, o.label || ('Chronogrammes de la tension u(t), en orange, et de l’intensité i(t), en vert, de période 20 ms' +
      (k >= 0.999 ? ' : elles sont en phase, elles s’annulent et changent de signe en même temps.' : ' : i(t) est en retard sur u(t), le facteur de puissance vaut ' + fr(k, 2) + '.')), frame(fr0, 0, 0, 400, 170).s);
  };
  /** Puissance instantanée p(t) et puissance moyenne P (course : conducteur ohmique, Ueff = 10 V, Ieff = 2 A). */
  FIG.pt = function (o) {
    o = o || {};
    var U = o.U || 10, I = o.I || 2, k = o.k === undefined ? 1 : o.k, P = PHYS.mean(U, I, k), pmax = PHYS.max(U, I, k), pmin = PHYS.min(U, I, k);
    var st = C.niceStep(pmax / 4), pts = samplePts(function (t) { return PHYS.p(U, I, k, t); }, 0, 41, 360);
    return svgChrono(400, 220, o.label || ('Puissance instantanée p(t) = u(t) × i(t) d’un conducteur ohmique : elle varie entre 0 et ' + fr(pmax) + ' W, deux fois par période de la tension. Sa valeur moyenne, la puissance moyenne P, vaut ' + fr(P) + ' W.'),
      frame({ t0: 0, t1: 41, y0: Math.min(pmin, 0) - st * 0.4, y1: pmax + st * 0.9, xs: 10, xm: 5, ys: st, pl: 44, xl: 't (ms)', yl: 'p (W)',
        areas: [{ pts: pts, col: 'P' }], curves: [{ pts: pts, col: 'P' }], hl: [{ y: P, col: 'P', s: 'P = ' + fr(P) + ' W', x: 30, below: true }] }, 0, 0, 400, 220).s);
  };
  /** Caractéristiques U = f(I) : une résistance (passive, passe par l'origine) et une pile (active). */
  FIG.carac = function () {
    return svgChrono(400, 220, 'Deux caractéristiques U = f(I). En violet, une résistance de 10 ohms : une droite qui passe par l’origine, le dipôle est passif. En gris, une pile : pour I = 0, sa tension vaut 9 V, sa caractéristique ne passe pas par l’origine, elle est active.',
      frame({ t0: 0, t1: 1.05, y0: 0, y1: 12.5, xs: 0.2, ys: 2, pl: 40, xl: 'I (A)', yl: 'U (V)',
        curves: [{ f: function (x) { return 10 * x; }, col: 'R', to: 1.05 }, { f: function (x) { return 9 - 3 * x; }, col: '--muted' }],
        dots: [{ t: 0, u: 0, col: 'R' }, { t: 0, u: 9, col: '--muted' }] }, 0, 0, 400, 220).s +
      text(372, 42, 'résistance', 'end', 'lab', true) + text(318, 134, 'pile', 'middle', 'lab', true));
  };

  /* =====================================================================
     Banque de questions
     ===================================================================== */
  function m(t) { return '\\(' + t + '\\)'; }
  function steps(list) { return '<ol class="steps-list">' + list.filter(Boolean).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit, signed) { return 'Donne ' + what + ' en ' + unit + (signed ? ', avec son signe' : '') + ', à 3 chiffres significatifs.'; }
  function fig(s) { return '<figure class="fig-wrap">' + s + '</figure>'; }
  function V(x) { return T(x, 3) + '\\ \\mathrm{V}'; }
  function Amp(x) { return T(x, 3) + '\\ \\mathrm{A}'; }
  function mA(x) { return T(x, 3) + '\\ \\mathrm{mA}'; }
  function W(x, n) { return T(x, n || 3) + '\\ \\mathrm{W}'; }
  function J(x) { return T(x, 3) + '\\ \\mathrm{J}'; }
  function Ohm(x) { return T(x, 3) + '\\ \\Omega'; }
  /** Facteur d'un produit : entre parenthèses quand il est négatif. */
  function par(x, sig) { return x < 0 ? '(' + T(x, sig || 3) + ')' : T(x, sig || 3); }
  /** Grandeurs colorées : tension, intensité, puissance, énergie, durée, résistance, facteur de puissance. */
  function Uq(sub) { return '\\q{u}{U' + (sub ? '_{' + sub + '}' : '') + '}'; }
  function Iq(sub) { return '\\q{I}{I' + (sub ? '_{' + sub + '}' : '') + '}'; }
  function Pq(sub) { return '\\q{P}{P' + (sub ? '_{' + sub + '}' : '') + '}'; }
  function Rq(sub) { return '\\q{R}{R' + (sub ? '_{' + sub + '}' : '') + '}'; }
  var Eq = '\\QE', tq = '\\Qt', kq = '\\Qk', Ue = '\\QUe', Ie = '\\QIe';
  function sig(x, n) { return C.roundSig(x, n || 3); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var SUBN = '₀₁₂₃₄₅₆₇₈₉';
  function subn(k) { return String(k).replace(/\d/g, function (d) { return SUBN[d]; }); }
  /** Les dipôles ronds des questions : symbole, article, « d’un… ». */
  var DIPS = [
    { sym: 'G', a: 'un générateur réversible', of: 'd’un générateur réversible' },
    { sym: 'B', a: 'une batterie', of: 'd’une batterie', name: 'batterie' },
    { sym: 'M', a: 'un moteur', of: 'd’un moteur', name: 'moteur' },
    { sym: 'D', a: 'un dipôle D', of: 'd’un dipôle D' }
  ];
  var MODE = { rec: 'en récepteur : il reçoit de l’énergie', gen: 'en générateur : il fournit de l’énergie' };
  /** Fonctionnement d'un dipôle : 'gen' ou 'rec', selon la convention et le signe de P = U × I. */
  function mode(conv, p) { return (conv === 'gen') === (p > 0) ? 'gen' : 'rec'; }

  function make(rng) {
    rng = rng || Math.random;
    function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    /** Valeur au hasard entre a et b, par pas de step (sans bruit d'arrondi). */
    function between(a, b, step) { var n = Math.round((b - a) / step); return sig(a + step * Math.floor(rng() * (n + 1)), 6); }
    function neg(p) { return rng() < p ? -1 : 1; }
    /** QCM : bonne réponse + distracteurs mélangés ; why = explication d'un distracteur. */
    function mcq(o, right, wrongs) {
      var all = shuffle([{ html: right, ok: true }].concat(wrongs.map(function (w) { return typeof w === 'string' ? { html: w } : w; })));
      o.choices = all.map(function (c) { return { html: c.html, why: c.why }; });
      o.answer = all.findIndex(function (c) { return c.ok; });
      o.ask = o.ask || 'Choisis la bonne réponse.';
      return o;
    }
    /** Un dipôle fléché au hasard : convention, sens du courant. */
    function arrows(conv) { var iR = rng() < 0.5; return { iDir: iR ? 'r' : 'l', uDir: (conv === 'gen') === iR ? 'r' : 'l' }; }

    /* ---- reconnaître la convention (cours, II) ---- */
    function convention() {
      if (rng() < 0.3) {
        var g = rng() < 0.5;
        return mcq({
          type: 'Les deux conventions', ref: 'c-conventions',
          html: '<p>En convention ' + (g ? 'générateur' : 'récepteur') + ', les flèches de la tension ' + m(Uq()) + ' et de l’intensité ' + m(Iq()) + ' sont :</p>',
          solution: '<p>Convention générateur : ' + m(Uq()) + ' et ' + m(Iq()) + ' dans le <b>même sens</b>. Convention récepteur : ' + m(Uq()) + ' et ' + m(Iq()) + ' de <b>sens opposés</b>.</p>'
        }, g ? 'dans le même sens' : 'de sens opposés', [
          { html: g ? 'de sens opposés' : 'dans le même sens', why: 'Ça, c’est la convention ' + (g ? 'récepteur' : 'générateur') + '.' },
          { html: 'perpendiculaires', why: 'Les deux flèches sont parallèles au fil : celle de ' + m(Iq()) + ' sur le fil, celle de ' + m(Uq()) + ' à côté du dipôle.' }
        ]);
      }
      var d = pick(DIPS), conv = pick(['gen', 'rec']), a = arrows(conv), same = conv === 'gen';
      return mcq({
        type: 'Reconnaître la convention', ref: 'c-conventions',
        html: '<p>Voici le fléchage ' + d.of + ' :</p>' + fig(FIG.dipole({ sym: d.sym, name: d.name, iDir: a.iDir, uDir: a.uDir })) + '<p>Quelle convention est utilisée ?</p>',
        solution: '<p>Les flèches de ' + m(Uq()) + ' et de ' + m(Iq()) + ' sont ' + (same ? 'dans le <b>même sens</b> : convention générateur' : 'de <b>sens opposés</b> : convention récepteur') + '.</p>' +
          '<p class="note">La convention est un choix de fléchage : à elle seule, elle ne dit pas si le dipôle fonctionne en générateur ou en récepteur. Il faut aussi le signe de ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + '.</p>'
      }, 'la convention ' + (same ? 'générateur' : 'récepteur'), [
        { html: 'la convention ' + (same ? 'récepteur' : 'générateur'), why: same ? 'Les deux flèches sont dans le même sens : c’est la convention générateur.' : 'Les deux flèches sont de sens opposés : c’est la convention récepteur.' },
        { html: 'on ne peut pas savoir sans les valeurs de U et de I', why: 'La convention se lit seulement sur le sens des flèches. Les valeurs servent ensuite à trouver le signe de P.' }
      ]);
    }

    /* ---- générateur ou récepteur ? (cours, II, tableau) ---- */
    function fonctionnement() {
      var conv = pick(['gen', 'rec']), u = between(1, 24, 1) * neg(0.3), i = between(0.1, 5, 0.1) * neg(0.4), p = sig(u * i, 6), md = mode(conv, p);
      var cv = 'convention ' + (conv === 'gen' ? 'générateur' : 'récepteur'), sgn = p > 0 ? ' > 0' : ' < 0', html;
      if (rng() < 0.65) {
        var d = pick(DIPS), a = arrows(conv);
        html = '<p>On mesure la tension et l’intensité ' + d.of + ', fléchées comme sur le schéma.</p>' +
          fig(FIG.dipole({ sym: d.sym, name: d.name, iDir: a.iDir, uDir: a.uDir, i: 'I = ' + fr(i) + ' A', u: 'U = ' + fr(u) + ' V' })) + '<p>Ce dipôle fonctionne :</p>';
      } else {
        html = '<p>Un dipôle est fléché en ' + cv + '. On calcule ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq() + ' = ' + W(p)) + '.</p><p>Ce dipôle fonctionne :</p>';
      }
      var wrongs = [{ html: MODE[md === 'gen' ? 'rec' : 'gen'], why: 'En ' + cv + ', une puissance ' + (p > 0 ? 'positive' : 'négative') + ' signifie que le dipôle ' + (md === 'gen' ? 'fournit' : 'reçoit') + ' de l’énergie.' }];
      if (p < 0) wrongs.push({ html: 'ni l’un ni l’autre : une puissance ne peut pas être négative', why: 'Une puissance négative a un sens : avec la convention, son signe dit si le dipôle reçoit ou fournit de l’énergie.' });
      return mcq({
        type: 'Générateur ou récepteur ?', ref: 'c-methode', html: html,
        solution: steps([
          'Les flèches de ' + m(Uq()) + ' et de ' + m(Iq()) + ' sont ' + (conv === 'gen' ? 'dans le même sens' : 'de sens opposés') + ' : ' + cv + '.',
          m(Pq() + ' = ' + Uq() + ' \\times ' + Iq() + ' = ' + par(u) + ' \\times ' + par(i) + ' = ' + W(p)) + '.',
          cap(cv) + ' et ' + m(Pq() + sgn) + ', donc le dipôle fonctionne ' + MODE[md] + ' (' + fr(Math.abs(p)) + ' W).'
        ])
      }, MODE[md], wrongs);
    }

    /* ---- P = U × I avec les signes (cours, I.A) ---- */
    function puissance() {
      var conv = pick(['gen', 'rec']), d = pick(DIPS), a = arrows(conv);
      var u = pick([between(1.5, 24, 0.5), between(110, 240, 10)]) * neg(0.25), inMA = rng() < 0.35;
      var mag = inMA ? between(20, 950, 10) / 1000 : between(0.1, 6, 0.1), i = sig(mag * neg(0.3), 6), p = u * i, md = mode(conv, p);
      var iLab = inMA ? fr(i * 1000) + ' mA' : fr(i) + ' A';
      var traps = [{ value: u / i, msg: m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ' : on multiplie la tension par l’intensité.' },
        { value: u + i, msg: 'On ne fait pas la somme d’une tension et d’une intensité : ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + '.' },
        { value: i / u, msg: m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ' : on multiplie, on ne divise pas.' },
        { value: u * i / 1000, msg: 'Des volts multipliés par des ampères donnent directement des <b>watts</b> : pas de conversion en kW.' }];
      if (inMA) traps.unshift({ value: u * i * 1000, msg: 'Convertis d’abord l’intensité en ampères : ' + m(mA(i * 1000) + ' = ' + Amp(i)) + '.' });
      if (u < 0 || i < 0) traps.unshift({ value: -p, msg: (u < 0 && i < 0 ? 'Les deux valeurs sont négatives : leur produit est positif.' : 'Garde le signe : ' + (u < 0 ? m(Uq()) : m(Iq())) + ' est négative, donc ' + m(Pq()) + ' aussi.') });
      return {
        type: 'Puissance P = U × I', ask: ask('la puissance P', 'watts (W)', true), unit: 'W', answer: p, traps: traps,
        html: '<p>On mesure la tension et l’intensité ' + d.of + ', fléchées comme sur le schéma.</p>' +
          fig(FIG.dipole({ sym: d.sym, name: d.name, iDir: a.iDir, uDir: a.uDir, i: 'I = ' + iLab, u: 'U = ' + fr(u) + ' V' })) +
          '<p>Calcule ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + '.</p>',
        solution: steps([
          inMA ? 'Conversion : ' + m(Iq() + ' = ' + mA(i * 1000) + ' = ' + Amp(i)) + '.' : null,
          m(Pq() + ' = ' + Uq() + ' \\times ' + Iq() + ' = ' + par(u) + ' \\times ' + par(i) + ' = ' + W(p)) + '.',
          'Convention ' + (conv === 'gen' ? 'générateur' : 'récepteur') + ' et ' + m(Pq() + (p > 0 ? ' > 0' : ' < 0')) + ', donc le dipôle fonctionne ' + MODE[md] + '.'
        ])
      };
    }

    /* ---- I = P / U ou U = P / I (exercice 1, exercice 5 question 4) ---- */
    function inverse() {
      var conv = pick(['gen', 'rec']), cv = 'convention ' + (conv === 'gen' ? 'générateur' : 'récepteur'), findI = rng() < 0.65;
      var u = pick([between(2, 24, 1), between(110, 240, 10)]) * neg(0.35), i = between(0.1, 5, 0.1) * neg(0.35), p = sig(u * i, 6);
      if (findI) {
        return {
          type: 'Intensité à partir de la puissance', ask: ask('l’intensité I', 'ampères (A)', true), unit: 'A', answer: i,
          html: '<p>Un dipôle est fléché en ' + cv + '. La tension à ses bornes vaut ' + m(Uq() + ' = ' + V(u)) + ' et la puissance calculée avec ce fléchage ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq() + ' = ' + W(p, 6)) + '.</p>' +
            '<p>Calcule l’intensité ' + m(Iq()) + ' du courant.</p>',
          traps: [{ value: u / p, msg: 'C’est l’inverse : ' + m(Iq() + ' = \\dfrac{' + Pq() + '}{' + Uq() + '}') + ', la puissance au numérateur.' },
            { value: p * u, msg: m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ' donne ' + m(Iq() + ' = \\dfrac{' + Pq() + '}{' + Uq() + '}') + ' : on divise.' },
            { value: -i, msg: 'Attention au signe : divise ' + m(W(p, 6)) + ' par ' + m(V(u)) + ' en gardant les deux signes.' }],
          solution: steps([m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ', donc ' + m(Iq() + ' = \\dfrac{' + Pq() + '}{' + Uq() + '}') + '.',
            m(Iq() + ' = \\dfrac{' + T(p, 6) + '}{' + T(u) + '} = ' + Amp(i)) + '.'])
        };
      }
      return {
        type: 'Tension à partir de la puissance', ask: ask('la tension U', 'volts (V)', true), unit: 'V', answer: u,
        html: '<p>Un dipôle est fléché en ' + cv + '. Il est traversé par un courant d’intensité ' + m(Iq() + ' = ' + Amp(i)) + ' et la puissance calculée avec ce fléchage vaut ' + m(Pq() + ' = ' + W(p, 6)) + '.</p>' +
          '<p>Calcule la tension ' + m(Uq()) + ' à ses bornes.</p>',
        traps: [{ value: i / p, msg: 'C’est l’inverse : ' + m(Uq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '}') + '.' },
          { value: p * i, msg: m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ' donne ' + m(Uq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '}') + ' : on divise.' },
          { value: -u, msg: 'Attention au signe : divise ' + m(W(p, 6)) + ' par ' + m(Amp(i)) + ' en gardant les deux signes.' }],
        solution: steps([m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ', donc ' + m(Uq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '}') + '.',
          m(Uq() + ' = \\dfrac{' + T(p, 6) + '}{' + T(i) + '} = ' + V(u)) + '.'])
      };
    }

    /* ---- régime sinusoïdal : P = k × Ueff × Ieff (cours, I.B) ---- */
    var OHMIC = ['un radiateur électrique', 'un fer à repasser', 'une bouilloire', 'un grille-pain'];
    var MOTORS = ['un moteur', 'une perceuse', 'un ventilateur', 'une pompe'];
    function sinus() {
      var v = pick(['P', 'P', 'P', 'k', 'I', 'umax']), U = pick([230, 230, 230, 120, 400]), I = between(0.5, 10, 0.1);
      var ohmic = v !== 'k' && rng() < 0.4, k = ohmic ? 1 : pick([0.75, 0.8, 0.82, 0.85, 0.88, 0.9, 0.95]);
      var who = ohmic ? pick(OHMIC) + ' (conducteur ohmique)' : pick(MOTORS) + (v === 'k' ? '' : ' de facteur de puissance ' + m(kq + ' = ' + T(k)));
      var data = 'sous la tension efficace ' + m(Ue + ' = ' + V(U));
      var law = m(Pq() + ' = ' + kq + ' \\times ' + Ue + ' \\times ' + Ie);
      if (v === 'P' || v === 'umax') {
        var P = k * U * I, um = v === 'umax' ? sig(U * Math.SQRT2, 3) : null;
        if (um) { P = k * (um / Math.SQRT2) * I; data = 'sous une tension sinusoïdale de valeur maximale ' + m('\\q{u}{U_{\\max}} = ' + V(um)); }
        var traps = [{ value: P / k * 2, msg: 'On utilise les valeurs <b>efficaces</b>, pas les valeurs maximales : ' + m('U_{\\max} \\times I_{\\max} = 2\\,' + Ue + ' \\times ' + Ie) + '.' },
          { value: (um || U) / I * k, msg: law + ' : on multiplie par l’intensité.' }];
        if (k !== 1) traps.unshift({ value: P / k, msg: 'N’oublie pas le facteur de puissance : pour un moteur, ' + law + ', avec ' + m(kq + ' = ' + T(k)) + '.' });
        if (um) traps.unshift({ value: k * um * I, msg: 'Convertis d’abord la valeur maximale en valeur efficace : ' + m(Ue + ' = \\dfrac{U_{\\max}}{\\sqrt{2}}') + '.' });
        return {
          type: 'Puissance moyenne en sinusoïdal', ask: ask('la puissance moyenne P', 'watts (W)'), unit: 'W', answer: P, traps: traps,
          html: '<p>' + cap(who) + ' fonctionne ' + data + '. L’intensité efficace du courant vaut ' + m(Ie + ' = ' + Amp(I)) + '.</p><p>Calcule sa puissance moyenne ' + m(Pq()) + '.</p>',
          solution: steps([
            um ? 'Valeur efficace de la tension : ' + m(Ue + ' = \\dfrac{U_{\\max}}{\\sqrt{2}} = \\dfrac{' + T(um) + '}{\\sqrt{2}} \\approx ' + V(um / Math.SQRT2)) + '.' : null,
            ohmic ? 'Pour un conducteur ohmique, ' + m(kq + ' = 1') + '.' : null,
            law + ', soit ' + m(Pq() + ' = ' + (k !== 1 ? T(k) + ' \\times ' : '') + T(um ? um / Math.SQRT2 : U, 4) + ' \\times ' + T(I) + ' \\approx ' + W(P)) + '.'
          ])
        };
      }
      if (v === 'k') {
        var Pd = sig(k * U * I, 4), kk = Pd / (U * I);
        return {
          type: 'Facteur de puissance', ask: 'Donne le facteur de puissance k (sans unité), à 3 chiffres significatifs.', unit: '', answer: kk,
          html: '<p>' + cap(who) + ' fonctionne ' + data + '. L’intensité efficace du courant vaut ' + m(Ie + ' = ' + Amp(I)) + ' et sa puissance moyenne ' + m(Pq() + ' = ' + W(Pd, 4)) + '.</p><p>Calcule son facteur de puissance ' + m(kq) + '.</p>',
          traps: [{ value: U * I / Pd, msg: 'C’est l’inverse : ' + m(kq + ' = \\dfrac{' + Pq() + '}{' + Ue + ' \\times ' + Ie + '}') + ', un nombre inférieur à 1.' },
            { value: Pd / U, msg: 'Divise ' + m(Pq()) + ' par le produit ' + m(Ue + ' \\times ' + Ie) + ', pas seulement par ' + m(Ue) + '.' },
            { value: Pd / I, msg: 'Divise ' + m(Pq()) + ' par le produit ' + m(Ue + ' \\times ' + Ie) + ', pas seulement par ' + m(Ie) + '.' }],
          solution: steps([law + ', donc ' + m(kq + ' = \\dfrac{' + Pq() + '}{' + Ue + ' \\times ' + Ie + '}') + '.',
            m(kq + ' = \\dfrac{' + T(Pd, 4) + '}{' + T(U) + ' \\times ' + T(I) + '} \\approx ' + T(kk, 3)) + ' : compris entre 0,75 et 0,95, comme pour un moteur.'])
        };
      }
      var Pw = sig(k * U * I, 3), Ia = Pw / (k * U);
      return {
        type: 'Intensité efficace', ask: ask('l’intensité efficace', 'ampères (A)'), unit: 'A', answer: Ia,
        html: '<p>' + cap(who) + ' fonctionne ' + data + '. Sa puissance moyenne vaut ' + m(Pq() + ' = ' + W(Pw)) + '.</p><p>Calcule l’intensité efficace ' + m(Ie) + ' du courant.</p>',
        traps: [k !== 1 ? { value: Pw / U, msg: 'N’oublie pas le facteur de puissance : ' + m(Ie + ' = \\dfrac{' + Pq() + '}{' + kq + ' \\times ' + Ue + '}') + '.' } : null,
          k !== 1 ? { value: Pw * k / U, msg: 'Le facteur de puissance est au dénominateur : ' + m(Ie + ' = \\dfrac{' + Pq() + '}{' + kq + ' \\times ' + Ue + '}') + '.' } : null,
          { value: Pw / (k * U * Math.SQRT2), msg: m(Ue + ' = ' + V(U)) + ' est déjà une valeur efficace : pas de ' + m('\\sqrt{2}') + ' ici.' },
          { value: k * U / Pw, msg: 'C’est l’inverse : ' + m(Ie + ' = \\dfrac{' + Pq() + '}{' + kq + ' \\times ' + Ue + '}') + '.' }].filter(Boolean),
        solution: steps([ohmic ? 'Pour un conducteur ohmique, ' + m(kq + ' = 1') + '.' : null,
          law + ', donc ' + m(Ie + ' = \\dfrac{' + Pq() + '}{' + kq + ' \\times ' + Ue + '}') + '.',
          m(Ie + ' = \\dfrac{' + T(Pw) + '}{' + (k !== 1 ? T(k) + ' \\times ' : '') + T(U) + '} \\approx ' + Amp(Ia)) + '.'])
      };
    }

    /* ---- énergie électrique E = P × Δt (cours, III) ---- */
    var DEVICES = [['une lampe', 60], ['un téléviseur', 120], ['un ordinateur', 250], ['un four', 2500], ['un radiateur', 2000], ['un lave-linge', 1800], ['un sèche-cheveux', 1200], ['une bouilloire', 2200]];
    function energie() {
      var v = pick(['J', 'J', 'kWh', 'kWh', 'dt', 'conv']), dev = pick(DEVICES), P = dev[1];
      if (v === 'J') {
        var min = between(2, 30, 1), E = P * min * 60;
        return {
          type: 'Énergie en joules', ask: ask('l’énergie E', 'joules (J)'), unit: 'J', answer: E,
          html: '<p>' + cap(dev[0]) + ' de puissance ' + m(Pq() + ' = ' + W(P)) + ' fonctionne pendant ' + min + ' min.</p><p>Calcule l’énergie électrique ' + m(Eq) + ' qu’' + (/^une/.test(dev[0]) ? 'elle' : 'il') + ' reçoit, en joules.</p>',
          traps: [{ value: P * min, msg: 'Pour avoir des joules, la durée doit être en <b>secondes</b> : ' + m(min + '\\ \\mathrm{min} = ' + (min * 60) + '\\ \\mathrm{s}') + '.' },
            { value: P * min / 60, msg: '1 min = 60 s : on <b>multiplie</b> les minutes par 60.' },
            { value: P / (min * 60), msg: m(Eq + ' = ' + Pq() + ' \\times ' + tq) + ' : on multiplie.' }],
          solution: steps(['Conversion : ' + m(tq + ' = ' + min + '\\ \\mathrm{min} = ' + min + ' \\times 60 = ' + (min * 60) + '\\ \\mathrm{s}') + '.',
            m(Eq + ' = ' + Pq() + ' \\times ' + tq + ' = ' + T(P) + ' \\times ' + T(min * 60) + ' = ' + J(E)) + '.'])
        };
      }
      if (v === 'kWh') {
        var inMin = rng() < 0.35, h = inMin ? between(0.25, 1.75, 0.25) : pick([0.5, 1, 1.5, 2, 3, 4, 5, 6, 8]), kwh = P / 1000 * h;
        var dur = inMin ? m(T(h * 60) + '\\ \\mathrm{min}') : m(T(h) + '\\ \\mathrm{h}');
        var tr = [{ value: P * h, msg: 'Tu as trouvé des <b>wattheures</b> : pour des kilowattheures, la puissance doit être en kW (' + m(W(P) + ' = ' + T(P / 1000) + '\\ \\mathrm{kW}') + ').' },
          { value: P * h * 3600, msg: 'Ici, on veut des kWh : puissance en kW et durée en heures, sans passer par les joules.' }];
        if (inMin) tr.unshift({ value: P / 1000 * h * 60, msg: 'La durée doit être en <b>heures</b> : ' + m(T(h * 60) + '\\ \\mathrm{min} = ' + T(h) + '\\ \\mathrm{h}') + '.' });
        return {
          type: 'Énergie en kilowattheures', ask: ask('l’énergie E', 'kilowattheures (kWh)'), unit: 'kWh', answer: kwh, traps: tr,
          html: '<p>' + cap(dev[0]) + ' de puissance ' + m(Pq() + ' = ' + W(P)) + ' fonctionne pendant ' + dur + '.</p><p>Calcule l’énergie ' + m(Eq) + ' consommée, en kilowattheures.</p>',
          solution: steps(['Conversions : ' + m(Pq() + ' = ' + W(P) + ' = ' + T(P / 1000) + '\\ \\mathrm{kW}') + (inMin ? ' et ' + m(tq + ' = \\dfrac{' + T(h * 60) + '}{60} = ' + T(h) + '\\ \\mathrm{h}') : '') + '.',
            m(Eq + ' = ' + Pq() + ' \\times ' + tq + ' = ' + T(P / 1000) + ' \\times ' + T(h) + ' = ' + T(kwh) + '\\ \\mathrm{kWh}') + '.'])
        };
      }
      if (v === 'dt') {
        var hrs = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]), Pd = pick([50, 100, 150, 200, 250, 300, 500]), Ek = Pd * hrs / 1000;
        return {
          type: 'Durée de fonctionnement', ask: ask('la durée Δt', 'heures (h)'), unit: 'h', answer: hrs,
          html: '<p>Une batterie stocke une énergie ' + m(Eq + ' = ' + T(Ek) + '\\ \\mathrm{kWh}') + '. Elle alimente un appareil de puissance ' + m(Pq() + ' = ' + W(Pd)) + '.</p><p>Pendant combien d’heures peut-elle le faire fonctionner ?</p>',
          traps: [{ value: Ek / Pd, msg: 'Mets la puissance en kW avant de diviser : ' + m(W(Pd) + ' = ' + T(Pd / 1000) + '\\ \\mathrm{kW}') + '.' },
            { value: Pd / Ek / 1000, msg: 'C’est l’inverse : ' + m(tq + ' = \\dfrac{' + Eq + '}{' + Pq() + '}') + '.' },
            { value: Ek * Pd / 1000, msg: m(Eq + ' = ' + Pq() + ' \\times ' + tq) + ' donne ' + m(tq + ' = \\dfrac{' + Eq + '}{' + Pq() + '}') + ' : on divise.' }],
          solution: steps([m(Eq + ' = ' + Pq() + ' \\times ' + tq) + ', donc ' + m(tq + ' = \\dfrac{' + Eq + '}{' + Pq() + '}') + ', avec ' + m(Pq() + ' = ' + T(Pd / 1000) + '\\ \\mathrm{kW}') + '.',
            m(tq + ' = \\dfrac{' + T(Ek) + '}{' + T(Pd / 1000) + '} = ' + T(hrs) + '\\ \\mathrm{h}') + '.'])
        };
      }
      var x = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]), wh = rng() < 0.35, Jv = x * (wh ? 3600 : 3.6e6);
      return {
        type: 'Conversion d’énergie', ask: 'Donne l’énergie en joules (J), à 3 chiffres significatifs.', unit: 'J', answer: Jv,
        html: '<p>Un compteur indique une énergie ' + m(Eq + ' = ' + T(x) + '\\ \\mathrm{' + (wh ? 'Wh' : 'kWh') + '}') + '. Convertis-la en joules.</p>',
        traps: [{ value: wh ? x * 60 : x * 3600, msg: (wh ? '1 Wh, c’est 1 W pendant 1 h = 3 600 s : on multiplie par 3 600.' : '1 kWh = 1 000 Wh et 1 Wh = 3 600 J : on multiplie par 3 600 000.') },
          { value: x * 1000, msg: wh ? '1 Wh = 3 600 J (1 W pendant 3 600 s).' : '1 kWh = 1 000 Wh, mais 1 Wh vaut encore 3 600 J.' },
          { value: x / 3600, msg: 'Le joule est <b>plus petit</b> que le wattheure : on multiplie.' }],
        solution: steps([wh ? m('1\\ \\mathrm{Wh} = 1\\ \\mathrm{W} \\times 3\\,600\\ \\mathrm{s} = 3\\,600\\ \\mathrm{J}') + '.' : m('1\\ \\mathrm{kWh} = 1\\,000\\ \\mathrm{W} \\times 3\\,600\\ \\mathrm{s} = 3{,}6 \\times 10^{6}\\ \\mathrm{J}') + '.',
          m(Eq + ' = ' + T(x) + ' \\times ' + (wh ? '3\\,600' : '3{,}6 \\times 10^{6}') + ' = ' + J(Jv)) + '.'])
      };
    }

    /* ---- dipôles passifs résistifs : P = R × I², effet Joule (cours, IV) ---- */
    var RJ = [4.7, 10, 15, 22, 33, 47, 56, 68, 80, 100, 150, 220];
    function joule() {
      var v = pick(['P', 'P', 'E', 'R', 'I']), r = pick(RJ), inMA = v === 'P' && rng() < 0.35;
      var i = inMA ? between(20, 900, 10) / 1000 : between(0.1, 3, 0.05), p = r * i * i;
      if (v === 'P') {
        var tr = [{ value: r * i, msg: 'C’est ' + m(Rq() + ' \\times ' + Iq() + '^2') + ' : l’intensité est <b>au carré</b>. ' + m(Rq() + ' \\times ' + Iq()) + ' est la tension.' },
          { value: r * r * i, msg: 'C’est l’intensité qui est au carré, pas la résistance : ' + m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + '.' },
          { value: (r * i) * (r * i), msg: m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' : seule l’intensité est au carré.' }];
        if (inMA) tr.unshift({ value: r * i * i * 1e6, msg: 'Convertis l’intensité en ampères avant de l’élever au carré : ' + m(mA(i * 1000) + ' = ' + Amp(i)) + '.' });
        return {
          type: 'Effet Joule : P = R × I²', ask: ask('la puissance P', 'watts (W)'), unit: 'W', answer: p, traps: tr,
          html: '<p>Une résistance ' + m(Rq() + ' = ' + Ohm(r)) + ' est traversée par un courant d’intensité ' + m(Iq() + ' = ' + (inMA ? mA(i * 1000) : Amp(i))) + '.</p><p>Calcule la puissance ' + m(Pq()) + ' qu’elle reçoit.</p>',
          solution: steps([inMA ? 'Conversion : ' + m(Iq() + ' = ' + mA(i * 1000) + ' = ' + Amp(i)) + '.' : null,
            m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2 = ' + T(r) + ' \\times ' + T(i) + '^2 = ' + W(p)) + '.',
            'Toute cette puissance est dissipée en chaleur : c’est l’effet Joule.'])
        };
      }
      if (v === 'E') {
        var min = between(1, 20, 1), E = p * min * 60;
        return {
          type: 'Effet Joule : énergie dissipée', ask: ask('l’énergie E', 'joules (J)'), unit: 'J', answer: E,
          html: '<p>Une résistance ' + m(Rq() + ' = ' + Ohm(r)) + ' est traversée pendant ' + min + ' min par un courant d’intensité ' + m(Iq() + ' = ' + Amp(i)) + '.</p><p>Calcule l’énergie ' + m(Eq) + ' dissipée en chaleur.</p>',
          traps: [{ value: p * min, msg: 'La durée doit être en <b>secondes</b> : ' + m(min + '\\ \\mathrm{min} = ' + (min * 60) + '\\ \\mathrm{s}') + '.' },
            { value: r * i * min * 60, msg: m(Eq + ' = ' + Rq() + ' \\times ' + Iq() + '^2 \\times ' + tq) + ' : l’intensité est au carré.' },
            { value: p, msg: 'Ça, c’est la puissance. Multiplie-la par la durée : ' + m(Eq + ' = ' + Pq() + ' \\times ' + tq) + '.' }],
          solution: steps(['Conversion : ' + m(tq + ' = ' + min + ' \\times 60 = ' + (min * 60) + '\\ \\mathrm{s}') + '.',
            m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2 = ' + T(r) + ' \\times ' + T(i) + '^2 = ' + W(p)) + '.',
            m(Eq + ' = ' + Pq() + ' \\times ' + tq + ' = ' + T(p, 4) + ' \\times ' + (min * 60) + ' = ' + J(E)) + '.'])
        };
      }
      if (v === 'R') {
        var Pd = sig(p, 3), rr = Pd / (i * i);
        return {
          type: 'Effet Joule : calculer R', ask: ask('la résistance R', 'ohms (Ω)'), unit: 'Ω', answer: rr,
          html: '<p>Une résistance traversée par un courant d’intensité ' + m(Iq() + ' = ' + Amp(i)) + ' dissipe une puissance ' + m(Pq() + ' = ' + W(Pd)) + '.</p><p>Calcule sa résistance ' + m(Rq()) + '.</p>',
          traps: [{ value: Pd / i, msg: m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' : on divise par ' + m(Iq() + '^2') + ', pas par ' + m(Iq()) + '.' },
            { value: Pd * i * i, msg: m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' donne ' + m(Rq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '^2}') + ' : on divise.' },
            { value: i * i / Pd, msg: 'C’est l’inverse : ' + m(Rq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '^2}') + '.' }],
          solution: steps([m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ', donc ' + m(Rq() + ' = \\dfrac{' + Pq() + '}{' + Iq() + '^2}') + '.',
            m(Rq() + ' = \\dfrac{' + T(Pd) + '}{' + T(i) + '^2} \\approx ' + Ohm(rr)) + '.'])
        };
      }
      var P2 = sig(p, 3), ii = Math.sqrt(P2 / r);
      return {
        type: 'Effet Joule : calculer I', ask: ask('l’intensité I', 'ampères (A)'), unit: 'A', answer: ii,
        html: '<p>Une résistance ' + m(Rq() + ' = ' + Ohm(r)) + ' dissipe une puissance ' + m(Pq() + ' = ' + W(P2)) + '.</p><p>Calcule l’intensité ' + m(Iq()) + ' du courant qui la traverse.</p>',
        traps: [{ value: P2 / r, msg: 'Tu as trouvé ' + m(Iq() + '^2') + ' : il reste à prendre la racine carrée.' },
          { value: Math.sqrt(P2 * r), msg: m(Iq() + '^2 = \\dfrac{' + Pq() + '}{' + Rq() + '}') + ' : on divise par ' + m(Rq()) + '.' },
          { value: Math.sqrt(r / P2), msg: 'C’est l’inverse : ' + m(Iq() + ' = \\sqrt{\\dfrac{' + Pq() + '}{' + Rq() + '}}') + '.' }],
        solution: steps([m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ', donc ' + m(Iq() + '^2 = \\dfrac{' + Pq() + '}{' + Rq() + '}') + ' et ' + m(Iq() + ' = \\sqrt{\\dfrac{' + Pq() + '}{' + Rq() + '}}') + '.',
          m(Iq() + ' = \\sqrt{\\dfrac{' + T(P2) + '}{' + T(r) + '}} \\approx ' + Amp(ii)) + '.'])
      };
    }

    /* ---- exercice 3 : loi des nœuds, loi des mailles, puissance de D₂ ---- */
    function circuit3() {
      var I1 = between(0.05, 0.5, 0.01), I2 = between(0.04, 0.5, 0.01) * neg(0.25), U = pick([12, 15, 19, 24, 30]);
      if (I1 + I2 < 0.03) I2 = -I2;
      var I3 = sig(I1 + I2, 6), U3 = between(Math.ceil(U * 0.3), Math.floor(U * 0.8), 1), U1 = U - U3, P2 = sig(U1 * I2, 6), md = mode('rec', P2);
      var target = pick(['I2', 'U1', 'P2', 'P2', 'mode']);
      var data = '<p class="measure">Données : ' + m(Iq(1) + ' = ' + Amp(I1)) + ', ' + m(Iq(3) + ' = ' + Amp(I3)) + ', ' + m(Uq() + ' = ' + V(U)) + ' et ' + m(Uq(3) + ' = ' + V(U3)) + '.</p>';
      var node = 'Loi des nœuds au nœud de droite : ' + m(Iq(1) + ' + ' + Iq(2) + ' = ' + Iq(3)) + ', donc ' + m(Iq(2) + ' = ' + Iq(3) + ' - ' + Iq(1) + ' = ' + T(I3) + ' - ' + T(I1) + ' = ' + Amp(I2)) + '.';
      var mesh = 'Loi des mailles dans la maille D₁, R₁, R₃ (sens horaire) : ' + m(Uq() + ' - ' + Uq(1) + ' - ' + Uq(3) + ' = 0') + ', donc ' + m(Uq(1) + ' = ' + Uq() + ' - ' + Uq(3) + ' = ' + T(U) + ' - ' + T(U3) + ' = ' + V(U1)) + '.';
      var pow = 'D₂ est fléché en convention récepteur (' + m(Uq(1)) + ' et ' + m(Iq(2)) + ' de sens opposés) : ' + m(Pq(2) + ' = ' + Uq(1) + ' \\times ' + Iq(2) + ' = ' + T(U1) + ' \\times ' + par(I2) + ' = ' + W(P2)) + '.';
      var html = '<p>Dans le montage de l’exercice 3 :</p>' + fig(FIG.ex3()) + data, o;
      if (target === 'mode') {
        return mcq({ type: 'Exercice 3 : fonctionnement de D₂', ref: 'c-methode', html: html + '<p>Le dipôle ' + m('\\mathrm{D_2}') + ' fonctionne :</p>', solution: steps([node, mesh, pow, 'Convention récepteur et ' + m(Pq(2) + (P2 > 0 ? ' > 0' : ' < 0')) + ', donc D₂ fonctionne ' + MODE[md] + '.']) },
          MODE[md], [{ html: MODE[md === 'gen' ? 'rec' : 'gen'], why: 'D₂ est en convention récepteur et ' + m(Pq(2) + ' = ' + W(P2)) + ' : une puissance ' + (P2 > 0 ? 'positive' : 'négative') + ' signifie qu’il ' + (md === 'rec' ? 'reçoit' : 'fournit') + ' de l’énergie.' }]);
      }
      if (target === 'I2') {
        o = { answer: I2, unit: 'A', what: Iq(2), ask: ask('l’intensité', 'ampères (A)', I2 < 0),
          traps: [{ value: I1 + I3, msg: m(Iq(3)) + ' <b>sort</b> du nœud de droite, ' + m(Iq(1)) + ' et ' + m(Iq(2)) + ' y entrent : ' + m(Iq(1) + ' + ' + Iq(2) + ' = ' + Iq(3)) + '.' },
            { value: I1 - I3, msg: 'Attention au signe : ' + m(Iq(2) + ' = ' + Iq(3) + ' - ' + Iq(1)) + '.' },
            { value: I3, msg: 'Le courant ' + m(Iq(3)) + ' se partage entre les deux branches : retire ' + m(Iq(1)) + '.' }],
          sol: [node] };
      } else if (target === 'U1') {
        o = { answer: U1, unit: 'V', what: Uq(1), ask: ask('la tension', 'volts (V)'),
          traps: [{ value: U + U3, msg: 'La tension ' + m(Uq()) + ' de D₁ se partage entre ' + m(Uq(1)) + ' et ' + m(Uq(3)) + ' : ' + m(Uq(1) + ' = ' + Uq() + ' - ' + Uq(3)) + '.' },
            { value: U3 - U, msg: 'Attention au signe : ' + m(Uq(1) + ' = ' + Uq() + ' - ' + Uq(3)) + ', positive ici.' },
            { value: U, msg: 'Les deux branches du haut et R₃ sont en série avec D₁ : retire ' + m(Uq(3)) + '.' }],
          sol: [mesh] };
      } else {
        o = { answer: P2, unit: 'W', what: Pq(2), ask: ask('la puissance', 'watts (W)', true),
          traps: [{ value: U * I2, msg: 'La tension aux bornes de D₂ est ' + m(Uq(1)) + ', pas ' + m(Uq()) + '.' },
            { value: U1 * I3, msg: 'D₂ est traversé par ' + m(Iq(2)) + ', pas par ' + m(Iq(3)) + '.' },
            { value: U1 * I1, msg: m(Iq(1)) + ' traverse R₁. Le courant de D₂ est ' + m(Iq(2)) + '.' },
            { value: -P2, msg: 'Garde le signe de ' + m(Iq(2)) + ' : ' + m(Pq(2) + ' = ' + Uq(1) + ' \\times ' + Iq(2)) + '.' }],
          sol: [node, mesh, pow] };
      }
      return {
        type: 'Exercice 3 : nœuds, mailles et puissance', ask: o.ask, unit: o.unit, answer: o.answer, traps: o.traps, ref: 'c-methode',
        html: html + '<p>Calcule ' + m(o.what) + '.</p>', solution: steps(o.sol)
      };
    }

    /* ---- exercice 4 : R₁ puis R₂ // R₃, puissance reçue par le dipôle AB ---- */
    function circuit4() {
      var R1 = pick([5, 10, 12, 15, 20]), R2 = pick([20, 40, 50, 60, 80, 100, 120]), R3 = rng() < 0.4 ? R2 : pick([20, 40, 50, 60, 80, 100, 120]);
      var U2 = pick([12, 18, 24, 30, 36, 48, 60]), I2 = U2 / R2, I3 = U2 / R3, I1 = I2 + I3, U1 = R1 * I1, U = U1 + U2, P = U * I1;
      var target = pick(['I2', 'I1', 'U1', 'U', 'P', 'P']);
      var data = '<p class="measure">Données : ' + m(Rq(1) + ' = ' + Ohm(R1)) + ', ' + m(Rq(2) + ' = ' + Ohm(R2)) + ', ' + m(Rq(3) + ' = ' + Ohm(R3)) + ' et ' + m(Uq(2) + ' = ' + V(U2)) + '.</p>';
      var s2 = 'Loi d’Ohm pour R₂ : ' + m(Iq(2) + ' = \\dfrac{' + Uq(2) + '}{' + Rq(2) + '} = \\dfrac{' + T(U2) + '}{' + T(R2) + '} = ' + Amp(I2)) + '.';
      var s3 = 'Loi d’Ohm pour R₃ (même tension ' + m(Uq(2)) + ', en dérivation) : ' + m(Iq(3) + ' = \\dfrac{' + T(U2) + '}{' + T(R3) + '} = ' + Amp(I3)) + '.';
      var s1 = 'Loi des nœuds : ' + m(Iq(1) + ' = ' + Iq(2) + ' + ' + Iq(3) + ' = ' + T(I2) + ' + ' + T(I3) + ' = ' + Amp(I1)) + '.';
      var su1 = 'Loi d’Ohm pour R₁ : ' + m(Uq(1) + ' = ' + Rq(1) + ' \\times ' + Iq(1) + ' = ' + T(R1) + ' \\times ' + T(I1) + ' = ' + V(U1)) + '.';
      var su = 'Loi des mailles : ' + m(Uq() + ' = ' + Uq(1) + ' + ' + Uq(2) + ' = ' + T(U1) + ' + ' + T(U2) + ' = ' + V(U)) + '.';
      var sp = 'Le dipôle AB est en convention récepteur (' + m(Uq()) + ' fléchée vers A, ' + m(Iq(1)) + ' entre par A) : ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq(1) + ' = ' + T(U) + ' \\times ' + T(I1) + ' = ' + W(P)) + '.';
      var o;
      if (target === 'I2') o = { answer: I2, unit: 'A', what: Iq(2), sol: [s2], traps: [{ value: R2 / U2, msg: 'Loi d’Ohm : ' + m(Iq(2) + ' = \\dfrac{' + Uq(2) + '}{' + Rq(2) + '}') + ', la tension au numérateur.' }, { value: U2 * R2, msg: m(Uq(2) + ' = ' + Rq(2) + ' \\times ' + Iq(2)) + ' donne ' + m(Iq(2) + ' = \\dfrac{' + Uq(2) + '}{' + Rq(2) + '}') + ' : on divise.' }, { value: U2 / R1, msg: 'R₂ est soumise à ' + m(Uq(2)) + ' : divise par ' + m(Rq(2)) + ', pas par ' + m(Rq(1)) + '.' }] };
      else if (target === 'I1') o = { answer: I1, unit: 'A', what: Iq(1), sol: [s2, s3, s1], traps: [{ value: I2, msg: 'Le courant ' + m(Iq(1)) + ' se partage entre R₂ et R₃ : ' + m(Iq(1) + ' = ' + Iq(2) + ' + ' + Iq(3)) + '.' }, { value: U2 / (R2 + R3), msg: 'R₂ et R₃ sont en <b>dérivation</b> : calcule le courant de chacune, puis ajoute-les.' }, { value: U2 / R1, msg: 'La tension de R₁ n’est pas ' + m(Uq(2)) + '. Passe par ' + m(Iq(2)) + ' et ' + m(Iq(3)) + '.' }] };
      else if (target === 'U1') o = { answer: U1, unit: 'V', what: Uq(1), sol: [s2, s3, s1, su1], traps: [{ value: R1 * I2, msg: 'R₁ est traversée par ' + m(Iq(1) + ' = ' + Iq(2) + ' + ' + Iq(3)) + ', pas seulement par ' + m(Iq(2)) + '.' }, { value: R1 / I1, msg: 'Loi d’Ohm : ' + m(Uq(1) + ' = ' + Rq(1) + ' \\times ' + Iq(1)) + ' : on multiplie.' }, { value: U2, msg: 'R₁ n’est pas en dérivation avec R₂ : sa tension n’est pas ' + m(Uq(2)) + '.' }] };
      else if (target === 'U') o = { answer: U, unit: 'V', what: Uq(), sol: [s2, s3, s1, su1, su], traps: [{ value: U2, msg: 'Il faut ajouter la tension ' + m(Uq(1)) + ' de R₁ : ' + m(Uq() + ' = ' + Uq(1) + ' + ' + Uq(2)) + '.' }, { value: U2 - U1, msg: 'Les flèches de ' + m(Uq(1)) + ' et de ' + m(Uq(2)) + ' sont dans le même sens : les tensions s’ajoutent.' }, { value: R1 * I2 + U2, msg: 'R₁ est traversée par ' + m(Iq(1)) + ', la somme des deux courants des branches.' }] };
      else o = { answer: P, unit: 'W', what: Pq(), sol: [s2, s3, s1, su1, su, sp], traps: [{ value: U * I2, msg: 'Le courant qui traverse le dipôle AB est ' + m(Iq(1)) + ', celui de la branche principale.' }, { value: U2 * I1, msg: 'La tension aux bornes du dipôle AB est ' + m(Uq() + ' = ' + Uq(1) + ' + ' + Uq(2)) + '.' }, { value: U1 * I1, msg: 'Ça, c’est la puissance de R₁ seule. Le dipôle AB comprend aussi R₂ et R₃.' }] };
      return {
        type: 'Exercice 4 : grandeurs du montage', ask: ask(o.unit === 'W' ? 'la puissance reçue par le dipôle AB' : 'le résultat', { A: 'ampères (A)', V: 'volts (V)', W: 'watts (W)' }[o.unit]), unit: o.unit, answer: o.answer, traps: o.traps, ref: 'c-methode',
        html: '<p>Dans le montage de l’exercice 4 :</p>' + fig(FIG.ex4()) + data + '<p>Calcule ' + (o.unit === 'W' ? 'la puissance ' + m(Pq()) + ' reçue par le dipôle AB' : m(o.what)) + '.</p>',
        solution: steps(o.sol)
      };
    }

    /* ---- exercice 5 (type DS) : G, R₁, D₂ et D₃ ---- */
    function circuit5() {
      var U = pick([6, 9, 12, 12, 24]), R1 = pick([5, 10, 10, 20]), I1, U1, tries = 0;
      do { I1 = between(0.1, 0.5, 0.05); U1 = sig(R1 * I1, 6); } while (U1 > U * 0.6 && ++tries < 50);
      if (U1 > U * 0.6) { R1 = 10; I1 = 0.3; U1 = 3; U = 12; }
      // |I₃| ≤ I₁ / 2 : I₂ = I₁ + I₃ reste positive (D₂ en récepteur, comme dans la fiche)
      var U2 = sig(U - U1, 6), I3 = between(0.01, Math.min(0.1, I1 / 2), 0.01) * neg(0.75), P3 = sig(U2 * I3, 6), I2 = sig(I1 + I3, 6), P2 = sig(U2 * I2, 6);
      var target = pick(['U2', 'I3', 'I1', 'I2', 'P2', 'D3', 'D2']);
      var data = '<p class="measure">Mesures : ' + m(Uq() + ' = ' + V(U)) + ', ' + m(Uq(1) + ' = ' + V(U1)) + ', ' + m(Rq(1) + ' = ' + Ohm(R1)) + ' ; la puissance de D₃ vaut ' + m(Pq(3) + ' = ' + W(P3, 6)) + '.</p>';
      var mesh = 'Loi des mailles dans la maille G, R₁, D₂ : ' + m(Uq() + ' - ' + Uq(1) + ' - ' + Uq(2) + ' = 0') + ', donc ' + m(Uq(2) + ' = ' + T(U) + ' - ' + T(U1) + ' = ' + V(U2)) + '. D₃ est en dérivation avec D₂ : ' + m(Uq(3) + ' = ' + Uq(2)) + '.';
      var s3 = 'D₃ est en convention générateur : ' + m(Pq(3) + ' = ' + Uq(3) + ' \\times ' + Iq(3)) + ', donc ' + m(Iq(3) + ' = \\dfrac{' + Pq(3) + '}{' + Uq(3) + '} = \\dfrac{' + T(P3, 6) + '}{' + T(U2, 6) + '} = ' + Amp(I3)) + '.';
      var s1 = 'Loi d’Ohm pour R₁ : ' + m(Iq(1) + ' = \\dfrac{' + Uq(1) + '}{' + Rq(1) + '} = \\dfrac{' + T(U1) + '}{' + T(R1) + '} = ' + Amp(I1)) + '.';
      var s2 = 'Loi des nœuds au nœud du haut (' + m(Iq(1)) + ' et ' + m(Iq(3)) + ' entrent, ' + m(Iq(2)) + ' sort) : ' + m(Iq(2) + ' = ' + Iq(1) + ' + ' + Iq(3) + ' = ' + T(I1) + ' + ' + par(I3) + ' = ' + Amp(I2)) + '.';
      var sp = 'D₂ est en convention récepteur (' + m(Uq(2)) + ' vers le haut, ' + m(Iq(2)) + ' vers le bas) : ' + m(Pq(2) + ' = ' + Uq(2) + ' \\times ' + Iq(2) + ' = ' + T(U2) + ' \\times ' + par(I2) + ' = ' + W(P2)) + '.';
      var html = '<p>Dans le montage de l’exercice 5 :</p>' + fig(FIG.ex5()) + data;
      if (target === 'D3' || target === 'D2') {
        var d3 = target === 'D3', md = d3 ? mode('gen', P3) : mode('rec', P2);
        return mcq({
          type: 'Exercice 5 : fonctionnement de ' + (d3 ? 'D₃' : 'D₂'), ref: 'c-methode',
          html: html + '<p>Le dipôle ' + m(d3 ? '\\mathrm{D_3}' : '\\mathrm{D_2}') + ' fonctionne :</p>',
          solution: d3 ? steps(['D₃ : ' + m(Uq(3)) + ' et ' + m(Iq(3)) + ' sont fléchées dans le même sens (vers le haut) : convention générateur.', 'Convention générateur et ' + m(Pq(3) + (P3 > 0 ? ' > 0' : ' < 0')) + ', donc D₃ fonctionne ' + MODE[md] + '.'])
            : steps([mesh, s3, s1, s2, sp, 'Convention récepteur et ' + m(Pq(2) + (P2 > 0 ? ' > 0' : ' < 0')) + ', donc D₂ fonctionne ' + MODE[md] + '.'])
        }, MODE[md], [{ html: MODE[md === 'gen' ? 'rec' : 'gen'], why: d3 ? 'D₃ est fléché en convention générateur (flèches dans le même sens). Avec cette convention, ' + m(Pq(3) + (P3 > 0 ? ' > 0' : ' < 0')) + ' signifie que D₃ ' + (md === 'gen' ? 'fournit' : 'reçoit') + ' de l’énergie.' : 'D₂ est en convention récepteur et ' + m(Pq(2) + ' = ' + W(P2)) + ' : il ' + (md === 'rec' ? 'reçoit' : 'fournit') + ' de l’énergie.' }]);
      }
      var o;
      if (target === 'U2') o = { answer: U2, unit: 'V', what: Uq(2), sol: [mesh], traps: [{ value: U + U1, msg: 'La tension ' + m(Uq()) + ' du générateur se partage entre R₁ et D₂ : ' + m(Uq(2) + ' = ' + Uq() + ' - ' + Uq(1)) + '.' }, { value: U1 - U, msg: 'Attention au signe : ' + m(Uq(2) + ' = ' + Uq() + ' - ' + Uq(1)) + ', positive ici.' }, { value: U, msg: 'R₁ est en série avec D₂ : retire ' + m(Uq(1)) + '.' }] };
      else if (target === 'I3') o = { answer: I3, unit: 'A', what: Iq(3), signed: true, sol: [mesh, s3], traps: [{ value: P3 / U, msg: 'La tension aux bornes de D₃ est ' + m(Uq(3) + ' = ' + Uq(2)) + ', pas ' + m(Uq()) + '.' }, { value: U2 / P3, msg: 'C’est l’inverse : ' + m(Iq(3) + ' = \\dfrac{' + Pq(3) + '}{' + Uq(3) + '}') + '.' }, { value: P3 * U2, msg: m(Pq(3) + ' = ' + Uq(3) + ' \\times ' + Iq(3)) + ' donne ' + m(Iq(3) + ' = \\dfrac{' + Pq(3) + '}{' + Uq(3) + '}') + ' : on divise.' }, { value: -I3, msg: 'Garde le signe de ' + m(Pq(3)) + ' : ' + m(Iq(3)) + ' a le même signe.' }] };
      else if (target === 'I1') o = { answer: I1, unit: 'A', what: Iq(1), sol: [s1], traps: [{ value: R1 / U1, msg: 'Loi d’Ohm : ' + m(Iq(1) + ' = \\dfrac{' + Uq(1) + '}{' + Rq(1) + '}') + ', la tension au numérateur.' }, { value: U / R1, msg: 'La tension aux bornes de R₁ est ' + m(Uq(1)) + ', pas ' + m(Uq()) + '.' }, { value: U1 * R1, msg: m(Uq(1) + ' = ' + Rq(1) + ' \\times ' + Iq(1)) + ' donne ' + m(Iq(1) + ' = \\dfrac{' + Uq(1) + '}{' + Rq(1) + '}') + ' : on divise.' }] };
      else if (target === 'I2') o = { answer: I2, unit: 'A', what: Iq(2), sol: [mesh, s3, s1, s2], traps: [{ value: I1 - I3, msg: m(Iq(1)) + ' et ' + m(Iq(3)) + ' <b>entrent</b> tous les deux dans le nœud : ' + m(Iq(2) + ' = ' + Iq(1) + ' + ' + Iq(3)) + ', avec le signe de ' + m(Iq(3)) + '.' }, { value: I1, msg: 'N’oublie pas le courant ' + m(Iq(3)) + ' qui arrive de D₃.' }] };
      else o = { answer: P2, unit: 'W', what: Pq(2), signed: true, sol: [mesh, s3, s1, s2, sp], traps: [{ value: U * I2, msg: 'La tension aux bornes de D₂ est ' + m(Uq(2)) + ', pas ' + m(Uq()) + '.' }, { value: U2 * I1, msg: 'D₂ est traversé par ' + m(Iq(2)) + ', pas par ' + m(Iq(1)) + '.' }, { value: U2 * (I1 - I3), msg: 'Au nœud, ' + m(Iq(2) + ' = ' + Iq(1) + ' + ' + Iq(3)) + ' (avec le signe de ' + m(Iq(3)) + ').' }] };
      return {
        type: 'Exercice 5 : grandeurs du montage', ask: ask('le résultat', { A: 'ampères (A)', V: 'volts (V)', W: 'watts (W)' }[o.unit], o.signed || o.answer < 0), unit: o.unit, answer: o.answer, traps: o.traps, ref: 'c-methode',
        html: html + '<p>Calcule ' + m(o.what) + '.</p>', solution: steps(o.sol)
      };
    }

    /* ---- vocabulaire et énoncés du cours ---- */
    var CONCEPTS = [
      function () { return mcq({ type: 'Unités', ref: 'c-continu', html: '<p>La puissance électrique s’exprime en :</p>', solution: '<p>En <b>watts</b> (W) : ' + m(Pq() + ' = ' + Uq() + ' \\times ' + Iq()) + ', avec ' + m(Uq()) + ' en volts et ' + m(Iq()) + ' en ampères.</p>' },
        'watts (W)', [{ html: 'joules (J)', why: 'Le joule est l’unité de l’<b>énergie</b> : ' + m(Eq + ' = ' + Pq() + ' \\times ' + tq) + '.' }, { html: 'volts (V)', why: 'Le volt est l’unité de la <b>tension</b>.' }, { html: 'kilowattheures (kWh)', why: 'Le kilowattheure est une unité d’<b>énergie</b> (celle des factures d’électricité).' }]); },
      function () { return mcq({ type: 'Le kilowattheure', ref: 'c-energie', html: '<p>Le kilowattheure (kWh) est une unité :</p>', solution: '<p>D’<b>énergie</b> : c’est l’énergie reçue en 1 h par un appareil de 1 kW. ' + m('1\\ \\mathrm{kWh} = 3{,}6 \\times 10^{6}\\ \\mathrm{J}') + '.</p>' },
        'd’énergie', [{ html: 'de puissance', why: 'L’unité de puissance est le watt (ou le kilowatt). Le kilowattheure, c’est une puissance multipliée par une durée : une énergie.' }, { html: 'de durée', why: 'Le kWh est le produit d’une puissance (kW) par une durée (h) : c’est une énergie.' }]); },
      function () { return mcq({ type: 'Effet Joule', ref: 'c-joule', html: '<p>L’énergie électrique reçue par une résistance est convertie :</p>', solution: '<p>Entièrement en <b>chaleur</b> (énergie thermique) : c’est l’<b>effet Joule</b>.</p>' },
        'en chaleur : c’est l’effet Joule', [{ html: 'en énergie chimique', why: 'C’est le cas d’une batterie en charge. Une résistance ne fait que chauffer.' }, { html: 'en énergie mécanique', why: 'C’est le rôle d’un moteur. Une résistance convertit tout en chaleur.' }]); },
      function () { return mcq({ type: 'Dipôle passif', ref: 'c-passif', html: '<p>Un dipôle est passif si :</p>', solution: '<p>Sa caractéristique ' + m(Uq() + ' = f(' + Iq() + ')') + ' <b>passe par l’origine</b> : sans courant, il n’y a pas de tension à ses bornes.</p>' },
        'sa caractéristique U = f(I) passe par l’origine', [{ html: 'il fournit de l’énergie au circuit', why: 'Un dipôle qui fournit de l’énergie fonctionne en générateur. Passif veut dire : pas de tension à ses bornes quand il n’y a pas de courant.' }, { html: 'sa résistance est nulle', why: 'Une résistance est un dipôle passif, et elle n’est pas nulle. Passif : la caractéristique passe par l’origine.' }]); },
      function () { return mcq({ type: 'Facteur de puissance', ref: 'c-sinus', html: '<p>Pour un conducteur ohmique en régime sinusoïdal, le facteur de puissance ' + m(kq) + ' vaut :</p>', solution: '<p>' + m(kq + ' = 1') + ', donc ' + m(Pq() + ' = ' + Ue + ' \\times ' + Ie) + '.</p>' },
        m(kq + ' = 1'), [{ html: m(kq + ' = 0{,}8'), why: 'C’est une valeur typique pour un <b>moteur</b> (entre 0,75 et 0,95). Pour un conducteur ohmique, ' + m(kq + ' = 1') + '.' }, { html: m(kq + ' = 0'), why: 'Avec ' + m(kq + ' = 0') + ', la puissance moyenne serait nulle : le conducteur ohmique ne chaufferait pas.' }]); },
      function () { return mcq({ type: 'Facteur de puissance d’un moteur', ref: 'c-sinus', html: '<p>Pour un moteur, le facteur de puissance ' + m(kq) + ' est :</p>', solution: '<p>Compris entre <b>0,75 et 0,95</b> : la puissance moyenne ' + m(Pq() + ' = ' + kq + ' \\times ' + Ue + ' \\times ' + Ie) + ' est un peu plus petite que ' + m(Ue + ' \\times ' + Ie) + '.</p>' },
        'compris entre 0,75 et 0,95', [{ html: 'égal à 1', why: 'C’est le cas d’un <b>conducteur ohmique</b>. Pour un moteur, ' + m(kq) + ' est compris entre 0,75 et 0,95.' }, { html: 'plus grand que 1', why: 'Le facteur de puissance ne dépasse jamais 1 : ' + m(Pq()) + ' est au plus égale à ' + m(Ue + ' \\times ' + Ie) + '.' }]); },
      function () { return mcq({ type: 'Puissance instantanée', ref: 'c-instantanee', html: '<p>En régime variable, la puissance instantanée reçue par un dipôle vaut :</p>', solution: '<p>' + m('\\Qpt = \\Qut \\times \\Qit') + ' : le produit de la tension et de l’intensité <b>au même instant</b>.</p>' },
        m('\\Qpt = \\Qut \\times \\Qit'), [{ html: m('\\Qpt = \\Qut + \\Qit'), why: 'Une puissance est un <b>produit</b> tension × intensité, jamais une somme.' }, { html: m('\\Qpt = ' + Ue + ' \\times ' + Ie), why: m(Ue + ' \\times ' + Ie) + ' ne dépend pas du temps : ce n’est pas une valeur instantanée.' }]); },
      function () { return mcq({ type: 'Puissance moyenne', ref: 'c-moyenne', html: '<p>La puissance moyenne ' + m('\\Qpm') + ' est :</p>', solution: '<p>La valeur moyenne du <b>produit</b> ' + m('\\Qut \\times \\Qit') + ' : ' + m('\\Qpm = \\langle \\Qut \\times \\Qit \\rangle') + '.</p>' },
        'la valeur moyenne du produit u(t) × i(t)', [{ html: 'le produit des valeurs moyennes ⟨u⟩ × ⟨i⟩', why: 'Pour une tension alternative, ' + m('\\langle u\\rangle = 0') + ' : on trouverait toujours 0 W, alors qu’un radiateur chauffe. On fait la moyenne du produit.' }, { html: 'la plus grande valeur de p(t)', why: 'La plus grande valeur, c’est la puissance maximale. La puissance moyenne est la valeur moyenne de ' + m('\\Qpt') + ' sur une période.' }]); },
      function () { return mcq({ type: 'Dipôle réversible', ref: 'c-roles', html: '<p>Un accumulateur (une batterie) est un dipôle :</p>', solution: '<p><b>Réversible</b> : récepteur quand on le charge, générateur quand il alimente un appareil.</p>' },
        'qui peut fonctionner en générateur ou en récepteur', [{ html: 'qui fonctionne toujours en générateur', why: 'Pendant la charge, la batterie <b>reçoit</b> de l’énergie : elle fonctionne en récepteur.' }, { html: 'qui fonctionne toujours en récepteur', why: 'Quand elle alimente un appareil, la batterie <b>fournit</b> de l’énergie : elle fonctionne en générateur.' }]); },
      function () { return mcq({ type: 'Générateurs et récepteurs', ref: 'c-roles', html: '<p>Parmi ces dipôles, lequel est un générateur ?</p>', solution: '<p>La <b>cellule photovoltaïque</b> fournit de l’énergie électrique. La résistance et la lampe en reçoivent : ce sont des récepteurs.</p>' },
        'une cellule photovoltaïque', [{ html: 'une résistance', why: 'Une résistance reçoit de l’énergie électrique et la convertit en chaleur : c’est un récepteur.' }, { html: 'une lampe', why: 'Une lampe reçoit de l’énergie électrique : c’est un récepteur.' }]); },
      function () { return mcq({ type: 'Effet Joule', ref: 'c-joule', html: '<p>L’intensité du courant qui traverse une résistance double. La puissance qu’elle reçoit est :</p>', solution: '<p>' + m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' : si ' + m(Iq()) + ' double, ' + m(Iq() + '^2') + ' est multiplié par ' + m('2^2 = 4') + '.</p>' },
        'multipliée par 4', [{ html: 'multipliée par 2', why: 'L’intensité est <b>au carré</b> dans ' + m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' : ' + m('2^2 = 4') + '.' }, { html: 'inchangée', why: 'La résistance ne change pas, mais ' + m(Pq() + ' = ' + Rq() + ' \\times ' + Iq() + '^2') + ' augmente avec l’intensité.' }]); }
    ];
    function concept() { return pick(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = { convention: convention, fonctionnement: fonctionnement, puissance: puissance, inverse: inverse, sinus: sinus, energie: energie, joule: joule, circuit3: circuit3, circuit4: circuit4, circuit5: circuit5, concept: concept };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = { convention: 'c-conventions', fonctionnement: 'c-methode', puissance: 'c-continu', inverse: 'c-continu', sinus: 'c-sinus', energie: 'c-energie', joule: 'c-joule', circuit3: 'c-methode', circuit4: 'c-methode', circuit5: 'c-methode', concept: 'c-continu' };
    /**
     * Type, carte du cours à revoir, et pièges exploitables : une erreur fréquente à moins de 3 % de la
     * bonne réponse se confondrait avec un simple arrondi, on ne la signale pas.
     */
    function tag(kind, o) {
      o.kind = kind; o.ref = o.ref || REF[kind];
      if (o.traps) {
        var seen = [];
        o.traps = o.traps.filter(function (t) {
          if (!isFinite(t.value) || Math.abs(t.value - o.answer) <= 0.03 * Math.abs(o.answer) + (o.tol || 0)) return false;
          // deux pièges de même valeur : seul le premier est gardé (son explication est la plus précise)
          if (seen.some(function (v) { return Math.abs(v - t.value) <= 0.015 * Math.abs(v) + 1e-12; })) return false;
          seen.push(t.value);
          return true;
        });
      }
      return o;
    }
    var KINDS = {};
    Object.keys(RAW).forEach(function (k) { KINDS[k] = function () { return tag(k, RAW[k]()); }; });
    var WEIGHTS = { convention: 2, fonctionnement: 3, puissance: 2, inverse: 2, sinus: 3, energie: 3, joule: 3, circuit3: 2, circuit4: 2, circuit5: 3, concept: 2 };
    var last = null;
    function training() {
      var keys = Object.keys(WEIGHTS).filter(function (k) { return k !== last; });
      var total = keys.reduce(function (s, k) { return s + WEIGHTS[k]; }, 0), r = rng() * total, choice = keys[0];
      for (var i = 0; i < keys.length; i++) { r -= WEIGHTS[keys[i]]; if (r < 0) { choice = keys[i]; break; } }
      last = choice;
      return KINDS[choice]();
    }
    /** Copie d'évaluation : 8 questions, 20 points. */
    function exam() {
      function pts(kind, p) { var o = KINDS[kind](); o.points = p; return o; }
      return [
        pts(pick(['convention', 'concept']), 2), pts('fonctionnement', 2), pts(pick(['puissance', 'inverse']), 2), pts('sinus', 3),
        pts('energie', 2), pts('joule', 3), pts(pick(['circuit3', 'circuit4']), 3), pts('circuit5', 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return { make: make, EXAM_QUESTIONS: 8, FIG: FIG, PHYS: PHYS };
});
