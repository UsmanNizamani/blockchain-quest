/**
 * Toast notification manager for in-game achievements and alerts
 */
export class Toast {
  /**
   * Show a toast message
   * @param {string} title
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} type
   * @param {number} duration
   */
  static show(titleOrObj, message = '', type = 'info', duration = 4000) {
    let title, msg, toastType, dur;
    if (titleOrObj && typeof titleOrObj === 'object') {
      title = titleOrObj.title || '';
      msg = titleOrObj.message || '';
      toastType = titleOrObj.type || 'info';
      dur = titleOrObj.duration || 4000;
    } else {
      title = titleOrObj || '';
      msg = message || '';
      toastType = type || 'info';
      dur = duration || 4000;
    }

    const typeMap = { danger: 'error', warn: 'warning', success: 'success', info: 'info', error: 'error' };
    toastType = typeMap[toastType] || toastType || 'info';

    const container = document.getElementById('toast-container');
    if (!container) return true;

    const toast = document.createElement('div');
    toast.className = `toast ${toastType} toast-${toastType}`;

    let icon = '⚡';
    if (toastType === 'success') icon = '✅';
    if (toastType === 'warning') icon = '⚠️';
    if (toastType === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        ${title ? `<h4>${title}</h4>` : ''}
        <p>${msg}</p>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.style) {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
      }
      setTimeout(() => toast?.remove?.(), 300);
    }, duration);
  }
}
