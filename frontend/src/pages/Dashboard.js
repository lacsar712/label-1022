import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statisticsApi } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart
} from 'recharts';

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9333ea', '#f97316'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [platformData, setPlatformData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topInfluencers, setTopInfluencers] = useState([]);
  const [recentCollabs, setRecentCollabs] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Small delay to ensure token is available after login navigation
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    // Check if token exists before making API calls
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      const [
        overviewRes,
        platformRes,
        categoryRes,
        statusRes,
        trendRes,
        topRes,
        recentRes
      ] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getPlatformDistribution(),
        statisticsApi.getCategoryDistribution(),
        statisticsApi.getCollaborationStatus(),
        statisticsApi.getMonthlyTrends(6),
        statisticsApi.getTopInfluencers({ limit: 5, order_by: 'followers' }),
        statisticsApi.getRecentCollaborations(5)
      ]);
      
      setOverview(overviewRes);
      setPlatformData(platformRes);
      setCategoryData(categoryRes);
      setStatusData(statusRes);
      setTrendData(trendRes);
      setTopInfluencers(topRes);
      setRecentCollabs(recentRes);
    } catch (error) {
      // Error handled by interceptor
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

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon blue">👤</div>
          <div className="stat-content">
            <div className="stat-label">Influencer总数</div>
            <div className="stat-value">{overview?.influencers?.total || 0}</div>
            <div className="stat-change positive">
              活跃: {overview?.influencers?.active || 0}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon green">🤝</div>
          <div className="stat-content">
            <div className="stat-label">合作项目</div>
            <div className="stat-value">{overview?.collaborations?.total || 0}</div>
            <div className="stat-change positive">
              进行中: {overview?.collaborations?.active || 0}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon orange">👥</div>
          <div className="stat-content">
            <div className="stat-label">总粉丝覆盖</div>
            <div className="stat-value">{formatNumber(overview?.followers)}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon purple">💰</div>
          <div className="stat-content">
            <div className="stat-label">投放预算</div>
            <div className="stat-value">{formatMoney(overview?.budget?.total)}</div>
            <div className="stat-change">
              已支出: {formatMoney(overview?.budget?.spent)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Platform Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">平台分布</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="count"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ platform, percent }) => 
                      `${platform} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Collaboration Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">合作状态分布</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a73e8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">月度合作趋势</h3>
        </div>
        <div className="card-body">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'budget' || name === 'cost') {
                      return ['¥' + value.toLocaleString(), name === 'budget' ? '预算' : '支出'];
                    }
                    return [value, '合作数'];
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="count" 
                  name="合作数"
                  stroke="#1a73e8" 
                  fill="#e8f0fe" 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="budget" 
                  name="预算"
                  stroke="#34a853" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Top Influencers */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Influencer</h3>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/influencers')}
            >
              查看全部 →
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>名称</th>
                  <th>平台</th>
                  <th>粉丝数</th>
                </tr>
              </thead>
              <tbody>
                {topInfluencers.map((inf, idx) => (
                  <tr 
                    key={inf.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/influencers/${inf.id}`)}
                  >
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: idx < 3 ? COLORS[idx] : 'var(--bg-tertiary)',
                        color: idx < 3 ? '#fff' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">
                          {inf.name?.[0]}
                        </div>
                        <span>{inf.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag tag-primary">{inf.platform}</span>
                    </td>
                    <td>{formatNumber(inf.followers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Collaborations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">最近合作</h3>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/collaborations')}
            >
              查看全部 →
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>Influencer</th>
                  <th>状态</th>
                  <th>预算</th>
                </tr>
              </thead>
              <tbody>
                {recentCollabs.map(collab => (
                  <tr key={collab.id}>
                    <td>{collab.project_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">
                          {collab.influencer_name?.[0]}
                        </div>
                        <span>{collab.influencer_name}</span>
                      </div>
                    </td>
                    <td>{getStatusTag(collab.status)}</td>
                    <td>{formatMoney(collab.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">互动数据总览</h3>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '24px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary-color)' }}>
                {formatNumber(overview?.engagement?.views)}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>总播放/阅读</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success-color)' }}>
                {formatNumber(overview?.engagement?.likes)}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>总点赞</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                {formatNumber(overview?.engagement?.comments)}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>总评论</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#9333ea' }}>
                {formatNumber(overview?.engagement?.shares)}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>总分享</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
