(() => {
  const KATEX_VERSION = '0.16.11';
  let loading = null;
  let busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function loadKatex() {
    if (window.katex) return Promise.resolve(window.katex);
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
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
      script.onerror = () => reject(new Error('KaTeX load failed'));
      document.head.appendChild(script);
    });

    return loading;
  }

  function renderMath(tex, displayMode) {
    const el = document.createElement(displayMode ? 'div' : 'span');
    el.className = displayMode ? 'math-display' : 'math-inline';

    try {
      el.innerHTML = window.katex.renderToString(tex.trim(), {
        displayMode,
        throwOnError: false,
        trust: false,
        strict: 'warn',
        output: 'html'
      });
    } catch (error) {
      el.className += ' math-error';
      el.textContent = displayMode ? `$$${tex}$$` : `$${tex}$`;
      el.title = error && error.message ? error.message : String(error);
    }

    return el;
  }

  function splitDisplayMath(text) {
    const parts = [];
    const pattern = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
      const tex = match[2] !== undefined ? match[2] : match[3];
      if (tex && tex.trim()) parts.push({ type: 'math', value: tex.trim() });
      else parts.push({ type: 'text', value: match[0] });
      last = pattern.lastIndex;
    }

    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts;
  }

  function buildFragment(parts) {
    const fragment = document.createDocumentFragment();

    parts.forEach((part) => {
      if (part.type === 'math') {
        fragment.append(renderMath(part.value, true));
        return;
      }

      const lines = part.value.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) fragment.append(document.createElement('br'));
        if (line) fragment.append(document.createTextNode(line));
      });
    });

    return fragment;
  }

  function shouldSkip(el) {
    return Boolean(el.closest('pre, code, kbd, samp, script, style, textarea, .katex, .katex-display, .math-inline, .math-display, .mermaid-host, .mermaid-error'));
  }

  async function processBlockMath() {
    const root = $('md-preview');
    if (!root || busy) return;
    const text = root.textContent || '';
    if (!text.includes('$$') && !text.includes('\\[')) return;

    busy = true;
    try {
      await loadKatex();

      const targets = Array.from(root.querySelectorAll('p, li, div'))
        .filter((el) => !shouldSkip(el))
        .filter((el) => {
          const t = el.textContent || '';
          return (t.includes('$$') || t.includes('\\[')) && !el.querySelector('.math-display, .math-inline');
        });

      targets.forEach((el) => {
        const textContent = (el.textContent || '').replace(/\u00a0/g, ' ');
        const parts = splitDisplayMath(textContent);
        if (!parts.some((part) => part.type === 'math')) return;
        el.replaceChildren(buildFragment(parts));
      });
    } finally {
      busy = false;
    }
  }

  function boot() {
    const root = $('md-preview');
    if (!root) return;

    const observer = new MutationObserver(() => {
      setTimeout(processBlockMath, 30);
    });
    observer.observe(root, { childList: true, subtree: true });

    setTimeout(processBlockMath, 80);
    setTimeout(processBlockMath, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
