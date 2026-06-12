import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelinesApi, influencersApi, usersApi } from '../../api';
import { useAuth, isOperator, isAdmin } from '../../contexts/AuthContext';

const STAGE_DEFS = [
  { key: 'to_contact', label: '待联系', color: '#6b7280', icon: '📋' },
  { key: 'communicating', label: '沟通中', color: '#3b82f6', icon: '💬' },
  { key: 'quote_confirmed', label: '报价确认', color: '#f59e0b', icon: '💰' },
  { key: 'signed', label: '已签约', color: '#10b981', icon: '✅' },
  { key: 'abandoned', label: '已放弃', color: '#ef4444', icon: '❌' }
];

const Pipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = isOperator(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState(STAGE_DEFS);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [filterOwner, setFilterOwner] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerOwnerId, setDrawerOwnerId] = useState('');
  const [drawerSaving, setDrawerSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipelineData, ownerData] = await Promise.all([
        pipelinesApi.getList(),
        pipelinesApi.getOwnerOptions()
      ]);
      setPipelines(pipelineData.items || []);
      setOwnerOptions(ownerData || []);
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  const formatMoney = (num) => {
    if (!num) return '¥0';
    return '¥' + Number(num).toLocaleString();
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

  const filteredPipelines = useMemo(() => {
    let result = [...pipelines];
    if (filterOwner) {
      result = result.filter(p => String(p.owner_id) === String(filterOwner));
    }
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      result = result.filter(p => {
        const name = p.influencer?.name?.toLowerCase() || '';
        const platform = p.influencer?.platform?.toLowerCase() || '';
        return name.includes(kw) || platform.includes(kw);
      });
    }
    return result;
  }, [pipelines, filterOwner, filterKeyword]);

  const pipelinesByStage = useMemo(() => {
    const grouped = {};
    STAGE_DEFS.forEach(s => { grouped[s.key] = []; });
    filteredPipelines.forEach(p => {
      if (grouped[p.stage]) {
        grouped[p.stage].push(p);
      }
    });
    return grouped;
  }, [filteredPipelines]);

  const stageCounts = useMemo(() => {
    const counts = {};
    STAGE_DEFS.forEach(s => {
      counts[s.key] = pipelinesByStage[s.key]?.length || 0;
    });
    return counts;
  }, [pipelinesByStage]);

  const handleDragStart = (e, pipeline) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    setDraggedItem(pipeline);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(pipeline.id));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stageKey) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, stageKey) => {
    if (!canEdit) return;
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedItem) return;
    if (draggedItem.stage === stageKey) {
      setDraggedItem(null);
      return;
    }

    const originalStage = draggedItem.stage;
    setPipelines(prev => prev.map(p =>
      p.id === draggedItem.id ? { ...p, stage: stageKey } : p
    ));
    setDraggedItem(null);

    try {
      await pipelinesApi.updateStage(draggedItem.id, stageKey);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: '阶段已更新' }
      }));
    } catch (error) {
      setPipelines(prev => prev.map(p =>
        p.id === draggedItem.id ? { ...p, stage: originalStage } : p
      ));
      console.error('Failed to update stage:', error);
    }
  };

  const handleCardClick = (pipeline) => {
    setSelectedPipeline(pipeline);
    setDrawerNotes(pipeline.notes || '');
    setDrawerOwnerId(pipeline.owner_id || '');
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedPipeline(null);
    setDrawerNotes('');
    setDrawerOwnerId('');
  };

  const handleSaveDrawer = async () => {
    if (!selectedPipeline || !canEdit) return;
    try {
      setDrawerSaving(true);
      const updateData = {};
      if (drawerNotes !== (selectedPipeline.notes || '')) {
        updateData.notes = drawerNotes;
      }
      const newOwnerId = drawerOwnerId ? Number(drawerOwnerId) : null;
      if (newOwnerId !== (selectedPipeline.owner_id || null)) {
        updateData.owner_id = newOwnerId;
      }
      if (Object.keys(updateData).length === 0) {
        handleCloseDrawer();
        return;
      }
      await pipelinesApi.update(selectedPipeline.id, updateData);
      setPipelines(prev => prev.map(p =>
        p.id === selectedPipeline.id
          ? { ...p, notes: drawerNotes, owner_id: newOwnerId, owner: newOwnerId ? ownerOptions.find(o => o.id === newOwnerId) : null }
          : p
      ));
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: '已保存' }
      }));
      handleCloseDrawer();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setDrawerSaving(false);
    }
  };

  const getStageDef = (key) => STAGE_DEFS.find(s => s.key === key) || STAGE_DEFS[0];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="pipeline-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>触达 Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            商务拓展漏斗看板 · 共 {filteredPipelines.length} 位在谈达人
          </p>
        </div>
      </div>

      <div className="pipeline-toolbar">
        <div className="pipeline-filters">
          <div className="search-input-wrapper" style={{ maxWidth: '260px', flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              className="form-input"
              placeholder="搜索达人名称或平台"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: '180px' }}
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
          >
            <option value="">全部负责人</option>
            {ownerOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="pipeline-summary">
          {STAGE_DEFS.map(s => (
            <div key={s.key} className="pipeline-summary-item" style={{ borderLeftColor: s.color }}>
              <span className="pipeline-summary-label">{s.label}</span>
              <span className="pipeline-summary-count" style={{ color: s.color }}>{stageCounts[s.key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pipeline-board">
        {STAGE_DEFS.map(stage => {
          const stagePipelines = pipelinesByStage[stage.key] || [];
          const isDragOver = dragOverStage === stage.key && draggedItem?.stage !== stage.key;
          return (
            <div
              key={stage.key}
              className={`pipeline-column ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="pipeline-column-header" style={{ borderTopColor: stage.color }}>
                <div className="pipeline-column-title">
                  <span className="pipeline-column-icon">{stage.icon}</span>
                  <span style={{ fontWeight: '600' }}>{stage.label}</span>
                  <span className="pipeline-column-count">{stagePipelines.length}</span>
                </div>
              </div>
              <div className="pipeline-column-body">
                {stagePipelines.length === 0 ? (
                  <div className="pipeline-empty">
                    <span style={{ fontSize: '32px', opacity: 0.3 }}>{stage.icon}</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>暂无达人</p>
                  </div>
                ) : (
                  stagePipelines.map(pipeline => (
                    <div
                      key={pipeline.id}
                      className={`pipeline-card ${draggedItem?.id === pipeline.id ? 'dragging' : ''}`}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, pipeline)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(pipeline)}
                    >
                      <div className="pipeline-card-header">
                        <div className="pipeline-card-avatar">
                          {pipeline.influencer?.name?.[0] || '?'}
                        </div>
                        <div className="pipeline-card-info">
                          <div className="pipeline-card-name">{pipeline.influencer?.name || '-'}</div>
                          <div className="pipeline-card-platform">
                            <span className="pipeline-platform-tag">{pipeline.influencer?.platform || '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pipeline-card-stats">
                        <div className="pipeline-card-stat">
                          <span className="pipeline-card-stat-value">{formatNumber(pipeline.influencer?.followers)}</span>
                          <span className="pipeline-card-stat-label">粉丝</span>
                        </div>
                        {pipeline.influencer?.cost_per_post ? (
                          <div className="pipeline-card-stat">
                            <span className="pipeline-card-stat-value">{formatMoney(pipeline.influencer.cost_per_post)}</span>
                            <span className="pipeline-card-stat-label">报价</span>
                          </div>
                        ) : null}
                      </div>
                      {(pipeline.notes || pipeline.owner) && (
                        <div className="pipeline-card-footer">
                          {pipeline.owner && (
                            <span className="pipeline-owner-badge">
                              👤 {pipeline.owner.nickname || pipeline.owner.username}
                            </span>
                          )}
                          {pipeline.notes && (
                            <span className="pipeline-notes-preview" title={pipeline.notes}>
                              📝 {pipeline.notes.length > 20 ? pipeline.notes.slice(0, 20) + '...' : pipeline.notes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {drawerOpen && selectedPipeline && (
        <>
          <div className="drawer-overlay" onClick={handleCloseDrawer}></div>
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <div className="drawer-title">跟进详情</div>
                <div className="drawer-subtitle">
                  更新于 {formatDateTime(selectedPipeline.updated_at)}
                </div>
              </div>
              <button className="modal-close" onClick={handleCloseDrawer}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <div className="drawer-influencer-card">
                <div className="drawer-influencer-avatar">
                  {selectedPipeline.influencer?.name?.[0] || '?'}
                </div>
                <div className="drawer-influencer-info">
                  <div className="drawer-influencer-name">
                    {selectedPipeline.influencer?.name || '-'}
                  </div>
                  <div className="drawer-influencer-meta">
                    <span className="pipeline-platform-tag">{selectedPipeline.influencer?.platform || '-'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      粉丝 {formatNumber(selectedPipeline.influencer?.followers)}
                    </span>
                    {selectedPipeline.influencer?.cost_per_post && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {formatMoney(selectedPipeline.influencer.cost_per_post)}/条
                      </span>
                    )}
                  </div>
                </div>
                <div className="drawer-stage-badge" style={{ backgroundColor: getStageDef(selectedPipeline.stage).color + '15', color: getStageDef(selectedPipeline.stage).color, borderColor: getStageDef(selectedPipeline.stage).color + '30' }}>
                  {getStageDef(selectedPipeline.stage).icon} {getStageDef(selectedPipeline.stage).label}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">负责人</label>
                <select
                  className="form-select"
                  value={drawerOwnerId}
                  onChange={(e) => setDrawerOwnerId(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">未指派</option>
                  {ownerOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">跟进备注</label>
                <textarea
                  className="form-textarea"
                  rows={8}
                  placeholder="记录沟通情况、报价细节、下一步计划等..."
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div className="form-group">
                <label className="form-label">创建时间</label>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {formatDateTime(selectedPipeline.created_at)}
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <div className="drawer-stats">
                <span style={{ marginRight: '16px' }}>ID: {selectedPipeline.id}</span>
                <span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginRight: '8px' }}
                    onClick={() => selectedPipeline.influencer_id && navigate(`/influencers/${selectedPipeline.influencer_id}`)}
                  >
                    查看达人详情 →
                  </button>
                </span>
              </div>
              <div>
                <button className="btn btn-ghost" onClick={handleCloseDrawer}>
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: '8px' }}
                  onClick={handleSaveDrawer}
                  disabled={!canEdit || drawerSaving}
                >
                  {drawerSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Pipeline;
