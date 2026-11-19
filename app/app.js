// Leonida Trophy Guide: tracker for the 55 GTA VI trophies on PS5.
// Progress and settings live in localStorage; export/import move them as a file.
// Everything runs offline: the only fetches are the app's own data files.
const EARNED_KEY = 'leonida-trophies-earned-v1';
const SETTINGS_KEY = 'leonida-trophies-settings-v1';
const SAMPLE_IDS = [2, 3, 8, 15, 16, 20, 21, 28, 35, 42, 52, 53];

const listEl = document.getElementById('trophyList');
const countLine = document.getElementById('countLine');
const emptyNote = document.getElementById('emptyNote');
const onlineNote = document.getElementById('onlineNote');
const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const earnedOnly = document.getElementById('earnedOnly');
const spoilerToggle = document.getElementById('spoilerToggle');
const kindFilters = document.getElementById('kindFilters');

let trophies = [];
let roadmap = { facts: [], stages: [], missable_note: '' };
let earned = new Set(readStored(EARNED_KEY));
let kind = 'all';
let openId = null;

function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
}

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'); } catch { return {}; }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    kind, grade: gradeFilter.value, search: searchInput.value,
    earnedOnly: earnedOnly.checked, spoilers: spoilerToggle.checked,
  }));
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isHidden(t) { return t.hidden && spoilerToggle.checked && !earned.has(t.id); }

function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

function kindLabel(t) {
  return t.kind;
}

function renderFacts() {
  const box = document.getElementById('facts');
  box.replaceChildren();
  for (const f of roadmap.facts) {
    const div = document.createElement('div');
    div.className = 'fact';
    const b = document.createElement('b');
    b.textContent = f.value;
    const span = document.createElement('span');
    span.textContent = f.label;
    div.append(b, span);
    box.append(div);
  }
}

function renderRoadmap() {
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  const stageCounts = {};
  for (const t of trophies) stageCounts[t.roadmap_stage] = (stageCounts[t.roadmap_stage] ?? 0) + 1;
  for (const s of roadmap.stages) {
    const li = document.createElement('li');
    const h3 = document.createElement('h3');
    h3.textContent = 'Stage ' + s.stage + ' — ' + s.title;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = s.hours + ' · ' + s.trophies;
    const body = document.createElement('p');
    body.textContent = s.body;
    const count = document.createElement('p');
    count.className = 'stage-count';
    const got = trophies.filter((t) => t.roadmap_stage === s.stage && earned.has(t.id)).length;
    count.textContent = got + ' of ' + (stageCounts[s.stage] ?? 0) + ' trophies in this stage earned';
    li.append(h3, meta, body, count);
    stagesEl.append(li);
  }
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = 'badge ' + cls;
  s.textContent = text;
  return s;
}

function renderGuide(t, host) {
  const box = document.createElement('div');
  box.className = 'trophy-guide';
  const h = document.createElement('h4');
  h.textContent = 'How to earn it';
  const p = document.createElement('p');
  p.textContent = t.guide;
  box.append(h, p);
  if (t.steps && t.steps.length) {
    const ol = document.createElement('ol');
    for (const step of t.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.append(li);
    }
    box.append(ol);
  }
  const src = document.createElement('p');
  src.className = 'guide-sources';
  src.textContent = 'Sources: ';
  (t.sources || []).forEach((s, i) => {
    if (i > 0) src.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    src.append(a);
  });
  box.append(src);
  host.append(box);
}

function renderList() {
  listEl.replaceChildren();
  const q = searchInput.value.trim().toLowerCase();
  let shown = 0;
  for (const t of trophies) {
    const isEarned = earned.has(t.id);
    if (kind === 'missable' && !t.missable) continue;
    if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) continue;
    if (gradeFilter.value !== 'all' && t.grade !== gradeFilter.value) continue;
    if (earnedOnly.checked && !isEarned) continue;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) continue;
    shown += 1;

    const li = document.createElement('li');
    li.className = 'trophy' + (isEarned ? ' earned' : '');
    li.id = 'trophy-' + t.id;
    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'trophy-check';
    box.checked = isEarned;
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveEarned();
      renderAll();
    });
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    const masked = isHidden(t);
    if (masked) {
      name.textContent = 'Hidden trophy — earn it or turn spoilers off to reveal it';
      desc.textContent = 'This trophy is hidden on PlayStation until earned.';
      desc.classList.add('spoiler-mask');
    } else {
      name.textContent = t.name;
      desc.textContent = t.description;
    }
    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.append(badge(gradeLabel(t.grade), t.grade));
    badges.append(badge(kindLabel(t), 'kind'));
    if (t.missable) badges.append(badge('Possibly missable', 'missable'));
    if (t.hidden) badges.append(badge('Hidden', 'hidden'));
    badges.append(badge('Roadmap stage ' + t.roadmap_stage, 'stage'));
    main.append(name, desc, badges);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = openId === t.id ? 'Hide guide' : 'Show guide';
    toggle.addEventListener('click', () => {
      openId = openId === t.id ? null : t.id;
      renderAll();
      if (openId === t.id) {
        history.replaceState(null, '', '#trophy-' + t.id);
        document.getElementById('trophy-' + t.id)?.scrollIntoView({ block: 'nearest' });
      } else {
        history.replaceState(null, '', ' ');
      }
    });
    head.append(box, main, toggle);
    li.append(head);
    if (masked) {
      const note = document.createElement('p');
      note.className = 'spoiler-mask';
      note.textContent = 'Guide hidden with spoilers on. Tick the box if you have earned it, or switch “Hide spoilers” off.';
      li.append(note);
    } else if (openId === t.id) {
      renderGuide(t, li);
    }
    listEl.append(li);
  }
  countLine.textContent = 'Showing ' + shown + ' of ' + trophies.length + ' trophies';
  emptyNote.hidden = shown !== 0;
  onlineNote.hidden = kind !== 'online';
}

function renderProgress() {
  const total = trophies.length;
  const got = trophies.filter((t) => earned.has(t.id)).length;
  const pct = total ? Math.round((got / total) * 100) : 0;
  document.getElementById('progressText').textContent = got + ' of ' + total + ' earned · ' + pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? [0, 0];
    byGrade[t.grade][1] += 1;
    if (earned.has(t.id)) byGrade[t.grade][0] += 1;
  }
  document.getElementById('progressBreakdown').textContent =
    ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => gradeLabel(g) + ' ' + (byGrade[g]?.[0] ?? 0) + '/' + (byGrade[g]?.[1] ?? 0))
      .join(' · ') + ' · Hidden ' + trophies.filter((t) => t.hidden && earned.has(t.id)).length + '/28 earned';
  const others = trophies.filter((t) => t.id !== 1 && earned.has(t.id)).length;
  document.getElementById('platinumProgress').textContent = others + ' of 54 other trophies';
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
  saveSettings();
}

function downloadProgress() {
  const payload = {
    app: 'leonida-trophy-guide',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    earnedNames: trophies.filter((t) => earned.has(t.id)).map((t) => t.name),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function importProgressFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const names = Array.isArray(data) ? data : (data.earnedNames ?? data.earned ?? data.trophies ?? []);
      const byName = new Map(trophies.map((t) => [t.name, t.id]));
      const byId = new Map(trophies.map((t) => [t.id, t.id]));
      const next = new Set();
      for (const item of names) {
        if (typeof item === 'string' && byName.has(item)) next.add(byName.get(item));
        if (typeof item === 'number' && byId.has(item)) next.add(item);
      }
      earned = next;
      saveEarned();
      renderAll();
      document.getElementById('saveNote').textContent = 'Imported ' + next.size + ' earned trophies from ' + file.name + '.';
    } catch {
      document.getElementById('saveNote').textContent = 'That file could not be read as trophy progress. Export a file from this guide and import that one.';
    }
  };
  reader.readAsText(file);
}

document.getElementById('exportBtn').addEventListener('click', downloadProgress);
document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) importProgressFile(file);
  e.target.value = '';
});
document.getElementById('sampleBtn').addEventListener('click', () => {
  earned = new Set(SAMPLE_IDS);
  saveEarned();
  renderAll();
  document.getElementById('saveNote').textContent = 'Sample progress loaded (12 trophies) so you can try the tracker. Reset all clears it.';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  earned = new Set();
  saveEarned();
  renderAll();
  document.getElementById('saveNote').textContent = 'Progress reset. Nothing is earned yet.';
});
kindFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-kind]');
  if (!btn) return;
  kind = btn.dataset.kind;
  kindFilters.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
  renderAll();
});
searchInput.addEventListener('input', renderAll);
gradeFilter.addEventListener('change', renderAll);
earnedOnly.addEventListener('change', renderAll);
spoilerToggle.addEventListener('change', renderAll);

const settings = readSettings();
if (settings.kind && kindFilters.querySelector('[data-kind="' + settings.kind + '"]')) {
  kind = settings.kind;
  kindFilters.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
}
if (settings.grade) gradeFilter.value = settings.grade;
if (settings.search) searchInput.value = settings.search;
if (typeof settings.earnedOnly === 'boolean') earnedOnly.checked = settings.earnedOnly;
if (typeof settings.spoilers === 'boolean') spoilerToggle.checked = settings.spoilers;

const [doc, road] = await Promise.all([
  (await fetch('data/trophies.json')).json(),
  (await fetch('data/roadmap.json')).json(),
]);
trophies = doc.trophies;
roadmap = road;

if (new URLSearchParams(location.search).has('sample')) {
  earned = new Set(SAMPLE_IDS);
  saveEarned();
}
const hashMatch = location.hash.match(/^#trophy-(\d+)$/);
if (hashMatch) openId = Number(hashMatch[1]);

renderFacts();
renderAll();
if (openId) document.getElementById('trophy-' + openId)?.scrollIntoView();

window.__trophyApp = { get earned() { return [...earned]; }, trophies: () => trophies };
