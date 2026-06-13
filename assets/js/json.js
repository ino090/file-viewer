/* ============================================
   JSON ビューア
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const jsonTree = document.getElementById('jsonTree');
  const jsonRaw = document.getElementById('jsonRaw');
  const treeToolbar = document.getElementById('treeToolbar');
  const modeTree = document.getElementById('modeTree');
  const modeRaw = document.getElementById('modeRaw');
  const searchInput = document.getElementById('searchInput');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const copyBtn = document.getElementById('copyBtn');
  const resetBtn = document.getElementById('resetBtn');
  const pasteArea = document.getElementById('pasteArea');
  const loadPasteBtn = document.getElementById('loadPasteBtn');

  let currentData = null;
  let currentLabel = '';

  setupDropzone(dropzone, fileInput, handleFile);

  loadPasteBtn.addEventListener('click', () => {
    const text = pasteArea.value;
    if (!text.trim()) return;
    loadFromText(text, '貼り付けたテキスト', text.length);
  });

  modeTree.addEventListener('change', updateViewMode);
  modeRaw.addEventListener('change', updateViewMode);

  expandAllBtn.addEventListener('click', () => setAllCollapsed(false));
  collapseAllBtn.addEventListener('click', () => setAllCollapsed(true));

  searchInput.addEventListener('input', () => searchTree(searchInput.value));

  copyBtn.addEventListener('click', async () => {
    if (currentData === null) return;
    const text = JSON.stringify(currentData, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'コピーしました';
      setTimeout(() => (copyBtn.textContent = '整形済みJSONをコピー'), 1500);
    } catch (err) {
      showError(errorBox, 'クリップボードへのコピーに失敗しました。');
    }
  });

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    pasteArea.value = '';
    currentData = null;
    resultArea.classList.add('hidden');
    hideError(errorBox);
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function handleFile(file) {
    hideError(errorBox);

    const ext = getExtension(file.name);
    if (ext !== 'json') {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.json ファイルを選択してください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      loadFromText(e.target.result, file.name, file.size);
    };
    reader.onerror = () => {
      showError(errorBox, 'ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsText(file, 'utf-8');
  }

  function loadFromText(text, label, size) {
    hideError(errorBox);
    const parsed = parseJsonWithLocation(text);
    if (parsed.error) {
      showError(errorBox, parsed.error);
      resultArea.classList.add('hidden');
      return;
    }

    currentData = parsed.data;
    currentLabel = label;
    showFileInfo(label, size);
    renderTree(currentData);
    renderRaw(currentData);
    updateViewMode();
    resultArea.classList.remove('hidden');
  }

  function parseJsonWithLocation(text) {
    try {
      return { data: JSON.parse(text) };
    } catch (err) {
      let location = '';
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const head = text.slice(0, pos);
        const lines = head.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        location = `（${line}行目 ${col}文字目付近）`;
      }
      return { error: `JSONの解析に失敗しました${location}\n${err.message}` };
    }
  }

  function showFileInfo(label, size) {
    const count = countNodes(currentData);
    fileInfo.innerHTML = `
      <span>名前: <strong>${escapeHtml(label)}</strong></span>
      <span>サイズ: <strong>${formatBytes(size)}</strong></span>
      <span>要素数: <strong>${count}</strong></span>
      <span>型: <strong>${describeType(currentData)}</strong></span>
    `;
  }

  function describeType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return `配列（${value.length}件）`;
    if (typeof value === 'object') return `オブジェクト（${Object.keys(value).length}キー）`;
    return typeof value;
  }

  function countNodes(value) {
    if (value === null || typeof value !== 'object') return 1;
    let count = 1;
    const entries = Array.isArray(value) ? value : Object.values(value);
    entries.forEach((v) => {
      count += countNodes(v);
    });
    return count;
  }

  function updateViewMode() {
    if (modeTree.checked) {
      jsonTree.classList.remove('hidden');
      jsonRaw.classList.add('hidden');
      treeToolbar.classList.remove('hidden');
    } else {
      jsonTree.classList.add('hidden');
      jsonRaw.classList.remove('hidden');
      treeToolbar.classList.add('hidden');
    }
  }

  function renderRaw(data) {
    jsonRaw.textContent = JSON.stringify(data, null, 2);
  }

  function renderTree(data) {
    jsonTree.innerHTML = '';
    const ul = document.createElement('ul');
    ul.appendChild(buildNode(undefined, data));
    jsonTree.appendChild(ul);
  }

  function buildNode(key, value) {
    const li = document.createElement('li');
    const isContainer = value !== null && typeof value === 'object';

    if (isContainer) {
      const isArray = Array.isArray(value);
      const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
      const open = isArray ? '[' : '{';
      const close = isArray ? ']' : '}';

      const toggle = document.createElement('span');
      toggle.className = 'json-toggle';
      toggle.textContent = entries.length > 0 ? '▾' : ' ';
      if (entries.length > 0) {
        toggle.addEventListener('click', () => {
          const collapsed = li.classList.toggle('json-collapsed');
          toggle.textContent = collapsed ? '▸' : '▾';
        });
      }
      li.appendChild(toggle);

      appendKeyLabel(li, key);

      const openSpan = document.createElement('span');
      openSpan.className = 'json-bracket';
      openSpan.textContent = open;
      li.appendChild(openSpan);

      const countSpan = document.createElement('span');
      countSpan.className = 'json-count';
      countSpan.textContent = isArray ? `${entries.length} 件` : `${entries.length} キー`;
      li.appendChild(countSpan);

      if (entries.length > 0) {
        const ul = document.createElement('ul');
        entries.forEach(([k, v]) => {
          ul.appendChild(buildNode(k, v));
        });
        li.appendChild(ul);
      }

      const closeSpan = document.createElement('span');
      closeSpan.className = 'json-bracket';
      closeSpan.textContent = close;
      li.appendChild(closeSpan);
    } else {
      const toggle = document.createElement('span');
      toggle.className = 'json-toggle';
      toggle.textContent = ' ';
      li.appendChild(toggle);

      appendKeyLabel(li, key);

      const valSpan = document.createElement('span');
      const fmt = formatPrimitive(value);
      valSpan.className = fmt.className;
      valSpan.textContent = fmt.text;
      li.appendChild(valSpan);
    }

    return li;
  }

  function appendKeyLabel(li, key) {
    if (key === undefined) return;
    const keySpan = document.createElement('span');
    if (typeof key === 'number') {
      keySpan.className = 'json-index';
      keySpan.textContent = `${key}: `;
    } else {
      keySpan.className = 'json-key';
      keySpan.textContent = `"${key}": `;
    }
    li.appendChild(keySpan);
  }

  function formatPrimitive(value) {
    if (value === null) return { text: 'null', className: 'json-null' };
    switch (typeof value) {
      case 'string':
        return { text: JSON.stringify(value), className: 'json-string' };
      case 'number':
        return { text: String(value), className: 'json-number' };
      case 'boolean':
        return { text: String(value), className: 'json-boolean' };
      default:
        return { text: String(value), className: '' };
    }
  }

  function setAllCollapsed(collapsed) {
    jsonTree.querySelectorAll('li').forEach((li) => {
      const hasChildList = Array.from(li.children).some((child) => child.tagName === 'UL');
      if (!hasChildList) return;
      li.classList.toggle('json-collapsed', collapsed);
      const toggle = li.querySelector(':scope > .json-toggle');
      if (toggle) toggle.textContent = collapsed ? '▸' : '▾';
    });
  }

  function searchTree(query) {
    jsonTree.querySelectorAll('.json-highlight').forEach((el) => el.classList.remove('json-highlight'));
    const q = query.trim().toLowerCase();
    if (!q) return;

    const candidates = jsonTree.querySelectorAll(
      '.json-key, .json-index, .json-string, .json-number, .json-boolean, .json-null'
    );

    let first = null;
    candidates.forEach((span) => {
      if (span.textContent.toLowerCase().includes(q)) {
        span.classList.add('json-highlight');
        expandAncestors(span);
        if (!first) first = span;
      }
    });

    if (first) {
      first.scrollIntoView({ block: 'center' });
    }
  }

  function expandAncestors(el) {
    let li = el.closest('li');
    while (li) {
      li.classList.remove('json-collapsed');
      const toggle = li.querySelector(':scope > .json-toggle');
      if (toggle && toggle.textContent.trim()) toggle.textContent = '▾';
      const parentUl = li.parentElement;
      li = parentUl ? parentUl.closest('li') : null;
    }
  }
})();
