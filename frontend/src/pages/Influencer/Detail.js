import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { influencersApi, collaborationsApi, competitiveIntelligenceApi, messageTemplatesApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';

const InfluencerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = isOperator(user);
  const canViewPriceHistory = isOperator(user);
  
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState(null);
  const [collaborations, setCollaborations] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [competitiveIntel, setCompetitiveIntel] = useState([]);
  const [competitiveIntelLoading, setCompetitiveIntelLoading] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('初次邀约');

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
      
      if (canViewPriceHistory) {
        fetchPriceHistory();
      }
      fetchCompetitiveIntel();
    } catch (error) {
      navigate('/influencers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      setPriceHistoryLoading(true);
      const data = await influencersApi.getPriceHistory(id);
      setPriceHistory(data.items);
    } catch (error) {
      console.error('Failed to fetch price history:', error);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const fetchCompetitiveIntel = async () => {
    try {
      setCompetitiveIntelLoading(true);
      const data = await competitiveIntelligenceApi.getList({ influencer_id: id, page_size: 100 });
      setCompetitiveIntel(data.items);
    } catch (error) {
      console.error('Failed to fetch competitive intelligence:', error);
    } finally {
      setCompetitiveIntelLoading(false);
    }
  };

  const parseVariables = (content) => {
    const pattern = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const data = await messageTemplatesApi.getList({ is_active: 1 });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const openInviteModal = async () => {
    await fetchTemplates();
    setShowInviteModal(true);
    setSelectedTemplate(null);
    setPreviewResult(null);
    setTemplateVariables({});
    setActiveCategory('初次邀约');
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setPreviewResult(null);
    
    const variables = parseVariables(template.content);
    const vars = {};
    
    variables.forEach(v => {
      let defaultValue = '';
      switch (v) {
        case '达人姓名':
          defaultValue = influencer?.name || '';
          break;
        case '所属平台':
          defaultValue = influencer?.platform || '';
          break;
        case '领域':
          defaultValue = influencer?.category?.name || '';
          break;
        case '联系人姓名':
          defaultValue = user?.nickname || user?.username || '';
          break;
        default:
          defaultValue = '';
      }
      vars[v] = defaultValue;
    });
    
    setTemplateVariables(vars);
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    try {
      setPreviewLoading(true);
      const result = await messageTemplatesApi.preview({
        template_id: selectedTemplate.id,
        variables: templateVariables
      });
      setPreviewResult(result);
    } catch (error) {
    } finally {
      setPreviewLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('success', '已复制到剪贴板');
  };

  const categoryColors = {
    '初次邀约': '#1890ff',
    '跟进催复': '#fa8c16',
    '合同确认': '#52c41a',
    '内容审核': '#722ed1',
    '日常维护': '#eb2f96'
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || '#1890ff';
  };

  const categories = ['初次邀约', '跟进催复', '合同确认', '内容审核', '日常维护'];
  
  const filteredTemplates = templates.filter(t => t.category === activeCategory);

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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const buildChartData = () => {
    if (!influencer) return [];
    
    const data = [];
    
    data.push({
      date: formatDate(influencer.created_at),
      time: influencer.created_at,
      price: Number(influencer.cost_per_post),
      label: '初始报价'
    });
    
    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    
    sortedHistory.forEach((h) => {
      data.push({
        date: formatDate(h.created_at),
        time: h.created_at,
        price: Number(h.new_price),
        label: h.change_reason || '价格调整'
      });
    });
    
    return data;
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

  const getTierBadge = (tier) => {
    if (!tier) return null;
    return (
      <span 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 14px',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: '500',
          backgroundColor: tier.color + '15',
          color: tier.color,
          border: `1px solid ${tier.color}30`
        }}
      >
        <span style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: tier.color 
        }} />
        {tier.name}
      </span>
    );
  };

  const getChangeTag = (amount) => {
    const num = Number(amount);
    if (num > 0) {
      return <span style={{ color: '#f5222d', fontWeight: '500' }}>↑ +¥{num.toLocaleString()}</span>;
    } else if (num < 0) {
      return <span style={{ color: '#52c41a', fontWeight: '500' }}>↓ -¥{Math.abs(num).toLocaleString()}</span>;
    }
    return <span style={{ color: 'var(--text-tertiary)' }}>— 持平</span>;
  };

  const getChangePercentTag = (percent) => {
    const num = Number(percent);
    if (num > 0) {
      return <span style={{ color: '#f5222d' }}>+{num}%</span>;
    } else if (num < 0) {
      return <span style={{ color: '#52c41a' }}>{num}%</span>;
    }
    return <span style={{ color: 'var(--text-tertiary)' }}>0%</span>;
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

  const totalCollabs = collaborations.length;
  const completedCollabs = collaborations.filter(c => c.status === 'completed').length;
  const totalBudget = collaborations.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalCost = collaborations.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const totalViews = collaborations.reduce((sum, c) => sum + (c.views || 0), 0);
  const totalLikes = collaborations.reduce((sum, c) => sum + (c.likes || 0), 0);

  const chartData = buildChartData();
  const highestPrice = priceHistory.length > 0
    ? Math.max(...chartData.map(d => d.price))
    : Number(influencer.cost_per_post);
  const lowestPrice = priceHistory.length > 0
    ? Math.min(...chartData.map(d => d.price))
    : Number(influencer.cost_per_post);
  const totalChangeCount = priceHistory.filter(h => Number(h.change_amount) !== 0).length;

  return (
    <div>
      <button 
        className="btn btn-ghost" 
        onClick={() => navigate('/influencers')}
        style={{ marginBottom: '16px' }}
      >
        ← 返回列表
      </button>

      <div className="detail-header">
        <div className="detail-avatar">
          {influencer.name?.[0]}
        </div>
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 className="detail-name" style={{ margin: 0 }}>{influencer.name}</h1>
            {influencer.tier && getTierBadge(influencer.tier)}
            {getStatusTag(influencer.status)}
            {canEdit && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={openInviteModal}
                style={{ marginLeft: 'auto' }}
              >
                ✉️ 一键生成邀约
              </button>
            )}
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
            {influencer.tier && (
              <div className="detail-meta-item">
                <span>⭐</span>
                <span>{influencer.tier.name}</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
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

      {canViewPriceHistory && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">📈 报价走势</h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>历史最高：</span>
                <span style={{ color: '#f5222d', fontWeight: '600' }}>{formatMoney(highestPrice)}</span>
              </span>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>历史最低：</span>
                <span style={{ color: '#52c41a', fontWeight: '600' }}>{formatMoney(lowestPrice)}</span>
              </span>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>调价次数：</span>
                <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{totalChangeCount}</span>
              </span>
            </div>
          </div>
          <div className="card-body">
            {chartData.length <= 1 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">📊</div>
                <div className="empty-title">暂无报价变动记录</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: '8px' }}>
                  当前报价为 {formatMoney(influencer.cost_per_post)}，后续调价将自动记录
                </div>
              </div>
            ) : (
              <div>
                <div style={{ height: '300px', marginBottom: '24px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => '¥' + (v / 1000).toFixed(0) + 'k'}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: '600' }}
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '报价']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="price"
                        name="单条报价"
                        stroke="#1890ff"
                        strokeWidth={3}
                        dot={{ fill: '#1890ff', r: 6, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, fill: '#1890ff', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--text-primary)' }}>
                  报价变更明细
                </h4>
                {priceHistoryLoading ? (
                  <div className="loading" style={{ minHeight: '120px' }}>
                    <div className="spinner"></div>
                  </div>
                ) : priceHistory.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-title" style={{ fontSize: '14px' }}>暂无变更明细</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>变更时间</th>
                          <th>变更前</th>
                          <th>变更后</th>
                          <th>变动金额</th>
                          <th>变动幅度</th>
                          <th>操作人</th>
                          <th>变更背景</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map((h) => (
                          <tr key={h.id}>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                              {formatDateTime(h.created_at)}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {formatMoney(h.old_price)}
                            </td>
                            <td style={{ fontWeight: '500' }}>
                              {formatMoney(h.new_price)}
                            </td>
                            <td>{getChangeTag(h.change_amount)}</td>
                            <td>{getChangePercentTag(h.change_percent)}</td>
                            <td>
                              {h.operator 
                                ? (h.operator.nickname || h.operator.username) 
                                : '-'}
                            </td>
                            <td style={{ 
                              maxWidth: '250px', 
                              color: h.change_reason ? 'var(--text-secondary)' : 'var(--text-tertiary)'
                            }}>
                              {h.change_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

      {competitiveIntel.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header" style={{ 
            background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
            borderBottom: '1px solid #ffd591'
          }}>
            <h3 className="card-title" style={{ color: '#d46b08', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              竞品合作记录
              <span className="tag tag-warning" style={{ marginLeft: '8px' }}>
                {competitiveIntel.length} 条记录
              </span>
            </h3>
            <div style={{ fontSize: '13px', color: '#d46b08' }}>
              该达人已被竞品锁定，建议评估谈判优先级与报价策略
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {competitiveIntelLoading ? (
              <div className="loading" style={{ minHeight: '120px' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr style={{ backgroundColor: '#fffbe6' }}>
                      <th style={{ color: '#d46b08' }}>竞品名称</th>
                      <th style={{ color: '#d46b08' }}>推测合作金额</th>
                      <th style={{ color: '#d46b08' }}>信息来源</th>
                      <th style={{ color: '#d46b08' }}>发现日期</th>
                      <th style={{ color: '#d46b08' }}>录入人</th>
                      <th style={{ color: '#d46b08' }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitiveIntel.map(record => (
                      <tr key={record.id} style={{ 
                        backgroundColor: 'rgba(255, 196, 0, 0.05)' 
                      }}>
                        <td style={{ fontWeight: '600', color: '#d46b08' }}>
                          {record.competitor_name}
                        </td>
                        <td style={{ color: '#f5222d', fontWeight: '500' }}>
                          {formatMoney(record.estimated_amount)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {record.source || '-'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(record.discovery_date)}
                        </td>
                        <td>
                          {record.creator 
                            ? (record.creator.nickname || record.creator.username) 
                            : '-'}
                        </td>
                        <td style={{ 
                          maxWidth: '300px', 
                          color: 'var(--text-secondary)',
                          fontSize: '13px'
                        }}>
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="一键生成邀约"
        size="large"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
              关闭
            </button>
            {selectedTemplate && (
              <button
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={previewLoading}
              >
                {previewLoading ? '生成中...' : '生成预览'}
              </button>
            )}
          </>
        }
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">当前达人</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  {influencer?.name?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {influencer?.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {influencer?.platform} · {influencer?.category?.name} · {formatNumber(influencer?.followers)}粉丝
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">选择模板</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    onClick={() => {
                      setActiveCategory(cat);
                      setSelectedTemplate(null);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {templatesLoading ? (
                <div className="loading" style={{ minHeight: '100px' }}>
                  <div className="spinner"></div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <div className="empty-icon">📝</div>
                  <div className="empty-title">该分类下暂无模板</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${selectedTemplate?.id === template.id ? getCategoryColor(template.category) : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedTemplate?.id === template.id ? getCategoryColor(template.category) + '08' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px'
                          }}>
                            <span style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: 'var(--text-primary)'
                            }}>
                              {template.name}
                            </span>
                            <span
                              className="tag"
                              style={{
                                fontSize: '11px',
                                backgroundColor: getCategoryColor(template.category) + '15',
                                color: getCategoryColor(template.category),
                                border: `1px solid ${getCategoryColor(template.category)}30`
                              }}
                            >
                              {template.category}
                            </span>
                          </div>
                          {template.subject && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '4px'
                            }}>
                              主题：{template.subject}
                            </div>
                          )}
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            lineHeight: '1.5',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {template.content.substring(0, 100)}...
                          </div>
                          {template.variables && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {template.variables.split(',').filter(v => v).slice(0, 5).map((v, idx) => (
                                <span key={idx} className="tag tag-primary" style={{ fontSize: '10px' }}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <span style={{ color: getCategoryColor(template.category), fontSize: '20px' }}>
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedTemplate && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">填充变量</h3>
              </div>
              <div className="card-body">
                {Object.keys(templateVariables).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {Object.keys(templateVariables).map(key => (
                      <div className="form-group" key={key}>
                        <label className="form-label">{key}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`请输入${key}`}
                          value={templateVariables[key] || ''}
                          onChange={(e) => setTemplateVariables({
                            ...templateVariables,
                            [key]: e.target.value
                          })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>
                    该模板不包含任何变量
                  </div>
                )}
              </div>
            </div>
          )}

          {previewResult && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">预览结果</h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyToClipboard(previewResult.content)}
                  >
                    复制文案
                  </button>
                </div>
              </div>
              <div className="card-body">
                {previewResult.subject && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      主题
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      {previewResult.subject}
                    </div>
                  </div>
                )}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  minHeight: '150px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  color: 'var(--text-primary)'
                }}>
                  {previewResult.content}
                </div>
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: '500' }}>
                    💡 使用提示
                  </div>
                  <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '4px', lineHeight: '1.6' }}>
                    点击「复制文案」按钮后，可直接粘贴到邮件、微信等沟通工具中使用。
                    如需要调整内容，可在上方修改变量后重新生成预览。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InfluencerDetail;
