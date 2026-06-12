import React, { useState, useEffect, useMemo } from 'react';
import { deliverablesApi } from '../../api';
import DeliverableDrawer from '../../components/DeliverableDrawer';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

const ContentCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [deliverables, setDeliverables] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCollabId, setDrawerCollabId] = useState(null);
  const [drawerCollabName, setDrawerCollabName] = useState('');

  useEffect(() => {
    fetchDeliverables();
  }, [currentMonth]);

  const fetchDeliverables = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startStr = firstDay.toISOString().split('T')[0];
      const endStr = lastDay.toISOString().split('T')[0];
      
      const data = await deliverablesApi.getCalendar(startStr, endStr);
      setDeliverables(data.items || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({ date, day, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, day: i, isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, day: i, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const getDeliverablesByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deliverables.filter(item => {
      if (!item.published_at) return false;
      const itemDate = new Date(item.published_at).toISOString().split('T')[0];
      return itemDate === dateStr;
    });
  };

  const getStatusInfo = (item) => {
    const now = new Date();
    const publishDate = new Date(item.published_at);
    const isPast = publishDate < now;

    if (item.review_status === 'approved' && item.content_link) {
      return { status: 'published', label: '已发布', className: 'status-published' };
    }
    
    if (isPast && item.review_status !== 'approved') {
      return { status: 'overdue', label: '已逾期', className: 'status-overdue' };
    }
    
    return { status: 'planned', label: '计划中', className: 'status-planned' };
  };

  const getDensityDots = (date) => {
    const items = getDeliverablesByDate(date);
    if (items.length === 0) return [];

    const dots = [];
    const maxDots = 3;
    const displayCount = Math.min(items.length, maxDots);

    for (let i = 0; i < displayCount; i++) {
      const statusInfo = getStatusInfo(items[i]);
      dots.push({
        className: `density-dot ${statusInfo.className}`,
        title: items[i].collaboration?.project_name || ''
      });
    }

    return dots;
  };

  const hasOverdue = (date) => {
    const items = getDeliverablesByDate(date);
    return items.some(item => getStatusInfo(item).status === 'overdue');
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const formatMonth = (date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const selectedDateItems = selectedDate ? getDeliverablesByDate(selectedDate) : [];

  const stats = useMemo(() => {
    const now = new Date();
    let planned = 0;
    let published = 0;
    let overdue = 0;

    deliverables.forEach(item => {
      const status = getStatusInfo(item).status;
      if (status === 'planned') planned++;
      else if (status === 'published') published++;
      else if (status === 'overdue') overdue++;
    });

    return { planned, published, overdue, total: deliverables.length };
  }, [deliverables]);

  return (
    <div className="content-calendar-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">内容排期日历</h2>
          <p className="page-subtitle">月历视角统筹各合作项目的计划发布时间</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={goToToday}>
            今天
          </button>
        </div>
      </div>

      <div className="calendar-stats">
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon planned-icon">📅</div>
          <div className="calendar-stat-content">
            <div className="calendar-stat-label">计划中</div>
            <div className="calendar-stat-value">{stats.planned}</div>
          </div>
        </div>
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon published-icon">✅</div>
          <div className="calendar-stat-content">
            <div className="calendar-stat-label">已发布</div>
            <div className="calendar-stat-value">{stats.published}</div>
          </div>
        </div>
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon overdue-icon">⚠️</div>
          <div className="calendar-stat-content">
            <div className="calendar-stat-label">已逾期</div>
            <div className="calendar-stat-value">{stats.overdue}</div>
          </div>
        </div>
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon total-icon">📊</div>
          <div className="calendar-stat-content">
            <div className="calendar-stat-label">本月总计</div>
            <div className="calendar-stat-value">{stats.total}</div>
          </div>
        </div>
      </div>

      <div className="calendar-container card">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={goToPrevMonth}>
            ‹
          </button>
          <div className="calendar-month-title">{formatMonth(currentMonth)}</div>
          <button className="calendar-nav-btn" onClick={goToNextMonth}>
            ›
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEK_DAYS.map((day, idx) => (
            <div key={day} className={`calendar-weekday ${idx === 0 || idx === 6 ? 'weekend' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading" style={{ minHeight: '400px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="calendar-grid">
            {calendarDays.map(({ date, day, isCurrentMonth }, index) => {
              const items = getDeliverablesByDate(date);
              const dots = getDensityDots(date);
              const overdue = hasOverdue(date);
              const today = isToday(date);
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={index}
                  className={`calendar-day 
                    ${isCurrentMonth ? 'current-month' : 'other-month'}
                    ${today ? 'today' : ''}
                    ${isSelected ? 'selected' : ''}
                    ${overdue ? 'has-overdue' : ''}
                    ${items.length > 0 ? 'has-content' : ''}
                  `}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="calendar-day-number">{day}</div>
                  <div className="calendar-day-dots">
                    {dots.map((dot, i) => (
                      <div key={i} className={dot.className} title={dot.title}></div>
                    ))}
                    {items.length > 3 && (
                      <div className="calendar-day-more">+{items.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot status-planned"></span>
            <span>计划中</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot status-published"></span>
            <span>已发布</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot status-overdue"></span>
            <span>已逾期</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="day-detail-panel card">
          <div className="day-detail-header">
            <div>
              <h3 className="day-detail-title">
                {selectedDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </h3>
              <div className="day-detail-subtitle">
                共 {selectedDateItems.length} 条排期
                {selectedDateItems.some(item => getStatusInfo(item).status === 'overdue') && (
                  <span className="tag tag-error" style={{ marginLeft: '8px' }}>
                    有逾期内容
                  </span>
                )}
              </div>
            </div>
            <button 
              className="modal-close" 
              onClick={() => setSelectedDate(null)}
              title="关闭"
            >
              ✕
            </button>
          </div>

          <div className="day-detail-body">
            {selectedDateItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">当日暂无排期</div>
                <div className="empty-description">点击其他日期查看排期详情</div>
              </div>
            ) : (
              <div className="deliverable-list">
                {selectedDateItems.map(item => {
                  const statusInfo = getStatusInfo(item);
                  return (
                    <div 
                      key={item.id} 
                      className={`deliverable-card ${statusInfo.status}`}
                      onClick={() => {
                        setDrawerCollabId(item.collaboration_id);
                        setDrawerCollabName(item.collaboration?.project_name || '');
                        setDrawerOpen(true);
                      }}
                    >
                      <div className="deliverable-card-header">
                        <div className="deliverable-time">
                          {formatTime(item.published_at)}
                        </div>
                        <span className={`tag status-tag ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="deliverable-project">
                        {item.collaboration?.project_name || '未命名项目'}
                      </div>

                      <div className="deliverable-meta">
                        {item.platform && (
                          <span className="tag tag-primary">{item.platform}</span>
                        )}
                        {item.collaboration?.content_type && (
                          <span className="tag tag-gray">{item.collaboration.content_type}</span>
                        )}
                        {item.collaboration?.influencer_name && (
                          <span className="deliverable-influencer">
                            👤 {item.collaboration.influencer_name}
                          </span>
                        )}
                      </div>

                      {item.content_link && (
                        <div className="deliverable-link">
                          <a href={item.content_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            🔗 查看内容
                          </a>
                        </div>
                      )}

                      {item.notes && (
                        <div className="deliverable-notes">
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <DeliverableDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        collaborationId={drawerCollabId}
        collaborationName={drawerCollabName}
      />
    </div>
  );
};

export default ContentCalendar;
