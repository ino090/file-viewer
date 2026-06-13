/* ============================================
   ファイルビューア集 - 共通ユーティリティ
   ============================================ */

/**
 * ドロップゾーン要素にドラッグ&ドロップ・クリックでのファイル選択を設定する。
 * @param {HTMLElement} dropzoneEl
 * @param {HTMLInputElement} fileInputEl
 * @param {(file: File) => void} onFile
 */
function setupDropzone(dropzoneEl, fileInputEl, onFile) {
  dropzoneEl.addEventListener('click', () => fileInputEl.click());

  dropzoneEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputEl.click();
    }
  });

  fileInputEl.addEventListener('change', () => {
    if (fileInputEl.files && fileInputEl.files[0]) {
      onFile(fileInputEl.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.remove('dragover');
    });
  });

  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneEl.classList.remove('dragover');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files[0]) {
      onFile(files[0]);
    }
  });
}

/**
 * バイト数を読みやすい単位の文字列に変換する。
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * HTML特殊文字をエスケープする。
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * エラーメッセージ表示用ボックスにメッセージをセットし表示する。
 * @param {HTMLElement} el
 * @param {string} message
 */
function showError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

/**
 * エラーメッセージ表示用ボックスを隠す。
 * @param {HTMLElement} el
 */
function hideError(el) {
  el.classList.add('hidden');
}

/**
 * ファイル名の拡張子（小文字、ピリオドなし）を取得する。
 * @param {string} filename
 * @returns {string}
 */
function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.slice(idx + 1).toLowerCase();
}

/**
 * Blobをファイルとしてダウンロードさせる。
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
