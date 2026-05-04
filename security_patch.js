(() => {
  const ALLOWED_TAGS = new Set([
    'a','abbr','b','blockquote','br','code','del','details','div','em','h1','h2','h3','h4','h5','h6','hr','i','input','kbd','li','ol','p','pre','s','span','strong','sub','summary','sup','table','tbody','td','th','thead','tr','ul'
  ]);

  const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'role', 'aria-label', 'aria-hidden', 'colspan', 'rowspan']);
  const TAG_ATTRS = {
    a: new Set(['href', 'name']),
    code: new Set(['class']),
    pre: new Set(['class']),
    input: new Set(['type', 'checked', 'disabled'])
  };

  function isSafeUrl(value) {
    const trimmed = String(value || '').trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
    try {
      const url = new URL(trimmed, location.href);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  }

  function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        node.replaceWith(document.createTextNode(node.textContent || ''));
        continue;
      }

      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        const specific = TAG_ATTRS[tag] && TAG_ATTRS[tag].has(name);
        const allowed = (GLOBAL_ATTRS.has(name) || specific) && !name.startsWith('on') && name !== 'style';
        if (!allowed) {
          node.removeAttribute(attr.name);
          continue;
        }
        if (name === 'href' && !isSafeUrl(attr.value)) node.removeAttribute(attr.name);
      }

      if (tag === 'a') {
        node.setAttribute('rel', 'noopener noreferrer');
      }

      if (tag === 'input') {
        if ((node.getAttribute('type') || '').toLowerCase() !== 'checkbox') {
          node.remove();
        } else {
          node.setAttribute('disabled', '');
        }
      }
    }
    return template.innerHTML;
  }

  function patchMarked() {
    if (!window.marked || window.marked.__playgroundSanitized) return;
    const originalParse = window.marked.parse.bind(window.marked);
    window.marked.parse = (...args) => sanitizeHtml(originalParse(...args));
    window.marked.__playgroundSanitized = true;
  }

  localStorage.setItem('my-playground-include-tailwind', 'false');

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'playground-console') return;
    const frame = document.getElementById('output-frame');
    if (frame && event.source !== frame.contentWindow) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function hardenTailwindToggle() {
    const checkbox = document.getElementById('include-tailwind');
    if (!checkbox) return;
    checkbox.checked = false;
    checkbox.disabled = true;
    checkbox.title = 'Security mode: external Tailwind browser CDN is disabled.';
    const label = checkbox.closest('label');
    if (label) label.title = checkbox.title;
  }

  patchMarked();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      patchMarked();
      hardenTailwindToggle();
    });
  } else {
    patchMarked();
    hardenTailwindToggle();
  }
})();
