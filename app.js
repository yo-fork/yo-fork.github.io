import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict" });

const DEFAULT_PROJECT = {
  name: "Scratch",
  html: [
    '<main class="card">',
    '  <h1>CodePen風 Playground</h1>',
    '  <p>HTML / CSS / JS を別々に書いて実行できます。</p>',
    '  <button id="count-button">Count: 0</button>',
    '</main>'
  ].join('\n'),
  css: [
    'body {',
    '  min-height: 100vh;',
    '  display: grid;',
    '  place-items: center;',
    '  margin: 0;',
    '  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  background: linear-gradient(135deg, #dbeafe, #f8fafc);',
    '}',
    '',
    '.card {',
    '  width: min(90vw, 420px);',
    '  padding: 24px;',
    '  border-radius: 20px;',
    '  background: white;',
    '  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);',
    '  text-align: center;',
    '}',
    '',
    'h1 { margin-top: 0; color: #1d4ed8; }',
    'button { border: 0; border-radius: 999px; padding: 12px 18px; color: white; background: #2563eb; font-weight: 700; }'
  ].join('\n'),
  js: [
    'let count = 0;',
    'const button = document.getElementById("count-button");',
    '',
    'button.addEventListener("click", function () {',
    '  count += 1;',
    '  button.textContent = "Count: " + count;',
    '  console.log("count", count);',
    '});'
  ].join('\n')
};

const DEFAULT_MARKDOWN = [
  '# Markdown Lab',
  '',
  'スマホでMarkdownを書きながら、プレビュー・Mermaid・コードハイライト・HTML書き出しを確認できます。',
  '',
  '## チェックリスト',
  '',
  '- [x] Markdownを書く',
  '- [x] Previewする',
  '- [ ] HTMLとしてExportする',
  '',
  '## コード',
  '',
  '```javascript',
  'const message = "Hello Markdown";',
  'console.log(message);',
  '```',
  '',
  '## 表',
  '',
  '| Area | Value |',
  '|---|---:|',
  '| Tokyo | 100 |',
  '| Osaka | 80 |',
  '',
  '## Mermaid',
  '',
  '```mermaid',
  'graph TD',
  '  A[Idea] --> B[Write]',
  '  B --> C[Preview]',
  '  C --> D[Export]',
  '```'
].join('\n');

const $ = (id) => document.getElementById(id);
const penTab = $('tab-pen');
const mdTab = $('tab-md');
const penButton = $('btn-pen');
const mdButton = $('btn-md');
const projectSelect = $('project-select');
const projectNameInput = $('project-name');
const htmlCode = $('html-code');
const cssCode = $('css-code');
const jsCode = $('js-code');
const allCodeTextareas = [htmlCode, cssCode, jsCode];
const editorPanel = $('editor-panel');
const previewPanel = $('preview-panel');
const outputFrame = $('output-frame');
const runButton = $('run-code');
const autoRun = $('auto-run');
const includeTailwind = $('include-tailwind');
const consoleOutput = $('console-output');
const statusText = $('status-text');
const mdInput = $('md-input');
const mdPreview = $('md-preview');
const mdPreviewShell = $('md-preview-shell');
const mdWorkspace = $('md-workspace');
const mdStats = $('md-stats');
const mdStatus = $('md-status');
const mdPreviewZoomLabel = $('md-preview-zoom-label');
const codeZoomLabel = $('code-zoom-label');
const editorTabButtons = {
  html: $('editor-tab-html'),
  css: $('editor-tab-css'),
  js: $('editor-tab-js'),
  preview: $('editor-tab-preview')
};
const mdModeButtons = {
  edit: $('md-mode-edit'),
  split: $('md-mode-split'),
  preview: $('md-mode-preview')
};

const STORAGE_KEYS = {
  projects: 'my-playground-projects-v7',
  activeProjectId: 'my-playground-active-project-id-v7',
  md: 'my-playground-md',
  mdMode: 'my-playground-md-mode',
  mdFontSize: 'my-playground-md-font-size',
  mdPreviewZoom: 'my-playground-md-preview-zoom-v3',
  codePreviewZoom: 'my-playground-code-preview-zoom-v3',
  activeEditor: 'my-playground-active-editor',
  autoRun: 'my-playground-auto-run',
  includeTailwind: 'my-playground-include-tailwind',
  editorFontSize: 'my-playground-editor-font-size'
};

let statusTimer = null;
let mdStatusTimer = null;
let mdRenderSeq = 0;
let projects = loadProjects();
let activeProjectId = localStorage.getItem(STORAGE_KEYS.activeProjectId) || projects[0].id;
let editorFontSize = Number(localStorage.getItem(STORAGE_KEYS.editorFontSize) || '16');
let mdMode = localStorage.getItem(STORAGE_KEYS.mdMode) || 'edit';
let mdFontSize = Number(localStorage.getItem(STORAGE_KEYS.mdFontSize) || '16');
let codePreviewZoom = Number(localStorage.getItem(STORAGE_KEYS.codePreviewZoom) || '1');
let mdPreviewZoom = Number(localStorage.getItem(STORAGE_KEYS.mdPreviewZoom) || '1');

if (!projects.some((p) => p.id === activeProjectId)) activeProjectId = projects[0].id;
mdInput.value = localStorage.getItem(STORAGE_KEYS.md) ?? DEFAULT_MARKDOWN;
const savedActiveEditor = localStorage.getItem(STORAGE_KEYS.activeEditor);
const savedAutoRun = localStorage.getItem(STORAGE_KEYS.autoRun);
const savedIncludeTailwind = localStorage.getItem(STORAGE_KEYS.includeTailwind);
if (savedAutoRun !== null) autoRun.checked = savedAutoRun === 'true';
if (savedIncludeTailwind !== null) includeTailwind.checked = savedIncludeTailwind === 'true';

function makeId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function createProject(o = {}) {
  return {
    id: makeId(),
    name: o.name || DEFAULT_PROJECT.name,
    html: o.html ?? DEFAULT_PROJECT.html,
    css: o.css ?? DEFAULT_PROJECT.css,
    js: o.js ?? DEFAULT_PROJECT.js,
    updatedAt: Date.now()
  };
}

function loadProjects() {
  const keys = [
    STORAGE_KEYS.projects,
    'my-playground-projects-v6',
    'my-playground-projects-v5',
    'my-playground-projects-v4',
    'my-playground-projects-v3'
  ];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }
  return [createProject({ name: 'Scratch' })];
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  localStorage.setItem(STORAGE_KEYS.activeProjectId, activeProjectId);
}

function getActiveProject() {
  return projects.find((p) => p.id === activeProjectId) || projects[0];
}

function captureEditorsToActiveProject() {
  const p = getActiveProject();
  p.name = projectNameInput.value.trim() || 'Untitled';
  p.html = htmlCode.value;
  p.css = cssCode.value;
  p.js = jsCode.value;
  p.updatedAt = Date.now();
  saveProjects();
}

function loadProjectIntoEditors(p) {
  activeProjectId = p.id;
  projectNameInput.value = p.name || 'Untitled';
  htmlCode.value = p.html || '';
  cssCode.value = p.css || '';
  jsCode.value = p.js || '';
  saveProjects();
  renderProjectSelect();
}

function renderProjectSelect() {
  projectSelect.innerHTML = '';
  projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name || 'Untitled';
    option.selected = p.id === activeProjectId;
    projectSelect.appendChild(option);
  });
}

function notify(message) {
  clearTimeout(statusTimer);
  statusText.textContent = message;
  statusText.classList.remove('hidden');
  statusTimer = setTimeout(() => statusText.classList.add('hidden'), 1800);
}

function notifyMd(message) {
  clearTimeout(mdStatusTimer);
  mdStatus.textContent = message;
  mdStatus.classList.remove('hidden');
  mdStatusTimer = setTimeout(() => mdStatus.classList.add('hidden'), 1800);
}

function clampZoom(z) {
  return Math.max(0.5, Math.min(2.5, Math.round(z * 100) / 100));
}

function applyEditorFontSize() {
  editorFontSize = Math.max(12, Math.min(24, editorFontSize));
  allCodeTextareas.forEach((t) => { t.style.fontSize = editorFontSize + 'px'; });
  localStorage.setItem(STORAGE_KEYS.editorFontSize, String(editorFontSize));
}

function applyMarkdownFontSize() {
  mdFontSize = Math.max(12, Math.min(24, mdFontSize));
  mdInput.style.fontSize = mdFontSize + 'px';
  localStorage.setItem(STORAGE_KEYS.mdFontSize, String(mdFontSize));
  updateMdStats();
}

function applyCodePreviewZoom({ rerun = true } = {}) {
  codePreviewZoom = clampZoom(codePreviewZoom);
  codeZoomLabel.textContent = Math.round(codePreviewZoom * 100) + '%';
  localStorage.setItem(STORAGE_KEYS.codePreviewZoom, String(codePreviewZoom));
  if (rerun) runCode(false);
}

function applyMdPreviewZoom() {
  mdPreviewZoom = clampZoom(mdPreviewZoom);
  mdPreview.style.zoom = String(mdPreviewZoom);
  mdPreviewZoomLabel.textContent = Math.round(mdPreviewZoom * 100) + '%';
  localStorage.setItem(STORAGE_KEYS.mdPreviewZoom, String(mdPreviewZoom));
}

function showMainTab(name) {
  const isPen = name === 'pen';
  penTab.classList.toggle('hidden', !isPen);
  mdTab.classList.toggle('hidden', isPen);
  penButton.classList.toggle('bg-slate-600', isPen);
  mdButton.classList.toggle('bg-slate-600', !isPen);
  if (!isPen) renderMarkdown();
}

function showEditorTab(name) {
  const isPreview = name === 'preview';
  htmlCode.classList.toggle('hidden', name !== 'html');
  cssCode.classList.toggle('hidden', name !== 'css');
  jsCode.classList.toggle('hidden', name !== 'js');
  editorPanel.classList.toggle('hidden', isPreview);
  previewPanel.classList.toggle('hidden', !isPreview);
  Object.keys(editorTabButtons).forEach((key) => {
    const active = key === name;
    editorTabButtons[key].classList.toggle('editor-tab-active', active);
    editorTabButtons[key].classList.toggle('editor-tab-inactive', !active);
  });
  localStorage.setItem(STORAGE_KEYS.activeEditor, name);
  if (isPreview) runCode(false);
}

function setMarkdownMode(mode) {
  mdMode = mode;
  localStorage.setItem(STORAGE_KEYS.mdMode, mode);
  mdWorkspace.classList.remove('md-workspace-edit-only', 'md-workspace-preview-only', 'md-workspace-split');
  mdInput.classList.toggle('hidden', mode === 'preview');
  mdPreviewShell.classList.toggle('hidden', mode === 'edit');
  if (mode === 'split') mdWorkspace.classList.add('md-workspace-split');
  if (mode === 'edit') mdWorkspace.classList.add('md-workspace-edit-only');
  if (mode === 'preview') mdWorkspace.classList.add('md-workspace-preview-only');
  Object.keys(mdModeButtons).forEach((key) => {
    const active = key === mode;
    mdModeButtons[key].classList.toggle('mode-active', active);
    mdModeButtons[key].classList.toggle('mode-inactive', !active);
  });
  if (mode !== 'edit') renderMarkdown();
}

function formatConsoleArg(v) {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch (_) { return String(v); }
}

function addConsoleLine(level, args) {
  const line = document.createElement('div');
  line.className = 'console-line console-' + level;
  line.textContent = args.map(formatConsoleArg).join(' ');
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  consoleOutput.innerHTML = '';
}

function safeForScript(v) {
  return String(v).replace(/<\/script/gi, '<\\/script');
}

function getConsoleBridgeScript() {
  return `<script>
(function(){
  function s(level,args){
    window.parent.postMessage({
      type:"playground-console",
      level:level,
      args:Array.prototype.map.call(args,function(a){
        try{
          if(a instanceof Error)return a.stack||a.message;
          if(a instanceof HTMLElement)return a.outerHTML;
          if(typeof a==="function")return String(a);
          structuredClone(a);
          return a;
        }catch(e){
          try{return JSON.stringify(a);}catch(e2){return String(a);}
        }
      })
    },"*");
  }
  ["log","warn","error"].forEach(function(level){
    var o=console[level];
    console[level]=function(){s(level,arguments);o.apply(console,arguments);};
  });
  window.addEventListener("error",function(e){s("error",[e.message+" at "+e.filename+":"+e.lineno]);});
  window.addEventListener("unhandledrejection",function(e){s("error",["Unhandled promise rejection",e.reason]);});
})();
</script>`;
}

function getPreviewZoomStyle() {
  return `<style id="__preview_zoom">body{zoom:${codePreviewZoom};}</style>`;
}

function buildStandaloneDocument(withBridge) {
  const tailwindScript = includeTailwind.checked ? '<script src="https://cdn.tailwindcss.com"></script>' : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${tailwindScript}
<style>
${cssCode.value}
</style>
${withBridge ? getPreviewZoomStyle() : ''}
</head>
<body>
${htmlCode.value}
${withBridge ? getConsoleBridgeScript() : ''}
<script>
try {
${safeForScript(jsCode.value)}
} catch (error) { console.error(error); }
</script>
</body>
</html>`;
}

function runCode(switchToPreview) {
  captureEditorsToActiveProject();
  localStorage.setItem(STORAGE_KEYS.autoRun, String(autoRun.checked));
  localStorage.setItem(STORAGE_KEYS.includeTailwind, String(includeTailwind.checked));
  clearConsole();
  outputFrame.srcdoc = buildStandaloneDocument(true);
  if (switchToPreview) showEditorTab('preview');
}

function debounce(fn, delay) {
  let timerId;
  return function () {
    const args = arguments;
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(null, args), delay);
  };
}

const autoRunDebounced = debounce(() => {
  captureEditorsToActiveProject();
  renderProjectSelect();
  if (autoRun.checked) runCode(false);
}, 500);

async function copyStandaloneHtml() {
  captureEditorsToActiveProject();
  try {
    await navigator.clipboard.writeText(buildStandaloneDocument(false));
    notify('Standalone HTMLをコピーしました');
  } catch (_) {
    notify('コピーできませんでした');
  }
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportStandaloneHtml() {
  captureEditorsToActiveProject();
  const safeName = (getActiveProject().name || 'playground').trim().replace(/[\\/:*?\"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 60) || 'playground';
  downloadText(safeName + '.html', buildStandaloneDocument(false), 'text/html;charset=utf-8');
  notify('HTMLを書き出しました');
}

function updateMdStats() {
  const text = mdInput.value;
  const chars = text.length;
  const noSpace = text.replace(/\s/g, '').length;
  const words = (text.trim().match(/[A-Za-z0-9_]+|[\u3040-\u30ff\u3400-\u9fff]+/g) || []).length;
  const headings = (text.match(/^#{1,6}\s+/gm) || []).length;
  mdStats.textContent = '文字: ' + chars + ' / 空白除く: ' + noSpace + ' / 語句: ' + words + ' / 見出し: ' + headings + ' / font: ' + mdFontSize + 'px';
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\u3040-\u30ff\u3400-\u9fff\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

function addHeadingAnchors() {
  const used = {};
  mdPreview.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    let id = slugify(h.textContent || 'heading') || 'heading';
    used[id] = (used[id] || 0) + 1;
    if (used[id] > 1) id += '-' + used[id];
    h.id = id;
  });
}

async function renderMermaidBlocks(token) {
  const blocks = Array.from(mdPreview.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid'));
  for (let i = 0; i < blocks.length; i += 1) {
    const code = blocks[i];
    const graph = code.textContent;
    const pre = code.parentElement;
    const host = document.createElement('div');
    host.className = 'mermaid-host';
    host.textContent = 'Mermaidを描画中...';
    pre.replaceWith(host);

    try {
      const id = 'mermaid-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 8);
      const result = await mermaid.render(id, graph);
      if (token !== mdRenderSeq) return;
      host.innerHTML = result.svg;
    } catch (error) {
      if (token !== mdRenderSeq) return;
      host.classList.add('mermaid-error');
      host.textContent = 'Mermaidの構文エラーです。\n\n' + (error && error.message ? error.message : String(error)) + '\n\n' + graph;
    }
  }
}

async function renderMarkdown() {
  const token = ++mdRenderSeq;
  const source = mdInput.value;
  localStorage.setItem(STORAGE_KEYS.md, source);
  updateMdStats();

  if (!window.marked || !window.hljs) {
    mdPreview.textContent = 'Markdownライブラリの読み込み中です。';
    return;
  }

  mdPreview.innerHTML = marked.parse(source, { gfm: true, breaks: true });
  await renderMermaidBlocks(token);
  if (token !== mdRenderSeq) return;
  mdPreview.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
  addHeadingAnchors();
  applyMdPreviewZoom();
}

const renderMarkdownDebounced = debounce(renderMarkdown, 250);

function getSelectionInfo() {
  return { start: mdInput.selectionStart || 0, end: mdInput.selectionEnd || 0, value: mdInput.value };
}

function replaceSelection(text, selectStartOffset, selectEndOffset) {
  const s = getSelectionInfo();
  mdInput.value = s.value.slice(0, s.start) + text + s.value.slice(s.end);
  const base = s.start;
  mdInput.focus();
  if (selectStartOffset !== undefined && selectEndOffset !== undefined) {
    mdInput.setSelectionRange(base + selectStartOffset, base + selectEndOffset);
  } else {
    mdInput.setSelectionRange(base + text.length, base + text.length);
  }
  renderMarkdownDebounced();
}

function wrapSelection(prefix, suffix, placeholder) {
  const s = getSelectionInfo();
  const selected = s.value.slice(s.start, s.end) || placeholder;
  replaceSelection(prefix + selected + suffix, prefix.length, prefix.length + selected.length);
}

function prefixCurrentLine(prefix) {
  const s = getSelectionInfo();
  const lineStart = s.value.lastIndexOf('\n', s.start - 1) + 1;
  mdInput.value = s.value.slice(0, lineStart) + prefix + s.value.slice(lineStart);
  mdInput.focus();
  mdInput.setSelectionRange(s.start + prefix.length, s.end + prefix.length);
  renderMarkdownDebounced();
}

function insertBlock(block) {
  const s = getSelectionInfo();
  const needsBefore = s.start > 0 && s.value[s.start - 1] !== '\n';
  const needsAfter = s.end < s.value.length && s.value[s.end] !== '\n';
  replaceSelection((needsBefore ? '\n' : '') + block + (needsAfter ? '\n' : ''));
}

function buildToc() {
  const items = [];
  mdInput.value.split('\n').forEach((line) => {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (!m) return;
    const level = m[1].length;
    const title = m[2].replace(/#+\s*$/, '').trim();
    const indent = '  '.repeat(Math.max(0, level - 1));
    items.push(indent + '- [' + title + '](#' + slugify(title) + ')');
  });
  return items.length ? '## 目次\n\n' + items.join('\n') + '\n' : '## 目次\n\n- 見出しがありません\n';
}

function getMarkdownHtmlDocument() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown Export</title>
<style>
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7;max-width:820px;margin:0 auto;padding:24px;color:#0f172a}
.markdown-body pre{overflow:auto;background:#f8fafc;border-radius:12px;padding:12px}
.markdown-body code{background:#f1f5f9;padding:.15rem .35rem;border-radius:.35rem}
.markdown-body pre code{background:transparent;padding:0}
.markdown-body table{border-collapse:collapse;width:100%;display:block;overflow:auto}
.markdown-body th,.markdown-body td{border:1px solid #cbd5e1;padding:.4rem .6rem}
.markdown-body th{background:#f1f5f9}
.mermaid-host{display:flex;justify-content:center;overflow:auto;margin:1rem 0;padding:1rem;border:1px solid #e5e7eb;border-radius:12px}
</style>
</head>
<body>
<article class="markdown-body">
${mdPreview.innerHTML}
</article>
</body>
</html>`;
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(mdInput.value);
    notifyMd('Markdownをコピーしました');
  } catch (_) {
    notifyMd('コピーできませんでした');
  }
}

async function copyMarkdownHtml() {
  await renderMarkdown();
  try {
    await navigator.clipboard.writeText(getMarkdownHtmlDocument());
    notifyMd('HTMLをコピーしました');
  } catch (_) {
    notifyMd('コピーできませんでした');
  }
}

penButton.addEventListener('click', () => showMainTab('pen'));
mdButton.addEventListener('click', () => { showMainTab('md'); renderMarkdown(); });
editorTabButtons.html.addEventListener('click', () => showEditorTab('html'));
editorTabButtons.css.addEventListener('click', () => showEditorTab('css'));
editorTabButtons.js.addEventListener('click', () => showEditorTab('js'));
editorTabButtons.preview.addEventListener('click', () => showEditorTab('preview'));
projectSelect.addEventListener('change', () => {
  captureEditorsToActiveProject();
  const next = projects.find((p) => p.id === projectSelect.value);
  if (next) {
    loadProjectIntoEditors(next);
    notify('プロジェクトを切り替えました');
    if (autoRun.checked) runCode(false);
  }
});
projectNameInput.addEventListener('input', debounce(() => { captureEditorsToActiveProject(); renderProjectSelect(); }, 300));
$('new-project').addEventListener('click', () => {
  captureEditorsToActiveProject();
  const name = prompt('新しいプロジェクト名', 'Untitled');
  if (name === null) return;
  const p = createProject({ name: name.trim() || 'Untitled', html: '', css: '', js: '' });
  projects.push(p);
  loadProjectIntoEditors(p);
  showEditorTab('html');
  notify('新規プロジェクトを作成しました');
});
$('save-project').addEventListener('click', () => { captureEditorsToActiveProject(); renderProjectSelect(); notify('保存しました'); });
$('delete-project').addEventListener('click', () => {
  if (projects.length <= 1) { notify('最後のプロジェクトは削除できません'); return; }
  const p = getActiveProject();
  if (!confirm('「' + p.name + '」を削除しますか？')) return;
  projects = projects.filter((item) => item.id !== p.id);
  activeProjectId = projects[0].id;
  saveProjects();
  loadProjectIntoEditors(projects[0]);
  notify('削除しました');
});
$('reset-sample').addEventListener('click', () => {
  if (!confirm('現在のコードをサンプルに戻しますか？')) return;
  const p = getActiveProject();
  p.html = DEFAULT_PROJECT.html;
  p.css = DEFAULT_PROJECT.css;
  p.js = DEFAULT_PROJECT.js;
  p.updatedAt = Date.now();
  saveProjects();
  loadProjectIntoEditors(p);
  showEditorTab('html');
  if (autoRun.checked) runCode(false);
  notify('サンプルを読み込みました');
});
$('copy-html').addEventListener('click', copyStandaloneHtml);
$('export-html').addEventListener('click', exportStandaloneHtml);
$('font-smaller').addEventListener('click', () => { editorFontSize -= 1; applyEditorFontSize(); notify('フォント ' + editorFontSize + 'px'); });
$('font-larger').addEventListener('click', () => { editorFontSize += 1; applyEditorFontSize(); notify('フォント ' + editorFontSize + 'px'); });
runButton.addEventListener('click', () => runCode(true));
$('clear-console').addEventListener('click', clearConsole);
allCodeTextareas.forEach((t) => t.addEventListener('input', autoRunDebounced));
autoRun.addEventListener('change', () => { localStorage.setItem(STORAGE_KEYS.autoRun, String(autoRun.checked)); if (autoRun.checked) runCode(false); });
includeTailwind.addEventListener('change', () => { localStorage.setItem(STORAGE_KEYS.includeTailwind, String(includeTailwind.checked)); runCode(false); });
$('code-zoom-out').addEventListener('click', () => { codePreviewZoom -= 0.1; applyCodePreviewZoom(); notify('Preview ' + Math.round(codePreviewZoom * 100) + '%'); });
$('code-zoom-in').addEventListener('click', () => { codePreviewZoom += 0.1; applyCodePreviewZoom(); notify('Preview ' + Math.round(codePreviewZoom * 100) + '%'); });
$('code-zoom-reset').addEventListener('click', () => { codePreviewZoom = 1; applyCodePreviewZoom(); notify('Preview 100%'); });
mdModeButtons.edit.addEventListener('click', () => setMarkdownMode('edit'));
mdModeButtons.split.addEventListener('click', () => setMarkdownMode('split'));
mdModeButtons.preview.addEventListener('click', () => setMarkdownMode('preview'));
$('md-h1').addEventListener('click', () => prefixCurrentLine('# '));
$('md-h2').addEventListener('click', () => prefixCurrentLine('## '));
$('md-bold').addEventListener('click', () => wrapSelection('**', '**', 'bold text'));
$('md-italic').addEventListener('click', () => wrapSelection('*', '*', 'italic text'));
$('md-code').addEventListener('click', () => insertBlock('```javascript\nconsole.log("hello");\n```\n'));
$('md-table').addEventListener('click', () => insertBlock('| Column | Value |\n|---|---:|\n| A | 100 |\n| B | 80 |\n'));
$('md-mermaid').addEventListener('click', () => insertBlock('```mermaid\ngraph TD\n  A[Start] --> B[Next]\n```\n'));
$('md-toc').addEventListener('click', () => insertBlock(buildToc()));
$('md-copy').addEventListener('click', copyMarkdown);
$('md-copy-html').addEventListener('click', copyMarkdownHtml);
$('md-export').addEventListener('click', () => { downloadText('markdown.md', mdInput.value, 'text/markdown;charset=utf-8'); notifyMd('Markdownを書き出しました'); });
$('md-export-html').addEventListener('click', async () => { await renderMarkdown(); downloadText('markdown.html', getMarkdownHtmlDocument(), 'text/html;charset=utf-8'); notifyMd('HTMLを書き出しました'); });
$('md-sample').addEventListener('click', () => { if (!confirm('Markdownをサンプルに戻しますか？')) return; mdInput.value = DEFAULT_MARKDOWN; renderMarkdown(); notifyMd('サンプルを読み込みました'); });
$('md-clear').addEventListener('click', () => { if (!confirm('Markdownを空にしますか？')) return; mdInput.value = ''; renderMarkdown(); notifyMd('クリアしました'); });
$('md-font-smaller').addEventListener('click', () => { mdFontSize -= 1; applyMarkdownFontSize(); notifyMd('フォント ' + mdFontSize + 'px'); });
$('md-font-larger').addEventListener('click', () => { mdFontSize += 1; applyMarkdownFontSize(); notifyMd('フォント ' + mdFontSize + 'px'); });
$('md-preview-zoom-out').addEventListener('click', () => { mdPreviewZoom -= 0.1; applyMdPreviewZoom(); notifyMd('Preview ' + Math.round(mdPreviewZoom * 100) + '%'); });
$('md-preview-zoom-in').addEventListener('click', () => { mdPreviewZoom += 0.1; applyMdPreviewZoom(); notifyMd('Preview ' + Math.round(mdPreviewZoom * 100) + '%'); });
$('md-preview-zoom-reset').addEventListener('click', () => { mdPreviewZoom = 1; applyMdPreviewZoom(); notifyMd('Preview 100%'); });
mdInput.addEventListener('input', renderMarkdownDebounced);
window.addEventListener('message', (event) => { if (!event.data || event.data.type !== 'playground-console') return; addConsoleLine(event.data.level || 'log', event.data.args || []); });

renderProjectSelect();
loadProjectIntoEditors(getActiveProject());
applyEditorFontSize();
applyMarkdownFontSize();
applyCodePreviewZoom({ rerun: false });
applyMdPreviewZoom();
showMainTab('pen');
showEditorTab(savedActiveEditor || 'html');
setMarkdownMode(mdMode);
runCode(false);
renderMarkdown();
