import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collaborationsApi, influencersApi, brandsApi } from '../../api';
import { useAuth, isOperator, isAdmin } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import DeliverableDrawer from '../../components/DeliverableDrawer';

const CollaborationList = () => {
  const { user } = useAuth();
  const canEdit = isOperator(user);
  const canManageBrands = isAdmin(user) || isOperator(user);
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Filters
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [contentType, setContentType] = useState('');
  const [influencerId, setInfluencerId] = useState('');
  
  // Options
  const [statuses, setStatuses] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Delete
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Deliverable Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCollabId, setDrawerCollabId] = useState(null);
  const [drawerCollabName, setDrawerCollabName] = useState('');

  // Filter: has pending deliverables
  const [hasPending, setHasPending] = useState(false);

  const [showBrandAuthModal, setShowBrandAuthModal] = useState(false);
  const [authCollabId, setAuthCollabId] = useState(null);
  const [authCollabName, setAuthCollabName] = useState('');
  const [brandAuthLoading, setBrandAuthLoading] = useState(false);
  const [brandAuthSaving, setBrandAuthSaving] = useState(false);
  const [allBrands, setAllBrands] = useState([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [collabBrandAuths, setCollabBrandAuths] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (contentType) params.content_type = contentType;
      if (influencerId) params.influencer_id = influencerId;
      if (hasPending) params.has_pending = true;
      
      const data = await collaborationsApi.getList(params);
      setCollaborations(data.items);
      setTotal(data.total);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, status, contentType, influencerId, hasPending]);

  const fetchOptions = async () => {
    try {
      const [statusesRes, contentTypesRes, influencersRes] = await Promise.all([
        collaborationsApi.getStatuses(),
        collaborationsApi.getContentTypes(),
        influencersApi.getList({ page_size: 100 }) // Get top 100 for selection
      ]);
      setStatuses(statusesRes);
      setContentTypes(contentTypesRes);
      setInfluencers(influencersRes.items);
    } catch (error) {
      // Handled by interceptor
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle navigation state (from Influencer Detail page)
  useEffect(() => {
    if (location.state?.openNewModal && location.state?.preSelectedInfluencer) {
      const inf = location.state.preSelectedInfluencer;
      openCreateModalWithInfluencer(inf);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setStatus('');
    setContentType('');
    setInfluencerId('');
    setHasPending(false);
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      influencer_id: '',
      project_name: '',
      status: 'pending',
      start_date: '',
      end_date: '',
      budget: 0,
      actual_cost: 0,
      content_type: '',
      content_requirements: '',
      deliverables: '',
      notes: ''
    });
    setFormErrors({});
    setShowModal(true);
  };
  
  // Open create modal with pre-selected influencer (from Influencer Detail page)
  const openCreateModalWithInfluencer = (influencer) => {
    setEditingId(null);
    setFormData({
      influencer_id: influencer.id,
      project_name: '',
      status: 'pending',
      start_date: '',
      end_date: '',
      budget: influencer.cost_per_post || 0,
      actual_cost: 0,
      content_type: '',
      content_requirements: '',
      deliverables: '',
      notes: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (id) => {
    try {
      const data = await collaborationsApi.getById(id);
      setEditingId(id);
      setFormData({
        influencer_id: data.influencer_id,
        project_name: data.project_name || '',
        status: data.status || 'pending',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        budget: data.budget || 0,
        actual_cost: data.actual_cost || 0,
        content_type: data.content_type || '',
        content_requirements: data.content_requirements || '',
        deliverables: data.deliverables || '',
        views: data.views || 0,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        notes: data.notes || ''
      });
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      // Handled by interceptor
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.influencer_id) errors.influencer_id = '请选择Influencer';
    if (!formData.project_name?.trim()) errors.project_name = '请输入项目名称';
    if (!formData.status) errors.status = '请选择状态';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const submitData = {
        ...formData,
        influencer_id: parseInt(formData.influencer_id),
        budget: parseFloat(formData.budget) || 0,
        actual_cost: parseFloat(formData.actual_cost) || 0,
        views: parseInt(formData.views) || 0,
        likes: parseInt(formData.likes) || 0,
        comments: parseInt(formData.comments) || 0,
        shares: parseInt(formData.shares) || 0
      };
      
      // Handle empty dates
      if (!submitData.start_date) submitData.start_date = null;
      if (!submitData.end_date) submitData.end_date = null;
      
      if (editingId) {
        await collaborationsApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await collaborationsApi.create(submitData);
        showToast('success', '创建成功');
      }
      
      setShowModal(false);
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
      await collaborationsApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  const openBrandAuthModal = async (collab) => {
    setAuthCollabId(collab.id);
    setAuthCollabName(collab.project_name);
    setShowBrandAuthModal(true);
    setBrandAuthLoading(true);
    try {
      const [brandsRes] = await Promise.all([
        brandsApi.getList({ page_size: 200 })
      ]);
      const brands = brandsRes.items || [];
      setAllBrands(brands);

      const brandAuthorizations = [];
      for (const b of brands) {
        try {
          const auths = await brandsApi.getAuthorizations(b.id);
          const arr = Array.isArray(auths) ? auths : auths.items || [];
          const match = arr.find(a => a.collaboration_id === collab.id);
          if (match) {
            brandAuthorizations.push(match);
          }
        } catch (e) { /* ignore individual brand errors */ }
      }
      setCollabBrandAuths(brandAuthorizations);
      setSelectedBrandIds(brandAuthorizations.map(a => a.brand_id));
    } finally {
      setBrandAuthLoading(false);
    }
  };

  const toggleBrandId = (id) => {
    setSelectedBrandIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveBrandAuthorizations = async () => {
    try {
      setBrandAuthSaving(true);
      const existingBrandIds = collabBrandAuths.map(a => a.brand_id);
      const toAdd = selectedBrandIds.filter(id => !existingBrandIds.includes(id));
      const toRemove = collabBrandAuths.filter(a => !selectedBrandIds.includes(a.brand_id));

      for (const brandId of toAdd) {
        await brandsApi.createAuthorizations(brandId, { collaboration_ids: [authCollabId] });
      }
      for (const auth of toRemove) {
        await brandsApi.deleteAuthorization(auth.brand_id, auth.id);
      }
      showToast('success', `品牌授权已更新：新增 ${toAdd.length} 个品牌，撤销 ${toRemove.length} 个品牌`);
      setShowBrandAuthModal(false);
      fetchData();
    } finally {
      setBrandAuthSaving(false);
    }
  };

  const formatMoney = (num) => {
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

  const openDeliverableDrawer = (collabId, collabName) => {
    setDrawerCollabId(collabId);
    setDrawerCollabName(collabName);
    setDrawerOpen(true);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">合作管理</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 新建合作
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
                placeholder="搜索项目名称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <select 
              className="form-select" 
              style={{ width: '160px' }}
              value={influencerId}
              onChange={(e) => setInfluencerId(e.target.value)}
            >
              <option value="">全部Influencer</option>
              {influencers.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '140px' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '140px' }}
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="">全部类型</option>
              {contentTypes.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            
            <button className="btn btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
            <label className="filter-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={hasPending}
                onChange={(e) => {
                  setHasPending(e.target.checked);
                  setPage(1);
                }}
              />
              仍有待审内容
            </label>
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
          ) : collaborations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤝</div>
              <div className="empty-title">暂无数据</div>
              <div className="empty-description">还没有合作记录，点击按钮创建</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>项目名称</th>
                    <th>Influencer</th>
                    <th>状态</th>
                    <th>内容类型</th>
                    <th>预算/花费</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborations.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{item.project_name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">
                            {item.influencer?.name?.[0]}
                          </div>
                          <span>{item.influencer?.name}</span>
                        </div>
                      </td>
                      <td>{getStatusTag(item.status)}</td>
                      <td>{item.content_type || '-'}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <div>预: {formatMoney(item.budget)}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>实: {formatMoney(item.actual_cost)}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div>始: {item.start_date || '-'}</div>
                          <div>终: {item.end_date || '-'}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {canManageBrands && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--primary-color)' }}
                              onClick={() => openBrandAuthModal(item)}
                              title="配置哪些品牌可以看到这个合作"
                            >
                              品牌授权
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openDeliverableDrawer(item.id, item.project_name)}
                          >
                            交付物
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(item.id)}
                            disabled={!canEdit && user.id !== item.user_id}
                          >
                            {canEdit || user.id === item.user_id ? '编辑' : '查看'}
                          </button>
                          {canEdit && (
                            <button 
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error-color)' }}
                              onClick={() => setDeleteId(item.id)}
                            >
                              删除
                            </button>
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
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑合作' : '新建合作'}
        size="large"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">项目名称 *</label>
          <input
            type="text"
            className="form-input"
            value={formData.project_name || ''}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
          />
          {formErrors.project_name && <div className="form-error">{formErrors.project_name}</div>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Influencer *</label>
            <select
              className="form-select"
              value={formData.influencer_id || ''}
              onChange={(e) => setFormData({ ...formData, influencer_id: e.target.value })}
            >
              <option value="">请选择Influencer</option>
              {influencers.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.platform})</option>
              ))}
            </select>
            {formErrors.influencer_id && <div className="form-error">{formErrors.influencer_id}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">状态 *</label>
            <select
              className="form-select"
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {formErrors.status && <div className="form-error">{formErrors.status}</div>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">预算 (元)</label>
            <input
              type="number"
              className="form-input"
              value={formData.budget || 0}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">实际支出 (元)</label>
            <input
              type="number"
              className="form-input"
              value={formData.actual_cost || 0}
              onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">开始日期</label>
            <input
              type="date"
              className="form-input"
              value={formData.start_date || ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">结束日期</label>
            <input
              type="date"
              className="form-input"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">内容类型</label>
            <select
              className="form-select"
              value={formData.content_type || ''}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
            >
              <option value="">请选择类型</option>
              {contentTypes.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">内容要求</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            value={formData.content_requirements || ''}
            onChange={(e) => setFormData({ ...formData, content_requirements: e.target.value })}
          />
        </div>

        {editingId && (
          <>
            <div style={{ margin: '20px 0 16px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              数据表现
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">浏览量/播放量</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.views || 0}
                  onChange={(e) => setFormData({ ...formData, views: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">点赞数</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.likes || 0}
                  onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">评论数</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.comments || 0}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">分享数</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.shares || 0}
                  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                />
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个合作记录吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />

      {/* Deliverable Drawer */}
      <DeliverableDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        collaborationId={drawerCollabId}
        collaborationName={drawerCollabName}
      />

      {/* Brand Authorization Modal */}
      <Modal
        isOpen={showBrandAuthModal}
        onClose={() => setShowBrandAuthModal(false)}
        title={`🏢 品牌可见性配置 - ${authCollabName}`}
        size="large"
        footer={<>
          <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '13px' }}>
            已勾选 {selectedBrandIds.length} 个品牌
          </div>
          <button className="btn btn-secondary" onClick={() => setShowBrandAuthModal(false)}>取消</button>
          <button
            className="btn btn-primary"
            onClick={saveBrandAuthorizations}
            disabled={brandAuthLoading || brandAuthSaving}
          >
            {brandAuthSaving ? '保存中...' : '保存授权'}
          </button>
        </>}
      >
        <div style={{
          padding: '12px',
          background: 'linear-gradient(135deg, var(--primary-bg), var(--bg-secondary))',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          💡 勾选下方品牌，表示这些品牌方用户在其门户中可以查看本合作的进度、预算和效果数据。取消勾选即撤销该品牌的可见权限。
        </div>

        {brandAuthLoading ? (
          <div className="loading" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          allBrands.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' }}>
              暂无品牌数据，请先在「系统管理 → 品牌方管理」中创建品牌
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
              maxHeight: '50vh',
              overflowY: 'auto',
              padding: '4px'
            }}>
              {allBrands.map(b => {
                const checked = selectedBrandIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px',
                      border: '1px solid',
                      borderColor: checked ? 'var(--primary-color)' : 'var(--border-color)',
                      background: checked ? 'var(--primary-bg)' : 'var(--bg-primary)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ marginTop: '3px', flexShrink: 0 }}
                      checked={checked}
                      onChange={() => toggleBrandId(b.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                        🏢 {b.name}
                      </div>
                      {b.industry && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {b.industry}
                        </div>
                      )}
                      {(b.contact_name || b.contact_phone) && (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {b.contact_name && <span>{b.contact_name}</span>}
                          {b.contact_name && b.contact_phone && <span> · </span>}
                          {b.contact_phone && <span>{b.contact_phone}</span>}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default CollaborationList;
