import React, { useState, useEffect, useCallback } from 'react';
import { brandPortalApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/Pagination';

const BrandInfluencers = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const [keyword, setKeyword] = useState('');

  const maskContactName = (name) => {
    if (!name) return '-';
    if (name.length <= 1) return '*' + name;
    return name[0] + '*'.repeat(Math.max(1, name.length - 1));
  };

  const maskPhone = (phone) => {
    if (!phone) return '-';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 7) return '*'.repeat(clean.length);
    return clean.slice(0, 3) + '****' + clean.slice(-4);
  };

  const maskEmail = (email) => {
    if (!email) return '-';
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    if (username.length <= 2) return username[0] + '***@' + domain;
    return username.slice(0, 2) + '***@' + domain;
  };

  const maskWechat = (wechat) => {
    if (!wechat) return '-';
    if (wechat.length <= 4) return wechat[0] + '****' + wechat.slice(-1);
    return wechat.slice(0, 2) + '****' + wechat.slice(-2);
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const getTierBadge = (tier) => {
    if (!tier) return <span style={{ color: 'var(--text-tertiary)' }}>未分级</span>;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: tier.color + '15',
          color: tier.color,
          border: `1px solid ${tier.color}30`
        }}
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: tier.color
        }} />
        {tier.name}
      </span>
    );
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;

      const data = await brandPortalApi.getInfluencers(params);
      setInfluencers(data.items);
      setTotal(data.total);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setPage(1);
  };

  const maskLabelStyle = {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    lineHeight: '1.8'
  };

  const maskTagStyle = {
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    flexShrink: 0
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">合作达人</h2>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="搜索达人名称、账号ID、标签..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : influencers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">暂无合作达人</div>
              <div className="empty-description">还没有与本品牌合作过的达人</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px'
            }}>
              {influencers.map(inf => (
                <div
                  key={inf.id}
                  className="card"
                  style={{
                    margin: 0,
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <div className="card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                      <div
                        className="avatar"
                        style={{ width: '56px', height: '56px', fontSize: '22px', flexShrink: 0 }}
                      >
                        {inf.name?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>
                            {inf.name}
                          </span>
                          {inf.platform && (
                            <span className="tag tag-primary">{inf.platform}</span>
                          )}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          {getTierBadge(inf.tier)}
                        </div>
                        {inf.account_id && (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            @{inf.account_id}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '12px 0',
                      borderTop: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                      marginBottom: '14px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>粉丝数</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {formatNumber(inf.followers)}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>互动率</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {inf.engagement_rate ? `${parseFloat(inf.engagement_rate).toFixed(2)}%` : '-'}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>合作次数</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-color)' }}>
                          {inf.collaboration_count || 0}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>联系方式</span>
                        <span style={maskTagStyle}>脱敏</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={maskLabelStyle}>
                          <span style={{ width: '52px', flexShrink: 0 }}>联系人：</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{maskContactName(inf.contact_name)}</span>
                        </div>
                        <div style={maskLabelStyle}>
                          <span style={{ width: '52px', flexShrink: 0 }}>电话：</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{maskPhone(inf.contact_phone)}</span>
                        </div>
                        <div style={maskLabelStyle}>
                          <span style={{ width: '52px', flexShrink: 0 }}>邮箱：</span>
                          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{maskEmail(inf.contact_email)}</span>
                        </div>
                        <div style={maskLabelStyle}>
                          <span style={{ width: '52px', flexShrink: 0 }}>微信：</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{maskWechat(inf.contact_wechat)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

export default BrandInfluencers;
