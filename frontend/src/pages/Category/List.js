import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../../api';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const CategoryList = () => {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getList();
      // Sort by sort_order
      const sorted = data.sort((a, b) => a.sort_order - b.sort_order);
      setCategories(sorted);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      sort_order: 0
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order || 0
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = '请输入分类名称';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const submitData = {
        ...formData,
        sort_order: parseInt(formData.sort_order) || 0
      };
      
      if (editingId) {
        await categoriesApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await categoriesApi.create(submitData);
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
      await categoriesApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">分类管理</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + 添加分类
        </button>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <div className="empty-title">暂无分类</div>
              <div className="empty-description">点击添加按钮创建第一个分类</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th width="80">排序</th>
                    <th>名称</th>
                    <th>描述</th>
                    <th width="150">相关Influencer</th>
                    <th width="150">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '2px 8px', 
                          background: 'var(--bg-tertiary)', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {cat.sort_order}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{cat.name}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {cat.description || '-'}
                      </td>
                      <td>{cat.influencers_count || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(cat)}
                          >
                            编辑
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error-color)' }}
                            onClick={() => setDeleteId(cat.id)}
                            disabled={cat.influencers_count > 0}
                            title={cat.influencers_count > 0 ? "无法删除：该分类下有Influencer" : "删除"}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑分类' : '添加分类'}
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
          <label className="form-label">分类名称 *</label>
          <input
            type="text"
            className="form-input"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          {formErrors.name && <div className="form-error">{formErrors.name}</div>}
        </div>
        
        <div className="form-group">
          <label className="form-label">描述</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">排序值 (越小越靠前)</label>
          <input
            type="number"
            className="form-input"
            value={formData.sort_order || 0}
            onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个分类吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default CategoryList;
