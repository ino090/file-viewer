/* ============================================
   ZIP ビューア (JSZip + marked.js)
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const zipTree = document.getElementById('zipTree');
  const zipPreview = document.getElementById('zipPreview');
  const searchInput = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetBtn');

  // プレビュー可能なテキスト系拡張子
  const TEXT_EXTS = new Set([
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'html', 'htm', 'css',
    'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'go', 'rb', 'php', 'sh', 'bash', 'bat', 'ps1', 'yml', 'yaml', 'ini',
    'conf', 'cfg', 'log', 'sql', 'toml', 'env', 'properties'
  ]);

  // 拡張子なしでもテキストとして扱うファイル名
  const TEXT_NO_EXT_NAMES = new Set([
    'readme', 'license', 'makefile', 'dockerfile', 'gemfile', 'rakefile',
    'procfile', 'changelog', 'authors', 'contributing', 'notice'
  ]);

  // 画像拡張子（プレビュー非対応）
  const IMAGE_EXTS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'svg', 'tiff', 'tif', 'heic', 'avif'
  ]);

  let entries = [];

  setupDropzone(dropzone, fileInput, handleFile);
  searchInput.addEventListener('input', () => filterTree(searchInput.value));

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    entries = [];
    searchInput.value = '';
    zipTree.innerHTML = '';
    zipPreview.innerHTML = '<div class="placeholder">ファイルを選択するとここに内容が表示されます</div>';
    resultArea.classList.add('hidden');
    hideError(errorBox);
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function handleFile(file) {
    hideError(errorBox);

    const ext = getExtension(file.name);
    if (ext !== 'zip') {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.zip ファイルを選択してください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      JSZip.loadAsync(e.target.result)
        .then((zip) => {
          buildEntries(zip);
          showFileInfo(file);
          renderTree();
          zipPreview.innerHTML = '<div class="placeholder">ファイルを選択するとここに内容が表示されます</div>';
          resultArea.classList.remove('hidden');
        })
        .catch((err) => {
          console.error(err);
          showError(
            errorBox,
            'ZIPファイルの読み込みに失敗しました。パスワード付き・暗号化されたZIP、または破損したファイルの可能性があります。\n詳細: ' +
              err.message
          );
          resultArea.classList.add('hidden');
        });
    };
    reader.onerror = () => {
      showError(errorBox, 'ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsArrayBuffer(file);
  }

  function buildEntries(zip) {
    entries = [];
    zip.forEach((relativePath, zipEntry) => {
      if (!relativePath) return;
      // 一部のツール（Windowsのzip作成機能など）は区切り文字に \ を使うため正規化する
      const normalizedPath = relativePath.replace(/\\/g, '/');
      entries.push({
        path: normalizedPath,
        name: normalizedPath.split('/').filter(Boolean).pop(),
        dir: zipEntry.dir,
        size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
        zipObj: zipEntry
      });
    });
    entries.sort((a, b) => a.path.localeCompare(b.path));
  }

  function showFileInfo(file) {
    const fileEntries = entries.filter((e) => !e.dir);
    const dirCount = entries.filter((e) => e.dir).length;
    const totalSize = fileEntries.reduce((sum, e) => sum + (e.size || 0), 0);

    fileInfo.innerHTML = `
      <span>ファイル名: <strong>${escapeHtml(file.name)}</strong></span>
      <span>ZIPサイズ: <strong>${formatBytes(file.size)}</strong></span>
      <span>内包ファイル数: <strong>${fileEntries.length}</strong></span>
      <span>フォルダ数: <strong>${dirCount}</strong></span>
      <span>展開後サイズ合計: <strong>${formatBytes(totalSize)}</strong></span>
    `;
  }

  // ---------- ツリー構築・描画 ----------

  function buildTreeData() {
    const root = { name: '', children: {}, type: 'dir' };
    entries.forEach((entry) => {
      const parts = entry.path.split('/').filter(Boolean);
      let node = root;
      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1;
        if (!node.children[part]) {
          node.children[part] = {
            name: part,
            children: {},
            type: isLast && !entry.dir ? 'file' : 'dir',
            entry: isLast && !entry.dir ? entry : null
          };
        } else if (isLast && !entry.dir) {
          node.children[part].type = 'file';
          node.children[part].entry = entry;
        }
        node = node.children[part];
      });
    });
    return root;
  }

  function renderTree() {
    zipTree.innerHTML = '';
    const root = buildTreeData();
    const rootUl = document.createElement('ul');
    appendChildren(root, rootUl);
    zipTree.appendChild(rootUl);
  }

  function appendChildren(node, container) {
    const names = Object.keys(node.children).sort((a, b) => {
      const A = node.children[a];
      const B = node.children[b];
      if (A.type !== B.type) return A.type === 'dir' ? -1 : 1;
      return a.localeCompare(b, 'ja');
    });

    names.forEach((name) => {
      const child = node.children[name];
      const li = document.createElement('li');

      if (child.type === 'dir') {
        const details = document.createElement('details');
        details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = '📁 ' + child.name;
        details.appendChild(summary);
        const ul = document.createElement('ul');
        appendChildren(child, ul);
        details.appendChild(ul);
        li.appendChild(details);
      } else {
        const div = document.createElement('div');
        div.className = 'zip-file';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = '📄 ' + child.name;

        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'zip-size';
        sizeSpan.textContent = formatBytes(child.entry.size || 0);

        div.appendChild(nameSpan);
        div.appendChild(sizeSpan);
        div.addEventListener('click', () => selectEntry(child.entry, div));

        li.appendChild(div);
      }

      container.appendChild(li);
    });
  }

  function selectEntry(entry, el) {
    zipTree.querySelectorAll('.zip-file.active').forEach((e) => e.classList.remove('active'));
    el.classList.add('active');
    previewEntry(entry);
  }

  // ---------- プレビュー ----------

  function isTextFile(entry) {
    const ext = getExtension(entry.name);
    if (TEXT_EXTS.has(ext)) return true;
    if (!ext) return TEXT_NO_EXT_NAMES.has(entry.name.toLowerCase());
    return false;
  }

  function previewEntry(entry) {
    zipPreview.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'zip-preview-header';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'name';
    nameDiv.textContent = entry.path;

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '0.6rem';
    right.style.alignItems = 'center';
    right.style.flexShrink = '0';

    const sizeSpan = document.createElement('span');
    sizeSpan.style.color = 'var(--color-text-muted)';
    sizeSpan.style.fontSize = '0.85rem';
    sizeSpan.textContent = formatBytes(entry.size || 0);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-sm';
    downloadBtn.textContent = '⬇ 取り出す';
    downloadBtn.addEventListener('click', () => {
      entry.zipObj.async('blob').then((blob) => downloadBlob(blob, entry.name));
    });

    right.appendChild(sizeSpan);
    right.appendChild(downloadBtn);
    header.appendChild(nameDiv);
    header.appendChild(right);
    zipPreview.appendChild(header);

    const ext = getExtension(entry.name);

    if (IMAGE_EXTS.has(ext)) {
      const msg = document.createElement('div');
      msg.className = 'placeholder';
      msg.textContent =
        '画像ファイルはこのビューアでプレビューできません。「取り出す」ボタンからダウンロードしてご確認ください。';
      zipPreview.appendChild(msg);
      return;
    }

    if (!isTextFile(entry)) {
      const msg = document.createElement('div');
      msg.className = 'placeholder';
      msg.textContent =
        'このファイル形式はプレビューに対応していません。「取り出す」ボタンからダウンロードしてご確認ください。';
      zipPreview.appendChild(msg);
      return;
    }

    const loading = document.createElement('div');
    loading.className = 'placeholder';
    loading.textContent = '読み込み中...';
    zipPreview.appendChild(loading);

    entry.zipObj
      .async('string')
      .then((text) => {
        loading.remove();
        text = stripBOM(text);
        if (ext === 'md' || ext === 'markdown') {
          renderMarkdownPreview(text);
        } else if (ext === 'json') {
          renderTextPreview(formatJsonSafely(text));
        } else {
          renderTextPreview(text);
        }
      })
      .catch((err) => {
        loading.remove();
        const msg = document.createElement('div');
        msg.className = 'error-box';
        msg.textContent = 'ファイルの読み込みに失敗しました。\n詳細: ' + err.message;
        zipPreview.appendChild(msg);
      });
  }

  function stripBOM(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  function formatJsonSafely(text) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch (e) {
      return text;
    }
  }

  function renderTextPreview(text) {
    const pre = document.createElement('pre');
    pre.textContent = text;
    zipPreview.appendChild(pre);
  }

  function renderMarkdownPreview(text) {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const btnRendered = document.createElement('button');
    btnRendered.className = 'btn btn-sm btn-primary';
    btnRendered.textContent = 'プレビュー表示';

    const btnRaw = document.createElement('button');
    btnRaw.className = 'btn btn-sm';
    btnRaw.textContent = 'Markdown原文';

    const rendered = document.createElement('div');
    rendered.innerHTML = marked.parse(text);

    const raw = document.createElement('pre');
    raw.textContent = text;
    raw.classList.add('hidden');

    btnRendered.addEventListener('click', () => {
      rendered.classList.remove('hidden');
      raw.classList.add('hidden');
      btnRendered.classList.add('btn-primary');
      btnRaw.classList.remove('btn-primary');
    });

    btnRaw.addEventListener('click', () => {
      rendered.classList.add('hidden');
      raw.classList.remove('hidden');
      btnRaw.classList.add('btn-primary');
      btnRendered.classList.remove('btn-primary');
    });

    toolbar.appendChild(btnRendered);
    toolbar.appendChild(btnRaw);
    zipPreview.appendChild(toolbar);
    zipPreview.appendChild(rendered);
    zipPreview.appendChild(raw);
  }

  // ---------- 検索 ----------

  function filterTree(query) {
    const q = query.trim().toLowerCase();
    const allLis = Array.from(zipTree.querySelectorAll('li'));

    if (!q) {
      allLis.forEach((li) => {
        li.style.display = '';
      });
      return;
    }

    allLis.forEach((li) => {
      const fileDiv = li.querySelector(':scope > .zip-file');
      if (fileDiv) {
        const match = fileDiv.textContent.toLowerCase().includes(q);
        li.style.display = match ? '' : 'none';
      }
    });

    // ディレクトリは、表示対象の子を含む場合のみ表示する（深い階層から処理）
    allLis
      .slice()
      .reverse()
      .forEach((li) => {
        const details = li.querySelector(':scope > details');
        if (!details) return;
        const childLis = details.querySelectorAll('li');
        const anyVisible = Array.from(childLis).some((c) => c.style.display !== 'none');
        li.style.display = anyVisible ? '' : 'none';
        if (anyVisible) details.open = true;
      });
  }
})();
