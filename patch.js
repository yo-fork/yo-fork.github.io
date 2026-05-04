(() => {
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

  function installObservers() {
    const mdPreview = $('md-preview');
    const mdPreviewShell = $('md-preview-shell');
    const mdButtons = [$('md-mode-edit'), $('md-mode-split'), $('md-mode-preview')].filter(Boolean);

    if (mdPreview) {
      const observer = new MutationObserver(() => {
        makeChecklistInteractive();
        updatePreviewZoomBarVisibility();
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
    `;
    document.head.appendChild(style);
  }

  function boot() {
    installStyle();
    setupPreviewZoomBar();
    installObservers();
    makeChecklistInteractive();
    updatePreviewZoomBarVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
