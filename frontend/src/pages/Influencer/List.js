import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { influencersApi, categoriesApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const InfluencerList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = isOperator(user);

  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Filters
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  
  // Options
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  
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
      if (platform) params.platform = platform;
      if (categoryId) params.category_id = categoryId;
      if (status) params.status = status;
      
      const data = await influencersApi.getList(params);
      setInfluencers(data.items);
      setTotal(data.total);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, platform, categoryId, status]);

  const fetchOptions = async () => {
    try {
      const [platformsRes, categoriesRes] = await Promise.all([
        influencersApi.getPlatforms(),
        categoriesApi.getList()
      ]);
      setPlatforms(platformsRes);
      setCategories(categoriesRes);
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

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setPlatform('');
    setCategoryId('');
    setStatus('');
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      platform: '抖音',
      account_id: '',
      followers: 0,
      category_id: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      contact_wechat: '',
      tags: '',
      cost_per_post: 0,
      engagement_rate: 0,
      status: 'active',
      notes: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (id) => {
    try {
      const data = await influencersApi.getById(id);
      setEditingId(id);
      setFormData({
        name: data.name || '',
        platform: data.platform || '抖音',
        account_id: data.account_id || '',
        followers: data.followers || 0,
        category_id: data.category_id || '',
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        contact_wechat: data.contact_wechat || '',
        tags: data.tags || '',
        cost_per_post: data.cost_per_post || 0,
        engagement_rate: data.engagement_rate || 0,
        status: data.status || 'active',
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
        followers: parseInt(formData.followers) || 0,
        cost_per_post: parseFloat(formData.cost_per_post) || 0,
        engagement_rate: parseFloat(formData.engagement_rate) || 0
      };
      
      if (editingId) {
        await influencersApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await influencersApi.create(submitData);
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
                    <th>单条报价</th>
                    <th>合作次数</th>
                    <th>状态</th>
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
                      <td>¥{parseFloat(inf.cost_per_post).toLocaleString()}</td>
                      <td>{inf.collaboration_count}</td>
                      <td>{getStatusTag(inf.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/influencers/${inf.id}`)}
                          >
                            查看
                          </button>
                          {canEdit && (
                            <>
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
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑Influencer' : '添加Influencer'}
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
            <label className="form-label">粉丝数</label>
            <input
              type="number"
              className="form-input"
              value={formData.followers || 0}
              onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">单条报价 (元)</label>
            <input
              type="number"
              className="form-input"
              value={formData.cost_per_post || 0}
              onChange={(e) => setFormData({ ...formData, cost_per_post: e.target.value })}
            />
          </div>
        </div>
        
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
    </div>
  );
};

export default InfluencerList;
