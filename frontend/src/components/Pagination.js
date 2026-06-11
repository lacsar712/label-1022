import React from 'react';

const Pagination = ({ current, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    
    let start = Math.max(1, current - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);
    
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="pagination">
      <button 
        className="pagination-btn"
        onClick={() => onChange(1)}
        disabled={current === 1}
      >
        «
      </button>
      <button 
        className="pagination-btn"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
      >
        ‹
      </button>
      
      {pages[0] > 1 && (
        <>
          <button className="pagination-btn" onClick={() => onChange(1)}>1</button>
          {pages[0] > 2 && <span style={{ padding: '0 8px' }}>...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          className={`pagination-btn ${page === current ? 'active' : ''}`}
          onClick={() => onChange(page)}
        >
          {page}
        </button>
      ))}
      
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span style={{ padding: '0 8px' }}>...</span>}
          <button className="pagination-btn" onClick={() => onChange(totalPages)}>{totalPages}</button>
        </>
      )}
      
      <button 
        className="pagination-btn"
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages}
      >
        ›
      </button>
      <button 
        className="pagination-btn"
        onClick={() => onChange(totalPages)}
        disabled={current === totalPages}
      >
        »
      </button>
      
      <span style={{ marginLeft: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        共 {total} 条
      </span>
    </div>
  );
};

export default Pagination;
