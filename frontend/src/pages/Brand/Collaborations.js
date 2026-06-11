import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandPortalApi } from '../../api';
import Pagination from '../../components/Pagination';

const Collaborations = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待开始' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (startDateFrom) params.start_date_from = startDateFrom;
      if (startDateTo) params.start_date_to = startDateTo;

      const data = await brandPortalApi.getCollaborations(params);
      setCollaborations(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, status, startDateFrom, startDateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setStatus('');
    setStartDateFrom('');
    setStartDateTo('');
    setPage(1);
  };

  const formatMoney = (num) => {
    return '¥' + (num?.toLocaleString() || '0');
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const maskContact = (value, type) => {
    if (!value) return '-';
    const str = String(value);
    switch (type) {
      case 'phone':
        if (str.length < 7) return '*'.repeat(str.length);
        return str.slice(0, 3) + '****' + str.slice(-4);
      case 'email': {
        const [local, domain] = str.split('@');
        if (!domain) return '*'.repeat(str.length);
        if (local.length <= 2) return '*'.repeat(local.length) + '@' + domain;
        return local.slice(0, 1) + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
      }
      default:
        return '*'.repeat(Math.max(3, Math.floor(str.length * 0.6)));
    }
  };

  const getStatusTag = (status) => {
    const map = {
      pending: { label: '待开始', class: 'tag-gray' },
      in_progress: { label: '进行中', class: 'tag-primary' },
      completed: { label: '已完成', class: 'tag-success' },
      cancelled: { label: '已取消', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const getPlatformTag = (platform) => {
    if (!platform) return null;
    const platformMap = {
      douyin: { label: '抖音', style: { background: '#000', color: '#fff' } },
      xiaohongshu: { label: '小红书', style: { background: '#fe2c55', color: '#fff' } },
      weibo: { label: '微博', style: { background: '#e6162d', color: '#fff' } },
      bilibili: { label: 'B站', style: { background: '#fb7299', color: '#fff' } },
      wechat: { label: '微信', style: { background: '#07c160', color: '#fff' } },
      kuaishou: { label: '快手', style: { background: '#ff4906', color: '#fff' } },
      zhihu: { label: '知乎', style: { background: '#0084ff', color: '#fff' } }
    };
    const config = platformMap[platform] || { label: platform, style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)' } };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          ...config.style
        }}
      >
        {config.label}
      </span>
    );
  };

  const renderProgressBar = (budget, actualCost) => {
    const budgetNum = Number(budget) || 0;
    const costNum = Number(actualCost) || 0;
    const percent = budgetNum > 0 ? Math.min(100, Math.round((costNum / budgetNum) * 100)) : 0;
    const barColor = percent >= 100 ? '#f5222d' : percent >= 80 ? '#f59e0b' : '#1890ff';

    return (
      <div style={{ minWidth: '180px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {formatMoney(costNum)} / {formatMoney(budgetNum)}
          </span>
          <span style={{ fontWeight: '600', color: barColor }}>{percent}%</span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
            borderRadius: '4px',
            transition: 'width 0.6s ease'
          }} />
        </div>
      </div>
    );
  };

  const renderPerformance = (views, likes) => {
    return (
      <div style={{ fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px' }}>👁️</span>
          <span style={{ color: 'var(--text-secondary)' }}>曝光:</span>
          <span style={{ fontWeight: '500' }}>{formatNumber(views)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '14px' }}>👍</span>
          <span style={{ color: 'var(--text-secondary)' }}>点赞:</span>
          <span style={{ fontWeight: '500' }}>{formatNumber(likes)}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">营销战役</h2>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="搜索项目名称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <select
              className="form-select"
              style={{ width: '140px' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                className="form-input"
                style={{ width: '150px' }}
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                placeholder="开始日期"
              />
              <span style={{ color: 'var(--text-secondary)' }}>至</span>
              <input
                type="date"
                className="form-input"
                style={{ width: '150px' }}
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                placeholder="结束日期"
              />
            </div>

            <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : collaborations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-title">暂无数据</div>
              <div className="empty-description">还没有营销战役记录</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>项目名称</th>
                    <th style={{ minWidth: '220px' }}>合作达人</th>
                    <th>状态</th>
                    <th>内容类型</th>
                    <th style={{ minWidth: '200px' }}>预算进度</th>
                    <th>效果数据</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborations.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div
                          style={{
                            fontWeight: '600',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s'
                          }}
                          onClick={() => navigate(`/brand/collaborations/${item.id}`)}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {item.project_name}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div className="avatar avatar-sm">
                              {item.influencer?.avatar ? (
                                <img
                                  src={item.influencer.avatar}
                                  alt={item.influencer.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                              ) : (
                                item.influencer?.name?.[0] || 'D'
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: '500' }}>{item.influencer?.name || '-'}</span>
                              {getPlatformTag(item.influencer?.platform)}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '36px' }}>
                            <div>📱 {maskContact(item.influencer?.phone, 'phone')}</div>
                            <div>✉️ {maskContact(item.influencer?.email, 'email')}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getStatusTag(item.status)}</td>
                      <td>{item.content_type || '-'}</td>
                      <td>{renderProgressBar(item.budget, item.actual_cost)}</td>
                      <td>{renderPerformance(item.views, item.likes)}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div>开始: {item.start_date || '-'}</div>
                          <div>结束: {item.end_date || '-'}</div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/brand/collaborations/${item.id}`)}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > pageSize && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Collaborations;
