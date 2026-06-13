/* ============================================
   PDF ビューア (PDF.js)
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const canvas = document.getElementById('pdfCanvas');
  const ctx = canvas.getContext('2d');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInput = document.getElementById('pageInput');
  const pageCount = document.getElementById('pageCount');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const resetBtn = document.getElementById('resetBtn');

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.25;

  let pdfDoc = null;
  let currentPage = 1;
  let currentScale = 1;
  let rendering = false;
  let pendingPage = null;

  setupDropzone(dropzone, fileInput, handleFile);

  prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
  nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
  pageInput.addEventListener('change', () => {
    const n = parseInt(pageInput.value, 10);
    if (!isNaN(n)) {
      goToPage(n);
    } else {
      pageInput.value = String(currentPage);
    }
  });
  zoomInBtn.addEventListener('click', () => setScale(currentScale + SCALE_STEP));
  zoomOutBtn.addEventListener('click', () => setScale(currentScale - SCALE_STEP));

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    if (pdfDoc) {
      pdfDoc.destroy();
    }
    pdfDoc = null;
    currentPage = 1;
    currentScale = 1;
    pendingPage = null;
    zoomLevel.textContent = '100%';
    pageInput.value = '1';
    pageCount.textContent = '-';
    resultArea.classList.add('hidden');
    hideError(errorBox);
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function handleFile(file) {
    hideError(errorBox);

    const ext = getExtension(file.name);
    if (ext !== 'pdf') {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.pdf ファイルを選択してください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      pdfjsLib
        .getDocument({ data })
        .promise.then((doc) => {
          if (pdfDoc) {
            pdfDoc.destroy();
          }
          pdfDoc = doc;
          currentPage = 1;
          currentScale = 1;
          zoomLevel.textContent = '100%';

          showFileInfo(file);
          pageCount.textContent = String(doc.numPages);
          pageInput.max = String(doc.numPages);
          pageInput.value = '1';

          resultArea.classList.remove('hidden');
          renderPage(currentPage);
        })
        .catch((err) => {
          console.error(err);
          showError(
            errorBox,
            'PDFファイルの読み込みに失敗しました。パスワード付きPDF、または破損したファイルの可能性があります。\n詳細: ' +
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

  function showFileInfo(file) {
    fileInfo.innerHTML = `
      <span>ファイル名: <strong>${escapeHtml(file.name)}</strong></span>
      <span>サイズ: <strong>${formatBytes(file.size)}</strong></span>
      <span>ページ数: <strong>${pdfDoc.numPages}</strong></span>
    `;
  }

  function goToPage(num) {
    if (!pdfDoc) return;
    const target = Math.min(Math.max(1, num), pdfDoc.numPages);
    currentPage = target;
    pageInput.value = String(target);
    renderPage(target);
  }

  function setScale(scale) {
    if (!pdfDoc) return;
    currentScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    zoomLevel.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
  }

  function renderPage(num) {
    if (!pdfDoc) return;

    if (rendering) {
      pendingPage = num;
      return;
    }
    rendering = true;

    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale: currentScale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderTask = page.render({ canvasContext: ctx, viewport: viewport });
      renderTask.promise.then(() => {
        rendering = false;
        updateControls();
        if (pendingPage !== null) {
          const next = pendingPage;
          pendingPage = null;
          renderPage(next);
        }
      });
    });
  }

  function updateControls() {
    pageInput.value = String(currentPage);
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
    zoomOutBtn.disabled = currentScale <= MIN_SCALE;
    zoomInBtn.disabled = currentScale >= MAX_SCALE;
  }
})();
