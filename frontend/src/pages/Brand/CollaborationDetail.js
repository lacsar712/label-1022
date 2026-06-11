import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { brandPortalApi } from '../../api';

const CollaborationDetail = () => {
  const { collab_id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [collaboration, setCollaboration] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [collab_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await brandPortalApi.getCollaborationById(collab_id);
      setCollaboration(data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError('该合作不在您的授权范围内');
      } else if (err.response?.status === 404) {
        setError('未找到该合作记录');
      } else {
        setError('加载失败，请稍后重试');
      }
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const maskContact = (value, type) => {
    if (!value) return '-';
    const str = String(value);
    switch (type) {
      case 'name':
        if (str.length <= 1) return '*';
        if (str.length === 2) return str[0] + '*';
        return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
      case 'phone':
        if (str.length < 7) return '*'.repeat(str.length);
        return str.slice(0, 3) + '****' + str.slice(-4);
      case 'email': {
        const [local, domain] = str.split('@');
        if (!domain) return '*'.repeat(str.length);
        if (local.length <= 2) return '*'.repeat(local.length) + '@' + domain;
        return local.slice(0, 1) + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
      }
      case 'wechat':
        if (str.length <= 2) return '*'.repeat(str.length);
        return str.slice(0, 2) + '*'.repeat(str.length - 2);
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

  const renderProgressBar = (budget, actualCost) => {
    const budgetNum = Number(budget) || 0;
    const costNum = Number(actualCost) || 0;
    const percent = budgetNum > 0 ? Math.min(100, Math.round((costNum / budgetNum) * 100)) : 0;
    const barColor = percent >= 100 ? '#f5222d' : percent >= 80 ? '#f59e0b' : '#1890ff';

    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>已消耗</span>
          <span style={{ fontWeight: '600', color: barColor }}>{percent}%</span>
        </div>
        <div style={{
          height: '12px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '6px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
            borderRadius: '6px',
            transition: 'width 0.6s ease',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'progressShine 2s infinite'
            }} />
          </div>
        </div>
        <style>{`
          @keyframes progressShine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-title">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/brand/collaborations')}>
          返回列表
        </button>
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-title">未找到该合作记录</div>
        <button className="btn btn-primary" onClick={() => navigate('/brand/collaborations')}>
          返回列表
        </button>
      </div>
    );
  }

  const influencer = collaboration.influencer || {};
  const budget = Number(collaboration.budget) || 0;
  const actualCost = Number(collaboration.actual_cost) || 0;

  return (
    <div>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/brand/collaborations')}
        style={{ marginBottom: '16px' }}
      >
        ← 返回列表
      </button>

      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, var(--primary-color)08 0%, var(--bg-primary) 60%)' }}>
        <div className="card-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {collaboration.project_name}
                </h1>
                {getStatusTag(collaboration.status)}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅</span>
                  <span>
                    {formatDate(collaboration.start_date)} ~ {formatDate(collaboration.end_date)}
                  </span>
                </div>
                {collaboration.content_type && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📝</span>
                    <span>{collaboration.content_type}</span>
                  </div>
                )}
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '20px 24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>总预算</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-color)' }}>
                      {formatMoney(budget)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>已消耗</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: actualCost >= budget ? '#f5222d' : '#f59e0b' }}>
                      {formatMoney(actualCost)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '4px' }}>剩余预算</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#52c41a' }}>
                      {formatMoney(Math.max(0, budget - actualCost))}
                    </div>
                  </div>
                </div>
                {renderProgressBar(budget, actualCost)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 合作内容信息</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  内容要求
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  minHeight: '60px'
                }}>
                  {collaboration.content_requirements || <span style={{ color: 'var(--text-tertiary)' }}>暂无</span>}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  交付要求
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  minHeight: '60px'
                }}>
                  {collaboration.deliverables || <span style={{ color: 'var(--text-tertiary)' }}>暂无</span>}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  备注说明
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  minHeight: '60px'
                }}>
                  {collaboration.notes || <span style={{ color: 'var(--text-tertiary)' }}>暂无</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👤 合作达人信息</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), #722ed1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff',
                flexShrink: 0
              }}>
                {influencer.name?.[0] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {influencer.name || '-'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {influencer.platform && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: 'var(--primary-color)15',
                      color: 'var(--primary-color)'
                    }}>
                      📱 {influencer.platform}
                    </span>
                  )}
                  {influencer.tier && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: (influencer.tier.color || '#1890ff') + '15',
                      color: influencer.tier.color || '#1890ff'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: influencer.tier.color || '#1890ff'
                      }} />
                      {influencer.tier.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#722ed1', marginBottom: '4px' }}>
                  {formatNumber(influencer.followers)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>粉丝数</div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                  {formatMoney(influencer.cost_per_post)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>单条报价</div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #f59e0b08, #722ed108)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '14px',
                fontWeight: '500'
              }}>
                <span>🔒</span>
                <span>联系方式（已脱敏）</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>联系人</span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    fontWeight: '500',
                    letterSpacing: '1px'
                  }}>
                    {maskContact(influencer.contact_name, 'name')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>电话</span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    fontWeight: '500',
                    letterSpacing: '1px'
                  }}>
                    {maskContact(influencer.contact_phone, 'phone')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>邮箱</span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    fontWeight: '500',
                    letterSpacing: '0.5px'
                  }}>
                    {maskContact(influencer.contact_email, 'email')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>微信</span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    fontWeight: '500',
                    letterSpacing: '1px'
                  }}>
                    {maskContact(influencer.contact_wechat, 'wechat')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 数据表现统计</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'linear-gradient(180deg, #1890ff08 0%, var(--bg-primary) 100%)',
              borderRadius: '12px',
              border: '1px solid #1890ff20'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                👁️ 曝光量
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#1890ff',
                lineHeight: '1.2',
                letterSpacing: '-0.5px'
              }}>
                {formatNumber(collaboration.views)}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'linear-gradient(180deg, #f5222d08 0%, var(--bg-primary) 100%)',
              borderRadius: '12px',
              border: '1px solid #f5222d20'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                ❤️ 点赞数
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#f5222d',
                lineHeight: '1.2',
                letterSpacing: '-0.5px'
              }}>
                {formatNumber(collaboration.likes)}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'linear-gradient(180deg, #52c41a08 0%, var(--bg-primary) 100%)',
              borderRadius: '12px',
              border: '1px solid #52c41a20'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                💬 评论数
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#52c41a',
                lineHeight: '1.2',
                letterSpacing: '-0.5px'
              }}>
                {formatNumber(collaboration.comments)}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'linear-gradient(180deg, #722ed108 0%, var(--bg-primary) 100%)',
              borderRadius: '12px',
              border: '1px solid #722ed120'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                🔄 分享数
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#722ed1',
                lineHeight: '1.2',
                letterSpacing: '-0.5px'
              }}>
                {formatNumber(collaboration.shares)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationDetail;
