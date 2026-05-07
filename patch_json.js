(() => {
  const STORAGE_KEY = 'my-playground-json-input-v1';
  const MODE_KEY = 'my-playground-json-mode-v1';
  const FONT_KEY = 'my-playground-json-font-size-v1';

  function $(id) {
    return document.getElementById(id);
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'checked' && value) el.checked = true;
      else if (value !== undefined && value !== null) el.setAttribute(key, value);
    });
    children.forEach((child) => el.append(child));
    return el;
  }

  function setupStyles() {
    if ($('json-viewer-style')) return;
    const style = document.createElement('style');
    style.id = 'json-viewer-style';
    style.textContent = `
      #btn-json { border: 0; letter-spacing: .01em; font-size: .95rem; }
      #btn-json.bg-slate-600 { background: rgba(255,255,255,.14); box-shadow: inset 0 -3px 0 #60a5fa; }
      .json-option-row { display:flex; align-items:center; gap:.45rem; font-size:.86rem; color:#334155; }
      .json-table-shell { padding: 0; }
      .json-table-wrap { min-width:100%; overflow:auto; background:#fff; }
      .json-table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: .84rem; color: #172033; }
      .json-table th, .json-table td { border-bottom: 1px solid #e2e8f0; border-right: 1px solid #edf2f7; padding: .45rem .55rem; vertical-align: top; white-space: nowrap; max-width: 22rem; overflow: hidden; text-overflow: ellipsis; background:#fff; }
      .json-table th { position: sticky; top: 0; z-index: 1; background: #f8fafc; font-weight: 800; color: #334155; border-bottom: 1px solid #cbd5e1; }
      .json-table td:first-child, .json-table th:first-child { position: sticky; left: 0; z-index: 2; }
      .json-table td:first-child { background:#fff; }
      .json-table th:first-child { z-index: 3; background: #f8fafc; }
      .json-null { color: #94a3b8; font-style: italic; }
      .json-bool { color: #7c3aed; font-weight: 700; }
      .json-num { color: #0369a1; font-variant-numeric: tabular-nums; }
      .json-error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: .75rem; border-radius: .75rem; white-space: pre-wrap; margin:.5rem; }
    `;
    document.head.appendChild(style);
  }

  function addMainTab() {
    const nav = document.querySelector('body > div.flex.bg-slate-800');
    if (!nav || $('btn-json')) return;

    const jsonButton = createEl('button', {
      id: 'btn-json',
      type: 'button',
      class: 'px-4 py-3 flex-1 font-bold hover:bg-slate-700',
      text: 'JSON'
    });
    nav.appendChild(jsonButton);
  }

  function addJsonSection() {
    if ($('tab-json')) return;

    const section = createEl('section', {
      id: 'tab-json',
      class: 'hidden flex-1 min-h-0 flex flex-col p-2 gap-2'
    });

    section.append(
      createEl('div', { class: 'grid grid-cols-3 gap-1 shrink-0' }, [
        createEl('button', { id: 'json-mode-edit', type: 'button', class: 'mode-active rounded px-2 py-2 text-sm font-bold', text: 'Edit' }),
        createEl('button', { id: 'json-mode-split', type: 'button', class: 'mode-inactive rounded px-2 py-2 text-sm font-bold', text: 'Split' }),
        createEl('button', { id: 'json-mode-table', type: 'button', class: 'mode-inactive rounded px-2 py-2 text-sm font-bold', text: 'Table' })
      ]),
      createEl('details', { id: 'json-tools', class: 'tool-details shrink-0' }, [
        createEl('summary', { text: 'JSON tools' }),
        createEl('div', { class: 'md-toolbar mt-2' }, [
          createEl('button', { id: 'json-parse', type: 'button', class: 'tool-button', text: 'Parse' }),
          createEl('button', { id: 'json-sample', type: 'button', class: 'tool-button', text: 'Sample' }),
          createEl('button', { id: 'json-clear', type: 'button', class: 'tool-button', text: 'Clear' }),
          createEl('button', { id: 'json-format', type: 'button', class: 'tool-button', text: 'Format' })
        ]),
        createEl('div', { class: 'md-toolbar mt-1' }, [
          createEl('button', { id: 'json-copy-csv', type: 'button', class: 'tool-button', text: 'Copy CSV' }),
          createEl('button', { id: 'json-export-csv', type: 'button', class: 'tool-button', text: 'Export CSV' }),
          createEl('button', { id: 'json-font-smaller', type: 'button', class: 'tool-button', text: 'A-' }),
          createEl('button', { id: 'json-font-larger', type: 'button', class: 'tool-button', text: 'A+' })
        ]),
        createEl('label', { class: 'json-option-row mt-2' }, [
          createEl('input', { id: 'json-flatten', type: 'checkbox', checked: true }),
          document.createTextNode(' Flatten nested objects')
        ])
      ]),
      createEl('div', { id: 'json-stats', class: 'shrink-0 rounded bg-white border border-slate-200 px-2 py-1 text-xs text-slate-600', text: 'JSON/JSONLを貼り付けてください' }),
      createEl('div', { id: 'json-status', class: 'hidden status shrink-0' })
    );

    const workspace = createEl('div', { id: 'json-workspace', class: 'flex-1 min-h-0 md-workspace-edit-only gap-2' });
    const input = createEl('textarea', {
      id: 'json-input',
      class: 'flex-1 min-h-0 p-3 border rounded shadow-inner bg-white text-sm',
      spellcheck: 'false',
      autocapitalize: 'off',
      autocomplete: 'off',
      autocorrect: 'off',
      placeholder: 'JSON array / object / JSONL here...'
    });
    const shell = createEl('div', { id: 'json-table-shell', class: 'hidden preview-shell json-table-shell' });
    shell.append(createEl('div', { id: 'json-table-wrap', class: 'json-table-wrap' }));
    workspace.append(input, shell);
    section.append(workspace);

    const mdSection = $('tab-md');
    if (mdSection && mdSection.parentNode) mdSection.parentNode.insertBefore(section, mdSection.nextSibling);
    else document.body.appendChild(section);
  }

  function sampleJson() {
    return [
      '{"id":1,"name":"Alice","area":"Tokyo","price":123.45,"active":true,"tags":["a","b"],"meta":{"score":95,"rank":"A"}}',
      '{"id":2,"name":"Bob","area":"Osaka","price":88,"active":false,"tags":["x"],"meta":{"score":82,"rank":"B"}}',
      '{"id":3,"name":"Carol","area":"Fukuoka","price":101.2,"active":true,"tags":[],"meta":{"score":91,"rank":"A"}}'
    ].join('\n');
  }

  function normalizeRows(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const arrayKey = Object.keys(value).find((key) => Array.isArray(value[key]));
      if (arrayKey) return value[arrayKey];
      return [value];
    }
    return [{ value }];
  }

  function parseInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    try {
      return normalizeRows(JSON.parse(trimmed));
    } catch (_) {
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const rows = [];
      const errors = [];
      lines.forEach((line, i) => {
        try { rows.push(JSON.parse(line)); }
        catch (e) { errors.push(`line ${i + 1}: ${e.message}`); }
      });
      if (errors.length) throw new Error('JSONとしてもJSONLとしてもパースできません。\n\n' + errors.slice(0, 8).join('\n'));
      return normalizeRows(rows);
    }
  }

  function stringifyCell(value) {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_) { return String(value); }
    }
    return String(value);
  }

  function flattenObject(value, prefix = '', out = {}) {
    if (value === null || typeof value !== 'object') {
      out[prefix || 'value'] = value;
      return out;
    }
    if (Array.isArray(value)) {
      out[prefix || 'value'] = value.map(stringifyCell).join(', ');
      return out;
    }
    const keys = Object.keys(value);
    if (!keys.length) {
      out[prefix || 'value'] = '{}';
      return out;
    }
    keys.forEach((key) => {
      const path = prefix ? prefix + '.' + key : key;
      const child = value[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) flattenObject(child, path, out);
      else if (Array.isArray(child)) out[path] = child.map(stringifyCell).join(', ');
      else out[path] = child;
    });
    return out;
  }

  function makeTableRows(rows, flatten) {
    const objects = rows.map((row) => {
      if (flatten) return flattenObject(row);
      if (row && typeof row === 'object' && !Array.isArray(row)) return row;
      return { value: row };
    });
    const columns = [];
    const seen = new Set();
    objects.forEach((row) => Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }));
    return { objects, columns };
  }

  function cellClass(value) {
    if (value === null || value === undefined || value === '') return 'json-null';
    if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'json-bool';
    if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value))) return 'json-num';
    return '';
  }

  function renderTable() {
    const input = $('json-input');
    const wrap = $('json-table-wrap');
    const stats = $('json-stats');
    const flattenBox = $('json-flatten');
    if (!input || !wrap || !stats || !flattenBox) return;

    localStorage.setItem(STORAGE_KEY, input.value);
    wrap.innerHTML = '';

    try {
      const rows = parseInput(input.value);
      const { objects, columns } = makeTableRows(rows, flattenBox.checked);
      if (!objects.length) {
        stats.textContent = '0 rows';
        wrap.textContent = 'データがありません';
        return;
      }
      const table = createEl('table', { class: 'json-table' });
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.append(createEl('th', { text: '#' }));
      columns.forEach((column) => headerRow.append(createEl('th', { text: column })));
      thead.append(headerRow);
      const tbody = document.createElement('tbody');
      objects.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.append(createEl('td', { text: String(index + 1) }));
        columns.forEach((column) => {
          const td = document.createElement('td');
          const value = row[column];
          td.textContent = stringifyCell(value);
          td.title = td.textContent;
          const cls = cellClass(value);
          if (cls) td.classList.add(cls);
          tr.append(td);
        });
        tbody.append(tr);
      });
      table.append(thead, tbody);
      wrap.append(table);
      stats.textContent = `${objects.length} rows × ${columns.length} columns`;
    } catch (error) {
      stats.textContent = 'Parse error';
      wrap.append(createEl('div', { class: 'json-error', text: error.message || String(error) }));
    }
  }

  function csvEscape(value) {
    const s = stringifyCell(value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCsv() {
    const rows = parseInput($('json-input').value);
    const { objects, columns } = makeTableRows(rows, $('json-flatten').checked);
    return [
      columns.map(csvEscape).join(','),
      ...objects.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
    ].join('\n');
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function notify(message) {
    const status = $('json-status');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('hidden');
    clearTimeout(status._timer);
    status._timer = setTimeout(() => status.classList.add('hidden'), 1700);
  }

  function setJsonMode(mode) {
    const workspace = $('json-workspace');
    const input = $('json-input');
    const shell = $('json-table-shell');
    const buttons = { edit: $('json-mode-edit'), split: $('json-mode-split'), table: $('json-mode-table') };
    if (!workspace || !input || !shell) return;
    workspace.classList.remove('md-workspace-edit-only', 'md-workspace-preview-only', 'md-workspace-split');
    input.classList.toggle('hidden', mode === 'table');
    shell.classList.toggle('hidden', mode === 'edit');
    if (mode === 'split') workspace.classList.add('md-workspace-split');
    if (mode === 'edit') workspace.classList.add('md-workspace-edit-only');
    if (mode === 'table') workspace.classList.add('md-workspace-preview-only');
    Object.entries(buttons).forEach(([key, button]) => {
      if (!button) return;
      const active = key === mode;
      button.classList.toggle('mode-active', active);
      button.classList.toggle('mode-inactive', !active);
    });
    localStorage.setItem(MODE_KEY, mode);
    if (mode !== 'edit') renderTable();
  }

  function setTopActive(target) {
    const buttons = { pen: $('btn-pen'), md: $('btn-md'), json: $('btn-json') };
    Object.entries(buttons).forEach(([key, button]) => {
      if (!button) return;
      const active = key === target;
      button.classList.toggle('bg-slate-600', active);
      button.classList.toggle('hover:bg-slate-700', !active);
    });
  }

  function switchMainTab(target) {
    const pen = $('tab-pen');
    const md = $('tab-md');
    const json = $('tab-json');
    if (!pen || !md || !json) return;
    pen.classList.toggle('hidden', target !== 'pen');
    md.classList.toggle('hidden', target !== 'md');
    json.classList.toggle('hidden', target !== 'json');
    setTopActive(target);
    localStorage.setItem('my-playground-main-tab-v1', target);
    if (target === 'json') renderTable();
  }

  function bindEvents() {
    $('btn-json').addEventListener('click', () => switchMainTab('json'));
    $('btn-pen').addEventListener('click', () => setTimeout(() => switchMainTab('pen'), 0));
    $('btn-md').addEventListener('click', () => setTimeout(() => switchMainTab('md'), 0));
    $('json-mode-edit').addEventListener('click', () => setJsonMode('edit'));
    $('json-mode-split').addEventListener('click', () => setJsonMode('split'));
    $('json-mode-table').addEventListener('click', () => setJsonMode('table'));
    $('json-parse').addEventListener('click', () => { renderTable(); setJsonMode('table'); });
    $('json-sample').addEventListener('click', () => { $('json-input').value = sampleJson(); renderTable(); notify('サンプルを読み込みました'); });
    $('json-clear').addEventListener('click', () => { if (confirm('JSON入力を空にしますか？')) { $('json-input').value = ''; renderTable(); } });
    $('json-format').addEventListener('click', () => {
      try {
        const rows = parseInput($('json-input').value);
        $('json-input').value = JSON.stringify(rows, null, 2);
        renderTable();
        notify('整形しました');
      } catch (_) { renderTable(); }
    });
    $('json-copy-csv').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(buildCsv()); notify('CSVをコピーしました'); }
      catch (_) { notify('コピーできませんでした'); }
    });
    $('json-export-csv').addEventListener('click', () => {
      try { downloadText('data.csv', buildCsv(), 'text/csv;charset=utf-8'); notify('CSVを書き出しました'); }
      catch (_) { renderTable(); }
    });
    $('json-font-smaller').addEventListener('click', () => {
      const input = $('json-input');
      const size = Math.max(12, parseInt(input.style.fontSize || '16', 10) - 1);
      input.style.fontSize = size + 'px';
      localStorage.setItem(FONT_KEY, input.style.fontSize);
    });
    $('json-font-larger').addEventListener('click', () => {
      const input = $('json-input');
      const size = Math.min(24, parseInt(input.style.fontSize || '16', 10) + 1);
      input.style.fontSize = size + 'px';
      localStorage.setItem(FONT_KEY, input.style.fontSize);
    });
    $('json-flatten').addEventListener('change', renderTable);
    $('json-input').addEventListener('input', () => {
      localStorage.setItem(STORAGE_KEY, $('json-input').value);
      if (!$('json-table-shell').classList.contains('hidden')) renderTable();
    });
  }

  function boot() {
    try {
      setupStyles();
      addMainTab();
      addJsonSection();
      const input = $('json-input');
      input.value = localStorage.getItem(STORAGE_KEY) || sampleJson();
      input.style.fontSize = localStorage.getItem(FONT_KEY) || '16px';
      bindEvents();
      setJsonMode(localStorage.getItem(MODE_KEY) || 'edit');
      const initial = localStorage.getItem('my-playground-main-tab-v1');
      if (initial === 'json') switchMainTab('json');
    } catch (error) {
      console.error(error);
      const fallback = $('tab-json') || document.body;
      const message = createEl('div', { class: 'json-error', text: 'JSONタブの初期化に失敗しました。\n' + (error.message || String(error)) });
      fallback.append(message);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
