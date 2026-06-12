import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelinesApi } from '../../api';
import { useAuth, isOperator, isAdmin } from '../../contexts/AuthContext';

const STAGE_DEFS = [
  { key: 'to_contact', label: '待联系', color: '#6b7280', icon: '📋' },
  { key: 'communicating', label: '沟通中', color: '#3b82f6', icon: '💬' },
  { key: 'quote_confirmed', label: '报价确认', color: '#f59e0b', icon: '💰' },
  { key: 'signed', label: '已签约', color: '#10b981', icon: '✅' },
  { key: 'abandoned', label: '已放弃', color: '#ef4444', icon: '❌' }
];

const PLATFORMS = ['全部', '抖音', '小红书', 'B站', '快手', '视频号', '微博', '微信公众号'];

const Pipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = isOperator(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
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

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableInfluencers, setAvailableInfluencers] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableKeyword, setAvailableKeyword] = useState('');
  const [availablePlatform, setAvailablePlatform] = useState('全部');
  const [selectedAvailableInfluencer, setSelectedAvailableInfluencer] = useState(null);
  const [addStage, setAddStage] = useState('to_contact');
  const [addOwnerId, setAddOwnerId] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      fetchAvailableInfluencers();
    }
  }, [addModalOpen, availableKeyword, availablePlatform]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

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

  const fetchAvailableInfluencers = async () => {
    try {
      setAvailableLoading(true);
      const params = {};
      if (availableKeyword) params.keyword = availableKeyword;
      if (availablePlatform && availablePlatform !== '全部') params.platform = availablePlatform;
      const data = await pipelinesApi.getAvailableInfluencers(params);
      setAvailableInfluencers(data || []);
    } catch (error) {
      console.error('Failed to fetch available influencers:', error);
      setAvailableInfluencers([]);
    } finally {
      setAvailableLoading(false);
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
      const updatedOwner = newOwnerId ? ownerOptions.find(o => o.id === newOwnerId) : null;
      setPipelines(prev => prev.map(p =>
        p.id === selectedPipeline.id
          ? { ...p, notes: drawerNotes, owner_id: newOwnerId, owner: updatedOwner }
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

  const handleMenuAction = async (action, pipeline) => {
    setActiveMenuId(null);
    if (!canEdit) return;

    if (action === 'remove') {
      if (!window.confirm(`确定要将 ${pipeline.influencer?.name} 移出 Pipeline 吗？`)) {
        return;
      }
      try {
        await pipelinesApi.delete(pipeline.id);
        setPipelines(prev => prev.filter(p => p.id !== pipeline.id));
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: '已移出 Pipeline' }
        }));
      } catch (error) {
        console.error('Failed to remove:', error);
      }
    } else if (action.startsWith('move_')) {
      const targetStage = action.replace('move_', '');
      if (targetStage === pipeline.stage) return;
      try {
        await pipelinesApi.updateStage(pipeline.id, targetStage);
        setPipelines(prev => prev.map(p =>
          p.id === pipeline.id ? { ...p, stage: targetStage } : p
        ));
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: '已更新阶段' }
        }));
      } catch (error) {
        console.error('Failed to update stage:', error);
      }
    } else if (action === 'view') {
      navigate(`/influencers/${pipeline.influencer_id}`);
    }
  };

  const handleOpenAddModal = () => {
    setAddModalOpen(true);
    setSelectedAvailableInfluencer(null);
    setAvailableKeyword('');
    setAvailablePlatform('全部');
    setAddStage('to_contact');
    setAddOwnerId(user?.id ? String(user.id) : '');
    setAddNotes('');
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    setSelectedAvailableInfluencer(null);
    setAvailableKeyword('');
    setAvailablePlatform('全部');
    setAddStage('to_contact');
    setAddOwnerId('');
    setAddNotes('');
  };

  const handleAddToPipeline = async () => {
    if (!selectedAvailableInfluencer || !canEdit) return;
    try {
      setAddSaving(true);
      const createData = {
        influencer_id: selectedAvailableInfluencer.id,
        stage: addStage
      };
      if (addOwnerId) createData.owner_id = Number(addOwnerId);
      if (addNotes) createData.notes = addNotes;

      const newPipeline = await pipelinesApi.create(createData);
      setPipelines(prev => [newPipeline, ...prev]);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: `${selectedAvailableInfluencer.name} 已成功纳入 Pipeline` }
      }));
      handleCloseAddModal();
      setSelectedAvailableInfluencer(null);
    } catch (error) {
      console.error('Failed to add to pipeline:', error);
      if (error.response?.data?.detail) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'error', message: error.response.data.detail }
        }));
      }
    } finally {
      setAddSaving(false);
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
      <div className="pipeline-page-header">
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>触达 Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            商务拓展漏斗看板 · 共 {filteredPipelines.length} 位在谈达人
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary btn-lg" onClick={handleOpenAddModal}>
            ➕ 纳入新达人
          </button>
        )}
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
                        {canEdit && (
                          <div
                            className="pipeline-card-menu"
                            ref={activeMenuId === pipeline.id ? menuRef : null}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === pipeline.id ? null : pipeline.id);
                            }}
                          >
                            <span>⋮</span>
                            {activeMenuId === pipeline.id && (
                              <div className="pipeline-card-dropdown">
                                <div
                                  className="pipeline-dropdown-item"
                                  onClick={(e) => { e.stopPropagation(); handleMenuAction('view', pipeline); }}
                                >
                                  👁️ 查看达人详情
                                </div>
                                <div className="pipeline-dropdown-divider"></div>
                                <div className="pipeline-dropdown-label">移动到</div>
                                {STAGE_DEFS.map(s => (
                                  <div
                                    key={s.key}
                                    className={`pipeline-dropdown-item ${pipeline.stage === s.key ? 'disabled' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (pipeline.stage !== s.key) handleMenuAction(`move_${s.key}`, pipeline);
                                    }}
                                    style={pipeline.stage !== s.key ? { paddingLeft: '28px' } : { paddingLeft: '28px', opacity: 0.5 }}
                                  >
                                    {s.icon} {s.label}
                                  </div>
                                ))}
                                <div className="pipeline-dropdown-divider"></div>
                                <div
                                  className="pipeline-dropdown-item danger"
                                  onClick={(e) => { e.stopPropagation(); handleMenuAction('remove', pipeline); }}
                                >
                                  🗑️ 移出 Pipeline
                                </div>
                              </div>
                            )}
                          </div>
                        )}
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

      {addModalOpen && (
        <>
          <div className="modal-overlay" onClick={handleCloseAddModal}></div>
          <div className="modal" style={{ maxWidth: '760px', width: '90%' }}>
            <div className="modal-header">
              <div className="modal-title">纳入新达人</div>
              <button className="modal-close" onClick={handleCloseAddModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="add-pipeline-filters">
                <div className="search-input-wrapper" style={{ flex: 1 }}>
                  <span className="search-icon">🔍</span>
                  <input
                    className="form-input"
                    placeholder="搜索达人名称或账号"
                    value={availableKeyword}
                    onChange={(e) => setAvailableKeyword(e.target.value)}
                  />
                </div>
                <select
                  className="form-select"
                  style={{ width: '160px' }}
                  value={availablePlatform}
                  onChange={(e) => setAvailablePlatform(e.target.value)}
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="add-pipeline-list">
                {availableLoading ? (
                  <div className="add-pipeline-empty">
                    <div className="spinner" style={{ width: '24px', height: '24px', marginBottom: '12px' }}></div>
                    <span>加载中...</span>
                  </div>
                ) : availableInfluencers.length === 0 ? (
                  <div className="add-pipeline-empty">
                    <span style={{ fontSize: '40px', opacity: 0.3 }}>😕</span>
                    <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                      {availableKeyword || availablePlatform !== '全部' ? '没有找到匹配的达人' : '所有达人都已在 Pipeline 中'}
                    </p>
                  </div>
                ) : (
                  availableInfluencers.map(inf => (
                    <div
                      key={inf.id}
                      className={`add-influencer-item ${selectedAvailableInfluencer?.id === inf.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAvailableInfluencer(inf)}
                    >
                      <div className="add-influencer-radio">
                        <span className={`radio-circle ${selectedAvailableInfluencer?.id === inf.id ? 'checked' : ''}`}>
                          {selectedAvailableInfluencer?.id === inf.id && '✓'}
                        </span>
                      </div>
                      <div className="add-influencer-avatar">
                        {inf.name?.[0] || '?'}
                      </div>
                      <div className="add-influencer-info">
                        <div className="add-influencer-name">{inf.name}</div>
                        <div className="add-influencer-meta">
                          <span className="pipeline-platform-tag">{inf.platform}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {formatNumber(inf.followers)} 粉丝
                          </span>
                          {inf.cost_per_post > 0 && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                              {formatMoney(inf.cost_per_post)}/条
                            </span>
                          )}
                          {inf.category && (
                            <span className="pipeline-platform-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                              {inf.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedAvailableInfluencer && (
                <div className="add-pipeline-config">
                  <div className="add-pipeline-config-title">
                    <span>📋 跟进设置</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      已选择：{selectedAvailableInfluencer.name}
                    </span>
                  </div>
                  <div className="add-pipeline-config-grid">
                    <div className="form-group">
                      <label className="form-label">初始阶段</label>
                      <select
                        className="form-select"
                        value={addStage}
                        onChange={(e) => setAddStage(e.target.value)}
                      >
                        {STAGE_DEFS.map(s => (
                          <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">负责人</label>
                      <select
                        className="form-select"
                        value={addOwnerId}
                        onChange={(e) => setAddOwnerId(e.target.value)}
                      >
                        <option value="">未指派</option>
                        {ownerOptions.map(o => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">初始备注（可选）</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="记录合作意向、关注点、初步报价等..."
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseAddModal}>
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ marginLeft: '8px' }}
                onClick={handleAddToPipeline}
                disabled={!selectedAvailableInfluencer || addSaving || !canEdit}
              >
                {addSaving ? '添加中...' : '➕ 加入 Pipeline'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Pipeline;
