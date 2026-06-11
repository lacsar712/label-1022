import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { influencersApi, collaborationsApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';

const InfluencerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = isOperator(user);
  
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState(null);
  const [collaborations, setCollaborations] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [infData, collabData] = await Promise.all([
        influencersApi.getById(id),
        collaborationsApi.getList({ influencer_id: id, page_size: 50 })
      ]);
      setInfluencer(infData);
      setCollaborations(collabData.items);
    } catch (error) {
      // Handled by interceptor
      navigate('/influencers');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const formatMoney = (num) => {
    return '¥' + (num?.toLocaleString() || '0');
  };

  const getStatusTag = (status) => {
    const map = {
      active: { label: '活跃', class: 'tag-success' },
      inactive: { label: '暂停', class: 'tag-gray' },
      blacklisted: { label: '黑名单', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const getCollabStatusTag = (status) => {
    const map = {
      pending: { label: '待开始', class: 'tag-gray' },
      in_progress: { label: '进行中', class: 'tag-primary' },
      completed: { label: '已完成', class: 'tag-success' },
      cancelled: { label: '已取消', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-title">未找到该Influencer</div>
        <button className="btn btn-primary" onClick={() => navigate('/influencers')}>
          返回列表
        </button>
      </div>
    );
  }

  // Calculate statistics
  const totalCollabs = collaborations.length;
  const completedCollabs = collaborations.filter(c => c.status === 'completed').length;
  const totalBudget = collaborations.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalCost = collaborations.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const totalViews = collaborations.reduce((sum, c) => sum + (c.views || 0), 0);
  const totalLikes = collaborations.reduce((sum, c) => sum + (c.likes || 0), 0);

  return (
    <div>
      {/* Back Button */}
      <button 
        className="btn btn-ghost" 
        onClick={() => navigate('/influencers')}
        style={{ marginBottom: '16px' }}
      >
        ← 返回列表
      </button>

      {/* Profile Header */}
      <div className="detail-header">
        <div className="detail-avatar">
          {influencer.name?.[0]}
        </div>
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="detail-name" style={{ margin: 0 }}>{influencer.name}</h1>
            {getStatusTag(influencer.status)}
          </div>
          
          <div className="detail-meta">
            <div className="detail-meta-item">
              <span>📱</span>
              <span>{influencer.platform}</span>
            </div>
            {influencer.account_id && (
              <div className="detail-meta-item">
                <span>@</span>
                <span>{influencer.account_id}</span>
              </div>
            )}
            {influencer.category && (
              <div className="detail-meta-item">
                <span>📁</span>
                <span>{influencer.category.name}</span>
              </div>
            )}
          </div>
          
          <div className="detail-stats">
            <div className="detail-stat">
              <div className="detail-stat-value">{formatNumber(influencer.followers)}</div>
              <div className="detail-stat-label">粉丝数</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{formatMoney(influencer.cost_per_post)}</div>
              <div className="detail-stat-label">单条报价</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{influencer.engagement_rate}%</div>
              <div className="detail-stat-label">互动率</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{totalCollabs}</div>
              <div className="detail-stat-label">合作次数</div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Contact Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">联系方式</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '16px' }}>
              {influencer.contact_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>联系人</span>
                  <span>{influencer.contact_name}</span>
                </div>
              )}
              {influencer.contact_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>电话</span>
                  <span>{influencer.contact_phone}</span>
                </div>
              )}
              {influencer.contact_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>邮箱</span>
                  <span>{influencer.contact_email}</span>
                </div>
              )}
              {influencer.contact_wechat && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>微信</span>
                  <span>{influencer.contact_wechat}</span>
                </div>
              )}
              {!influencer.contact_name && !influencer.contact_phone && 
               !influencer.contact_email && !influencer.contact_wechat && (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  暂无联系方式
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collaboration Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">合作统计</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {completedCollabs}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>已完成</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-color)' }}>
                  {formatMoney(totalCost)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总投入</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {formatNumber(totalViews)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总曝光</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#9333ea' }}>
                  {formatNumber(totalLikes)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总互动</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {influencer.tags && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">标签</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {influencer.tags.split(',').map((tag, idx) => (
                <span key={idx} className="tag tag-primary">{tag.trim()}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {influencer.notes && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">备注</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {influencer.notes}
            </p>
          </div>
        </div>
      )}

      {/* Collaboration History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">合作记录</h3>
          {canEdit && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/collaborations', { 
                state: { 
                  openNewModal: true, 
                  preSelectedInfluencer: influencer 
                } 
              })}
            >
              + 新建合作
            </button>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {collaborations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无合作记录</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>内容类型</th>
                  <th>状态</th>
                  <th>预算</th>
                  <th>实际支出</th>
                  <th>开始日期</th>
                  <th>曝光量</th>
                </tr>
              </thead>
              <tbody>
                {collaborations.map(collab => (
                  <tr key={collab.id}>
                    <td style={{ fontWeight: '500' }}>{collab.project_name}</td>
                    <td>{collab.content_type || '-'}</td>
                    <td>{getCollabStatusTag(collab.status)}</td>
                    <td>{formatMoney(collab.budget)}</td>
                    <td>{formatMoney(collab.actual_cost)}</td>
                    <td>{collab.start_date || '-'}</td>
                    <td>{formatNumber(collab.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerDetail;
