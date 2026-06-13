/* ============================================
   Word ビューア (mammoth.js)
   ============================================ */

(function () {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const errorBox = document.getElementById('errorBox');
  const warningBox = document.getElementById('warningBox');
  const resultArea = document.getElementById('resultArea');
  const fileInfo = document.getElementById('fileInfo');
  const docView = document.getElementById('docView');
  const htmlSource = document.getElementById('htmlSource');
  const modeDoc = document.getElementById('modeDoc');
  const modeHtml = document.getElementById('modeHtml');
  const resetBtn = document.getElementById('resetBtn');

  setupDropzone(dropzone, fileInput, handleFile);

  modeDoc.addEventListener('change', updateViewMode);
  modeHtml.addEventListener('change', updateViewMode);

  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    docView.innerHTML = '';
    htmlSource.textContent = '';
    resultArea.classList.add('hidden');
    hideError(errorBox);
    warningBox.classList.add('hidden');
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // 画像の代わりに表示するプレースホルダー画像（SVG）
  function placeholderImageSrc() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135">' +
      '<rect width="100%" height="100%" fill="#eef1f5"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'fill="#8a94a6" font-size="14" font-family="sans-serif">画像（表示非対応）</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function handleFile(file) {
    hideError(errorBox);
    warningBox.classList.add('hidden');

    const ext = getExtension(file.name);
    if (ext === 'doc') {
      showError(
        errorBox,
        '古い形式の.docファイルには対応していません。Wordで開いて.docx形式で保存し直してから読み込んでください。'
      );
      return;
    }
    if (ext !== 'docx') {
      showError(errorBox, `対応していないファイル形式です（.${ext || '不明'}）。.docx ファイルを選択してください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const options = {
        // 文書内の画像は表示せず、プレースホルダーに置き換える
        convertImage: mammoth.images.imgElement(function () {
          return Promise.resolve({
            src: placeholderImageSrc(),
            alt: '画像（このビューアでは表示されません）'
          });
        })
      };

      mammoth
        .convertToHtml({ arrayBuffer: arrayBuffer }, options)
        .then((result) => {
          docView.innerHTML = result.value;
          htmlSource.textContent = result.value;
          showFileInfo(file);

          if (result.messages && result.messages.length > 0) {
            const items = result.messages.map((m) => `・${m.message}`).join('\n');
            warningBox.textContent =
              '変換時に以下の注意事項があります（一部の書式が再現されない可能性があります）:\n' + items;
            warningBox.classList.remove('hidden');
          }

          updateViewMode();
          resultArea.classList.remove('hidden');
        })
        .catch((err) => {
          console.error(err);
          showError(
            errorBox,
            'ファイルの変換に失敗しました。.docx形式の正しいファイルかご確認ください。\n詳細: ' + err.message
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
    `;
  }

  function updateViewMode() {
    if (modeDoc.checked) {
      docView.classList.remove('hidden');
      htmlSource.classList.add('hidden');
    } else {
      docView.classList.add('hidden');
      htmlSource.classList.remove('hidden');
    }
  }
})();
