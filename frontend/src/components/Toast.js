import React from 'react';

const safeMessage = (msg) => {
  if (msg === null || msg === undefined) return '';
  if (typeof msg === 'string') return msg;
  if (typeof msg === 'number' || typeof msg === 'boolean') return String(msg);
  try {
    return JSON.stringify(msg);
  } catch (e) {
    return String(msg);
  }
};

const Toast = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{safeMessage(toast.message)}</span>
        </div>
      ))}
    </div>
  );
};

// Helper function to show toast
export const showToast = (type, message) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { type, message: safeMessage(message) }
  }));
};

export default Toast;
