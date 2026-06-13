/* ============================================
   CSV ビューア (PapaParse)
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const dataTable = document.getElementById('dataTable');
  const encodingSelect = document.getElementById('encodingSelect');
  const delimiterSelect = document.getElementById('delimiterSelect');
  const headerToggle = document.getElementById('headerToggle');
  const filterInput = document.getElementById('filterInput');
  const resetBtn = document.getElementById('resetBtn');

  let currentFile = null;
  let rawArrayBuffer = null;
  let currentData = null;

  setupDropzone(dropzone, fileInput, handleFile);
  encodingSelect.addEventListener('change', parseAndRender);
  delimiterSelect.addEventListener('change', parseAndRender);
  headerToggle.addEventListener('change', renderTable);
  filterInput.addEventListener('input', applyFilter);

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    currentFile = null;
    rawArrayBuffer = null;
    currentData = null;
    filterInput.value = '';
    resultArea.classList.add('hidden');
    hideError(errorBox);
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function handleFile(file) {
    hideError(errorBox);

    const ext = getExtension(file.name);
    const allowed = ['csv', 'tsv', 'txt'];
    if (!allowed.includes(ext)) {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.csv, .tsv, .txt のいずれかを選択してください。`);
      return;
    }

    // TSVファイルは区切り文字をタブに自動設定
    if (ext === 'tsv') {
      delimiterSelect.value = '\\t';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      currentFile = file;
      rawArrayBuffer = e.target.result;
      parseAndRender();
      resultArea.classList.remove('hidden');
    };
    reader.onerror = () => {
      showError(errorBox, 'ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsArrayBuffer(file);
  }

  function parseAndRender() {
    if (!rawArrayBuffer) return;
    hideError(errorBox);

    let text;
    try {
      text = new TextDecoder(encodingSelect.value).decode(rawArrayBuffer);
    } catch (err) {
      showError(errorBox, '指定した文字エンコーディングでの読み込みに失敗しました。');
      return;
    }

    let delim = delimiterSelect.value;
    if (delim === '\\t') delim = '\t';

    const config = { skipEmptyLines: true };
    if (delim) config.delimiter = delim;

    let result;
    try {
      result = Papa.parse(text, config);
    } catch (err) {
      showError(errorBox, 'CSVの解析に失敗しました。\n詳細: ' + err.message);
      return;
    }

    if (result.errors && result.errors.length > 0) {
      console.warn('CSV解析時の警告:', result.errors);
    }

    currentData = result.data;
    renderTable();
  }

  function renderTable() {
    dataTable.innerHTML = '';

    if (!currentData || currentData.length === 0) {
      dataTable.innerHTML = '<tr><td class="placeholder">表示できるデータがありません</td></tr>';
      updateFileInfo(0, 0);
      return;
    }

    const useHeader = headerToggle.checked;
    const headerRow = useHeader ? currentData[0] : null;
    const bodyRows = useHeader ? currentData.slice(1) : currentData;
    const colCount = currentData.reduce((max, row) => Math.max(max, row.length), 0);

    const thead = document.createElement('thead');
    const headTr = document.createElement('tr');
    for (let c = 0; c < colCount; c++) {
      const th = document.createElement('th');
      const label = useHeader ? headerRow[c] : undefined;
      th.textContent = label !== undefined && label !== '' ? label : `列${c + 1}`;
      headTr.appendChild(th);
    }
    thead.appendChild(headTr);
    dataTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    bodyRows.forEach((row) => {
      const tr = document.createElement('tr');
      for (let c = 0; c < colCount; c++) {
        const td = document.createElement('td');
        td.textContent = row[c] !== undefined ? row[c] : '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    dataTable.appendChild(tbody);

    updateFileInfo(bodyRows.length, colCount);
    applyFilter();
  }

  function applyFilter() {
    const q = filterInput.value.trim().toLowerCase();
    const rows = dataTable.querySelectorAll('tbody tr');
    let visible = 0;
    rows.forEach((tr) => {
      if (!q) {
        tr.style.display = '';
        visible++;
        return;
      }
      const match = tr.textContent.toLowerCase().includes(q);
      tr.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    const visibleSpan = document.getElementById('visibleRowInfo');
    if (visibleSpan) {
      if (q) {
        visibleSpan.textContent = `（絞り込み中: ${visible}行表示）`;
      } else {
        visibleSpan.textContent = '';
      }
    }
  }

  function updateFileInfo(rowCount, colCount) {
    if (!currentFile) return;
    fileInfo.innerHTML = `
      <span>ファイル名: <strong>${escapeHtml(currentFile.name)}</strong></span>
      <span>サイズ: <strong>${formatBytes(currentFile.size)}</strong></span>
      <span>行数: <strong>${rowCount}</strong></span>
      <span>列数: <strong>${colCount}</strong></span>
      <span id="visibleRowInfo"></span>
    `;
  }
})();
