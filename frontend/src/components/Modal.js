import React from 'react';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'default' }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeMap = {
    large: { cls: 'modal-large', style: { maxWidth: '800px' } },
    xlarge: { cls: 'modal-large modal-xlarge', style: { maxWidth: '1100px' } },
    default: { cls: '', style: {} }
  };
  const sizeConfig = sizeMap[size] || sizeMap.default;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal ${sizeConfig.cls}`} style={sizeConfig.style}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
