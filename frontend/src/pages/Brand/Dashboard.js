import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { brandPortalApi } from '../../api';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#fbbc04', '#1a73e8', '#34a853', '#ea4335'];

const STATUS_LABELS = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [engagementTrend, setEngagementTrend] = useState([]);
  const [campaignProgress, setCampaignProgress] = useState([]);
  const [collaborations, setCollaborations] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const [
        overviewRes,
        statusRes,
        trendRes,
        progressRes,
        collabsRes
      ] = await Promise.all([
        brandPortalApi.getOverview(),
        brandPortalApi.getStatusDistribution(),
        brandPortalApi.getEngagementTrend(),
        brandPortalApi.getCampaignProgress(),
        brandPortalApi.getCollaborations({ page: 1, page_size: 5 })
      ]);

      setOverview(overviewRes);
      setStatusDistribution(Array.isArray(statusRes) ? statusRes : []);
      setEngagementTrend(Array.isArray(trendRes) ? trendRes : []);
      setCampaignProgress(Array.isArray(progressRes) ? progressRes : []);
      setCollaborations(collabsRes?.items || []);
    } catch (error) {
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
    if (num >= 10000) {
      return '¥' + (num / 10000).toFixed(1) + '万';
    }
    return '¥' + (num?.toLocaleString() || '0');
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { label: '待开始', class: 'tag-gray' },
      in_progress: { label: '进行中', class: 'tag-primary' },
      completed: { label: '已完成', class: 'tag-success' },
      cancelled: { label: '已取消', class: 'tag-error' }
    };
    const config = statusMap[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const formatDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekDay = weekDays[now.getDay()];
    return `${year}年${month}月${day}日 ${weekDay}`;
  };

  const getProgressPercent = (total, spent) => {
    if (!total || total <= 0) return 0;
    return Math.min(Math.round((spent / total) * 100), 100);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const totalCampaigns = overview?.collaborations?.total || 0;
  const inProgress = overview?.collaborations?.in_progress || 0;
  const completed = overview?.collaborations?.completed || 0;
  const totalBudget = overview?.budget?.total || 0;
  const spentBudget = overview?.budget?.spent || 0;
  const budgetPercent = overview?.budget?.progress_percent ?? getProgressPercent(totalBudget, spentBudget);
  const totalViews = overview?.engagement?.total_views || 0;
  const totalLikes = overview?.engagement?.total_likes || 0;
  const totalInfluencers = overview?.influencers_count || 0;

  const pieData = statusDistribution.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count || 0
  }));

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #1a73e8 0%, #9333ea 100%)', color: '#fff', border: 'none' }}>
        <div className="card-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                你好，{user?.nickname || user?.name || '用户'} 👋
              </div>
              <div style={{ fontSize: '18px', opacity: 0.9, marginBottom: '4px' }}>
                欢迎回来，{user?.brand?.name || '品牌方'}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.75 }}>
                {formatDate()}
              </div>
            </div>
            <div style={{ fontSize: '48px', opacity: 0.2 }}>
              🏢
            </div>
          </div>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon blue">📊</div>
          <div className="stat-content">
            <div className="stat-label">营销战役总数</div>
            <div className="stat-value">{totalCampaigns}</div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--primary-color)' }}>
                进行中: {inProgress}
              </span>
              <span style={{ color: 'var(--success-color)' }}>
                已完成: {completed}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">💰</div>
          <div className="stat-content">
            <div className="stat-label">预算消耗进度</div>
            <div className="stat-value">{formatMoney(totalBudget)}</div>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  已支出: {formatMoney(spentBudget)}
                </span>
                <span style={{ color: budgetPercent >= 90 ? 'var(--error-color)' : 'var(--primary-color)', fontWeight: '600' }}>
                  {budgetPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${budgetPercent}%`,
                    height: '100%',
                    background: budgetPercent >= 90 ? 'var(--error-color)' : 'linear-gradient(90deg, #1a73e8, #9333ea)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">👁️</div>
          <div className="stat-content">
            <div className="stat-label">总互动效果</div>
            <div className="stat-value">{formatNumber(totalViews)}</div>
            <div className="stat-change positive">
              总点赞: {formatNumber(totalLikes)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">🤝</div>
          <div className="stat-content">
            <div className="stat-label">合作达人数量</div>
            <div className="stat-value">{totalInfluencers}</div>
            <div className="stat-change">
              累计合作达人
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">各战役预算消耗进度</h3>
        </div>
        <div className="card-body">
          {campaignProgress.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              暂无战役数据
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {campaignProgress.map(campaign => {
                const percent = getProgressPercent(campaign.budget_total, campaign.budget_spent);
                return (
                  <div
                    key={campaign.id}
                    onClick={() => navigate(`/brand/campaigns/${campaign.id}`)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 115, 232, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #1a73e8, #9333ea)' }}>
                          {campaign.name?.[0]}
                        </div>
                        <span style={{ fontWeight: '600' }}>{campaign.name}</span>
                        {getStatusTag(campaign.status)}
                      </div>
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {formatMoney(campaign.budget_spent)} / {formatMoney(campaign.budget_total)}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: percent >= 90 ? 'var(--error-color)' : 'var(--primary-color)'
                        }}>
                          {percent}%
                        </div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: percent >= 90
                            ? 'linear-gradient(90deg, #ea4335, #f97316)'
                            : 'linear-gradient(90deg, #1a73e8, #34a853)',
                          borderRadius: '5px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">战役状态分布</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: 'var(--border-color)' }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">近6个月效果趋势</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    formatter={(value, name) => {
                      const nameMap = {
                        views: '曝光量',
                        likes: '点赞',
                        comments: '评论',
                        shares: '分享'
                      };
                      return [formatNumber(value), nameMap[name] || name];
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const nameMap = {
                        views: '曝光量',
                        likes: '点赞',
                        comments: '评论',
                        shares: '分享'
                      };
                      return nameMap[value] || value;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#1a73e8"
                    fill="#e8f0fe"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="likes"
                    stroke="#34a853"
                    fill="#e6f4ea"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="comments"
                    stroke="#fbbc04"
                    fill="#fef7e0"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stroke="#9333ea"
                    fill="#f3e8fd"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">近期合作</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/brand/collaborations')}
          >
            查看全部 →
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>合作达人</th>
                <th>状态</th>
                <th>预算</th>
              </tr>
            </thead>
            <tbody>
              {collaborations.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    暂无合作数据
                  </td>
                </tr>
              ) : (
                collaborations.map(collab => (
                  <tr
                    key={collab.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/brand/collaborations/${collab.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">
                          {collab.campaign_name?.[0] || collab.project_name?.[0] || '?'}
                        </div>
                        <span>{collab.campaign_name || collab.project_name || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">
                          {collab.influencer_name?.[0] || '?'}
                        </div>
                        <span>{collab.influencer_name || '-'}</span>
                      </div>
                    </td>
                    <td>{getStatusTag(collab.status)}</td>
                    <td>{formatMoney(collab.budget)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
