import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { influencersApi, categoriesApi, tiersApi, pipelinesApi } from '../../api';
import { useAuth, isOperator, isAdmin } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const InfluencerList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = isOperator(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Pipeline status
  const [pipelineStatusMap, setPipelineStatusMap] = useState({});
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [selectedInfForPipeline, setSelectedInfForPipeline] = useState(null);
  const [addPipelineStage, setAddPipelineStage] = useState('to_contact');
  const [addPipelineOwnerId, setAddPipelineOwnerId] = useState('');
  const [addPipelineNotes, setAddPipelineNotes] = useState('');
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [pipelineSaving, setPipelineSaving] = useState(false);
  
  // Filters
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tierId, setTierId] = useState('');
  const [status, setStatus] = useState('');
  
  // Options
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tiers, setTiers] = useState([]);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [tierDropdownOpen, setTierDropdownOpen] = useState(false);
  const tierDropdownRef = useRef(null);
  const [originalCostPerPost, setOriginalCostPerPost] = useState(null);
  
  // Delete
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (platform) params.platform = platform;
      if (categoryId) params.category_id = categoryId;
      if (tierId) params.tier_id = tierId;
      if (status) params.status = status;

      const data = await influencersApi.getList(params);
      setInfluencers(data.items);
      setTotal(data.total);

      // Check pipeline status for all influencers on this page
      if (data.items && data.items.length > 0) {
        const checks = data.items.map(inf =>
          pipelinesApi.checkInfluencer(inf.id).catch(() => ({ in_pipeline: false }))
        );
        const results = await Promise.all(checks);
        const statusMap = {};
        data.items.forEach((inf, idx) => {
          statusMap[inf.id] = results[idx];
        });
        setPipelineStatusMap(statusMap);
      } else {
        setPipelineStatusMap({});
      }
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, platform, categoryId, tierId, status]);

  const fetchOptions = async () => {
    try {
      const [platformsRes, categoriesRes, tiersRes, ownerRes] = await Promise.all([
        influencersApi.getPlatforms(),
        categoriesApi.getList(),
        tiersApi.getList(),
        pipelinesApi.getOwnerOptions()
      ]);
      setPlatforms(platformsRes);
      setCategories(categoriesRes);
      const sortedTiers = tiersRes.sort((a, b) => a.sort_order - b.sort_order);
      setTiers(sortedTiers);
      setOwnerOptions(ownerRes || []);
    } catch (error) {
      // Handled by interceptor
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tierDropdownRef.current && !tierDropdownRef.current.contains(event.target)) {
        setTierDropdownOpen(false);
      }
    };
    if (tierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tierDropdownOpen]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setPlatform('');
    setCategoryId('');
    setTierId('');
    setStatus('');
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setOriginalCostPerPost(null);
    setFormData({
      name: '',
      platform: '抖音',
      account_id: '',
      followers: 0,
      category_id: '',
      tier_id: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      contact_wechat: '',
      tags: '',
      cost_per_post: 0,
      engagement_rate: 0,
      status: 'active',
      notes: '',
      change_reason: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (id) => {
    try {
      const data = await influencersApi.getById(id);
      setEditingId(id);
      setOriginalCostPerPost(data.cost_per_post);
      setFormData({
        name: data.name || '',
        platform: data.platform || '抖音',
        account_id: data.account_id || '',
        followers: data.followers || 0,
        category_id: data.category_id || '',
        tier_id: data.tier_id || '',
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        contact_wechat: data.contact_wechat || '',
        tags: data.tags || '',
        cost_per_post: data.cost_per_post || 0,
        engagement_rate: data.engagement_rate || 0,
        status: data.status || 'active',
        notes: data.notes || '',
        change_reason: ''
      });
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      // Handled by interceptor
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = '请输入名称';
    if (!formData.platform) errors.platform = '请选择平台';
    
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = '邮箱格式不正确';
    }
    
    if (formData.contact_phone && !/^1[3-9]\d{9}$/.test(formData.contact_phone)) {
      errors.contact_phone = '手机号格式不正确';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const submitData = {
        ...formData,
        category_id: formData.category_id || null,
        tier_id: formData.tier_id ? parseInt(formData.tier_id) : null,
        followers: parseInt(formData.followers) || 0,
        cost_per_post: parseFloat(formData.cost_per_post) || 0,
        engagement_rate: parseFloat(formData.engagement_rate) || 0
      };
      
      if (editingId) {
        const priceChanged = originalCostPerPost !== null &&
          parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost);
        
        const payload = { ...submitData };
        if (priceChanged && formData.change_reason?.trim()) {
          payload.change_reason = formData.change_reason.trim();
        } else if (!priceChanged) {
          payload.change_reason = undefined;
        }
        
        await influencersApi.update(editingId, payload);
        showToast('success', '更新成功');
      } else {
        await influencersApi.create(submitData);
        showToast('success', '创建成功');
      }
      
      setShowModal(false);
      setTierDropdownOpen(false);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await influencersApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  // ============ Pipeline Functions ============
  const handleOpenAddPipeline = (inf) => {
    setSelectedInfForPipeline(inf);
    setAddPipelineStage('to_contact');
    setAddPipelineOwnerId(user?.id ? String(user.id) : '');
    setAddPipelineNotes('');
    setPipelineModalOpen(true);
  };

  const handleClosePipelineModal = () => {
    setPipelineModalOpen(false);
    setSelectedInfForPipeline(null);
    setAddPipelineStage('to_contact');
    setAddPipelineOwnerId('');
    setAddPipelineNotes('');
  };

  const handleAddToPipeline = async () => {
    if (!selectedInfForPipeline || !canEdit) return;
    try {
      setPipelineSaving(true);
      const createData = {
        influencer_id: selectedInfForPipeline.id,
        stage: addPipelineStage
      };
      if (addPipelineOwnerId) createData.owner_id = Number(addPipelineOwnerId);
      if (addPipelineNotes) createData.notes = addPipelineNotes;

      await pipelinesApi.create(createData);
      showToast('success', `${selectedInfForPipeline.name} 已成功纳入 Pipeline`);

      // Update pipeline status map
      setPipelineStatusMap(prev => ({
        ...prev,
        [selectedInfForPipeline.id]: {
          in_pipeline: true,
          stage: addPipelineStage,
          stage_label: { to_contact: '待联系', communicating: '沟通中', quote_confirmed: '报价确认', signed: '已签约', abandoned: '已放弃' }[addPipelineStage]
        }
      }));

      handleClosePipelineModal();
    } catch (error) {
      console.error('Failed to add to pipeline:', error);
      if (error.response?.data?.detail) {
        showToast('error', error.response.data.detail);
      }
    } finally {
      setPipelineSaving(false);
    }
  };

  const getPipelineBadge = (inf) => {
    const status = pipelineStatusMap[inf.id];
    if (!status?.in_pipeline) return null;

    const colorMap = {
      to_contact: '#6b7280',
      communicating: '#3b82f6',
      quote_confirmed: '#f59e0b',
      signed: '#10b981',
      abandoned: '#ef4444'
    };
    const color = colorMap[status.stage] || '#6b7280';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 10px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: color + '15',
          color: color,
          border: '1px solid ' + color + '30',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          navigate('/pipeline');
        }}
        title="点击跳转到 Pipeline 看板"
      >
        📊 {status.stage_label || status.stage}
      </span>
    );
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
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

  const getTierBadge = (tier) => {
    if (!tier) return <span style={{ color: 'var(--text-tertiary)' }}>未分级</span>;
    return (
      <span 
        className="tier-badge"
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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">Influencer列表</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 添加Influencer
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="搜索名称、账号、标签..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <select 
              className="form-select" 
              style={{ width: '140px' }}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="">全部平台</option>
              {platforms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '140px' }}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">全部分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '140px' }}
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
            >
              <option value="">全部等级</option>
              {tiers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '120px' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="active">活跃</option>
              <option value="inactive">暂停</option>
              <option value="blacklisted">黑名单</option>
            </select>
            
            <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : influencers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <div className="empty-title">暂无数据</div>
              <div className="empty-description">还没有Influencer，点击添加按钮创建</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>平台</th>
                    <th>粉丝数</th>
                    <th>分类</th>
                    <th>等级</th>
                    <th>单条报价</th>
                    <th>合作次数</th>
                    <th>状态</th>
                    <th>Pipeline</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {influencers.map(inf => (
                    <tr key={inf.id}>
                      <td>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                          onClick={() => navigate(`/influencers/${inf.id}`)}
                        >
                          <div className="avatar">
                            {inf.name?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500' }}>{inf.name}</div>
                            {inf.account_id && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                @{inf.account_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><span className="tag tag-primary">{inf.platform}</span></td>
                      <td>{formatNumber(inf.followers)}</td>
                      <td>{inf.category?.name || '-'}</td>
                      <td>{getTierBadge(inf.tier)}</td>
                      <td>¥{parseFloat(inf.cost_per_post).toLocaleString()}</td>
                      <td>{inf.collaboration_count}</td>
                      <td>{getStatusTag(inf.status)}</td>
                      <td>{getPipelineBadge(inf) || <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>未跟进</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/influencers/${inf.id}`)}
                          >
                            查看
                          </button>
                          {canEdit && (
                            <>
                              {!pipelineStatusMap[inf.id]?.in_pipeline && inf.status === 'active' ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOpenAddPipeline(inf)}
                                >
                                  📊 纳入跟进
                                </button>
                              ) : pipelineStatusMap[inf.id]?.in_pipeline ? (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#3b82f6' }}
                                  onClick={() => navigate('/pipeline')}
                                >
                                  查看 Pipeline →
                                </button>
                              ) : null}
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEditModal(inf.id)}
                              >
                                编辑
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--error-color)' }}
                                onClick={() => setDeleteId(inf.id)}
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setTierDropdownOpen(false); }}
        title={editingId ? '编辑Influencer' : '添加Influencer'}
        size="large"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowModal(false); setTierDropdownOpen(false); }}>取消</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">名称 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">平台 *</label>
            <select
              className="form-select"
              value={formData.platform || ''}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            >
              {platforms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {formErrors.platform && <div className="form-error">{formErrors.platform}</div>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">账号ID</label>
            <input
              type="text"
              className="form-input"
              value={formData.account_id || ''}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">分类</label>
            <select
              className="form-select"
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">请选择分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">达人等级</label>
            <div ref={tierDropdownRef} style={{ position: 'relative' }}>
              <div
                className="form-input"
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  minHeight: '36px'
                }}
                onClick={() => setTierDropdownOpen(!tierDropdownOpen)}
              >
                {formData.tier_id ? (
                  (() => {
                    const selectedTier = tiers.find(t => t.id === parseInt(formData.tier_id));
                    if (!selectedTier) return <span style={{ color: 'var(--text-tertiary)' }}>未分级</span>;
                    return (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: selectedTier.color + '18',
                        color: selectedTier.color,
                        border: `1px solid ${selectedTier.color}40`
                      }}>
                        <span style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: selectedTier.color 
                        }} />
                        {selectedTier.name}
                      </span>
                    );
                  })()
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>未分级</span>
                )}
                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>▼</span>
              </div>
              
              {tierDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                  overflow: 'hidden'
                }}>
                  <div
                    onClick={() => {
                      setFormData({ ...formData, tier_id: '' });
                      setTierDropdownOpen(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: !formData.tier_id ? 'var(--primary-color)' : 'var(--text-primary)',
                      backgroundColor: !formData.tier_id ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: tiers.length > 0 ? '1px solid var(--border-light)' : 'none'
                    }}
                  >
                    <span style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--border-color)' 
                    }} />
                    未分级
                  </div>
                  {tiers.map(tier => (
                    <div
                      key={tier.id}
                      onClick={() => {
                        setFormData({ ...formData, tier_id: tier.id.toString() });
                        setTierDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontSize: '14px',
                        color: formData.tier_id == tier.id ? tier.color : 'var(--text-primary)',
                        backgroundColor: formData.tier_id == tier.id ? tier.color + '10' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (formData.tier_id != tier.id) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.tier_id != tier.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: tier.color 
                        }} />
                        <span style={{ fontWeight: formData.tier_id == tier.id ? '600' : '400' }}>
                          {tier.name}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '10px'
                      }}>
                        {tier.max_followers === 0 
                          ? `${(tier.min_followers / 10000).toFixed(0)}万+`
                          : tier.min_followers === 0
                            ? `0-${(tier.max_followers / 10000).toFixed(0)}万`
                            : `${(tier.min_followers / 10000).toFixed(0)}-${(tier.max_followers / 10000).toFixed(0)}万`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">粉丝数</label>
            <input
              type="number"
              className="form-input"
              value={formData.followers || 0}
              onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              单条报价 (元)
              {editingId && originalCostPerPost !== null &&
                parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost) && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#fa8c16',
                  fontWeight: '500'
                }}>
                  ⚠️ 已变动（原价 ¥{parseFloat(originalCostPerPost).toLocaleString()}）
                </span>
              )}
            </label>
            <input
              type="number"
              className="form-input"
              style={{
                borderColor: editingId && originalCostPerPost !== null &&
                  parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost)
                  ? '#fa8c16'
                  : undefined
              }}
              value={formData.cost_per_post || 0}
              onChange={(e) => setFormData({ ...formData, cost_per_post: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">互动率 (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.engagement_rate || 0}
              onChange={(e) => setFormData({ ...formData, engagement_rate: e.target.value })}
            />
          </div>
        </div>

        {editingId && (
          <div className="form-group">
            <label className="form-label">
            {originalCostPerPost !== null &&
              parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost) ? (
              <span style={{ color: '#fa8c16', fontWeight: '500' }}>
            变更原因 *
            </span>
          ) : (
              '变更原因'
            )}
          </label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder={
                originalCostPerPost !== null &&
                  parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost)
                  ? '请填写本次调价的背景/原因，将记录在报价历史中'
                  : '报价未变动，无需填写'
              }
              value={formData.change_reason || ''}
              onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })}
              disabled={
                originalCostPerPost !== null &&
                  parseFloat(formData.cost_per_post) === parseFloat(originalCostPerPost)
              }
              style={{
                opacity:
                  originalCostPerPost !== null &&
                    parseFloat(formData.cost_per_post) === parseFloat(originalCostPerPost)
                    ? 0.5
                    : undefined
              }}
            />
            {originalCostPerPost !== null &&
              parseFloat(formData.cost_per_post) !== parseFloat(originalCostPerPost) &&
              !formData.change_reason?.trim() && (
                <div style={{
                  fontSize: '12px',
                  color: '#fa8c16',
                  marginTop: '4px'
                }}>
                  建议填写，便于后续议价/续约时查阅报价依据
                </div>
              )}
          </div>
        )}
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">联系人</label>
            <input
              type="text"
              className="form-input"
              value={formData.contact_name || ''}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">联系电话</label>
            <input
              type="text"
              className="form-input"
              value={formData.contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
            {formErrors.contact_phone && <div className="form-error">{formErrors.contact_phone}</div>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">联系邮箱</label>
            <input
              type="email"
              className="form-input"
              value={formData.contact_email || ''}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
            {formErrors.contact_email && <div className="form-error">{formErrors.contact_email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">微信号</label>
            <input
              type="text"
              className="form-input"
              value={formData.contact_wechat || ''}
              onChange={(e) => setFormData({ ...formData, contact_wechat: e.target.value })}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">标签</label>
          <input
            type="text"
            className="form-input"
            placeholder="多个标签用逗号分隔"
            value={formData.tags || ''}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">状态</label>
          <select
            className="form-select"
            value={formData.status || 'active'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">活跃</option>
            <option value="inactive">暂停</option>
            <option value="blacklisted">黑名单</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个Influencer吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />

      {/* Add to Pipeline Modal */}
      <Modal
        isOpen={pipelineModalOpen}
        onClose={handleClosePipelineModal}
        title="📊 纳入跟进 Pipeline"
        size="medium"
        footer={
          <>
            <button className="btn btn-ghost" onClick={handleClosePipelineModal}>取消</button>
            <button
              className="btn btn-primary"
              onClick={handleAddToPipeline}
              disabled={pipelineSaving || !canEdit}
            >
              {pipelineSaving ? '添加中...' : '➕ 加入 Pipeline'}
            </button>
          </>
        }
      >
        {selectedInfForPipeline && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              background: 'var(--bg-tertiary)',
              borderRadius: '10px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), #4fc3f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: '20px',
                flexShrink: 0
              }}>
                {selectedInfForPipeline.name?.[0] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                  {selectedInfForPipeline.name}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span className="tag tag-primary">{selectedInfForPipeline.platform}</span>
                  <span>粉丝 {formatNumber(selectedInfForPipeline.followers)}</span>
                  <span>¥{parseFloat(selectedInfForPipeline.cost_per_post).toLocaleString()}/条</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div className="form-group">
                <label className="form-label">初始阶段</label>
                <select
                  className="form-select"
                  value={addPipelineStage}
                  onChange={(e) => setAddPipelineStage(e.target.value)}
                >
                  <option value="to_contact">📋 待联系</option>
                  <option value="communicating">💬 沟通中</option>
                  <option value="quote_confirmed">💰 报价确认</option>
                  <option value="signed">✅ 已签约</option>
                  <option value="abandoned">❌ 已放弃</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">负责人</label>
                <select
                  className="form-select"
                  value={addPipelineOwnerId}
                  onChange={(e) => setAddPipelineOwnerId(e.target.value)}
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
                rows={4}
                placeholder="记录合作意向、关注点、初步报价等..."
                value={addPipelineNotes}
                onChange={(e) => setAddPipelineNotes(e.target.value)}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default InfluencerList;
