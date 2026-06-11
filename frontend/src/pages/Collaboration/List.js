import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collaborationsApi, influencersApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const CollaborationList = () => {
  const { user } = useAuth();
  const canEdit = isOperator(user);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (contentType) params.content_type = contentType;
      if (influencerId) params.influencer_id = influencerId;
      
      const data = await collaborationsApi.getList(params);
      setCollaborations(data.items);
      setTotal(data.total);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, status, contentType, influencerId]);

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
                        <div style={{ display: 'flex', gap: '8px' }}>
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
    </div>
  );
};

export default CollaborationList;
