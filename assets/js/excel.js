/* ============================================
   Excel ビューア (SheetJS)
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const sheetTabs = document.getElementById('sheetTabs');
  const dataTable = document.getElementById('dataTable');
  const rawToggle = document.getElementById('rawValuesToggle');
  const resetBtn = document.getElementById('resetBtn');

  let workbook = null;
  let currentSheetName = null;

  setupDropzone(dropzone, fileInput, handleFile);
  rawToggle.addEventListener('change', renderSheet);

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    workbook = null;
    currentSheetName = null;
    resultArea.classList.add('hidden');
    hideError(errorBox);
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function handleFile(file) {
    hideError(errorBox);

    const ext = getExtension(file.name);
    const allowed = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv'];
    if (!allowed.includes(ext)) {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.xlsx, .xls, .xlsm, .csv のいずれかを選択してください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('シートが見つかりませんでした。');
        }

        showFileInfo(file);
        buildTabs();
        selectSheet(workbook.SheetNames[0]);
        resultArea.classList.remove('hidden');
      } catch (err) {
        console.error(err);
        showError(
          errorBox,
          'ファイルの読み込みに失敗しました。Excel形式 (.xlsx, .xls, .xlsm) かご確認ください。\n詳細: ' + err.message
        );
        resultArea.classList.add('hidden');
      }
    };
    reader.onerror = () => {
      showError(errorBox, 'ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsArrayBuffer(file);
  }

  function showFileInfo(file) {
    fileInfo.innerHTML = `
      <span>ファイル名: <strong>${escapeHtml(file.name)}</strong></span>
      <span>サイズ: <strong>${formatBytes(file.size)}</strong></span>
      <span>シート数: <strong>${workbook.SheetNames.length}</strong></span>
    `;
  }

  function buildTabs() {
    sheetTabs.innerHTML = '';
    workbook.SheetNames.forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = name;
      btn.addEventListener('click', () => selectSheet(name));
      sheetTabs.appendChild(btn);
    });
  }

  function selectSheet(name) {
    currentSheetName = name;
    Array.from(sheetTabs.children).forEach((btn) => {
      btn.classList.toggle('active', btn.textContent === name);
    });
    renderSheet();
  }

  function getCellDisplay(cell, raw) {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    if (raw) {
      if (cell.v instanceof Date) return cell.v.toISOString();
      return cell.v;
    }
    if (cell.w !== undefined) return cell.w;
    if (cell.v instanceof Date) return cell.v.toISOString();
    return cell.v;
  }

  function renderSheet() {
    if (!workbook || !currentSheetName) return;
    const ws = workbook.Sheets[currentSheetName];
    dataTable.innerHTML = '';

    if (!ws || !ws['!ref']) {
      dataTable.innerHTML = '<tr><td class="placeholder">このシートにはデータがありません</td></tr>';
      return;
    }

    const range = XLSX.utils.decode_range(ws['!ref']);
    const merges = ws['!merges'] || [];
    const mergeMap = {};
    merges.forEach((m) => {
      mergeMap[`${m.s.r},${m.s.c}`] = { rowspan: m.e.r - m.s.r + 1, colspan: m.e.c - m.s.c + 1 };
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r === m.s.r && c === m.s.c) continue;
          mergeMap[`${r},${c}`] = 'skip';
        }
      }
    });

    const raw = rawToggle.checked;

    // 列ラベル(A, B, C...)ヘッダー
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    for (let c = range.s.c; c <= range.e.c; c++) {
      const th = document.createElement('th');
      th.textContent = XLSX.utils.encode_col(c);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    dataTable.appendChild(thead);

    // データ行 + 行番号
    const tbody = document.createElement('tbody');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const tr = document.createElement('tr');
      const rowTh = document.createElement('th');
      rowTh.textContent = String(r + 1);
      tr.appendChild(rowTh);

      for (let c = range.s.c; c <= range.e.c; c++) {
        const key = `${r},${c}`;
        if (mergeMap[key] === 'skip') continue;

        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        const td = document.createElement('td');
        const span = mergeMap[key];
        if (span) {
          if (span.rowspan > 1) td.rowSpan = span.rowspan;
          if (span.colspan > 1) td.colSpan = span.colspan;
        }
        td.textContent = getCellDisplay(cell, raw);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    dataTable.appendChild(tbody);
  }
})();
