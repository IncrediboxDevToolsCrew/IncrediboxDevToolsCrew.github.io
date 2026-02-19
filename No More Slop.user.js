// ==UserScript==
// @name         No More Slop
// @namespace    https://github.com/Gen1xLol/no-more-slop-for-penguinmod
// @version      1.0.3
// @description  Adds a "Recent Non-Slop Projects" category to PenguinMod's main page, which filters out common keywords associated with low effort ("slop") projects.
// @author       Gen1x
// @match        https://penguinmod.com/
// @match        https://www.penguinmod.com/
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const VER = "1.0.3";
  const FRONTPAGE = 'https://projects.penguinmod.com/api/v1/projects/frontpage';
  const SLOPBLOCK = 'https://gen1xlol.github.io/no-more-slop-for-penguinmod/slopblock.txt';
  const VERSION_URL = 'https://gen1xlol.github.io/no-more-slop-for-penguinmod/version.txt';
  const UPDATE_URL = 'https://gen1xlol.github.io/no-more-slop-for-penguinmod/No%20More%20Slop.user.js';
  const KEY_DISABLED = 'nms_disabled_keywords';
  const KEY_CUSTOM   = 'nms_custom_keywords';
  const KEY_SHIPS    = 'nms_filter_ships';
  const KEY_EMPTY    = 'nms_filter_empty';

  const IC = {
    chart:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;color:#4ade80;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    filter:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;color:#f87171;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
    tag:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;opacity:0.8;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    ship:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;opacity:0.8;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
    both:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`,
    bullet:  `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px;opacity:0.5;"><circle cx="12" cy="12" r="6"></circle></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
  };

  let fpPromise = null;

  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    const req = _fetch.apply(this, arguments);
    if (url === FRONTPAGE || url.startsWith(FRONTPAGE)) {
      fpPromise = req.then(r => r.clone().json());
    }
    return req;
  };

  const getDisabled = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY_DISABLED) || '[]')); } catch { return new Set(); } };
  const setDisabled = s => localStorage.setItem(KEY_DISABLED, JSON.stringify([...s]));
  const getCustom   = () => { try { return JSON.parse(localStorage.getItem(KEY_CUSTOM) || '[]'); } catch { return []; } };
  const setCustom   = a => localStorage.setItem(KEY_CUSTOM, JSON.stringify(a));
  const getShips    = () => { const v = localStorage.getItem(KEY_SHIPS); return v === null ? true : v === 'true'; };
  const setShips    = b => localStorage.setItem(KEY_SHIPS, String(b));
  const getEmpty    = () => { const v = localStorage.getItem(KEY_EMPTY); return v === null ? true : v === 'true'; };
  const setEmpty    = b => localStorage.setItem(KEY_EMPTY, String(b));

  const SHIP_RE = /\b\w[\w\s]*\s+[xX×]\s+\w[\w\s]*\b/;

  function isShip(p) {
    return SHIP_RE.test([p.title, p.instructions, p.notes].filter(Boolean).join(' '));
  }

  function isEmpty(p) {
    const noInstructions = p.instructions === '' || p.instructions == null;
    const noNotes = p.notes === '' || p.notes == null;
    return noInstructions || noNotes;
  }

  function parseKws(raw) {
    return raw.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
  }

  function activeKws(base) {
    const dis = getDisabled();
    return [...base, ...getCustom()].filter(kw => !dis.has(kw));
  }

  function slopMatches(p, kws) {
    const hay = [p.title, p.instructions, p.notes, p.author?.username].filter(Boolean).join(' ').toLowerCase();
    return kws.filter(kw => hay.includes(kw));
  }

  function isSlop(p, kws) {
    const hay = [p.title, p.instructions, p.notes, p.author?.username].filter(Boolean).join(' ').toLowerCase();
    return kws.some(kw => hay.includes(kw));
  }

  function computeStats(projects, base) {
    const kws    = activeKws(base);
    const ships  = getShips();
    const empty  = getEmpty();
    let byTag = 0, byShip = 0, byBoth = 0, byEmpty = 0, shown = 0;
    const tagCounts = {};

    for (const p of projects) {
      const matches   = slopMatches(p, kws);
      const slopHit   = matches.length > 0;
      const shipHit   = ships && isShip(p);
      const emptyHit  = empty && isEmpty(p);
      matches.forEach(m => { tagCounts[m] = (tagCounts[m] || 0) + 1; });

      if (emptyHit && !slopHit && !shipHit) {
        byEmpty++;
      } else if (slopHit && shipHit) {
        byBoth++;
      } else if (slopHit) {
        byTag++;
      } else if (shipHit) {
        byShip++;
      } else {
        shown++;
      }
    }

    return {
      total: projects.length,
      totalFiltered: byTag + byShip + byBoth + byEmpty,
      shown, byTag, byShip, byBoth, byEmpty,
      shipsOn: ships,
      emptyOn: empty,
      sortedTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
    };
  }

  function refreshStats() {
    const panel = document.getElementById('nms-stats-panel');
    if (!panel || !allProjects.length) return;
    panel.innerHTML = statsHTML(computeStats(allProjects, baseKws));
  }

  function statsHTML(s) {
    const pct = s.total ? ((s.totalFiltered / s.total) * 100).toFixed(1) : '0.0';
    const tagRows = s.sortedTags.length
      ? `<div class="nms-tag-stats-list">${s.sortedTags.map(([t, n]) =>
          `<div class="nms-tag-stat-item"><span class="nms-tag-name">${esc(t)}</span><span class="nms-tag-count">${n}</span></div>`
        ).join('')}</div>`
      : `<div style="padding:4px 0;opacity:0.6;font-style:italic;">No tags detected.</div>`;

    return `
      <details id="nms-stats-details">
        <summary style="cursor:pointer;font-size:0.8rem;opacity:0.8;user-select:none;padding:4px 0;display:flex;align-items:center;">
          ${IC.chart} Filter Stats -&nbsp;<strong>${s.totalFiltered}</strong> / <strong>${s.total}</strong>&nbsp;- hidden (${pct}%)
        </summary>
        <div style="margin-top:8px;padding-left:4px;font-size:0.82rem;">
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;margin-bottom:12px;">
            <div style="display:flex;align-items:center;">${IC.check} Shown</div><div><strong>${s.shown}</strong></div>
            <div style="display:flex;align-items:center;">${IC.filter} Hidden</div><div><strong>${s.totalFiltered}</strong></div>
            <div style="display:flex;align-items:center;padding-left:14px;opacity:0.8;">${IC.tag} By keyword</div><div><strong>${s.byTag}</strong></div>
            <div style="display:flex;align-items:center;padding-left:14px;opacity:0.8;">${IC.ship} By ship</div><div><strong>${s.byShip}</strong>${!s.shipsOn ? ' <em style="opacity:0.5;font-size:0.7em">(off)</em>' : ''}</div>
            <div style="display:flex;align-items:center;padding-left:14px;opacity:0.8;">${IC.both} By both</div><div><strong>${s.byBoth}</strong></div>
            <div style="display:flex;align-items:center;padding-left:14px;opacity:0.8;">${IC.filter} By empty fields</div><div><strong>${s.byEmpty}</strong>${!s.emptyOn ? ' <em style="opacity:0.5;font-size:0.7em">(off)</em>' : ''}</div>
          </div>
          <div style="border-top:1px solid rgba(127,127,127,0.2);padding-top:8px;">
            <div style="font-weight:600;margin-bottom:6px;font-size:0.75rem;text-transform:uppercase;opacity:0.7;letter-spacing:0.05em;">Keyword Hit Counts</div>
            ${tagRows}
          </div>
        </div>
      </details>`;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function injectCSS() {
    if (document.getElementById('nms-style')) return;
    const s = document.createElement('style');
    s.id = 'nms-style';
    s.textContent = `
      #nms-modal-overlay {
        position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:99998;
        display:flex; align-items:center; justify-content:center;
        font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
      }
      #nms-modal {
        --nms-bg:#ffffff; --nms-fg:#575e75; --nms-fg-head:#111111; --nms-border:#e0e0e0;
        --nms-input-bg:#f0f0f0; --nms-btn-bg:#009fc7; --nms-btn-fg:#ffffff;
        --nms-tag-bg:#009fc7; --nms-tag-fg:#ffffff;
        --nms-disabled-bg:#e0e0e0; --nms-disabled-fg:#888888;
        background:var(--nms-bg); color:var(--nms-fg); border-radius:1rem;
        box-shadow:0px 4px 12px rgba(0,0,0,0.15); width:min(500px,90vw); max-height:85vh;
        display:flex; flex-direction:column; z-index:99999; font-family:inherit;
        overflow:hidden; border:1px solid var(--nms-border);
      }
      body.dark-mode #nms-modal {
        --nms-bg:#111111; --nms-fg:#cccccc; --nms-fg-head:#ffffff; --nms-border:#333333;
        --nms-input-bg:#222222; --nms-btn-bg:#009fc7; --nms-tag-bg:#009fc7;
        --nms-disabled-bg:#333333; --nms-disabled-fg:#777777;
      }
      #nms-modal * { box-sizing:border-box; }
      #nms-modal-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:1rem 1.25rem; border-bottom:1px solid var(--nms-border);
      }
      #nms-modal-header h2 { margin:0; font-size:1.1rem; font-weight:700; color:var(--nms-fg-head); }
      #nms-modal-close {
        background:transparent; border:none; cursor:pointer; font-size:1.2rem;
        color:var(--nms-fg); padding:0 4px; line-height:1; user-select:none;
      }
      #nms-modal-close:hover { color:var(--nms-fg-head); }
      #nms-modal-body { overflow-y:auto; padding:1.25rem; flex:1; }
      .nms-normal-case { text-transform:none; }
      .nms-section-label {
        font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--nms-fg);
        margin:1.25rem 0 0.5rem; opacity:0.8;
      }
      .nms-section-label:first-child { margin-top:0; }
      .nms-tag-list { display:flex; flex-wrap:wrap; gap:8px; }
      .nms-tag {
        display:inline-flex; align-items:center; gap:6px; padding:6px 12px;
        border-radius:2rem; font-size:0.85rem; font-weight:600; cursor:pointer;
        user-select:none; background:var(--nms-tag-bg); color:var(--nms-tag-fg); border:none;
      }
      .nms-tag:hover { opacity:0.9; }
      .nms-tag.disabled { background:var(--nms-disabled-bg); color:var(--nms-disabled-fg); text-decoration:line-through; }
      hr.nms-hr { border:none; border-top:1px solid var(--nms-border); margin:1.25rem 0; }
      #nms-add-row { display:flex; gap:8px; margin-top:10px; }
      #nms-add-input {
        flex:1; padding:8px 12px; border-radius:0.5rem; border:1px solid var(--nms-border);
        background:var(--nms-input-bg); color:var(--nms-fg-head); font-family:inherit; font-size:0.9rem;
      }
      #nms-add-input:focus { outline:2px solid var(--nms-btn-bg); border-color:transparent; }
      .nms-btn {
        padding:8px 16px; border-radius:2rem; border:none; cursor:pointer; font-size:0.9rem;
        font-weight:700; background:var(--nms-btn-bg); color:var(--nms-btn-fg);
        white-space:nowrap; font-family:inherit;
      }
      .nms-btn:hover { opacity:0.9; }
      .nms-btn.secondary {
        background:transparent; color:var(--nms-fg); border:1px solid var(--nms-border);
      }
      .nms-btn.secondary:hover { background:var(--nms-input-bg); }
      #nms-modal-footer {
        padding:1rem 1.25rem; border-top:1px solid var(--nms-border);
        display:flex; gap:10px; justify-content:flex-end; background:var(--nms-bg);
      }
      .nms-muted-text { font-size:0.85rem; color:var(--nms-fg); opacity:0.7; font-style:italic; }
      .nms-toggle-row { display:flex; align-items:center; gap:10px; padding:10px 0; }
      .nms-toggle-label { font-size:0.9rem; color:var(--nms-fg-head); cursor:pointer; flex:1; }
      .nms-toggle-label small { display:block; font-size:0.78rem; color:var(--nms-fg); opacity:0.7; font-weight:normal; margin-top:2px; }
      .nms-switch { position:relative; display:inline-block; width:40px; height:22px; flex-shrink:0; }
      .nms-switch input { opacity:0; width:0; height:0; }
      .nms-slider { position:absolute; cursor:pointer; inset:0; background:var(--nms-disabled-bg); border-radius:22px; transition:background 0.2s; }
      .nms-slider:before { content:''; position:absolute; width:16px; height:16px; left:3px; top:3px; background:white; border-radius:50%; transition:transform 0.2s; }
      .nms-switch input:checked + .nms-slider { background:var(--nms-btn-bg); }
      .nms-switch input:checked + .nms-slider:before { transform:translateX(18px); }
      #nms-stats-panel { margin-top:6px; font-size:0.82rem; color:inherit; opacity:0.85; }
      #nms-stats-panel details summary::-webkit-details-marker { color:inherit; }
      .nms-tag-stats-list { max-height:150px; overflow-y:auto; border-radius:6px; border:1px solid rgba(127,127,127,0.15); background:rgba(127,127,127,0.05); }
      .nms-tag-stat-item { display:flex; justify-content:space-between; padding:3px 8px; font-size:0.8rem; border-bottom:1px solid rgba(127,127,127,0.1); }
      .nms-tag-stat-item:last-child { border-bottom:none; }
      .nms-tag-name { font-weight:500; }
      .nms-tag-count { font-weight:700; opacity:0.8; }
      #nms-update-link {
        display:inline-flex; align-items:center; color:#f5a623; font-size:0.85rem;
        font-weight:700; text-decoration:none; margin-left:10px;
      }
      #nms-update-link:hover { text-decoration:underline; }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  let baseKws = [];

  function makeToggleRow(id, checked, onChange, labelText, descText) {
    const row = document.createElement('div');
    row.className = 'nms-toggle-row';

    const lbl = document.createElement('label');
    lbl.className = 'nms-toggle-label';
    lbl.htmlFor = id;
    lbl.innerHTML = `${labelText} <small>${descText}</small>`;

    const sw = document.createElement('label');
    sw.className = 'nms-switch';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = checked;
    cb.onchange = () => onChange(cb.checked);
    const slider = document.createElement('span');
    slider.className = 'nms-slider';
    sw.appendChild(cb);
    sw.appendChild(slider);
    row.appendChild(lbl);
    row.appendChild(sw);
    return row;
  }

  function openModal() {
    if (document.getElementById('nms-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'nms-modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'nms-modal';

    const header = document.createElement('div');
    header.id = 'nms-modal-header';
    header.innerHTML = `<h2>Filter Preferences</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.id = 'nms-modal-close';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = closeModal;
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.id = 'nms-modal-body';

    function render() {
      body.innerHTML = '';
      const dis = getDisabled();
      const cus = getCustom();

      const intro = document.createElement('p');
      intro.className = 'nms-normal-case';
      intro.innerHTML = `<small>This script fetches a list of default keywords. If you don't agree with one of them, you can toggle it. Also, if I missed a tag, make sure to <a href="https://github.com/Gen1xLol/no-more-slop-for-penguinmod" target="_blank" class="svelte-89pxgo" rel="noopener noreferrer">PR the GitHub repo</a>!</small>`;
      body.appendChild(intro);

      const specialLabel = document.createElement('div');
      specialLabel.className = 'nms-section-label';
      specialLabel.textContent = 'Special Filters';
      body.appendChild(specialLabel);

      body.appendChild(makeToggleRow(
        'nms-ship-toggle',
        getShips(),
        b => setShips(b),
        'Filter ships',
        'Hides projects containing "Character X Character" style pairings in title, instructions, or notes.'
      ));

      body.appendChild(makeToggleRow(
        'nms-empty-toggle',
        getEmpty(),
        b => setEmpty(b),
        'Filter empty descriptions',
        'Hides projects that are missing instructions, notes & credits, or both.'
      ));

      const hr0 = document.createElement('hr');
      hr0.className = 'nms-hr';
      body.appendChild(hr0);

      const builtinLabel = document.createElement('div');
      builtinLabel.className = 'nms-section-label';
      builtinLabel.textContent = 'Built-in Tags';
      body.appendChild(builtinLabel);

      const builtinList = document.createElement('div');
      builtinList.className = 'nms-tag-list';

      if (!baseKws.length) {
        builtinList.innerHTML = `<span class="nms-muted-text">Loading...</span>`;
      } else {
        baseKws.forEach(kw => {
          const tag = document.createElement('span');
          tag.className = 'nms-tag' + (dis.has(kw) ? ' disabled' : '');
          tag.textContent = kw;
          tag.title = dis.has(kw) ? 'Click to Enable' : 'Click to Disable';
          tag.onclick = () => {
            const d = getDisabled();
            d.has(kw) ? d.delete(kw) : d.add(kw);
            setDisabled(d);
            render();
          };
          builtinList.appendChild(tag);
        });
      }
      body.appendChild(builtinList);

      const hr1 = document.createElement('hr');
      hr1.className = 'nms-hr';
      body.appendChild(hr1);

      const customLabel = document.createElement('div');
      customLabel.className = 'nms-section-label';
      customLabel.textContent = 'Custom Tags';
      body.appendChild(customLabel);

      const customList = document.createElement('div');
      customList.className = 'nms-tag-list';

      if (!cus.length) {
        const empty = document.createElement('span');
        empty.className = 'nms-muted-text';
        empty.textContent = 'No custom tags yet.';
        customList.appendChild(empty);
      } else {
        cus.forEach(kw => {
          const tag = document.createElement('span');
          tag.className = 'nms-tag' + (dis.has(kw) ? ' disabled' : '');
          tag.textContent = kw;
          tag.title = 'Click: Toggle | Right-click: Delete';
          tag.onclick = () => {
            const d = getDisabled();
            d.has(kw) ? d.delete(kw) : d.add(kw);
            setDisabled(d);
            render();
          };
          tag.oncontextmenu = e => {
            e.preventDefault();
            if (!confirm(`Delete tag "${kw}"?`)) return;
            setCustom(getCustom().filter(k => k !== kw));
            const d = getDisabled(); d.delete(kw); setDisabled(d);
            render();
          };
          customList.appendChild(tag);
        });
      }
      body.appendChild(customList);

      const addRow = document.createElement('div');
      addRow.id = 'nms-add-row';
      const input = document.createElement('input');
      input.id = 'nms-add-input';
      input.type = 'text';
      input.placeholder = 'Add keyword...';
      const addBtn = document.createElement('button');
      addBtn.className = 'nms-btn';
      addBtn.textContent = 'Add';
      const doAdd = () => {
        const val = input.value.trim().toLowerCase();
        if (!val) return;
        const c = getCustom();
        if (!c.includes(val) && !baseKws.includes(val)) { c.push(val); setCustom(c); }
        input.value = '';
        render();
        setTimeout(() => body.querySelector('#nms-add-input')?.focus(), 0);
      };
      addBtn.onclick = doAdd;
      input.onkeydown = e => { if (e.key === 'Enter') doAdd(); };
      addRow.appendChild(input);
      addRow.appendChild(addBtn);
      body.appendChild(addRow);
    }

    render();

    const footer = document.createElement('div');
    footer.id = 'nms-modal-footer';

    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'nms-btn secondary';
    reloadBtn.textContent = 'Reload';
    reloadBtn.onclick = () => { closeModal(); reloadSection(); };

    const doneBtn = document.createElement('button');
    doneBtn.className = 'nms-btn';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = closeModal;

    footer.appendChild(reloadBtn);
    footer.appendChild(doneBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    overlay.onclick = e => { if (e.target === overlay) closeModal(); };
    overlay.addEventListener('wheel', e => {
      const body = document.getElementById('nms-modal-body');
      if (body) {
        body.scrollTop += e.deltaY;
      }
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('keydown', onEsc);
    document.body.appendChild(overlay);
  }

  function closeModal() {
    document.getElementById('nms-modal-overlay')?.remove();
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') closeModal(); }

  function reloadSection() {
    filtered = null;
    setList(null);
    if (allProjects.length) {
      const kws   = activeKws(baseKws);
      const ships = getShips();
      const empty = getEmpty();
      filtered = allProjects.filter(p => !isSlop(p, kws) && !(ships && isShip(p)) && !(empty && isEmpty(p)));
      setList(filtered);
      refreshStats();
    }
  }

  function injectUpdateLink() {
    const titleP = document.querySelector('#nms-injected .header.svelte-89pxgo p:first-child');
    if (!titleP || document.getElementById('nms-update-link')) return;
    const link = document.createElement('a');
    link.id = 'nms-update-link';
    link.href = UPDATE_URL + '?_=' + Math.random();
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `${IC.warning}Update Script`;
    titleP.appendChild(link);
  }

  let updateAvailable = false;

  function injectUpdateLinkIfNeeded() {
    if (updateAvailable) injectUpdateLink();
  }

  async function checkVersion() {
    try {
      const remote = (await fetch(VERSION_URL + '?_=' + Math.random()).then(r => r.text())).trim();
      if (remote !== VER) {
        updateAvailable = true;
        const tryInject = () => {
          if (document.getElementById('nms-injected')) {
            injectUpdateLink();
          } else {
            setTimeout(tryInject, 100);
          }
        };
        tryInject();
      }
    } catch (_) {}
  }

  function buildCard(p) {
    const pUrl  = `https://studio.penguinmod.com/#${p.id}`;
    const aUrl  = `/profile?user=${p.author.username}`;
    const thumb = `https://projects.penguinmod.com/api/v1/projects/getproject?projectID=${p.id}&requestType=thumbnail`;
    const pfp   = `https://projects.penguinmod.com/api/v1/users/getpfp?username=${p.author.username}`;

    const card = document.createElement('div');
    card.setAttribute('data-featured', p.featured ? 'true' : 'false');
    card.className = 'project svelte-1xvaxv4';
    card.innerHTML = `
      <a href="${pUrl}" target="_self" class="project-image svelte-1xvaxv4">
        <img src="${thumb}" alt="Project Thumbnail" class="project-image svelte-1xvaxv4">
      </a>
      <a href="${aUrl}" target="_self" class="project-author svelte-1xvaxv4">
        <img src="${pfp}" alt="Project Author" class="project-author svelte-1xvaxv4">
      </a>
      <div class="project-meta svelte-1xvaxv4">
        <a href="${pUrl}" target="_self" class="text project-title svelte-1xvaxv4" title="${p.title ?? ''}">${p.title ?? '(untitled)'}</a>
        <a href="${pUrl}" target="_self" class="text author date svelte-1xvaxv4">${fmtDate(p.date)}</a>
      </div>`;
    return card;
  }

  function buildSection(initial) {
    const section = document.createElement('div');
    section.className = 'section svelte-89pxgo';
    section.style.width = '65%';
    section.id = 'nms-injected';

    const hdr = document.createElement('div');
    hdr.className = 'header svelte-89pxgo';

    const title = document.createElement('p');
    title.style.cssText = 'margin-block:6px;';
    title.innerHTML = '<b>Recent Non-Slop Projects</b>';

    const prefP = document.createElement('p');
    prefP.style.cssText = 'margin-block:6px;';
    const prefLink = document.createElement('a');
    prefLink.href = '#';
    prefLink.className = 'svelte-89pxgo';
    prefLink.textContent = 'Preferences';
    prefLink.onclick = e => { e.preventDefault(); openModal(); };
    prefP.appendChild(prefLink);

    hdr.appendChild(title);
    hdr.appendChild(prefP);

    const statsPanel = document.createElement('div');
    statsPanel.id = 'nms-stats-panel';
    if (initial !== null && initial !== false && allProjects.length) {
      statsPanel.innerHTML = statsHTML(computeStats(allProjects, baseKws));
    }

    const wrap = document.createElement('div');
    wrap.className = 'container svelte-89pxgo';
    wrap.style.cssText = 'height:244px;overflow-x:auto;overflow-y:hidden;';

    const list = document.createElement('div');
    list.id = 'nms-list';
    list.className = 'project-list svelte-zlorb7';
    setListContent(list, initial);

    wrap.appendChild(list);
    section.appendChild(hdr);
    section.appendChild(statsPanel);
    section.appendChild(wrap);
    setTimeout(injectUpdateLinkIfNeeded, 0);
    return section;
  }

  function setListContent(list, projects) {
    list.innerHTML = '';
    if (projects === null) {
      const msg = document.createElement('p');
      msg.style.cssText = 'padding:1rem;opacity:0.5;font-style:italic;';
      msg.textContent = 'Loading...';
      list.appendChild(msg);
    } else if (projects === false) {
      const msg = document.createElement('p');
      msg.style.cssText = 'padding:1rem;opacity:0.5;font-style:italic;';
      msg.textContent = 'Failed to load projects.';
      list.appendChild(msg);
    } else if (!projects.length) {
      const msg = document.createElement('p');
      msg.style.cssText = 'padding:1rem;opacity:0.5;font-style:italic;';
      msg.textContent = 'No non-slop projects found right now.';
      list.appendChild(msg);
    } else {
      projects.forEach(p => list.appendChild(buildCard(p)));
    }
  }

  function setList(projects) {
    const list = document.getElementById('nms-list');
    if (list) setListContent(list, projects);
  }

  let filtered    = null;
  let allProjects = [];
  let contObserver = null;

  const getContainer = () => document.querySelector('[class*="section-projects"]');

  function ensureInjected() {
    if (document.getElementById('nms-injected')) return;
    const c = getContainer();
    if (c) c.appendChild(buildSection(filtered));
  }

  function watchContainer(c) {
    contObserver?.disconnect();
    contObserver = new MutationObserver(() => {
      if (!document.getElementById('nms-injected')) {
        const fresh = getContainer();
        if (fresh) {
          if (fresh !== c) watchContainer(fresh);
          fresh.appendChild(buildSection(filtered));
        }
      }
    });
    contObserver.observe(c, { childList: true, subtree: false });
  }

  function watchForContainer() {
    const obs = new MutationObserver(() => {
      const c = getContainer();
      if (c && !document.getElementById('nms-injected')) {
        ensureInjected();
        watchContainer(c);
      }
    });
    const c = getContainer();
    if (c) { ensureInjected(); watchContainer(c); }
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function main() {
    injectCSS();
    watchForContainer();
    checkVersion();

    let fpData, slopRaw;
    try {
      const waitFP = new Promise(resolve => {
        const poll = () => fpPromise ? resolve(fpPromise) : setTimeout(poll, 50);
        poll();
      });
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
      [fpData, slopRaw] = await Promise.all([
        Promise.race([waitFP.then(p => p), timeout]),
        fetch(SLOPBLOCK + '?_=' + Math.random()).then(r => r.text()),
      ]);
    } catch (err) {
      console.warn('[No More Slop] falling back to direct fetch:', err.message);
      try {
        [fpData, slopRaw] = await Promise.all([
          fetch(FRONTPAGE).then(r => r.json()),
          fetch(SLOPBLOCK + '?_=' + Math.random()).then(r => r.text()),
        ]);
      } catch (err2) {
        console.error('[No More Slop] fetch failed:', err2);
        filtered = false;
        setList(false);
        return;
      }
    }

    baseKws = parseKws(slopRaw);

    const seen = new Set();
    for (const p of [...(fpData.latest ?? []), ...(fpData.voted ?? []), ...(fpData.tagged ?? [])]) {
      if (!seen.has(p.id)) { seen.add(p.id); allProjects.push(p); }
    }
    allProjects.sort((a, b) => b.date - a.date);

    const kws   = activeKws(baseKws);
    const ships = getShips();
    const empty = getEmpty();
    filtered = allProjects.filter(p => !isSlop(p, kws) && !(ships && isShip(p)) && !(empty && isEmpty(p)));
    setList(filtered);
    refreshStats();
  }

  main();
})();
