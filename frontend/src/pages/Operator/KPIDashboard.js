import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { statisticsApi } from '../../api';

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9333ea', '#f97316', '#06b6d4', '#8b5cf6'];

const OperatorKPIDashboard = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await statisticsApi.getOperatorKPI(year, month);
      setKpiData(data);
    } catch (error) {
      console.error('Failed to fetch operator KPI:', error);
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
    const map = {
      pending: { label: '待开始', class: 'tag-gray' },
      in_progress: { label: '进行中', class: 'tag-primary' },
      completed: { label: '已完成', class: 'tag-success' },
      cancelled: { label: '已取消', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const buildChartData = () => {
    if (!kpiData?.operators) return [];
    return kpiData.operators.map((op, idx) => ({
      name: op.nickname,
      user_id: op.user_id,
      发起合作: op.initiated_count,
      完结项目: op.completed_count,
      color: COLORS[idx % COLORS.length]
    }));
  };

  const handleOperatorClick = (operator) => {
    setSelectedOperator(operator);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOperator(null);
  };

  const getMonthOptions = () => {
    const options = [];
    for (let y = now.getFullYear() - 5; y <= now.getFullYear(); y++) {
      for (let m = 1; m <= 12; m++) {
        if (y === now.getFullYear() && m > now.getMonth() + 1) break;
        options.push({ year: y, month: m, label: `${y}年${m}月` });
      }
    }
    return options.reverse();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const chartData = buildChartData();
  const teamTotals = kpiData?.team_totals || {};

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">运营 KPI 看板</h2>
        <div className="page-actions">
          <select
            className="form-select"
            style={{ width: '160px' }}
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setYear(y);
              setMonth(m);
            }}
          >
            {getMonthOptions().map(opt => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-content">
            <div className="stat-label">发起合作总数</div>
            <div className="stat-value">{teamTotals.initiated_count || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-label">完结项目数</div>
            <div className="stat-value">{teamTotals.completed_count || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">💰</div>
          <div className="stat-content">
            <div className="stat-label">累计预算</div>
            <div className="stat-value">{formatMoney(teamTotals.total_budget)}</div>
            <div className="stat-change">
              已支出: {formatMoney(teamTotals.total_cost)}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📊</div>
          <div className="stat-content">
            <div className="stat-label">平均 CPM</div>
            <div className="stat-value">¥{teamTotals.avg_cpm?.toFixed(2) || '0.00'}</div>
            <div className="stat-change">
              千次曝光成本
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">📊 团队成员横向对比</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            点击成员可下钻查看合作明细
          </span>
        </div>
        <div className="card-body">
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">暂无数据</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: '8px' }}>
                当前月份没有运营数据
              </div>
            </div>
          ) : (
            <div style={{ height: Math.max(300, chartData.length * 50 + 80) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                    width={100}
                    onClick={(data) => {
                      const op = kpiData.operators.find(o => o.user_id === data.user_id);
                      if (op) handleOperatorClick(op);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: '600' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="发起合作"
                    fill="#93c5fd"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => {
                      const op = kpiData.operators.find(o => o.user_id === data.user_id);
                      if (op) handleOperatorClick(op);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar
                    dataKey="完结项目"
                    fill="#1a73e8"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => {
                      const op = kpiData.operators.find(o => o.user_id === data.user_id);
                      if (op) handleOperatorClick(op);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 明细数据</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {!kpiData?.operators || kpiData.operators.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无数据</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>运营人员</th>
                  <th>发起合作数</th>
                  <th>完结项目数</th>
                  <th>完结率</th>
                  <th>累计预算</th>
                  <th>累计支出</th>
                  <th>总曝光</th>
                  <th>平均 CPM</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {kpiData.operators.map((op, idx) => (
                  <tr
                    key={op.user_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOperatorClick(op)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        <div className="avatar avatar-sm">
                          {op.nickname?.[0]}
                        </div>
                        <span style={{ fontWeight: '500' }}>{op.nickname}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600' }}>{op.initiated_count}</td>
                    <td style={{ color: 'var(--success-color)', fontWeight: '600' }}>
                      {op.completed_count}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '60px',
                          height: '6px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${op.completion_rate}%`,
                            height: '100%',
                            background: 'var(--success-color)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {op.completion_rate}%
                        </span>
                      </div>
                    </td>
                    <td>{formatMoney(op.total_budget)}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: '500' }}>
                      {formatMoney(op.total_cost)}
                    </td>
                    <td>{formatNumber(op.total_views)}</td>
                    <td>¥{op.avg_cpm?.toFixed(2) || '0.00'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOperatorClick(op);
                        }}
                      >
                        查看明细 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {drawerOpen && selectedOperator && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <div className="drawer-title">
                  {selectedOperator.nickname} 的合作列表
                </div>
                <div className="drawer-subtitle">
                  {year}年{month}月 · 共 {selectedOperator.collaborations?.length || 0} 个合作
                </div>
              </div>
              <button className="modal-close" onClick={closeDrawer}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>发起合作</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{selectedOperator.initiated_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>完结项目</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success-color)' }}>{selectedOperator.completed_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>累计支出</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-color)' }}>{formatMoney(selectedOperator.total_cost)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>平均 CPM</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>¥{selectedOperator.avg_cpm?.toFixed(2)}</div>
                </div>
              </div>

              {!selectedOperator.collaborations || selectedOperator.collaborations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">暂无合作记录</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedOperator.collaborations.map(collab => (
                    <div
                      key={collab.id}
                      style={{
                        padding: '16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => navigate(`/collaborations`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontWeight: '600', fontSize: '15px' }}>{collab.project_name}</div>
                        {getStatusTag(collab.status)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <div className="avatar avatar-sm" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
                          {collab.influencer_name?.[0]}
                        </div>
                        <span>{collab.influencer_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>预算：</span>
                          <span style={{ fontWeight: '500' }}>{formatMoney(collab.budget)}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>支出：</span>
                          <span style={{ fontWeight: '500', color: 'var(--primary-color)' }}>{formatMoney(collab.actual_cost)}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>曝光：</span>
                          <span style={{ fontWeight: '500' }}>{formatNumber(collab.views)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OperatorKPIDashboard;
