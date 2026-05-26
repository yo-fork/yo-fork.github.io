(() => {
  const KATEX_VERSION = '0.16.11';
  const mathBlocks = new Map();
  let mathBlockSeq = 0;
  let katexLoadPromise = null;
  let mathRendering = false;

  function $(id) {
    return document.getElementById(id);
  }

  function setupPreviewZoomBar() {
    const source = $('md-zoom-source');
    const bar = $('md-preview-zoom-bar');
    const out = $('md-preview-zoom-out');
    const reset = $('md-preview-zoom-reset');
    const input = $('md-preview-zoom-in');
    const label = $('md-preview-zoom-label');

    if (!source || !bar || !out || !reset || !input || !label) return;

    out.textContent = '−';
    reset.textContent = '100%';
    input.textContent = '＋';

    bar.append(out, reset, input, label);
    source.remove();
  }

  function updatePreviewZoomBarVisibility() {
    const bar = $('md-preview-zoom-bar');
    const previewShell = $('md-preview-shell');
    if (!bar || !previewShell) return;
    bar.classList.toggle('hidden', previewShell.classList.contains('hidden'));
  }

  function taskLineIndexes(markdown) {
    const indexes = [];
    markdown.split('\n').forEach((line, i) => {
      if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) indexes.push(i);
    });
    return indexes;
  }

  function makeChecklistInteractive() {
    const mdInput = $('md-input');
    const mdPreview = $('md-preview');
    if (!mdInput || !mdPreview) return;

    const boxes = Array.from(mdPreview.querySelectorAll('input[type="checkbox"]'));
    if (boxes.length === 0) return;

    const indexes = taskLineIndexes(mdInput.value);

    boxes.forEach((box, i) => {
      if (box.dataset.playgroundChecklistReady === '1') return;
      box.dataset.playgroundChecklistReady = '1';
      box.disabled = false;
      box.removeAttribute('disabled');
      box.style.pointerEvents = 'auto';
      box.style.cursor = 'pointer';
      box.setAttribute('aria-label', 'Toggle task');

      box.addEventListener('change', () => {
        const lineIndex = indexes[i];
        if (lineIndex === undefined) return;

        const lines = mdInput.value.split('\n');
        lines[lineIndex] = lines[lineIndex].replace(/^(\s*[-*+]\s+\[)[ xX](\]\s+)/, '$1' + (box.checked ? 'x' : ' ') + '$2');
        mdInput.value = lines.join('\n');
        localStorage.setItem('my-playground-md', mdInput.value);
        mdInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function loadKatex() {
    if (window.katex) return Promise.resolve(window.katex);
    if (katexLoadPromise) return katexLoadPromise;

    katexLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-playground-katex]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
        link.dataset.playgroundKatex = '1';
        document.head.appendChild(link);
      }

      const script = document.createElement('script');
      script.src = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
      script.defer = true;
      script.dataset.playgroundKatex = '1';
      script.onload = () => resolve(window.katex);
      script.onerror = () => reject(new Error('KaTeXの読み込みに失敗しました'));
      document.head.appendChild(script);
    });

    return katexLoadPromise;
  }

  function makeMathToken(tex) {
    const token = `PGMATHBLOCK${mathBlockSeq++}PG`;
    mathBlocks.set(token, tex.trim());
    return token;
  }

  function preprocessBlockMath(markdown) {
    let text = String(markdown || '');

    // $$ ... $$ block. This handles both multi-line and one-line display math.
    text = text.replace(/(^|\n)[ \t]*\$\$[ \t]*(?:\n)?([\s\S]*?)(?:\n)?[ \t]*\$\$[ \t]*(?=\n|$)/g, (match, lead, tex) => {
      if (!tex.trim()) return match;
      return lead + makeMathToken(tex) + '\n';
    });

    // \[ ... \] block. This also handles one-line display math.
    text = text.replace(/(^|\n)[ \t]*\\\[[ \t]*(?:\n)?([\s\S]*?)(?:\n)?[ \t]*\\\][ \t]*(?=\n|$)/g, (match, lead, tex) => {
      if (!tex.trim()) return match;
      return lead + makeMathToken(tex) + '\n';
    });

    return text;
  }

  function patchMarkedForBlockMath() {
    if (!window.marked || window.marked.__playgroundBlockMathPatched) return;
    const originalParse = window.marked.parse.bind(window.marked);
    window.marked.parse = (source, ...args) => originalParse(preprocessBlockMath(source), ...args);
    window.marked.__playgroundBlockMathPatched = true;
  }

  function shouldSkipMathNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('code, pre, kbd, samp, script, style, textarea, .katex, .katex-display, .math-inline, .math-display, .mermaid-host, .mermaid-error'));
  }

  function findMathToken(text, startIndex) {
    const candidates = [];

    const push = (index, open, close, displayMode) => {
      if (index >= 0) candidates.push({ index, open, close, displayMode });
    };

    push(text.indexOf('\\(', startIndex), '\\(', '\\)', false);

    let dollarIndex = text.indexOf('$', startIndex);
    while (dollarIndex >= 0) {
      const prev = text[dollarIndex - 1] || '';
      const next = text[dollarIndex + 1] || '';
      const isDouble = text[dollarIndex + 1] === '$' || text[dollarIndex - 1] === '$';
      const likelyCurrency = /\d/.test(next) || /\d/.test(prev);
      if (!isDouble && !likelyCurrency && next && !/\s/.test(next)) {
        push(dollarIndex, '$', '$', false);
        break;
      }
      dollarIndex = text.indexOf('$', dollarIndex + 1);
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.index - b.index);
    return candidates[0];
  }

  function splitMathText(text) {
    const parts = [];
    let cursor = 0;

    while (cursor < text.length) {
      const token = findMathToken(text, cursor);
      if (!token) {
        parts.push({ type: 'text', value: text.slice(cursor) });
        break;
      }

      if (token.index > cursor) parts.push({ type: 'text', value: text.slice(cursor, token.index) });

      const contentStart = token.index + token.open.length;
      const closeIndex = text.indexOf(token.close, contentStart);
      if (closeIndex < 0) {
        parts.push({ type: 'text', value: text.slice(token.index) });
        break;
      }

      const raw = text.slice(contentStart, closeIndex);
      const beforeClose = text[closeIndex - 1] || '';
      const afterClose = text[closeIndex + token.close.length] || '';
      const invalidInlineDollar = token.open === '$' && (/\s/.test(beforeClose) || afterClose === '$');

      if (!raw.trim() || invalidInlineDollar) {
        parts.push({ type: 'text', value: text.slice(token.index, closeIndex + token.close.length) });
      } else {
        parts.push({ type: 'math', value: raw.trim(), displayMode: token.displayMode });
      }

      cursor = closeIndex + token.close.length;
    }

    return parts;
  }

  function renderMathElement(tex, displayMode) {
    const wrapper = document.createElement(displayMode ? 'div' : 'span');
    wrapper.className = displayMode ? 'math-display' : 'math-inline';

    try {
      wrapper.innerHTML = window.katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        trust: false,
        strict: 'warn',
        output: 'html'
      });
    } catch (error) {
      wrapper.className += ' math-error';
      wrapper.textContent = (displayMode ? '$$' : '$') + tex + (displayMode ? '$$' : '$');
      wrapper.title = error && error.message ? error.message : String(error);
    }

    return wrapper;
  }

  function processMathPlaceholders(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return /PGMATHBLOCK\d+PG/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue || '';
      const parts = text.split(/(PGMATHBLOCK\d+PG)/g).filter(Boolean);
      const fragment = document.createDocumentFragment();

      parts.forEach((part) => {
        if (mathBlocks.has(part)) fragment.append(renderMathElement(mathBlocks.get(part), true));
        else fragment.append(document.createTextNode(part));
      });

      const parent = node.parentElement;
      const onlyPlaceholder = parent && parent.textContent.trim() === text.trim() && /^PGMATHBLOCK\d+PG$/.test(text.trim());
      if (onlyPlaceholder && parent.tagName.toLowerCase() === 'p' && fragment.childNodes.length === 1) {
        parent.replaceWith(fragment);
      } else {
        node.replaceWith(fragment);
      }
    });
  }

  async function renderMathInMarkdown() {
    const mdPreview = $('md-preview');
    if (!mdPreview || mathRendering) return;
    if (!/[\\$]|PGMATHBLOCK\d+PG/.test(mdPreview.textContent || '')) return;

    mathRendering = true;
    try {
      await loadKatex();
      processMathPlaceholders(mdPreview);

      const walker = document.createTreeWalker(mdPreview, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (shouldSkipMathNode(node)) return NodeFilter.FILTER_REJECT;
          if (!/[\\$]/.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        const parts = splitMathText(node.nodeValue || '');
        if (!parts.some((part) => part.type === 'math')) return;

        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
          if (part.type === 'text') fragment.append(document.createTextNode(part.value));
          else fragment.append(renderMathElement(part.value, part.displayMode));
        });
        node.replaceWith(fragment);
      });
    } catch (error) {
      console.error(error);
    } finally {
      mathRendering = false;
    }
  }

  function installObservers() {
    const mdPreview = $('md-preview');
    const mdPreviewShell = $('md-preview-shell');
    const mdButtons = [$('md-mode-edit'), $('md-mode-split'), $('md-mode-preview')].filter(Boolean);

    if (mdPreview) {
      const observer = new MutationObserver(() => {
        makeChecklistInteractive();
        updatePreviewZoomBarVisibility();
        renderMathInMarkdown();
      });
      observer.observe(mdPreview, { childList: true, subtree: true });
    }

    if (mdPreviewShell) {
      const shellObserver = new MutationObserver(updatePreviewZoomBarVisibility);
      shellObserver.observe(mdPreviewShell, { attributes: true, attributeFilter: ['class'] });
    }

    mdButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setTimeout(() => {
          makeChecklistInteractive();
          updatePreviewZoomBarVisibility();
          renderMathInMarkdown();
        }, 50);
      });
    });
  }

  function installStyle() {
    const style = document.createElement('style');
    style.textContent = `
      #md-preview-zoom-bar.hidden { display: none !important; }
      #md-preview-zoom-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .25rem; }
      .markdown-body input[type="checkbox"] { width: 1.1em; height: 1.1em; margin-right: .35em; vertical-align: -0.15em; accent-color: #2563eb; }
      .markdown-body .math-inline { display: inline-block; margin: 0 .08em; max-width: 100%; overflow-x: auto; vertical-align: -0.08em; }
      .markdown-body .math-display { display: block; margin: 1rem 0; overflow-x: auto; text-align: center; }
      .markdown-body .math-error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: .4rem; padding: .08rem .28rem; }
    `;
    document.head.appendChild(style);
  }

  function addMathHints() {
    const tools = $('md-tools');
    if (!tools || $('md-math-hint')) return;
    const hint = document.createElement('div');
    hint.id = 'md-math-hint';
    hint.className = 'mt-2 text-xs text-slate-600';
    hint.textContent = 'Math: $x^2$ / $$\\sum_i x_i$$ / \\(a+b\\) / \\[E=mc^2\\]';
    tools.appendChild(hint);
  }

  function requestRerender() {
    const mdInput = $('md-input');
    if (!mdInput) return;
    mdInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function boot() {
    installStyle();
    patchMarkedForBlockMath();
    setupPreviewZoomBar();
    installObservers();
    addMathHints();
    makeChecklistInteractive();
    updatePreviewZoomBarVisibility();
    renderMathInMarkdown();
    setTimeout(requestRerender, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
