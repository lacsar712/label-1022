import React, { useState, useEffect, useCallback } from 'react';
import { tiersApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const TierList = () => {
  const { user } = useAuth();
  const canEdit = user?.role?.name === 'admin' || user?.role?.name === 'operator';

  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tiersApi.getList();
      const sorted = data.sort((a, b) => a.sort_order - b.sort_order);
      setTiers(sorted);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(0) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const getFollowersRange = (tier) => {
    if (tier.max_followers === 0) {
      return `${formatNumber(tier.min_followers)} 以上`;
    }
    if (tier.min_followers === 0) {
      return `${formatNumber(tier.max_followers)} 以下`;
    }
    return `${formatNumber(tier.min_followers)} - ${formatNumber(tier.max_followers)}`;
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      color: '#1890ff',
      min_followers: 0,
      max_followers: 0,
      sort_order: tiers.length + 1,
      description: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (tier) => {
    setEditingId(tier.id);
    setFormData({
      name: tier.name,
      color: tier.color,
      min_followers: tier.min_followers,
      max_followers: tier.max_followers,
      sort_order: tier.sort_order,
      description: tier.description || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = '请输入等级名称';
    if (!formData.color) errors.color = '请选择颜色';
    if (formData.min_followers < 0) errors.min_followers = '最小粉丝数不能为负';
    if (formData.max_followers < 0) errors.max_followers = '最大粉丝数不能为负';
    if (formData.max_followers > 0 && formData.min_followers >= formData.max_followers) {
      errors.max_followers = '最大粉丝数必须大于最小粉丝数';
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
        min_followers: parseInt(formData.min_followers) || 0,
        max_followers: parseInt(formData.max_followers) || 0,
        sort_order: parseInt(formData.sort_order) || 0
      };
      
      if (editingId) {
        await tiersApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await tiersApi.create(submitData);
        showToast('success', '创建成功');
      }
      
      setShowModal(false);
      fetchData();
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await tiersApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const newTiers = [...tiers];
    const temp = { ...newTiers[index] };
    newTiers[index] = { ...newTiers[index - 1] };
    newTiers[index - 1] = temp;
    
    const orders = {};
    newTiers.forEach((tier, i) => {
      orders[tier.id] = i + 1;
    });
    
    try {
      await tiersApi.reorder(orders);
      const sorted = newTiers.map((tier, i) => ({ ...tier, sort_order: i + 1 }));
      setTiers(sorted);
      showToast('success', '排序已更新');
    } catch (error) {
    }
  };

  const handleMoveDown = async (index) => {
    if (index === tiers.length - 1) return;
    const newTiers = [...tiers];
    const temp = { ...newTiers[index] };
    newTiers[index] = { ...newTiers[index + 1] };
    newTiers[index + 1] = temp;
    
    const orders = {};
    newTiers.forEach((tier, i) => {
      orders[tier.id] = i + 1;
    });
    
    try {
      await tiersApi.reorder(orders);
      const sorted = newTiers.map((tier, i) => ({ ...tier, sort_order: i + 1 }));
      setTiers(sorted);
      showToast('success', '排序已更新');
    } catch (error) {
    }
  };

  const colorPresets = [
    '#f5222d', '#fa8c16', '#faad14', '#52c41a',
    '#13c2c2', '#1890ff', '#722ed1', '#eb2f96'
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">达人等级管理</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 添加等级
          </button>
        )}
      </div>

      <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
        提示：拖拽或使用上下箭头调整等级顺序，等级将按此顺序在达人列表中展示
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body">
            <div className="loading">
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      ) : tiers.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <div className="empty-title">暂无等级</div>
              <div className="empty-description">点击添加按钮创建第一个达人等级</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {tiers.map((tier, index) => (
            <div 
              key={tier.id} 
              className="card tier-card"
              style={{ 
                borderLeft: `4px solid ${tier.color}`,
                position: 'relative'
              }}
            >
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: tier.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}
                    >
                      {tier.name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {tier.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        排序: {tier.sort_order}
                      </div>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                        onClick={() => handleMoveDown(index)}
                        disabled={index === tiers.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: tier.color + '15',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: tier.color, fontWeight: '500' }}>
                    📊 粉丝数区间
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: tier.color, marginTop: '4px' }}>
                    {getFollowersRange(tier)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>达人数量:</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {tier.influencer_count || 0}
                  </span>
                </div>

                {tier.description && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    lineHeight: '1.5'
                  }}>
                    {tier.description}
                  </div>
                )}

                {canEdit && (
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => openEditModal(tier)}
                    >
                      编辑
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, color: 'var(--error-color)' }}
                      onClick={() => setDeleteId(tier.id)}
                      disabled={tier.influencer_count > 0}
                      title={tier.influencer_count > 0 ? '该等级下有达人，无法删除' : '删除'}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑等级' : '添加等级'}
        size="medium"
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
          <label className="form-label">等级名称 *</label>
          <input
            type="text"
            className="form-input"
            placeholder="如：头部达人、腰部达人"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          {formErrors.name && <div className="form-error">{formErrors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">展示颜色 *</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="color"
              style={{ 
                width: '40px', 
                height: '36px', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '2px'
              }}
              value={formData.color || '#1890ff'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="#1890ff"
              value={formData.color || ''}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {colorPresets.map(color => (
              <div
                key={color}
                onClick={() => setFormData({ ...formData, color })}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: formData.color === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                  boxSizing: 'border-box'
                }}
              />
            ))}
          </div>
          {formErrors.color && <div className="form-error">{formErrors.color}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">最小粉丝数</label>
            <input
              type="number"
              className="form-input"
              value={formData.min_followers || 0}
              onChange={(e) => setFormData({ ...formData, min_followers: e.target.value })}
            />
            {formErrors.min_followers && <div className="form-error">{formErrors.min_followers}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">最大粉丝数</label>
            <input
              type="number"
              className="form-input"
              value={formData.max_followers || 0}
              onChange={(e) => setFormData({ ...formData, max_followers: e.target.value })}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              设为 0 表示不设上限
            </div>
            {formErrors.max_followers && <div className="form-error">{formErrors.max_followers}</div>}
          </div>
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

        <div className="form-group">
          <label className="form-label">等级描述</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            placeholder="简单描述这个等级的特点..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个等级吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TierList;
