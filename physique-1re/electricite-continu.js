/* ==========================================================================
   Chapitre 5 — Électricité en régime continu : schémas électriques et banque de
   questions paramétrées.
   Inspirée de la fiche « Lois des mailles et lois des nœuds » (exercice 1 : mailles
   ABCDA et ADEA ; exercice 2 : montage en dérivation et ampèremètres ; exercice 3 :
   nœud C et mailles ABCFA, CDEFC, ABDEA ; exercice 4 : calculs de résistances avec
   la loi d'Ohm) et du cours (fléchage des tensions, convention générateur et
   récepteur, loi des mailles, nœud, loi des nœuds).

   Les schémas sont dessinés en SVG par circuit() et les fonctions FIG : les mêmes
   pour le cours, les exemples, les graphiques à manipuler et les questions.
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
     Schémas électriques (SVG). Fils horizontaux ou verticaux ; chaque dipôle
     coupe son fil. Couleurs : tension d'un récepteur (orange), tension du
     générateur (bleu), intensité (vert), via la variable CSS --c de chaque flèche.
     ===================================================================== */
  var DIM = { R: 44, L: 28, G: 36, A: 26, V: 26 }; // longueur de chaque dipôle le long de son fil
  function r1(x) { return String(Math.round(x * 10) / 10); }
  function xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** « U_AB = 2 V » : symbole en italique, indice abaissé ; « E = 5 V », « I » : symbole en italique. */
  function rich(s) {
    var m = /^([A-Za-z])_([A-Za-z0-9]+)(.*)$/.exec(s);
    if (m) return '<tspan class="q">' + m[1] + '</tspan><tspan class="sub" dx="1" dy="4">' + m[2] + '</tspan>' + (m[3] ? '<tspan dy="-4">' + xml(m[3]) + '</tspan>' : '');
    m = /^([UIRE])((?:\s.*)?)$/.exec(s);
    if (m) return '<tspan class="q">' + m[1] + '</tspan>' + xml(m[2]);
    return xml(s);
  }
  /** Texte d'une ou plusieurs lignes (séparées par \n) ; la première ligne peut porter un symbole et un indice. */
  function text(x, y, s, anchor, cls, plain) {
    var lines = String(s).split('\n'), y0 = y - (lines.length - 1) * 8.5;
    var body = (plain ? xml(lines[0]) : rich(lines[0])) + lines.slice(1).map(function (l) { return '<tspan x="' + r1(x) + '" y="' + r1(y0 + 17) + '">' + xml(l) + '</tspan>'; }).join('');
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
   * p : { t: 'R' | 'L' | 'G' | 'A' | 'V', name, at: côté du nom (l, r, a, b, in),
   *       plus: borne + du générateur (a, b, l, r), com: borne COM d'un appareil de mesure (a, b, l, r) }
   */
  function dipole(p, cx, cy, horiz) {
    var t = p.t, L = DIM[t], s = '', r = L / 2;
    if (t === 'R') {
      var w = horiz ? L : 16, h = horiz ? 16 : L;
      s += '<rect class="cp" x="' + r1(cx - w / 2) + '" y="' + r1(cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="2"/>';
    } else {
      s += '<circle class="cp" cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r + '"/>';
      if (t === 'L') {
        var k = r * 0.7071;
        s += '<path class="cp" d="M' + r1(cx - k) + ' ' + r1(cy - k) + 'L' + r1(cx + k) + ' ' + r1(cy + k) + 'M' + r1(cx - k) + ' ' + r1(cy + k) + 'L' + r1(cx + k) + ' ' + r1(cy - k) + '"/>';
      } else s += text(cx, cy + 5, t === 'G' ? 'G' : t + (p.idx ? '_' + p.idx : ''), 'middle', 'sym');
    }
    if (p.name) {
      if (p.at === 'in') s += text(cx, cy + 4.5, p.name, 'middle', 'nm in');
      else s += side(cx, cy, p.at || (horiz ? 'a' : 'r'), (t === 'R' ? (horiz ? 8 : 8) : r) + 6, p.name, 'nm');
    }
    if (p.plus) { // bornes + et − du générateur, du côté opposé à la flèche de tension
      var plusEnd = { a: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] }[p.plus], nx = horiz ? 0 : 1, ny = horiz ? -1 : 0;
      s += text(cx + plusEnd[0] * (r + 7) + nx * 12, cy + plusEnd[1] * (r + 4) + ny * 10 + 5, '+', 'middle', 'pm', true);
      s += text(cx - plusEnd[0] * (r + 7) + nx * 12, cy - plusEnd[1] * (r + 9) + ny * 10 + 5, '−', 'middle', 'pm', true);
    }
    if (p.com) { // l'appareil de mesure : le courant entre par mA (ou V) et sort par COM
      var e = { a: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] }[p.com], ox = horiz ? 0 : 1, oy = horiz ? -1 : 0, inLab = t === 'A' ? 'mA' : 'V';
      s += text(cx + e[0] * (r + 9) + ox * 16, cy + e[1] * (r + 9) + oy * 12 + 4, 'COM', 'middle', 'term', true);
      s += text(cx - e[0] * (r + 9) + ox * 16, cy - e[1] * (r + 9) + oy * 12 + 4, inLab, 'middle', 'term', true);
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
  /** Flèche de (x1, y1) vers (x2, y2), couleur de la grandeur col (u, gen, I, I1, I2). */
  function arrow(x1, y1, x2, y2, s, col, where, wrap) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, hl = 9, hw = 4.6;
    var bx = x2 - ux * hl, by = y2 - uy * hl;
    var out = '<g class="arr" style="--c: var(--q-' + col + ')"><path d="M' + r1(x1) + ' ' + r1(y1) + 'L' + r1(bx) + ' ' + r1(by) + '"/>' +
      '<path class="hd" d="M' + r1(x2) + ' ' + r1(y2) + 'L' + r1(bx - uy * hw) + ' ' + r1(by + ux * hw) + 'L' + r1(bx + uy * hw) + ' ' + r1(by - ux * hw) + 'Z"/>';
    // wrap : longueur au-delà de laquelle l'étiquette passe sur deux lignes (true = 9 caractères)
    if (s && wrap !== undefined && wrap !== false && s.length > (wrap === true ? 9 : wrap) && s.indexOf(' = ') > 0) s = s.replace(' = ', ' =\n');
    if (s) out += side((x1 + x2) / 2, (y1 + y2) / 2, where || (Math.abs(dx) > Math.abs(dy) ? 'b' : 'r'), 8, s, 'lab');
    return out + '</g>';
  }
  /**
   * Flèche de tension le long d'un dipôle centré en (cx, cy) : du côté where (l, r, a, b),
   * pointe vers head (a : vers le haut, b : vers le bas, l : vers la gauche, r : vers la droite).
   */
  function uArrow(t, cx, cy, where, head, s, gen, wrap) {
    var off = (t === 'R' ? 8 : DIM[t] / 2) + 12, half = DIM[t] / 2 + 6, col = gen ? 'gen' : 'u';
    if (where === 'l' || where === 'r') {
      var x = cx + (where === 'l' ? -off : off), up = head === 'a';
      return arrow(x, cy + (up ? half : -half), x, cy + (up ? -half : half), s, col, where, wrap);
    }
    var y = cy + (where === 'a' ? -off : off), right = head === 'r';
    return arrow(cx + (right ? -half : half), y, cx + (right ? half : -half), y, s, col, where);
  }
  /** Flèche d'intensité sur un fil, au point (x, y), dans la direction dir (r, l, a, b). */
  function iArrow(x, y, dir, s, where, col) {
    var v = { r: [1, 0], l: [-1, 0], b: [0, 1], a: [0, -1] }[dir], ux = v[0], uy = v[1], a = 6, w = 5.2;
    var d = 'M' + r1(x + ux * a) + ' ' + r1(y + uy * a) + 'L' + r1(x - ux * a - uy * w) + ' ' + r1(y - uy * a + ux * w) + 'L' + r1(x - ux * a + uy * w) + ' ' + r1(y - uy * a - ux * w) + 'Z';
    return '<g class="arr cur" style="--c: var(--q-' + (col || 'I') + ')"><path class="hd" d="' + d + '"/>' +
      (s ? side(x, y, where || (ux ? 'a' : 'r'), 10, s, 'lab') : '') + '</g>';
  }
  /** Sens de parcours d'une maille : flèche circulaire (sens horaire) et signe +. */
  function rot(cx, cy, r) {
    var a0 = 125 * Math.PI / 180, a1 = a0 + 290 * Math.PI / 180;
    function P(a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var p0 = P(a0), pe = P(a1 - 0.3), tip = P(a1), tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
    var tp = [tip[0] + tx * 3, tip[1] + ty * 3], b = [tip[0] - tx * 6, tip[1] - ty * 6];
    return '<g class="rot"><path d="M' + r1(p0[0]) + ' ' + r1(p0[1]) + 'A' + r + ' ' + r + ' 0 1 1 ' + r1(pe[0]) + ' ' + r1(pe[1]) + '"/>' +
      '<path class="hd" d="M' + r1(tp[0]) + ' ' + r1(tp[1]) + 'L' + r1(b[0] + nx * 4.5) + ' ' + r1(b[1] + ny * 4.5) + 'L' + r1(b[0] - nx * 4.5) + ' ' + r1(b[1] - ny * 4.5) + 'Z"/>' +
      text(cx, cy + 6, '+', 'middle', 'pm', true) + '</g>';
  }
  /** Schéma complet ; x0 recadre à gauche quand le dessin y laisse de la place (texte plus grand sur téléphone). */
  function svg(w, h, label, body, x0) {
    return '<svg class="fig circuit" viewBox="' + (x0 || 0) + ' 0 ' + w + ' ' + h + '" role="img" aria-label="' + xml(label) + '">' + body + '</svg>';
  }

  /* ---------- les schémas du chapitre ---------- */
  var FIG = {};
  /**
   * Circuit série : générateur à gauche (+ en haut), 2 ou 3 dipôles en haut et à droite, appareils sur le fil du bas.
   * o : { recs: [{ t, name, u }], E: étiquette de la tension du générateur, i: étiquette du courant, rot, bottom: [{ t: 'A', idx }] }
   */
  FIG.loop = function (o) {
    var X0 = 110, X1 = 290, Y0 = 50, Y1 = 180, Ym = 115, recs = o.recs, n = recs.length;
    var top = n === 3 ? recs.slice(0, 2) : recs.slice(0, 1), right = recs[n - 1], tx = top.length === 2 ? [158, 242] : [200];
    var s = branch(X0, Y0, X0, Y1, [{ t: 'G', c: Ym, plus: 'a' }]);
    s += branch(X0, Y0, X1, Y0, top.map(function (p, k) { return { t: p.t, c: tx[k], name: p.name, at: p.t === 'R' ? 'in' : 'b', idx: p.idx }; }));
    s += branch(X1, Y0, X1, Y1, [{ t: right.t, c: Ym, name: right.name, at: 'l', idx: right.idx }]);
    var bottom = o.bottom || [];
    s += branch(X0, Y1, X1, Y1, bottom.map(function (p) { return { t: p.t, c: 230, idx: p.idx }; }));
    if (o.E) s += uArrow('G', X0, Ym, 'l', 'a', o.E, true);
    top.forEach(function (p, k) { if (p.u && p.t !== 'A') s += uArrow(p.t, tx[k], Y0, 'a', 'l', p.u); });
    if (right.u && right.t !== 'A') s += uArrow(right.t, X1, Ym, 'r', 'a', right.u, false, true);
    if (o.i) s += iArrow(bottom.length ? 165 : 200, Y1, 'l', o.i, 'b');
    if (o.rot) s += rot(200, Ym, 17);
    return svg(400, 215, o.label || 'Circuit série : un générateur et des récepteurs dans une seule boucle', s);
  };
  /**
   * Deux branches en dérivation aux bornes du générateur.
   * o : { t: 'R' | 'L', names: [n1, n2], E, u: [u1, u2], i, i1, i2, colors: true pour I₁ et I₂ dans la couleur de leur branche, nodes }
   */
  FIG.parallel = function (o) {
    var X0 = 110, X1 = 230, X2 = 365, Y0 = 40, Y1 = 200, Ym = 120, t = o.t || 'R', u = o.u || [];
    var s = branch(X0, Y0, X0, Y1, [{ t: 'G', c: Ym, plus: 'a' }]);
    s += path([[X0, Y0], [X2, Y0]]) + path([[X0, Y1], [X2, Y1]]);
    s += branch(X1, Y0, X1, Y1, [{ t: t, c: Ym, name: o.names[0], at: 'l' }]);
    s += branch(X2, Y0, X2, Y1, [{ t: t, c: Ym, name: o.names[1], at: 'l' }]);
    s += dot(X1, Y0) + dot(X1, Y1);
    if (o.nodes) s += pt(X1, Y0, o.nodes[0], 'a') + pt(X1, Y1, o.nodes[1], 'b');
    if (o.E) s += uArrow('G', X0, Ym, 'l', 'a', o.E, true, true);
    if (u[0]) s += uArrow(t, X1, Ym, 'r', 'a', u[0], false, 0);
    if (u[1]) s += uArrow(t, X2, Ym, 'r', 'a', u[1], false, 0);
    if (o.i) s += iArrow(170, Y0, 'r', o.i, 'a');
    if (o.i1) s += iArrow(X1, 72, 'b', o.i1, 'l', o.colors ? 'I1' : 'I');
    if (o.i2) s += iArrow(X2, 72, 'b', o.i2, 'l', o.colors ? 'I2' : 'I');
    return svg(455, 228, o.label || 'Deux dipôles branchés en dérivation aux bornes d’un générateur', s);
  };
  /** Nœud : 4 fils (gauche, haut, droite, bas) ; w = { l, a, r, b } → { into: true si le courant entre, s: étiquette }. */
  FIG.star = function (w, label) {
    var cx = 200, cy = 105, s = '';
    var ends = { l: [50, cy], a: [cx, 18], r: [350, cy], b: [cx, 192] };
    Object.keys(ends).forEach(function (k) {
      if (!w[k]) return;
      var e = ends[k], mx = (e[0] + cx) / 2, my = (e[1] + cy) / 2, out = { l: 'l', a: 'a', r: 'r', b: 'b' }[k], inn = { l: 'r', a: 'b', r: 'l', b: 'a' }[k];
      s += path([e, [cx, cy]]);
      s += iArrow(mx, my, w[k].into ? inn : out, w[k].s, k === 'l' || k === 'r' ? 'a' : 'r');
    });
    return svg(400, 210, label || 'Un nœud où se rejoignent quatre fils', s + dot(cx, cy) + text(cx + 9, cy - 9, 'N', 'start', 'pt', true));
  };
  /** Convention générateur et convention récepteur, côte à côte. */
  FIG.conventions = function () {
    var s = branch(20, 60, 180, 60, [{ t: 'G', c: 100, plus: 'r' }]);
    s += iArrow(150, 60, 'r', 'I', 'a') + uArrow('G', 100, 60, 'b', 'r', 'U', true);
    s += text(100, 140, 'générateur', 'middle', 'cap', true);
    s += branch(220, 60, 380, 60, [{ t: 'R', c: 300 }]) + dot(240, 60) + dot(360, 60) + pt(240, 60, 'A', 'a') + pt(360, 60, 'B', 'a');
    s += iArrow(259, 60, 'r', 'I', 'a') + uArrow('R', 300, 60, 'b', 'l', 'U_AB');
    s += text(300, 140, 'récepteur', 'middle', 'cap', true);
    return svg(400, 150, 'À gauche, un générateur : la flèche de tension U est dans le même sens que le courant I. À droite, un récepteur entre A et B : la flèche de la tension U_AB pointe vers A, dans le sens opposé au courant I.', s);
  };
  /** Exemple du cours : un générateur, deux lampes et une résistance en série ; maille orientée. */
  FIG.coursMaille = function (o) {
    o = o || {};
    var X0 = 90, X1 = 310, Y0 = 50, Y1 = 200, Ym = 125, s = '';
    s += branch(X0, Y0, X0, Y1, [{ t: 'L', c: Ym, name: 'L_1', at: 'r' }]);
    s += branch(X0, Y0, X1, Y0, [{ t: 'L', c: 200, name: 'L_2', at: 'b' }]);
    s += branch(X1, Y0, X1, Y1, [{ t: 'R', c: Ym, name: 'R', at: 'l' }]);
    s += branch(X0, Y1, X1, Y1, [{ t: 'G', c: 200, plus: 'l' }]);
    s += uArrow('L', X0, Ym, 'l', 'b', o.u1 || 'U_L1');
    s += uArrow('L', 200, Y0, 'a', 'l', o.u2 || 'U_L2');
    s += uArrow('R', X1, Ym, 'r', 'a', o.ur || 'U_R');
    s += uArrow('G', 200, Y1, 'b', 'l', o.ug || 'U_G', true);
    s += iArrow(140, Y1, 'l', 'I', 'a');
    s += rot(200, Ym, 18);
    return svg(400, 262, 'Maille orientée dans le sens horaire : le générateur G en bas (borne + à gauche), la lampe L1 à gauche, la lampe L2 en haut, la résistance R à droite. La flèche de U_G pointe vers la gauche ; celles de U_L1, U_L2 et U_R sont dans le sens opposé au courant.', s);
  };
  /** Mesures : ampèremètre en série, voltmètre en dérivation, bornes COM. */
  FIG.mesures = function () {
    var X0 = 80, X1 = 260, X2 = 340, Y0 = 50, Y1 = 200, Ym = 125, s = '';
    s += branch(X0, Y0, X0, Y1, [{ t: 'G', c: Ym, plus: 'a' }]);
    s += branch(X0, Y0, X1, Y0, [{ t: 'A', c: 170, com: 'r' }]);
    s += branch(X1, Y0, X1, Y1, [{ t: 'R', c: Ym, name: 'R', at: 'r' }]);
    s += path([[X0, Y1], [X1, Y1]]);
    s += path([[X1, 85], [X2, 85]]) + branch(X2, 85, X2, 165, [{ t: 'V', c: Ym, com: 'b' }]) + path([[X2, 165], [X1, 165]]);
    s += dot(X1, 85) + dot(X1, 165);
    s += iArrow(118, Y0, 'r', 'I', 'a');
    s += uArrow('R', X1, Ym, 'l', 'a', 'U');
    return svg(400, 225, 'Un générateur, un ampèremètre en série sur le fil du haut (le courant entre par la borne mA et sort par COM) et une résistance R ; un voltmètre est branché en dérivation aux bornes de R (borne V en haut, COM en bas).', s);
  };
  /** Loi d'Ohm : une résistance fléchée en convention récepteur. */
  FIG.ohm = function (o) {
    o = o || {};
    var s = branch(30, 55, 370, 55, [{ t: 'R', c: 200, name: o.name || 'R', at: 'a' }]) + dot(60, 55) + dot(340, 55) + pt(60, 55, 'A', 'a') + pt(340, 55, 'B', 'a');
    s += iArrow(118, 55, 'r', o.i || 'I', 'a') + uArrow('R', 200, 55, 'b', 'l', o.u || 'U');
    return svg(400, 105, 'Une résistance entre A et B, fléchée en convention récepteur : le courant I va de A vers B, la flèche de la tension U pointe vers A.', s);
  };
  /** Exercice 1 : mailles ABCDA et ADEA. v : étiquettes { EA, ED, AD, AB, BC, CD } ; rot : sens de parcours. */
  FIG.ex1 = function (v, label) {
    v = v || {};
    var Y0 = 40, Y1 = 290, XL = 110, XM = 230, XR = 330, s = '';
    s += path([[XL, Y0], [XR, Y0]]) + path([[XL, Y1], [XR, Y1]]);
    s += branch(XL, Y0, XL, Y1, [{ t: 'R', c: 100 }, { t: 'G', c: 228, plus: 'a' }]);
    s += branch(XM, Y0, XM, Y1, [{ t: 'R', c: 165 }]);
    s += branch(XR, Y0, XR, Y1, [{ t: 'R', c: 85 }, { t: 'R', c: 165 }, { t: 'R', c: 245 }]);
    s += dot(XM, Y0) + dot(XM, Y1) + dot(XR, 125) + dot(XR, 205) + dot(XL, 164);
    s += pt(XM, Y0, 'A', 'a') + pt(XM, Y1, 'D', 'b') + pt(XR, 125, 'B', 'l') + pt(XR, 205, 'C', 'l') + pt(XL, 164, 'E', 'r');
    s += uArrow('R', XL, 100, 'l', 'b', v.EA === undefined ? 'U_EA' : v.EA, false, 6);
    s += uArrow('G', XL, 228, 'l', 'a', v.ED === undefined ? 'U_ED' : v.ED, true, 6);
    s += uArrow('R', XM, 165, 'r', 'a', v.AD === undefined ? 'U_AD' : v.AD, false, true);
    s += uArrow('R', XR, 85, 'r', 'a', v.AB === undefined ? 'U_AB' : v.AB, false, true);
    s += uArrow('R', XR, 165, 'r', 'a', v.BC === undefined ? 'U_BC' : v.BC, false, true);
    s += uArrow('R', XR, 245, 'r', 'a', v.CD === undefined ? 'U_CD' : v.CD, false, true);
    s += rot(280, 85, 16);
    return svg(400, 320, label || 'Exercice 1 : générateur G entre E (borne +) et D ; résistances entre E et A, entre A et D, puis A-B, B-C et C-D sur la branche de droite. Toutes les tensions sont fléchées vers le haut sauf U_EA, fléchée vers E. La maille ABCDA est orientée dans le sens horaire.', s, 22);
  };
  /** Exercice 2 : deux lampes en dérivation, trois ampèremètres. o : { a1, a2, a3 (lectures), sol: sens du courant et bornes COM } */
  FIG.ex2 = function (o) {
    o = o || {};
    var XL = 70, XN = 130, XM = 290, XR = 350, YA = 45, YB = 105, YM = 75, Y1 = 265, s = '', sol = !!o.sol;
    s += branch(XL, YM, XL, Y1, [{ t: 'G', c: 170, plus: 'a' }]);
    s += path([[XL, YM], [XN, YM]]) + path([[XM, YM], [XR, YM], [XR, Y1]]);
    s += path([[XN, YA], [XN, YB]]) + path([[XM, YA], [XM, YB]]);
    s += branch(XN, YA, XM, YA, [{ t: 'A', c: 170, idx: '1', com: sol ? 'r' : '' }, { t: 'L', c: 240, name: 'L_1', at: 'a' }]);
    s += branch(XN, YB, XM, YB, [{ t: 'A', c: 170, idx: '2', com: sol ? 'r' : '' }, { t: 'L', c: 240, name: 'L_2', at: 'b' }]);
    s += branch(XL, Y1, XR, Y1, [{ t: 'A', c: 210, idx: '3', com: sol ? 'l' : '' }]);
    s += dot(XN, YM) + dot(XM, YM);
    // indications des ampèremètres
    if (o.a1) s += text(170, sol ? 19 : 25, o.a1, 'middle', 'read', true);
    if (o.a2) s += text(170, 137, o.a2, 'middle', 'read', true);
    if (o.a3) s += text(210, Y1 + 32, o.a3, 'middle', 'read', true);
    if (sol) s += iArrow(XL, 118, 'a', 'I_3', 'l') + iArrow(205, YA, 'r') + iArrow(205, YB, 'r') + iArrow(XR, 170, 'b') + iArrow(290, Y1, 'l', 'I_3', 'a');
    return svg(326, 305, sol
      ? 'Exercice 2, solution : le courant sort par la borne + du générateur (en haut), traverse les deux branches de gauche à droite, descend à droite et revient par le fil du bas vers la borne −. La borne COM de A1 et de A2 est à droite, celle de A3 à gauche.'
      : 'Exercice 2 : un générateur (borne + en haut) ; deux branches en dérivation, l’une avec l’ampèremètre A1 et la lampe L1, l’autre avec A2 et L2 ; l’ampèremètre A3 sur le fil du bas.', s, 36);
  };
  /** Exercice 3 : nœud C, mailles ABCFA, CDEFC, ABDEA. v : étiquettes { E, U1, U2, U3, I1, I2, I3 } */
  FIG.ex3 = function (v, label) {
    v = v || {};
    var XL = 110, XC = 250, XR = 420, Y0 = 60, Y1 = 230, s = '';
    s += branch(XL, Y0, XL, Y1, [{ t: 'G', c: 145, plus: 'a' }]);
    s += branch(XL, Y0, XR, Y0, [{ t: 'R', c: 180, name: 'R_1', at: 'in' }, { t: 'R', c: 340, name: 'R_3', at: 'in' }]);
    s += branch(XC, Y0, XC, Y1, [{ t: 'R', c: 165, name: 'R_2', at: 'l' }]);
    s += path([[XR, Y0], [XR, Y1], [XL, Y1]]);
    s += dot(XC, Y0) + dot(XC, Y1);
    s += pt(XL, Y0, 'B', 'l') + pt(XC, Y0, 'C', 'a') + pt(XR, Y0, 'D', 'a') + pt(XL, Y1, 'A', 'b') + pt(XC, Y1, 'F', 'b') + pt(XR, Y1, 'E', 'b');
    s += uArrow('G', XL, 145, 'l', 'a', v.E || 'E', true);
    s += uArrow('R', 180, Y0, 'b', 'l', v.U1 || 'U_1') + uArrow('R', 340, Y0, 'b', 'l', v.U3 || 'U_3') + uArrow('R', XC, 165, 'r', 'a', v.U2 || 'U_2');
    s += iArrow(134, Y0, 'r', v.I1 || 'I_1', 'a') + iArrow(287, Y0, 'r', v.I3 || 'I_3', 'a') + iArrow(XC, 118, 'b', v.I2 || 'I_2', 'l');
    return svg(450, 262, label || 'Exercice 3 : générateur de tension E entre A et B ; R1 entre B et C ; au nœud C, le courant se partage entre R2 (vers F) et R3 (vers D) ; D, E, F et A sont reliés par le fil du bas.', s);
  };
  /** Exercice 4 : générateur 5 V et résistance(s) ; n = 13 (R seule), 14 (220 Ω puis R), 15 (470 Ω puis R en dérivation avec 470 Ω). */
  FIG.ex4 = function (n, v) {
    v = v || {};
    var XL = 80, XR = 240, Y0 = 40, Y1 = 230, s = '';
    s += branch(XL, Y0, XL, Y1, [{ t: 'G', c: 135, plus: 'a' }]);
    s += uArrow('G', XL, 135, 'l', 'a', v.E || '5 V', true);
    s += path([[XL, Y0], [XR, Y0]]) + iArrow(160, Y0, 'r', v.I || (n === 13 ? 'I = 5 mA' : n === 14 ? 'I = 6,9 mA' : 'I = 8 mA'), 'a');
    s += pt(XL, Y0, 'B', 'a') + pt(XR, Y0, 'C', 'a') + pt(XL, Y1, 'A', 'b');
    if (n === 13) {
      s += branch(XR, Y0, XR, Y1, [{ t: 'R', c: 135, name: v.R || 'R', at: 'r' }]) + path([[XL, Y1], [XR, Y1]]) + pt(XR, Y1, 'D', 'b');
    } else if (n === 14) {
      s += branch(XR, Y0, XR, Y1, [{ t: 'R', c: 92, name: v.R0 || '220 Ω', at: 'r' }, { t: 'R', c: 178, name: v.R || 'R', at: 'r' }]);
      s += path([[XL, Y1], [XR, Y1]]) + dot(XR, 135) + pt(XR, 135, 'D', 'l') + pt(XR, Y1, 'E', 'b');
    } else {
      s += branch(XR, Y0, XR, 135, [{ t: 'R', c: 88, name: v.R0 || '470 Ω', at: 'r' }]);
      s += branch(XR, 135, XR, Y1, [{ t: 'R', c: 183, name: v.R || 'R', at: 'l' }]);
      s += path([[XR, 135], [320, 135]]) + branch(320, 135, 320, Y1, [{ t: 'R', c: 183, name: v.Rp || '470 Ω', at: 'r' }]) + path([[320, Y1], [XL, Y1]]);
      s += dot(XR, 135) + dot(XR, Y1) + pt(XR, 135, 'D', 'l') + pt(XR, Y1, 'E', 'b');
    }
    var lab = {
      13: 'Exercice 4, n° 13 : générateur de 5 V et une résistance R parcourue par I = 5 mA.',
      14: 'Exercice 4, n° 14 : générateur de 5 V, résistance de 220 ohms puis résistance R en série, I = 6,9 mA.',
      15: 'Exercice 4, n° 15 : générateur de 5 V, résistance de 470 ohms puis, entre D et E, la résistance R en dérivation avec une résistance de 470 ohms ; I = 8 mA.'
    }[n];
    return svg(400, 262, v.label || lab, s);
  };

  /* =====================================================================
     Banque de questions
     ===================================================================== */
  function m(t) { return '\\(' + t + '\\)'; }
  function steps(list) { return '<ol class="steps-list">' + list.filter(Boolean).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }
  function fig(s) { return '<figure class="fig-wrap">' + s + '</figure>'; }
  /** Nombre en texte (schémas) et en LaTeX, avec le vrai signe moins. */
  function fr(x, sig) { return Math.abs(x) < 1e-12 ? '0' : C.fmtNum(x, sig || 3).replace('-', '−'); }
  function V(x) { return T(x, 3) + '\\ \\mathrm{V}'; }
  function Amp(x) { return T(x, 3) + '\\ \\mathrm{A}'; }
  function mA(x) { return T(x, 3) + '\\ \\mathrm{mA}'; }
  function Ohm(x) { return T(x, 3) + '\\ \\Omega'; }
  /** Grandeurs colorées : tension d'un récepteur, du générateur, intensité, résistance. */
  function Uq(sub) { return '\\q{u}{U' + (sub ? '_{' + sub + '}' : '') + '}'; }
  function Ug(sub) { return '\\q{gen}{' + (sub ? 'U_{' + sub + '}' : 'E') + '}'; }
  function Iq(sub) { return '\\q{I}{I' + (sub ? '_{' + sub + '}' : '') + '}'; }
  function Rq(sub) { return '\\q{R}{R' + (sub ? '_{' + sub + '}' : '') + '}'; }
  var SUBN = '₀₁₂₃₄₅₆₇₈₉';
  function subn(k) { return String(k).replace(/\d/g, function (d) { return SUBN[d]; }); }
  function isInt(x) { return Math.abs(x - Math.round(x)) < 1e-9; }
  var UNITW = { V: 'volts (V)', A: 'ampères (A)', mA: 'milliampères (mA)', 'Ω': 'ohms (Ω)' };
  /** Arrondi à n chiffres significatifs (valeurs affichées dans les énoncés). */
  function sig(x, n) { return C.roundSig(x, n || 3); }

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

    /* ---- conventions de fléchage (cours, I) ---- */
    function convention() {
      var v = P(['gen', 'rec', 'fig', 'fig', 'uab']);
      if (v === 'gen' || v === 'rec') {
        var gen = v === 'gen';
        return mcq({
          type: 'Convention ' + (gen ? 'générateur' : 'récepteur'), ref: 'c-fleche',
          html: '<p>' + (gen ? 'Pour un <b>générateur</b>' : 'Pour un <b>récepteur</b> (résistance, lampe, moteur)') + ', la flèche de la tension se dessine :</p>',
          solution: '<p>' + (gen ? 'Générateur : la tension se flèche dans le <b>même sens</b> que le courant.' : 'Récepteur : la tension se flèche dans le <b>sens opposé</b> au courant.') + '</p>'
        }, gen ? 'dans le même sens que le courant' : 'dans le sens opposé au courant', [
          { html: gen ? 'dans le sens opposé au courant' : 'dans le même sens que le courant', why: gen ? 'C’est la convention <b>récepteur</b>. Pour un générateur, la flèche de tension va dans le même sens que le courant.' : 'C’est la convention <b>générateur</b>. Pour un récepteur, la flèche de tension est opposée au courant.' },
          { html: 'perpendiculairement au fil', why: 'La flèche de tension se dessine à côté du dipôle, parallèlement au fil : dans le même sens que le courant ou dans le sens opposé.' }
        ]);
      }
      if (v === 'uab') {
        var a = P(['A', 'C', 'E', 'P']), b = { A: 'B', C: 'D', E: 'F', P: 'N' }[a];
        return mcq({
          type: 'Notation d’une tension', ref: 'c-fleche',
          html: '<p>La tension ' + m(Uq(a + b)) + ' est représentée par une flèche :</p>',
          solution: '<p>La flèche de ' + m(Uq(a + b)) + ' part de ' + b + ' et <b>pointe vers ' + a + '</b>, la première lettre. ' + m(Uq(a + b) + ' = V_{' + a + '} - V_{' + b + '}') + '.</p>'
        }, 'qui part de ' + b + ' et pointe vers ' + a, [
          { html: 'qui part de ' + a + ' et pointe vers ' + b, why: 'Cette flèche-là représente ' + m(Uq(b + a)) + ' : la pointe désigne toujours la première lettre.' },
          { html: 'toujours dans le sens du courant', why: 'Le sens de la flèche dépend de la notation (la pointe vers la première lettre), pas du courant.' }
        ]);
      }
      // sur un schéma : flécher la tension d'un dipôle traversé par un courant
      var t = P(['G', 'R', 'L']), right = rng() < 0.5, isGen = t === 'G';
      var s = branch(20, 55, 380, 55, [{ t: t, c: 200, plus: isGen ? (right ? 'r' : 'l') : null }]) + iArrow(right ? 110 : 290, 55, right ? 'r' : 'l', 'I', 'a');
      var name = { G: 'un générateur', R: 'une résistance', L: 'une lampe' }[t], same = isGen;
      var good = (same === right) ? 'vers la droite' : 'vers la gauche', bad = good === 'vers la droite' ? 'vers la gauche' : 'vers la droite';
      return mcq({
        type: 'Flécher une tension', ref: 'c-fleche',
        html: '<p>Le dipôle ci-dessous est ' + name + ', traversé par le courant ' + m(Iq()) + '. Dans quel sens faut-il flécher la tension à ses bornes ?</p>' +
          fig(svg(400, 80, 'Un dipôle (' + name + ') sur un fil horizontal ; le courant I circule ' + (right ? 'de gauche à droite' : 'de droite à gauche') + '.', s)),
        solution: '<p>' + (isGen ? 'C’est un générateur : sa tension se flèche dans le <b>même sens</b> que le courant' : 'C’est un récepteur : sa tension se flèche dans le <b>sens opposé</b> au courant') + ', donc ' + good + '.</p>'
      }, good, [{ html: bad, why: isGen ? 'Pour un générateur, la flèche de tension va dans le <b>même sens</b> que le courant.' : 'Pour un récepteur (' + name + '), la flèche de tension est <b>opposée</b> au courant.' }]);
    }

    /* ---- U_BA = −U_AB, U_AB = V_A − V_B ---- */
    function notation() {
      if (rng() < 0.5) {
        var u = between(0.5, 12, 0.5) * (rng() < 0.3 ? -1 : 1), a = P(['A', 'C', 'P']), b = { A: 'B', C: 'D', P: 'N' }[a];
        return {
          type: 'Notation d’une tension', ask: ask('la tension', 'volts (V)'), unit: 'V', answer: -u,
          html: '<p>On mesure ' + m(Uq(a + b) + ' = ' + V(u)) + '.</p><p>Que vaut ' + m(Uq(b + a)) + ' ?</p>',
          traps: [{ value: u, msg: 'Inverser les lettres inverse la flèche : ' + m(Uq(b + a) + ' = -' + Uq(a + b)) + '. Le signe change.' }],
          solution: steps([m(Uq(b + a) + ' = V_{' + b + '} - V_{' + a + '} = -(V_{' + a + '} - V_{' + b + '}) = -' + Uq(a + b)) + '.', m(Uq(b + a) + ' = ' + V(-u)) + '.'])
        };
      }
      var va = between(0, 12, 0.5), vb = between(0, 12, 0.5);
      while (Math.abs(va - vb) < 0.5) vb = between(0, 12, 0.5);
      var rev = rng() < 0.4, ans = rev ? vb - va : va - vb, name = rev ? 'BA' : 'AB';
      return {
        type: 'Tension et potentiels', ask: ask('la tension', 'volts (V)'), unit: 'V', answer: ans,
        html: '<p>Dans un circuit, le point A est au potentiel ' + m('V_A = ' + V(va)) + ' et le point B au potentiel ' + m('V_B = ' + V(vb)) + '.</p><p>Calcule la tension ' + m(Uq(name)) + '.</p>',
        traps: [
          { value: -ans, msg: 'L’ordre des lettres compte : ' + m(Uq(name) + ' = V_{' + name[0] + '} - V_{' + name[1] + '}') + ', la première lettre en premier.' },
          { value: va + vb, msg: 'Une tension est une <b>différence</b> de potentiels, pas une somme.' }
        ],
        solution: steps([m(Uq(name) + ' = V_{' + name[0] + '} - V_{' + name[1] + '} = ' + T(rev ? vb : va) + ' - ' + T(rev ? va : vb) + ' = ' + V(ans)) + '.'])
      };
    }

    /* ---- loi des mailles dans un circuit série (cours, I) ---- */
    function mailleSerie() {
      var n = P([2, 3, 3]), E = P([4.5, 6, 9, 12, 12, 24]), step = E >= 12 ? 0.5 : 0.1, cuts = [], k;
      while (cuts.length < n - 1) {
        var c = between(step * 4, E - step * 4, step);
        if (cuts.every(function (x) { return Math.abs(x - c) >= step * 4; })) cuts.push(c);
      }
      cuts.sort(function (a, b) { return a - b; });
      var us = [], prev = 0;
      cuts.concat([E]).forEach(function (c) { us.push(sig(c - prev, 6)); prev = c; });
      var kinds = n === 2 ? P([['R', 'R'], ['L', 'R'], ['L', 'L']]) : P([['L', 'L', 'R'], ['R', 'R', 'R']]);
      var names = []; var cnt = { R: 0, L: 0 };
      kinds.forEach(function (t) { cnt[t]++; names.push(t + '_' + cnt[t]); });
      kinds.forEach(function (t, i) { if (cnt[t] === 1) names[i] = t; });
      var unknown = Math.floor(rng() * (n + 1)); // n : le générateur
      var recs = kinds.map(function (t, i) { return { t: t, name: names[i], u: 'U_' + (i + 1) + (unknown === i ? ' = ?' : ' = ' + fr(us[i]) + ' V') }; });
      var html = '<p>Dans ce circuit série, la maille est parcourue dans le sens horaire.</p>' +
        fig(FIG.loop({ recs: recs, E: unknown === n ? 'E = ?' : 'E = ' + fr(E) + ' V', i: 'I', rot: true }));
      var terms = us.map(function (u, i) { return Uq(i + 1); }), eq = Ug() + ' - ' + terms.join(' - ') + ' = 0';
      var known = us.filter(function (u, i) { return i !== unknown; }), sumKnown = known.reduce(function (s, x) { return s + x; }, 0);
      var traps = [];
      if (unknown === n) {
        traps.push({ value: known[0] - known[1], msg: 'Dans la maille, les tensions des récepteurs s’<b>ajoutent</b> : ' + m(Ug() + ' = ' + terms.join(' + ')) + '.' });
        if (n === 3) traps.push({ value: known[0] + known[1], msg: 'Il y a trois récepteurs dans la maille : n’en oublie aucun.' });
        return {
          type: 'Loi des mailles : circuit série', ask: ask('la tension du générateur', 'volts (V)'), unit: 'V', answer: E, traps: traps,
          html: html + '<p>Calcule la tension ' + m(Ug()) + ' du générateur.</p>',
          solution: steps([
            'En tournant dans le sens horaire, la flèche de ' + m(Ug()) + ' est dans le sens du parcours (+), celles des récepteurs dans le sens opposé (−).',
            'Loi des mailles : ' + m(eq) + ', donc ' + m(Ug() + ' = ' + terms.join(' + ')) + '.',
            m(Ug() + ' = ' + us.map(function (u) { return T(u); }).join(' + ') + ' = ' + V(E)) + '.'
          ])
        };
      }
      var ans = us[unknown], others = terms.filter(function (t, i) { return i !== unknown; });
      traps.push({ value: E + sumKnown, msg: 'Le générateur fait monter la tension, les récepteurs se la partagent : ' + m(terms[unknown] + ' = ' + Ug() + ' - ' + others.join(' - ')) + '.' });
      traps.push({ value: sumKnown - E, msg: 'Attention au signe : ' + m(terms[unknown] + ' = ' + Ug() + ' - ' + others.join(' - ')) + ', positif ici.' });
      if (n === 3) known.forEach(function (u) { traps.push({ value: E - u, msg: 'Il y a trois récepteurs : retire les <b>deux</b> tensions connues.' }); });
      traps.push({ value: E / n, msg: 'Les récepteurs ne se partagent pas la tension à parts égales (ils n’ont pas la même résistance) : utilise la loi des mailles.' });
      return {
        type: 'Loi des mailles : circuit série', ask: ask('la tension', 'volts (V)'), unit: 'V', answer: ans, traps: traps,
        html: html + '<p>Calcule la tension ' + m(terms[unknown]) + '.</p>',
        solution: steps([
          'En tournant dans le sens horaire, la flèche de ' + m(Ug()) + ' est dans le sens du parcours (+), celles des récepteurs dans le sens opposé (−).',
          'Loi des mailles : ' + m(eq) + ', donc ' + m(terms[unknown] + ' = ' + Ug() + ' - ' + others.join(' - ')) + '.',
          m(terms[unknown] + ' = ' + T(E) + ' - ' + known.map(function (u) { return T(u); }).join(' - ') + ' = ' + V(ans)) + '.'
        ])
      };
    }

    /* ---- exercice 1 : mailles ABCDA et ADEA ---- */
    function mailleFleche() {
      var ab = between(0.5, 6, 0.5), bc = between(0.5, 6, 0.5), cd = between(0.5, 6, 0.5), ea = between(1, 6, 0.5);
      var ad = sig(ab + bc + cd, 6), ed = sig(ad + ea, 6), v = P(['AD', 'ED', 'EA', 'CD']);
      function L(name, val) { return 'U_' + name + ' = ' + (val === null ? '?' : fr(val) + ' V'); }
      var labels = {}, html, ans, traps, sol, target;
      var mABCDA = Uq('AD') + ' - ' + Uq('AB') + ' - ' + Uq('BC') + ' - ' + Uq('CD') + ' = 0', mADEA = Ug('ED') + ' - ' + Uq('EA') + ' - ' + Uq('AD') + ' = 0';
      var intro1 = 'Maille ABCDA, parcourue dans le sens horaire : la flèche de ' + m(Uq('AD')) + ' est dans le sens du parcours, celles de ' + m(Uq('AB')) + ', ' + m(Uq('BC')) + ' et ' + m(Uq('CD')) + ' dans le sens opposé.';
      var intro2 = 'Maille ADEA, parcourue de A vers D, puis E, puis A : la flèche de ' + m(Ug('ED')) + ' est dans le sens du parcours, celles de ' + m(Uq('AD')) + ' et de ' + m(Uq('EA')) + ' dans le sens opposé.';
      if (v === 'AD') {
        labels = { AB: L('AB', ab), BC: L('BC', bc), CD: L('CD', cd), AD: L('AD', null), EA: 'U_EA', ED: 'U_ED' };
        target = Uq('AD'); ans = ad;
        traps = [{ value: ab + bc, msg: 'Il y a trois tensions dans la branche de droite : ' + m(Uq('AD') + ' = ' + Uq('AB') + ' + ' + Uq('BC') + ' + ' + Uq('CD')) + '.' },
          { value: -ad, msg: 'Les trois flèches de droite pointent vers le haut, comme celle de ' + m(Uq('AD')) + ' : les tensions sont positives et s’ajoutent.' }];
        sol = [intro1, 'Loi des mailles : ' + m(mABCDA) + ', donc ' + m(Uq('AD') + ' = ' + Uq('AB') + ' + ' + Uq('BC') + ' + ' + Uq('CD')) + '.', m(Uq('AD') + ' = ' + T(ab) + ' + ' + T(bc) + ' + ' + T(cd) + ' = ' + V(ad)) + '.'];
      } else if (v === 'CD') {
        labels = { AB: L('AB', ab), BC: L('BC', bc), CD: L('CD', null), AD: L('AD', ad), EA: 'U_EA', ED: 'U_ED' };
        target = Uq('CD'); ans = cd;
        traps = [{ value: ad + ab + bc, msg: m(Uq('CD') + ' = ' + Uq('AD') + ' - ' + Uq('AB') + ' - ' + Uq('BC')) + ' : on retire les tensions connues de la branche de droite.' },
          { value: ad - ab, msg: 'Retire aussi ' + m(Uq('BC')) + ' : ' + m(Uq('CD') + ' = ' + Uq('AD') + ' - ' + Uq('AB') + ' - ' + Uq('BC')) + '.' }];
        if (Math.abs(ad - bc - ab) > 1e-9) traps.push({ value: ad - bc, msg: 'Retire aussi ' + m(Uq('AB')) + ' : ' + m(Uq('CD') + ' = ' + Uq('AD') + ' - ' + Uq('AB') + ' - ' + Uq('BC')) + '.' });
        sol = [intro1, 'Loi des mailles : ' + m(mABCDA) + ', donc ' + m(Uq('CD') + ' = ' + Uq('AD') + ' - ' + Uq('AB') + ' - ' + Uq('BC')) + '.', m(Uq('CD') + ' = ' + T(ad) + ' - ' + T(ab) + ' - ' + T(bc) + ' = ' + V(cd)) + '.'];
      } else if (v === 'ED') {
        labels = { AB: 'U_AB', BC: 'U_BC', CD: 'U_CD', AD: L('AD', ad), EA: L('EA', ea), ED: L('ED', null) };
        target = Ug('ED'); ans = ed;
        traps = [{ value: ad - ea, msg: 'Les flèches de ' + m(Uq('AD')) + ' et de ' + m(Uq('EA')) + ' sont toutes deux opposées au parcours : ' + m(Ug('ED') + ' = ' + Uq('EA') + ' + ' + Uq('AD')) + '.' },
          { value: ea - ad, msg: m(Ug('ED') + ' = ' + Uq('EA') + ' + ' + Uq('AD')) + ' : les deux tensions s’ajoutent.' }];
        sol = [intro2, 'Loi des mailles : ' + m(mADEA) + ', donc ' + m(Ug('ED') + ' = ' + Uq('EA') + ' + ' + Uq('AD')) + '.', m(Ug('ED') + ' = ' + T(ea) + ' + ' + T(ad) + ' = ' + V(ed)) + '.'];
      } else {
        labels = { AB: 'U_AB', BC: 'U_BC', CD: 'U_CD', AD: L('AD', ad), EA: L('EA', null), ED: L('ED', ed) };
        target = Uq('EA'); ans = ea;
        traps = [{ value: ed + ad, msg: m(Uq('EA') + ' = ' + Ug('ED') + ' - ' + Uq('AD')) + ' : la tension du générateur se partage entre les deux résistances de la maille.' },
          { value: ad - ed, msg: 'Attention au signe : ' + m(Uq('EA') + ' = ' + Ug('ED') + ' - ' + Uq('AD')) + ', positif ici.' }];
        sol = [intro2, 'Loi des mailles : ' + m(mADEA) + ', donc ' + m(Uq('EA') + ' = ' + Ug('ED') + ' - ' + Uq('AD')) + '.', m(Uq('EA') + ' = ' + T(ed) + ' - ' + T(ad) + ' = ' + V(ea)) + '.'];
      }
      html = '<p>Dans le circuit ci-dessous (exercice 1 de la fiche), toutes les tensions sont fléchées.</p>' + fig(FIG.ex1(labels)) + '<p>Calcule ' + m(target) + '.</p>';
      return { type: 'Loi des mailles : tensions fléchées', ask: 'Donne la tension en volts (V), à 3 chiffres significatifs.', unit: 'V', answer: ans, traps: traps, html: html, solution: steps(sol) };
    }

    /* ---- dérivation : même tension (cours, exemple) ---- */
    function derivation() {
      var E = P([1.5, 4.5, 6, 9, 12, 24]), t = P(['L', 'R']), names = t === 'L' ? ['L_1', 'L_2'] : ['R_1', 'R_2'], which = P([1, 2]);
      var findE = rng() < 0.35;
      if (findE) {
        var u = which === 1 ? ['U_1 = ' + fr(E) + ' V', 'U_2'] : ['U_1', 'U_2 = ' + fr(E) + ' V'];
        return {
          type: 'Dipôles en dérivation', ask: ask('la tension du générateur', 'volts (V)'), unit: 'V', answer: E,
          html: '<p>Deux ' + (t === 'L' ? 'lampes' : 'résistances') + ' sont branchées en dérivation aux bornes d’un générateur. Un voltmètre indique ' + m(Uq(which) + ' = ' + V(E)) + '.</p>' +
            fig(FIG.parallel({ t: t, names: names, E: 'E = ?', u: u })) + '<p>Que vaut la tension ' + m(Ug()) + ' du générateur ?</p>',
          traps: [{ value: 2 * E, msg: 'En dérivation, les tensions ne s’ajoutent pas : chaque branche a la <b>même tension</b> que le générateur.' },
            { value: E / 2, msg: 'Les deux branches ne se partagent pas la tension : elles ont toutes les deux la tension du générateur.' }],
          solution: steps(['La maille formée par le générateur et la branche ' + which + ' donne ' + m(Ug() + ' - ' + Uq(which) + ' = 0') + '.', m(Ug() + ' = ' + Uq(which) + ' = ' + V(E)) + ' : en dérivation, même tension.'])
        };
      }
      return {
        type: 'Dipôles en dérivation', ask: ask('la tension', 'volts (V)'), unit: 'V', answer: E,
        html: '<p>Deux ' + (t === 'L' ? 'lampes' : 'résistances') + ' sont branchées en dérivation aux bornes d’un générateur de tension ' + m(Ug() + ' = ' + V(E)) + '.</p>' +
          fig(FIG.parallel({ t: t, names: names, E: 'E = ' + fr(E) + ' V', u: which === 1 ? ['U_1 = ?', 'U_2'] : ['U_1', 'U_2 = ?'] })) + '<p>Que vaut la tension ' + m(Uq(which)) + ' ?</p>',
        traps: [{ value: E / 2, msg: 'En dérivation, les tensions ne se partagent pas : chaque branche est directement reliée aux bornes du générateur.' },
          { value: 2 * E, msg: 'Les tensions ne s’ajoutent qu’en série. En dérivation, elles sont égales.' }],
        solution: steps(['La maille formée par le générateur et la branche ' + which + ' donne ' + m(Ug() + ' - ' + Uq(which) + ' = 0') + '.', m(Uq(which) + ' = ' + Ug() + ' = ' + V(E)) + ' : des dipôles en dérivation ont la même tension.'])
      };
    }

    /* ---- exercice 2 : loi des nœuds et conversions ---- */
    function noeud() {
      var i3 = between(300, 1500, 5), i1 = sig(between(0.1, 0.9, 0.005) * i3 / 1000, 3), i2 = sig(i3 / 1000 - i1, 6);
      if (i2 <= 0.02) { i1 = sig(i3 / 2000, 3); i2 = sig(i3 / 1000 - i1, 6); }
      var v = P(['I2', 'I2', 'I3', 'I1']), o = {}, ans, unit, traps, sol, target;
      if (v === 'I2') {
        o = { a1: fr(i1, 4) + ' A', a2: '?', a3: fr(i3, 4) + ' mA' }; ans = i2; unit = 'A'; target = Iq(2);
        traps = [{ value: i3 - i1, msg: 'Convertis d’abord ' + m(Iq(3) + ' = ' + mA(i3)) + ' en ampères (' + m(Amp(i3 / 1000)) + ') : on ne soustrait que des intensités exprimées dans la même unité.' },
          { value: i3 / 1000 + i1, msg: 'Le courant ' + m(Iq(3)) + ' se partage entre les deux branches : ' + m(Iq(2) + ' = ' + Iq(3) + ' - ' + Iq(1)) + '.' },
          { value: i2 * 1000, msg: 'La réponse est demandée en <b>ampères</b>.' }];
        sol = ['Conversion : ' + m(Iq(3) + ' = ' + mA(i3) + ' = ' + Amp(i3 / 1000)) + '.', 'Loi des nœuds au nœud de gauche : ' + m(Iq(3) + ' = ' + Iq(1) + ' + ' + Iq(2)) + ', donc ' + m(Iq(2) + ' = ' + Iq(3) + ' - ' + Iq(1)) + '.', m(Iq(2) + ' = ' + T(i3 / 1000, 4) + ' - ' + T(i1, 4) + ' = ' + Amp(i2)) + '.'];
      } else if (v === 'I3') {
        o = { a1: fr(i1, 4) + ' A', a2: fr(i2 * 1000, 4) + ' mA', a3: '?' }; ans = i3; unit = 'mA'; target = Iq(3);
        traps = [{ value: i1 + i2 * 1000, msg: 'Mets les deux intensités dans la même unité avant de les additionner : ' + m(Iq(1) + ' = ' + Amp(i1) + ' = ' + mA(i1 * 1000)) + '.' },
          { value: i3 / 1000, msg: 'La réponse est demandée en <b>milliampères</b> : ' + m('1\\ \\mathrm{A} = 1\\,000\\ \\mathrm{mA}') + '.' },
          { value: Math.abs(i2 * 1000 - i1 * 1000), msg: 'Le courant principal est la <b>somme</b> des courants des branches : ' + m(Iq(3) + ' = ' + Iq(1) + ' + ' + Iq(2)) + '.' }];
        sol = ['Conversion : ' + m(Iq(1) + ' = ' + Amp(i1) + ' = ' + mA(i1 * 1000)) + '.', 'Loi des nœuds : ' + m(Iq(3) + ' = ' + Iq(1) + ' + ' + Iq(2)) + '.', m(Iq(3) + ' = ' + T(i1 * 1000, 4) + ' + ' + T(i2 * 1000, 4) + ' = ' + mA(i3)) + '.'];
      } else {
        o = { a1: '?', a2: fr(i2, 4) + ' A', a3: fr(i3, 4) + ' mA' }; ans = i1; unit = 'A'; target = Iq(1);
        traps = [{ value: i3 - i2, msg: 'Convertis d’abord ' + m(Iq(3) + ' = ' + mA(i3)) + ' en ampères (' + m(Amp(i3 / 1000)) + ').' },
          { value: i3 / 1000 + i2, msg: m(Iq(1) + ' = ' + Iq(3) + ' - ' + Iq(2)) + ' : le courant ' + m(Iq(3)) + ' entre dans le nœud et se partage.' },
          { value: i1 * 1000, msg: 'La réponse est demandée en <b>ampères</b>.' }];
        sol = ['Conversion : ' + m(Iq(3) + ' = ' + mA(i3) + ' = ' + Amp(i3 / 1000)) + '.', 'Loi des nœuds : ' + m(Iq(3) + ' = ' + Iq(1) + ' + ' + Iq(2)) + ', donc ' + m(Iq(1) + ' = ' + Iq(3) + ' - ' + Iq(2)) + '.', m(Iq(1) + ' = ' + T(i3 / 1000, 4) + ' - ' + T(i2, 4) + ' = ' + Amp(i1)) + '.'];
      }
      return {
        type: 'Loi des nœuds : montage en dérivation', ask: ask('l’intensité', unit === 'A' ? 'ampères (A)' : 'milliampères (mA)'), unit: unit, answer: ans, traps: traps,
        html: '<p>Dans ce montage en dérivation (exercice 2 de la fiche), les ampèremètres ' + m('\\mathrm{A_1}') + ', ' + m('\\mathrm{A_2}') + ' et ' + m('\\mathrm{A_3}') + ' mesurent ' + m(Iq(1)) + ', ' + m(Iq(2)) + ' et ' + m(Iq(3)) + '.</p>' +
          fig(FIG.ex2(o)) + '<p>Calcule ' + m(target) + '.</p>',
        solution: steps(sol)
      };
    }

    /* ---- un nœud, quatre fils ---- */
    function add(t, c) { return t + (typeof c === 'number' ? c : c.v); }
    function noeudMulti() {
      var nin = P([2, 2, 1, 3]), nout = 4 - nin, ins, outs, last, k, tries = 0;
      // toutes les intensités sont positives, multiples de 0,05 A ; la dernière entrée équilibre le nœud
      do {
        outs = []; ins = [];
        for (k = 0; k < nout; k++) outs.push(between(0.05, 1, 0.05));
        for (k = 0; k < nin - 1; k++) ins.push(between(0.05, 1, 0.05));
        last = sig(outs.reduce(add, 0) - ins.reduce(add, 0), 6);
      } while (last < 0.05 && ++tries < 100);
      if (last < 0.05) { ins = nin === 3 ? [0.2, 0.3] : nin === 2 ? [0.5] : []; outs = nin === 3 ? [0.9] : nin === 2 ? [0.6, 0.3] : [0.2, 0.3, 0.4]; last = sig(outs.reduce(add, 0) - ins.reduce(add, 0), 6); }
      ins.push(last);
      var sides = shuffle(['l', 'a', 'r', 'b']);
      var all = ins.map(function (x) { return { v: x, into: true }; }).concat(outs.map(function (x) { return { v: x, into: false }; }));
      all.forEach(function (c, i) { c.side = sides[i]; c.name = i + 1; });
      var hid = P(all), small = all.filter(function (c) { return c !== hid && c.v < 1; });
      var mAc = small.length && rng() < 0.4 ? P(small) : null;
      var w = {};
      all.forEach(function (c) { w[c.side] = { into: c.into, s: 'I_' + c.name + (c === hid ? ' = ?' : ' = ' + (c === mAc ? fr(c.v * 1000, 4) + ' mA' : fr(c.v, 4) + ' A')) }; });
      var inL = all.filter(function (c) { return c.into; }), outL = all.filter(function (c) { return !c.into; });
      var same = all.filter(function (c) { return c !== hid && c.into === hid.into; }), other = all.filter(function (c) { return c.into !== hid.into; });
      function names(list, sep) { return list.map(function (c) { return Iq(c.name); }).join(sep); }
      var law = names(inL, ' + ') + ' = ' + names(outL, ' + ');
      var expr = Iq(hid.name) + ' = ' + names(other, ' + ') + (same.length ? ' - ' + names(same, ' - ') : '');
      var numeric = other.map(function (c) { return T(c.v, 4); }).join(' + ') + same.map(function (c) { return ' - ' + T(c.v, 4); }).join('');
      var dir = hid.into ? 'entrent' : 'sortent', traps = [];
      if (same.length) {
        traps.push({ value: other.reduce(add, 0) + same.reduce(add, 0), msg: m(Iq(hid.name)) + ' ' + (hid.into ? 'entre' : 'sort') + ' comme ' + same.map(function (c) { return m(Iq(c.name)); }).join(' et ') + ' : sépare les courants qui entrent de ceux qui sortent, ' + m(law) + '.' });
        traps.push({ value: same.reduce(add, 0) - other.reduce(add, 0), msg: 'Attention au sens des flèches : ' + m(expr) + ', positif ici.' });
      } else if (other.length > 1) {
        traps.push({ value: Math.abs(other[0].v - other.slice(1).reduce(add, 0)), msg: 'Tous les courants qui ' + (hid.into ? 'sortent' : 'entrent') + ' s’ajoutent : ' + m(expr) + '.' });
      }
      if (mAc) traps.push({ value: hid.v + (mAc.into === hid.into ? -1 : 1) * (mAc.v * 1000 - mAc.v), msg: 'Convertis ' + m(Iq(mAc.name) + ' = ' + mA(mAc.v * 1000) + ' = ' + Amp(mAc.v)) + ' avant de calculer.' });
      return {
        type: 'Loi des nœuds', ask: ask('l’intensité', 'ampères (A)'), unit: 'A', answer: hid.v, traps: traps,
        html: '<p>Quatre fils se rejoignent au nœud N. Le sens de chaque courant est donné par sa flèche.</p>' + fig(FIG.star(w)) + '<p>Calcule ' + m(Iq(hid.name)) + '.</p>',
        solution: steps([
          mAc ? 'Conversion : ' + m(Iq(mAc.name) + ' = ' + mA(mAc.v * 1000) + ' = ' + Amp(mAc.v)) + '.' : null,
          'Entrent dans le nœud : ' + inL.map(function (c) { return m(Iq(c.name)); }).join(', ') + ' ; en sortent : ' + outL.map(function (c) { return m(Iq(c.name)); }).join(', ') + '.',
          'Loi des nœuds : ' + m(law) + ', donc ' + m(expr) + '.',
          m(Iq(hid.name) + ' = ' + numeric + ' = ' + Amp(hid.v)) + '.'
        ])
      };
    }

    /* ---- conversions (exercice 2, question 3) ---- */
    function conversion() {
      var v = P(['mA-A', 'mA-A', 'A-mA', 'kO-O']);
      if (v === 'mA-A') {
        var x = P([between(5, 95, 5), between(100, 990, 5), between(1000, 2500, 50)]);
        return {
          type: 'Conversion d’intensité', ask: 'Donne l’intensité en ampères (A).', unit: 'A', answer: x / 1000,
          html: '<p>Un ampèremètre indique ' + m(Iq() + ' = ' + mA(x)) + '. Convertis cette intensité en ampères.</p>',
          traps: [{ value: x * 1000, msg: 'Le milliampère est <b>plus petit</b> que l’ampère : on divise par 1 000.' }, { value: x / 100, msg: m('1\\ \\mathrm{A} = 1\\,000\\ \\mathrm{mA}') + ' : on divise par 1 000, pas par 100.' }],
          solution: steps([m('1\\ \\mathrm{mA} = 10^{-3}\\ \\mathrm{A}') + ' : on divise par 1 000.', m(Iq() + ' = ' + mA(x) + ' = \\dfrac{' + T(x) + '}{1\\,000}\\ \\mathrm{A} = ' + Amp(x / 1000)) + '.'])
        };
      }
      if (v === 'A-mA') {
        var a = P([between(0.005, 0.095, 0.005), between(0.1, 0.995, 0.005), between(1, 3, 0.05)]);
        return {
          type: 'Conversion d’intensité', ask: 'Donne l’intensité en milliampères (mA).', unit: 'mA', answer: sig(a * 1000, 6),
          html: '<p>Un ampèremètre indique ' + m(Iq() + ' = ' + Amp(a)) + '. Convertis cette intensité en milliampères.</p>',
          traps: [{ value: a / 1000, msg: 'Il y a <b>plus</b> de milliampères que d’ampères : on multiplie par 1 000.' }, { value: a * 100, msg: m('1\\ \\mathrm{A} = 1\\,000\\ \\mathrm{mA}') + ' : on multiplie par 1 000, pas par 100.' }],
          solution: steps([m('1\\ \\mathrm{A} = 1\\,000\\ \\mathrm{mA}') + '.', m(Iq() + ' = ' + T(a, 4) + ' \\times 1\\,000\\ \\mathrm{mA} = ' + mA(a * 1000)) + '.'])
        };
      }
      var k = P([0.22, 0.47, 1, 1.5, 2.2, 3.3, 4.7, 10, 22, 47]);
      return {
        type: 'Conversion de résistance', ask: 'Donne la résistance en ohms (Ω).', unit: 'Ω', answer: sig(k * 1000, 6),
        html: '<p>Une résistance porte l’indication ' + m(Rq() + ' = ' + T(k) + '\\ \\mathrm{k\\Omega}') + '. Convertis-la en ohms.</p>',
        traps: [{ value: k / 1000, msg: 'Le kilo-ohm est <b>plus grand</b> que l’ohm : ' + m('1\\ \\mathrm{k\\Omega} = 1\\,000\\ \\Omega') + ', on multiplie.' }, { value: k * 100, msg: m('1\\ \\mathrm{k\\Omega} = 1\\,000\\ \\Omega') + ' : on multiplie par 1 000.' }],
        solution: steps([m('1\\ \\mathrm{k\\Omega} = 1\\,000\\ \\Omega') + '.', m(Rq() + ' = ' + T(k) + ' \\times 1\\,000\\ \\Omega = ' + Ohm(k * 1000)) + '.'])
      };
    }

    /* ---- circuit série : même intensité partout ---- */
    function serieIntensite() {
      var i = P([between(0.05, 0.95, 0.01), between(0.1, 2, 0.05)]), inMA = rng() < 0.4, ans = inMA ? sig(i * 1000, 6) : i;
      var recs = [{ t: 'A', idx: '1' }, { t: 'L', name: 'L_1' }, { t: 'L', name: 'L_2' }];
      return {
        type: 'Intensité dans un circuit série', ask: ask('l’intensité mesurée par A₂', inMA ? 'milliampères (mA)' : 'ampères (A)'), unit: inMA ? 'mA' : 'A', answer: ans,
        html: '<p>Deux lampes et deux ampèremètres sont branchés en série. L’ampèremètre ' + m('\\mathrm{A_1}') + ' indique ' + m(Amp(i)) + '.</p>' +
          fig(FIG.loop({ recs: recs, bottom: [{ t: 'A', idx: '2' }], i: 'I', label: 'Circuit série : générateur, ampèremètre A1, lampes L1 et L2, ampèremètre A2 sur le fil du bas.' })) +
          '<p>Que mesure l’ampèremètre ' + m('\\mathrm{A_2}') + ' ?</p>',
        traps: [{ value: ans / 2, msg: 'Le courant n’est pas « consommé » par les lampes : dans un circuit série (sans nœud), l’intensité est la <b>même partout</b>.' },
          { value: ans * 2, msg: 'Les intensités ne s’ajoutent pas en série : il n’y a qu’une boucle, donc une seule intensité.' },
          inMA ? { value: i, msg: 'La réponse est demandée en <b>milliampères</b>.' } : null].filter(Boolean),
        solution: steps(['Il n’y a pas de nœud dans un circuit série : le même courant traverse tous les dipôles.', 'A₂ mesure la même intensité que A₁ : ' + m(Iq() + ' = ' + Amp(i) + (inMA ? ' = ' + mA(i * 1000) : '')) + '.'])
      };
    }

    /* ---- loi d'Ohm U = R × I (exercice 4) ---- */
    var RS = [10, 22, 47, 68, 100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700];
    function rText(r) { return r >= 1000 && rng() < 0.5 ? { tex: T(r / 1000) + '\\ \\mathrm{k\\Omega}', k: true } : { tex: Ohm(r), k: false }; }
    function ohmU() {
      var r = P(RS), imA = r >= 1000 ? between(0.5, 10, 0.5) : r >= 100 ? between(1, 50, 1) : between(10, 200, 5), i = imA / 1000, u = r * i, R = rText(r);
      var traps = [{ value: r * imA, msg: 'Convertis l’intensité en <b>ampères</b> : ' + m(mA(imA) + ' = ' + Amp(i)) + '. La loi d’Ohm s’écrit avec des ohms, des ampères et des volts.' },
        { value: r / i, msg: 'C’est ' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ' : on multiplie.' }];
      if (R.k) traps.push({ value: (r / 1000) * i, msg: 'Convertis la résistance en ohms : ' + m(R.tex + ' = ' + Ohm(r)) + '.' });
      return {
        type: 'Loi d’Ohm : calculer U', ask: ask('la tension U', 'volts (V)'), unit: 'V', answer: u, traps: traps,
        html: '<p>Une résistance ' + m(Rq() + ' = ' + R.tex) + ' est traversée par un courant d’intensité ' + m(Iq() + ' = ' + mA(imA)) + '.</p>' + fig(FIG.ohm({ name: 'R', i: 'I', u: 'U = ?' })) + '<p>Calcule la tension ' + m(Uq()) + ' à ses bornes.</p>',
        solution: steps([R.k ? m(R.tex + ' = ' + Ohm(r)) + '.' : null, m(Iq() + ' = ' + mA(imA) + ' = ' + Amp(i)) + '.', 'Loi d’Ohm : ' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq() + ' = ' + T(r) + ' \\times ' + T(i, 4) + ' = ' + V(u)) + '.'])
      };
    }
    function ohmR() {
      var r = P(RS), imA = r >= 1000 ? between(0.5, 10, 0.5) : r >= 100 ? between(1, 50, 1) : between(10, 200, 5), u = sig(r * imA / 1000, 3), ans = u / (imA / 1000);
      return {
        type: 'Loi d’Ohm : calculer R', ask: ask('la résistance R', 'ohms (Ω)'), unit: 'Ω', answer: ans,
        traps: [{ value: u / imA, msg: 'Convertis l’intensité en <b>ampères</b> : ' + m(mA(imA) + ' = ' + Amp(imA / 1000)) + '.' },
          { value: (imA / 1000) / u, msg: 'C’est l’inverse : ' + m(Rq() + ' = \\dfrac{' + Uq() + '}{' + Iq() + '}') + ', la tension au numérateur.' },
          { value: u * imA / 1000, msg: m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ' donne ' + m(Rq() + ' = \\dfrac{' + Uq() + '}{' + Iq() + '}') + ' : on divise.' }],
        html: '<p>Une résistance soumise à une tension ' + m(Uq() + ' = ' + V(u)) + ' est traversée par un courant d’intensité ' + m(Iq() + ' = ' + mA(imA)) + '.</p><p>Calcule sa résistance ' + m(Rq()) + '.</p>',
        solution: steps([m(Iq() + ' = ' + mA(imA) + ' = ' + Amp(imA / 1000)) + '.', 'Loi d’Ohm : ' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ', donc ' + m(Rq() + ' = \\dfrac{' + Uq() + '}{' + Iq() + '} = \\dfrac{' + T(u) + '}{' + T(imA / 1000, 4) + '} = ' + Ohm(ans)) + '.'])
      };
    }
    function ohmI() {
      var r = P(RS), u = P([1.5, 3, 4.5, 5, 6, 9, 12, 24]), R = rText(r), ans = u / r * 1000;
      var traps = [{ value: u / r, msg: 'Tu as trouvé l’intensité en ampères : la réponse est demandée en <b>milliampères</b> (× 1 000).' },
        { value: r / u * 1000, msg: 'C’est l’inverse : ' + m(Iq() + ' = \\dfrac{' + Uq() + '}{' + Rq() + '}') + '.' },
        { value: u * r * 1000, msg: m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ' donne ' + m(Iq() + ' = \\dfrac{' + Uq() + '}{' + Rq() + '}') + ' : on divise.' }];
      if (R.k) traps.push({ value: u / (r / 1000) * 1000, msg: 'Convertis la résistance en ohms : ' + m(R.tex + ' = ' + Ohm(r)) + '.' });
      return {
        type: 'Loi d’Ohm : calculer I', ask: ask('l’intensité I', 'milliampères (mA)'), unit: 'mA', answer: ans, traps: traps,
        html: '<p>On applique une tension ' + m(Uq() + ' = ' + V(u)) + ' aux bornes d’une résistance ' + m(Rq() + ' = ' + R.tex) + '.</p><p>Calcule l’intensité ' + m(Iq()) + ' du courant qui la traverse.</p>',
        solution: steps([R.k ? m(R.tex + ' = ' + Ohm(r)) + '.' : null, 'Loi d’Ohm : ' + m(Iq() + ' = \\dfrac{' + Uq() + '}{' + Rq() + '} = \\dfrac{' + T(u) + '}{' + T(r) + '} = ' + Amp(u / r)) + '.', m(Iq() + ' = ' + mA(ans)) + '.'])
      };
    }

    /* ---- exercice 4, n° 14 : deux résistances en série ---- */
    function serieR() {
      var E = P([5, 6, 9, 12]), r0 = P([100, 150, 220, 330, 470]), r = P([220, 330, 470, 560, 680, 1000]);
      var imA = sig(E / (r0 + r) * 1000, 2), i = imA / 1000, u0 = r0 * i, ur = E - u0, ans = ur / i;
      return {
        type: 'Calcul d’une résistance (série)', ask: ask('la résistance R', 'ohms (Ω)'), unit: 'Ω', answer: ans,
        traps: [{ value: E / i, msg: m('\\dfrac{' + Ug() + '}{' + Iq() + '}') + ' est la résistance de <b>tout</b> le circuit : il faut encore retirer les ' + m(Ohm(r0)) + ' de l’autre résistance.' },
          { value: ur / imA, msg: 'Convertis l’intensité en ampères : ' + m(mA(imA) + ' = ' + Amp(i)) + '.' },
          { value: E / i + r0, msg: 'Les résistances en série s’ajoutent : ' + m(Rq() + ' = \\dfrac{' + Ug() + '}{' + Iq() + '} - ' + T(r0) + '\\ \\Omega') + '.' },
          { value: u0 / i, msg: 'Ça, c’est la résistance de ' + m(Ohm(r0)) + '. Calcule plutôt la tension aux bornes de ' + m(Rq()) + ' avec la loi des mailles.' }],
        html: '<p>Un générateur de tension ' + m(Ug() + ' = ' + V(E)) + ' alimente une résistance de ' + m(Ohm(r0)) + ' en série avec une résistance ' + m(Rq()) + '. L’intensité du courant vaut ' + m(Iq() + ' = ' + mA(imA)) + '.</p>' +
          fig(FIG.ex4(14, { E: fr(E) + ' V', I: 'I = ' + fr(imA) + ' mA', R0: fr(r0) + ' Ω', label: 'Générateur de ' + fr(E) + ' V, résistance de ' + fr(r0) + ' ohms puis résistance R en série, I = ' + fr(imA) + ' mA.' })) +
          '<p>Calcule ' + m(Rq()) + '.</p>',
        solution: steps([
          'Même intensité partout (circuit série) : ' + m(Iq() + ' = ' + Amp(i)) + '.',
          'Loi d’Ohm pour ' + m(Ohm(r0)) + ' : ' + m(Uq('CD') + ' = ' + T(r0) + ' \\times ' + T(i, 4) + ' = ' + V(u0)) + '.',
          'Loi des mailles : ' + m(Uq('DE') + ' = ' + Ug() + ' - ' + Uq('CD') + ' = ' + T(E) + ' - ' + T(u0, 4) + ' = ' + V(ur)) + '.',
          'Loi d’Ohm pour ' + m(Rq()) + ' : ' + m(Rq() + ' = \\dfrac{' + Uq('DE') + '}{' + Iq() + '} = \\dfrac{' + T(ur, 4) + '}{' + T(i, 4) + '} = ' + Ohm(ans)) + '.'
        ])
      };
    }

    /* ---- exercice 4, n° 15 : résistance en dérivation ---- */
    function mixteR() {
      var E, r0, rp, r, imA, i, u0, up, ip, ir, ans, tries = 0;
      do {
        E = P([5, 6, 9, 12]); r0 = P([220, 330, 470]); rp = P([330, 470, 680, 1000]); r = P([150, 220, 330, 470, 680]);
        imA = sig(E / (r0 + r * rp / (r + rp)) * 1000, 2); i = imA / 1000;
        u0 = r0 * i; up = E - u0; ip = up / rp; ir = i - ip; ans = up / ir;
      } while ((!(ir > 0) || Math.abs(ans - r) / r > 0.25) && ++tries < 50);
      if (tries >= 50) { E = 5; r0 = 470; rp = 470; imA = 8; i = 0.008; u0 = 3.76; up = 1.24; ip = up / rp; ir = i - ip; ans = up / ir; }
      return {
        type: 'Calcul d’une résistance (dérivation)', ask: ask('la résistance R', 'ohms (Ω)'), unit: 'Ω', answer: ans,
        traps: [{ value: up / i, msg: 'Au nœud D, le courant ' + m(Iq()) + ' se partage : seule une partie traverse ' + m(Rq()) + '. Calcule ' + m(Iq('R') + ' = ' + Iq() + ' - ' + Iq('p')) + ' avec la loi des nœuds.' },
          { value: E / i, msg: m('\\dfrac{' + Ug() + '}{' + Iq() + '}') + ' est la résistance de tout le circuit, pas celle de ' + m(Rq()) + '.' },
          { value: up / (imA - ip), msg: 'Mets les intensités dans la même unité : ' + m(mA(imA) + ' = ' + Amp(i)) + '.' }],
        html: '<p>Un générateur de tension ' + m(Ug() + ' = ' + V(E)) + ' alimente une résistance de ' + m(Ohm(r0)) + ', suivie de deux résistances en dérivation : ' + m(Rq()) + ' et ' + m(Ohm(rp)) + '. L’intensité dans le générateur vaut ' + m(Iq() + ' = ' + mA(imA)) + '.</p>' +
          fig(FIG.ex4(15, { E: fr(E) + ' V', I: 'I = ' + fr(imA) + ' mA', R0: fr(r0) + ' Ω', Rp: fr(rp) + ' Ω', label: 'Générateur de ' + fr(E) + ' V ; résistance de ' + fr(r0) + ' ohms, puis R en dérivation avec ' + fr(rp) + ' ohms ; I = ' + fr(imA) + ' mA.' })) +
          '<p>Calcule ' + m(Rq()) + '.</p>',
        solution: steps([
          'Loi d’Ohm pour ' + m(Ohm(r0)) + ' : ' + m(Uq('CD') + ' = ' + T(r0) + ' \\times ' + T(i, 4) + ' = ' + V(u0)) + '.',
          'Loi des mailles : ' + m(Uq('DE') + ' = ' + Ug() + ' - ' + Uq('CD') + ' = ' + V(up)) + ' ; c’est la tension des deux résistances en dérivation.',
          'Loi d’Ohm pour ' + m(Ohm(rp)) + ' : ' + m(Iq('p') + ' = \\dfrac{' + T(up, 4) + '}{' + T(rp) + '} = ' + Amp(ip)) + '.',
          'Loi des nœuds en D : ' + m(Iq('R') + ' = ' + Iq() + ' - ' + Iq('p') + ' = ' + T(i, 4) + ' - ' + T(ip, 4) + ' = ' + Amp(ir)) + '.',
          m(Rq() + ' = \\dfrac{' + Uq('DE') + '}{' + Iq('R') + '} = \\dfrac{' + T(up, 4) + '}{' + T(ir, 4) + '} = ' + Ohm(ans)) + '.'
        ])
      };
    }

    /* ---- exercice 3 : nœud C, mailles ABCFA et CDEFC ---- */
    function mixte() {
      var E = P([6, 9, 10, 12, 24]), u1 = between(E * 0.2, E * 0.8, 0.5), i1 = between(0.05, 0.5, 0.01), i2mA = between(Math.round(i1 * 200), Math.round(i1 * 800), 1);
      var i2 = i2mA / 1000, i3 = sig(i1 - i2, 6), u2 = sig(E - u1, 6), u3 = u2, target = P(['I3', 'I3', 'U2', 'U3', 'R1', 'R2', 'R3']);
      var labels = { E: 'E = ' + fr(E) + ' V', U1: 'U_1 = ' + fr(u1) + ' V', I1: 'I_1 = ' + fr(i1) + ' A', I2: 'I_2 = ' + fr(i2mA) + ' mA', U2: 'U_2', U3: 'U_3', I3: 'I_3' };
      var data = '<p>Données : ' + m(Ug() + ' = ' + V(E)) + ', ' + m(Uq(1) + ' = ' + V(u1)) + ', ' + m(Iq(1) + ' = ' + Amp(i1)) + ', ' + m(Iq(2) + ' = ' + mA(i2mA)) + '.</p>';
      var mABCFA = 'Maille ABCFA : ' + m(Ug() + ' - ' + Uq(1) + ' - ' + Uq(2) + ' = 0') + ', donc ' + m(Uq(2) + ' = ' + Ug() + ' - ' + Uq(1) + ' = ' + T(E) + ' - ' + T(u1) + ' = ' + V(u2)) + '.';
      var nodeC = 'Nœud C : ' + m(Iq(1) + ' = ' + Iq(2) + ' + ' + Iq(3)) + ', donc ' + m(Iq(3) + ' = ' + Iq(1) + ' - ' + Iq(2) + ' = ' + T(i1) + ' - ' + T(i2) + ' = ' + Amp(i3)) + '.';
      var mCDEFC = 'Maille CDEFC : ' + m(Uq(2) + ' - ' + Uq(3) + ' = 0') + ', donc ' + m(Uq(3) + ' = ' + Uq(2) + ' = ' + V(u3)) + ' (R₂ et R₃ sont en dérivation entre C et F).';
      var o = { type: 'Lois des nœuds et des mailles : exercice 3', ask: 'Donne le résultat à 3 chiffres significatifs, dans l’unité indiquée.' }, sol;
      if (target === 'I3') {
        labels.I3 = 'I_3 = ?'; o.answer = i3; o.unit = 'A'; o.ref = 'c-loi-noeuds'; o.what = Iq(3);
        o.traps = [{ value: i1 + i2, msg: m(Iq(1)) + ' arrive au nœud C et s’y partage entre ' + m(Iq(2)) + ' et ' + m(Iq(3)) + ' : ' + m(Iq(3) + ' = ' + Iq(1) + ' - ' + Iq(2)) + '.' },
          { value: i1 - i2mA, msg: 'Convertis ' + m(Iq(2) + ' = ' + mA(i2mA) + ' = ' + Amp(i2)) + ' avant de soustraire.' },
          { value: i3 * 1000, msg: 'La réponse est demandée en <b>ampères</b>.' }];
        sol = ['Conversion : ' + m(Iq(2) + ' = ' + mA(i2mA) + ' = ' + Amp(i2)) + '.', nodeC];
      } else if (target === 'U2' || target === 'U3') {
        var u3t = target === 'U3';
        labels[target] = (u3t ? 'U_3' : 'U_2') + ' = ?'; o.answer = u2; o.unit = 'V'; o.ref = 'c-maille'; o.what = u3t ? Uq(3) : Uq(2);
        o.traps = [{ value: E + u1, msg: 'Dans la maille ABCFA, ' + m(Ug()) + ' se partage entre ' + m(Uq(1)) + ' et ' + m(Uq(2)) + ' : ' + m(Uq(2) + ' = ' + Ug() + ' - ' + Uq(1)) + '.' },
          { value: E, msg: 'La tension ' + m(Ug()) + ' n’est pas tout entière aux bornes de ' + (u3t ? 'R₃' : 'R₂') + ' : il faut retirer ' + m(Uq(1)) + '.' },
          { value: (E - u1) / 2, msg: (u3t ? 'R₂ et R₃' : 'Les dipôles') + ' en dérivation ne se partagent pas la tension : ils ont la même.' }];
        sol = [mABCFA, u3t ? mCDEFC : null];
      } else {
        var k = +target[1], uu = [u1, u2, u3][k - 1], ii = [i1, i2, i3][k - 1], ans = uu / ii;
        labels['R' + k] = 'R_' + k + ' = ?'; o.answer = ans; o.unit = 'Ω'; o.ref = 'c-ohm'; o.what = Rq(k);
        o.traps = [{ value: ii / uu, msg: 'Loi d’Ohm : ' + m(Rq(k) + ' = \\dfrac{' + Uq(k) + '}{' + Iq(k) + '}') + ', la tension au numérateur.' }];
        if (k === 2) o.traps.push({ value: uu / i2mA, msg: 'Convertis ' + m(Iq(2) + ' = ' + mA(i2mA) + ' = ' + Amp(i2)) + '.' }, { value: E / i2, msg: 'La tension aux bornes de R₂ n’est pas ' + m(Ug()) + ' : calcule d’abord ' + m(Uq(2) + ' = ' + Ug() + ' - ' + Uq(1)) + '.' });
        if (k === 3) o.traps.push({ value: uu / i1, msg: 'R₃ n’est traversée que par ' + m(Iq(3) + ' = ' + Iq(1) + ' - ' + Iq(2)) + ', pas par ' + m(Iq(1)) + '.' }, { value: uu / i2, msg: 'R₃ est traversée par ' + m(Iq(3)) + ', pas par ' + m(Iq(2)) + '.' });
        if (k === 1) o.traps.push({ value: E / i1, msg: 'La tension aux bornes de R₁ est ' + m(Uq(1)) + ', pas ' + m(Ug()) + '.' });
        sol = [k === 2 ? 'Conversion : ' + m(Iq(2) + ' = ' + mA(i2mA) + ' = ' + Amp(i2)) + '.' : null, k >= 2 ? mABCFA : null, k === 3 ? mCDEFC : null, k === 3 ? nodeC : null,
          'Loi d’Ohm : ' + m(Rq(k) + ' = \\dfrac{' + Uq(k) + '}{' + Iq(k) + '} = \\dfrac{' + T(uu, 4) + '}{' + T(ii, 4) + '} = ' + Ohm(ans)) + '.'];
      }
      o.html = '<p>Dans le montage de l’exercice 3 de la fiche :</p>' + fig(FIG.ex3(labels)) + data + '<p>Calcule ' + m(o.what) + '.</p>';
      o.ask = ask('le résultat', UNITW[o.unit]);
      delete o.what;
      o.solution = steps(sol);
      return o;
    }

    /* ---- appareils de mesure (exercice 2, question 2) ---- */
    function ammeter() {
      var v = P(['amp', 'volt', 'com', 'uab']);
      if (v === 'amp') return mcq({ type: 'Ampèremètre', ref: 'c-mesures', html: '<p>Un ampèremètre se branche :</p>', solution: '<p>En <b>série</b>, dans la branche dont on veut mesurer l’intensité : le courant doit le traverser. Il entre par la borne mA (ou A) et sort par COM.</p>' },
        'en série, dans la branche où l’on mesure le courant', [{ html: 'en dérivation, aux bornes du dipôle', why: 'C’est le branchement du <b>voltmètre</b>. L’ampèremètre doit être traversé par le courant : en série.' }, { html: 'n’importe où, il mesure toujours le même courant', why: 'Dans un circuit avec des nœuds, chaque branche a sa propre intensité : l’ampèremètre mesure celle de <b>sa</b> branche.' }]);
      if (v === 'volt') return mcq({ type: 'Voltmètre', ref: 'c-mesures', html: '<p>Un voltmètre se branche :</p>', solution: '<p>En <b>dérivation</b>, aux bornes du dipôle dont on mesure la tension.</p>' },
        'en dérivation, aux bornes du dipôle', [{ html: 'en série avec le dipôle', why: 'C’est le branchement de l’<b>ampèremètre</b>. La tension se mesure entre deux points : aux bornes du dipôle.' }, { html: 'à la place du générateur', why: 'Le voltmètre ne fournit pas d’énergie : il se branche aux bornes du dipôle étudié.' }]);
      if (v === 'com') return mcq({ type: 'Borne COM', ref: 'c-mesures', html: '<p>Dans un ampèremètre bien branché, le courant <b>sort</b> par la borne :</p>', solution: '<p>Le courant entre par la borne <b>mA</b> (ou A) et sort par la borne <b>COM</b> : la borne COM est donc du côté de la borne − du générateur.</p>' },
        'COM', [{ html: 'mA (ou A)', why: 'C’est par la borne mA (ou A) que le courant <b>entre</b>. Il sort par COM.' }, { html: 'V', why: 'La borne V est celle du voltmètre, pas de l’ampèremètre.' }]);
      return mcq({ type: 'Mesurer une tension', ref: 'c-mesures', html: '<p>Pour mesurer ' + m(Uq('AB')) + ' avec un voltmètre, on relie :</p>', solution: '<p>La borne <b>V</b> au point <b>A</b> et la borne <b>COM</b> au point <b>B</b> : le voltmètre affiche ' + m('V_A - V_B = ' + Uq('AB')) + '.</p>' },
        'la borne V au point A et la borne COM au point B', [{ html: 'la borne V au point B et la borne COM au point A', why: 'Le voltmètre afficherait ' + m(Uq('BA') + ' = -' + Uq('AB')) + ' : la valeur aurait le mauvais signe.' }, { html: 'la borne mA au point A et la borne COM au point B', why: 'La borne mA sert à mesurer une intensité. Pour une tension, on utilise la borne V.' }]);
    }

    /* ---- vocabulaire et énoncés du cours ---- */
    var CONCEPTS = [
      function () { return mcq({ type: 'Maille', ref: 'c-maille', html: '<p>Une maille est :</p>', solution: '<p>Une <b>boucle fermée</b> du circuit. On lui donne toujours un sens de parcours.</p>' },
        'une boucle fermée du circuit, à laquelle on donne un sens de parcours', [{ html: 'un point où se rejoignent au moins trois fils', why: 'Ça, c’est un <b>nœud</b>.' }, { html: 'une portion de circuit entre deux nœuds', why: 'Ça, c’est une <b>branche</b>. Une maille est une boucle fermée.' }]); },
      function () { return mcq({ type: 'Nœud', ref: 'c-noeud', html: '<p>Un nœud est :</p>', solution: '<p>Une intersection d’<b>au moins trois fils</b> du circuit.</p>' },
        'une intersection d’au moins trois fils', [{ html: 'une intersection de deux fils', why: 'Deux fils bout à bout forment un simple fil : il faut <b>au moins trois</b> fils pour un nœud.' }, { html: 'une boucle fermée du circuit', why: 'Ça, c’est une <b>maille</b>.' }]); },
      function () { return mcq({ type: 'Loi des mailles', ref: 'c-maille', html: '<p>Dans une maille fléchée, la somme des tensions (comptées avec leur signe selon le sens de parcours) est :</p>', solution: '<p><b>Nulle</b>. Par exemple ' + m(Ug() + ' - ' + Uq(1) + ' - ' + Uq(2) + ' = 0') + '.</p>' },
        'nulle', [{ html: 'égale à la tension du générateur', why: 'La tension du générateur fait partie de la somme : ' + m(Ug() + ' - ' + Uq(1) + ' - ' + Uq(2) + ' = 0') + '. C’est cette somme qui est nulle.' }, { html: 'égale à la somme des intensités', why: 'On ne mélange pas tensions (V) et intensités (A).' }]); },
      function () { return mcq({ type: 'Loi des nœuds', ref: 'c-loi-noeuds', html: '<p>La loi des nœuds dit que :</p>', solution: '<p>La somme des intensités des courants qui <b>entrent</b> dans un nœud est égale à la somme des intensités des courants qui en <b>sortent</b>.</p>' },
        'la somme des intensités qui entrent dans un nœud est égale à la somme des intensités qui en sortent', [{ html: 'l’intensité est la même dans toutes les branches', why: 'C’est vrai seulement dans un circuit série, sans nœud. À un nœud, le courant se partage.' }, { html: 'les courants qui sortent d’un nœud ont toujours la même intensité', why: 'Ils se partagent selon les dipôles des branches : la plus petite résistance reçoit le plus grand courant.' }]); },
      function () { return mcq({ type: 'Sens du courant', ref: 'c-continu', html: '<p>À l’extérieur du générateur, le sens conventionnel du courant va :</p>', solution: '<p>De la borne <b>+</b> vers la borne <b>−</b> du générateur.</p>' },
        'de la borne + vers la borne − du générateur', [{ html: 'de la borne − vers la borne + du générateur', why: 'C’est le sens de déplacement des électrons. Le sens conventionnel du courant est l’inverse : du + vers le −.' }, { html: 'dans les deux sens à la fois', why: 'En régime continu, le courant garde le même sens : du + vers le − à l’extérieur du générateur.' }]); },
      function () { return mcq({ type: 'Régime continu', ref: 'c-continu', html: '<p>En régime continu, la tension et l’intensité :</p>', solution: '<p>Restent <b>constantes au cours du temps</b> (pile, batterie, alimentation stabilisée).</p>' },
        'restent constantes au cours du temps', [{ html: 'changent de signe périodiquement', why: 'C’est un régime <b>alternatif</b> (chapitre suivant : régime variable).' }, { html: 'augmentent au cours du temps', why: 'En régime continu, elles ne varient pas.' }]); },
      function () { return mcq({ type: 'Unités', ref: 'c-ohm', html: '<p>La résistance ' + m(Rq()) + ' d’un dipôle s’exprime en :</p>', solution: '<p>En <b>ohms</b> (Ω). La tension est en volts (V), l’intensité en ampères (A).</p>' },
        'ohms (Ω)', [{ html: 'volts (V)', why: 'Le volt est l’unité de la <b>tension</b>.' }, { html: 'ampères (A)', why: 'L’ampère est l’unité de l’<b>intensité</b>.' }, { html: 'watts (W)', why: 'Le watt est l’unité de la puissance.' }]); },
      function () { return mcq({ type: 'Circuit série', ref: 'c-serie', html: '<p>Dans un circuit série (une seule boucle, sans nœud), l’intensité :</p>', solution: '<p>Est la <b>même en tout point</b> du circuit.</p>' },
        'est la même en tout point', [{ html: 'diminue après chaque récepteur', why: 'Le courant n’est pas « consommé » : les charges qui entrent dans un dipôle en ressortent. Sans nœud, l’intensité ne change pas.' }, { html: 'se partage entre les récepteurs', why: 'Le courant ne se partage qu’à un <b>nœud</b>.' }]); },
      function () { return mcq({ type: 'Dérivation', ref: 'c-derivation', html: '<p>Deux dipôles branchés en dérivation ont toujours :</p>', solution: '<p>La <b>même tension</b> à leurs bornes (loi des mailles).</p>' },
        'la même tension à leurs bornes', [{ html: 'la même intensité', why: 'C’est le cas de deux dipôles en <b>série</b>. En dérivation, le courant se partage.' }, { html: 'des tensions qui s’ajoutent pour donner celle du générateur', why: 'C’est le cas des dipôles en <b>série</b>.' }]); },
      function () { return mcq({ type: 'Loi d’Ohm', ref: 'c-ohm', html: '<p>La loi d’Ohm, pour une résistance fléchée en convention récepteur, s’écrit :</p>', solution: '<p>' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ', avec ' + m(Uq()) + ' en volts, ' + m(Rq()) + ' en ohms et ' + m(Iq()) + ' en ampères.</p>' },
        m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()), [{ html: m(Rq() + ' = ' + Uq() + ' \\times ' + Iq()), why: 'De ' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ' on tire ' + m(Rq() + ' = \\dfrac{' + Uq() + '}{' + Iq() + '}') + ' : on divise.' }, { html: m(Iq() + ' = ' + Rq() + ' \\times ' + Uq()), why: 'De ' + m(Uq() + ' = ' + Rq() + ' \\times ' + Iq()) + ' on tire ' + m(Iq() + ' = \\dfrac{' + Uq() + '}{' + Rq() + '}') + '.' }]); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = {
      convention: convention, notation: notation, mailleSerie: mailleSerie, mailleFleche: mailleFleche, derivation: derivation,
      noeud: noeud, noeudMulti: noeudMulti, conversion: conversion, serieIntensite: serieIntensite,
      ohmU: ohmU, ohmR: ohmR, ohmI: ohmI, serieR: serieR, mixteR: mixteR, mixte: mixte, ammeter: ammeter, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      convention: 'c-fleche', notation: 'c-fleche', mailleSerie: 'c-maille', mailleFleche: 'c-maille', derivation: 'c-derivation',
      noeud: 'c-loi-noeuds', noeudMulti: 'c-loi-noeuds', conversion: 'c-continu', serieIntensite: 'c-serie',
      ohmU: 'c-ohm', ohmR: 'c-ohm', ohmI: 'c-ohm', serieR: 'c-methode', mixteR: 'c-methode', mixte: 'c-methode', ammeter: 'c-mesures', concept: 'c-maille'
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
      convention: 2, notation: 2, mailleSerie: 3, mailleFleche: 3, derivation: 2, noeud: 3, noeudMulti: 2, conversion: 1,
      serieIntensite: 1, ohmU: 2, ohmR: 2, ohmI: 2, serieR: 3, mixteR: 1, mixte: 3, ammeter: 1, concept: 2
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
        pts(P(['convention', 'ammeter', 'concept']), 2), pts(P(['notation', 'conversion']), 2), pts(P(['mailleSerie', 'derivation']), 2),
        pts('mailleFleche', 3), pts(P(['noeud', 'noeudMulti']), 3), pts(P(['ohmU', 'ohmR', 'ohmI']), 2), pts('serieR', 3), pts(P(['mixte', 'mixteR']), 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return { make: make, EXAM_QUESTIONS: 8, FIG: FIG, isInt: isInt };
});
