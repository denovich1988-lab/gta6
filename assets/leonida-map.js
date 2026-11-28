/* gta6box interactive Leonida map.
   Our own schematic drawing (not Rockstar artwork, not traced from fan maps).
   Region placement follows what Rockstar and several guides agree on;
   shapes and distances are illustrative, not to scale. */
(function () {
  var REGIONS = [
    {
      id: 'kalaga', name: 'Mount Kalaga National Park', color: '#3fe0cf',
      d: 'M40,40 L500,30 L503,130 L300,140 L40,130 Z', label: [270, 88],
      text: 'A national park near the northern border of the state: forests, hills and backcountry for hunting, fishing and hiking.',
      facts: ['Wildlife here includes deer and forest predators', 'The Strangers and Freaks mission “Veteran Hunted” starts near Mount Kalaga'],
      links: [['GTA 6 animals', '/map/gta-6-animals/'], ['Strangers and Freaks side missions', '/missions/gta-6-strangers-and-freaks/']]
    },
    {
      id: 'gellhorn', name: 'Port Gellhorn', color: '#ffa24a',
      d: 'M40,130 L300,140 L280,250 L180,300 L110,250 L60,215 L35,150 Z', label: [165, 205],
      text: 'A run-down town on the west coast that Rockstar calls Leonida’s forgotten coast: cheap motels, shut-down attractions and empty strip malls.',
      facts: ['A former holiday spot that has seen better days', 'Some guides place the motel from “What’s in the Bag?” here'],
      links: [['Port Gellhorn guide', '/map/port-gellhorn-gta-6/'], ['What’s in the Bag? walkthrough', '/missions/gta-6-whats-in-the-bag-walkthrough/']]
    },
    {
      id: 'ambrosia', name: 'Ambrosia', color: '#ff8f6b',
      d: 'M300,140 L503,130 L505,190 L440,210 L420,300 L330,320 L280,250 Z', label: [375, 285],
      text: 'An industrial town built around a sugar refinery, next to Lake Leonida.',
      facts: ['Home of the Demolition Derby at Ambrosia Raceway', 'Rockstar says the battle for health and wealth in Leonida begins here'],
      links: [['How to make money in GTA 6', '/cheats/how-to-make-money-in-gta-6/']]
    },
    {
      id: 'grassrivers', name: 'Grassrivers', color: '#7bd88f',
      d: 'M180,300 L280,250 L330,320 L360,420 L320,500 L250,560 L215,500 L185,420 L150,330 Z', label: [258, 405],
      text: 'Swamp and wetland wilderness in the south-west, inspired by the Everglades.',
      facts: ['Alligator and wading-bird country', 'Airboats are the natural way to get around'],
      links: [['GTA 6 animals', '/map/gta-6-animals/']]
    },
    {
      id: 'vice', name: 'Vice City', color: '#ff5fa2',
      d: 'M330,320 L420,300 L430,420 L405,500 L360,560 L300,585 L250,560 L320,500 L360,420 Z', label: [385, 450],
      text: 'The main city on the south-east coast, inspired by Miami: beaches, nightlife and neon.',
      facts: ['The densest, most urban part of the map', 'The first Vice City since 2002'],
      links: [['Vice City guide', '/map/gta-6-vice-city/'], ['Fast travel', '/map/gta-6-fast-travel/'], ['GTA 6 map size', '/map/gta-6-map-size/']]
    },
    {
      id: 'keys', name: 'Leonida Keys', color: '#5fb8ff',
      keys: true, label: [175, 600],
      text: 'A chain of tropical islands south of Vice City, inspired by the Florida Keys.',
      facts: ['Jason Duval is based here at the start of the story', 'Coastal wildlife: pelicans, gulls, dolphins and sharks'],
      links: [['Jason Duval', '/characters/gta-6-jason-duval/'], ['GTA 6 animals', '/map/gta-6-animals/']]
    }
  ];
  var LAND = 'M40,40 L500,30 L505,190 L440,210 L420,300 L430,420 L405,500 L360,560 L300,585 L250,560 L215,500 L185,420 L150,330 L110,250 L60,215 L35,150 Z';
  var ISLES = [[268, 606, 16, 7], [232, 618, 14, 6], [198, 626, 13, 6], [164, 630, 12, 5], [131, 628, 11, 5], [101, 622, 9, 4]];
  var NS = 'http://www.w3.org/2000/svg';

  var CSS = '.leo{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;margin:24px 0;background:var(--dusk,#1f1738);border:1px solid var(--line,#3b2f63);border-radius:16px;padding:16px}' +
    '.leo svg{width:100%;height:auto;display:block;border-radius:12px;background:radial-gradient(120% 90% at 70% 100%,#1b4b5a 0%,#132f45 45%,#140f26 100%)}' +
    '.leo .rg{cursor:pointer;transition:fill-opacity .15s}.leo .rg:focus{outline:none}.leo .rg:hover,.leo .rg.on,.leo .rg:focus-visible{fill-opacity:.62}' +
    '.leo .rg.on{stroke:#fdf1e3;stroke-width:2.5}.leo text{font-family:var(--display,Impact,sans-serif);fill:#fdf1e3;font-size:15px;letter-spacing:.04em;text-transform:uppercase;pointer-events:none;paint-order:stroke;stroke:#140f26;stroke-width:3px}' +
    '.leo .note{font-size:12px;color:var(--sand-3,#a79bbd);margin:8px 2px 0}' +
    '.leo-p h3{margin:0 0 6px;font-family:var(--display,Impact,sans-serif);text-transform:uppercase;letter-spacing:.03em;font-size:26px}' +
    '.leo-p p{margin:0 0 10px;color:var(--sand-2,#cfc3dd)}.leo-p ul{margin:0 0 12px;padding-left:18px}.leo-p li{margin:4px 0}' +
    '.leo-p .lk{display:flex;flex-wrap:wrap;gap:8px}.leo-p .lk a{display:inline-block;padding:7px 12px;border-radius:999px;background:var(--panel,#271d47);border:1px solid var(--line,#3b2f63);color:var(--sand,#fdf1e3);text-decoration:none;font-size:14px}' +
    '.leo-p .lk a:hover{border-color:var(--teal,#3fe0cf)}' +
    '.leo-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.leo-tabs button{font:inherit;font-size:13px;cursor:pointer;border-radius:999px;padding:6px 11px;border:1px solid var(--line,#3b2f63);background:transparent;color:var(--sand-2,#cfc3dd)}' +
    '.leo-tabs button[aria-pressed=true]{color:#140f26;border-color:transparent}' +
    '@media (max-width:760px){.leo{grid-template-columns:1fr}}';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, html) { var n = document.createElement(tag); if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build(root) {
    if (!document.getElementById('leo-css')) { var st = h('style', CSS); st.id = 'leo-css'; document.head.appendChild(st); }
    root.classList.add('leo');
    var left = h('div'), right = h('div');
    right.className = 'leo-p';
    right.setAttribute('aria-live', 'polite');
    root.appendChild(left); root.appendChild(right);

    var svg = el('svg', { viewBox: '0 0 540 660', role: 'img', 'aria-label': 'Schematic map of the six regions of Leonida in GTA 6' });
    left.appendChild(svg);
    el('path', { d: LAND, fill: '#2b2350', stroke: '#3fe0cf', 'stroke-opacity': '.5', 'stroke-width': '2' }, svg);
    var shapes = {};
    REGIONS.forEach(function (r) {
      var g = el('g', { 'class': 'rg', tabindex: '0', role: 'button', 'aria-label': r.name, fill: r.color, 'fill-opacity': '.32', stroke: r.color, 'stroke-opacity': '.9', 'stroke-width': '1.5' }, svg);
      if (r.keys) {
        el('path', { d: 'M300,585 Q285,600 268,606 L232,618 L198,626 L164,630 L131,628 L101,622', fill: 'none', stroke: r.color, 'stroke-dasharray': '4 5', 'stroke-width': '2' }, g);
        ISLES.forEach(function (i) { el('ellipse', { cx: i[0], cy: i[1], rx: i[2], ry: i[3] }, g); });
        el('rect', { x: 90, y: 595, width: 195, height: 45, fill: 'transparent', stroke: 'none' }, g);
      } else {
        el('path', { d: r.d }, g);
      }
      if (r.id === 'ambrosia') el('ellipse', { cx: 410, cy: 225, rx: 30, ry: 21, fill: '#1b4b5a', 'fill-opacity': '1', stroke: '#3fe0cf', 'stroke-opacity': '.6' }, svg);
      shapes[r.id] = g;
      g.addEventListener('click', function () { show(r.id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(r.id); } });
    });
    REGIONS.forEach(function (r) {
      var lines = r.name === 'Mount Kalaga National Park' ? ['Mount Kalaga', 'National Park'] : [r.name];
      lines.forEach(function (t, i) { var tx = el('text', { x: r.label[0], y: r.label[1] + i * 17, 'text-anchor': 'middle' }, svg); tx.textContent = t; });
    });
    var lk = el('text', { x: 410, y: 230, 'text-anchor': 'middle', style: 'font-size:10px' }, svg); lk.textContent = 'Lake Leonida';
    var comp = el('text', { x: 505, y: 625, 'text-anchor': 'middle', style: 'font-size:13px' }, svg); comp.textContent = 'N ↑';
    var note = h('p', 'Schematic map drawn by gta6box, not to scale. Region positions follow Rockstar’s descriptions and agreeing guides; exact borders are approximate.');
    note.className = 'note';
    left.appendChild(note);

    var tabs = h('div'); tabs.className = 'leo-tabs';
    REGIONS.forEach(function (r) {
      var b = h('button', esc(r.name)); b.type = 'button'; b.dataset.id = r.id;
      b.addEventListener('click', function () { show(r.id); });
      tabs.appendChild(b);
    });
    var body = h('div');
    right.appendChild(tabs); right.appendChild(body);

    function show(id) {
      var r = REGIONS.filter(function (x) { return x.id === id; })[0];
      for (var k in shapes) shapes[k].classList.toggle('on', k === id);
      [].forEach.call(tabs.children, function (b) {
        var on = b.dataset.id === id;
        b.setAttribute('aria-pressed', on);
        b.style.background = on ? REGIONS.filter(function (x) { return x.id === b.dataset.id; })[0].color : 'transparent';
      });
      body.innerHTML = '<h3 style="color:' + r.color + '">' + esc(r.name) + '</h3><p>' + esc(r.text) + '</p><ul>' +
        r.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><div class="lk">' +
        r.links.map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join('') + '</div>';
    }
    show('vice');
  }

  function init() { [].forEach.call(document.querySelectorAll('.leo-map'), build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
