import React, { useState, useEffect } from 'react';
import { deliverablesApi } from '../api';
import { useAuth, isOperator } from '../contexts/AuthContext';
import { showToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';

const DeliverableDrawer = ({ isOpen, onClose, collaborationId, collaborationName }) => {
  const { user } = useAuth();
  const canEdit = isOperator(user);

  const [loading, setLoading] = useState(false);
  const [deliverables, setDeliverables] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [reviewStatuses, setReviewStatuses] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && collaborationId) {
      fetchOptions();
      fetchDeliverables();
    }
  }, [isOpen, collaborationId]);

  const fetchOptions = async () => {
    try {
      const [p, r] = await Promise.all([
        deliverablesApi.getPlatforms(),
        deliverablesApi.getReviewStatuses()
      ]);
      setPlatforms(p);
      setReviewStatuses(r);
    } catch (error) {}
  };

  const fetchDeliverables = async () => {
    try {
      setLoading(true);
      const data = await deliverablesApi.getList({ collaboration_id: collaborationId });
      setDeliverables(data.items);
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      collaboration_id: collaborationId,
      platform: '',
      content_link: '',
      published_at: '',
      review_status: 'pending',
      notes: ''
    });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setFormData({
      platform: item.platform || '',
      content_link: item.content_link || '',
      published_at: item.published_at ? item.published_at.slice(0, 16) : '',
      review_status: item.review_status || 'pending',
      notes: item.notes || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const submitData = { ...formData };
      if (!submitData.published_at) submitData.published_at = null;

      if (editingId) {
        await deliverablesApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await deliverablesApi.create(submitData);
        showToast('success', '创建成功');
      }

      setShowForm(false);
      fetchDeliverables();
    } catch (error) {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deliverablesApi.delete(deleteId);
      showToast('success', '已删除');
      setDeleteId(null);
      fetchDeliverables();
    } catch (error) {} finally {
      setDeleting(false);
    }
  };

  const getReviewStatusTag = (status) => {
    const map = {
      pending: { label: '待审', className: 'tag-warning' },
      approved: { label: '已通过', className: 'tag-success' },
      rejected: { label: '已驳回', className: 'tag-error' }
    };
    const config = map[status] || { label: status, className: 'tag-gray' };
    return <span className={`tag ${config.className}`}>{config.label}</span>;
  };

  const getTimelineDotClass = (status) => {
    const map = {
      pending: 'timeline-dot-warning',
      approved: 'timeline-dot-success',
      rejected: 'timeline-dot-error'
    };
    return map[status] || 'timeline-dot-gray';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <h3 className="drawer-title">内容交付物</h3>
            <div className="drawer-subtitle">{collaborationName}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {canEdit && (
            <div style={{ marginBottom: '20px' }}>
              <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
                + 添加交付物
              </button>
            </div>
          )}

          {showForm && (
            <div className="deliverable-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">发布平台</label>
                  <select
                    className="form-select"
                    value={formData.platform || ''}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  >
                    <option value="">请选择平台</option>
                    {platforms.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">审核状态</label>
                  <select
                    className="form-select"
                    value={formData.review_status || 'pending'}
                    onChange={(e) => setFormData({ ...formData, review_status: e.target.value })}
                  >
                    {reviewStatuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">内容链接</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://..."
                  value={formData.content_link || ''}
                  onChange={(e) => setFormData({ ...formData, content_link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">上线时间</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.published_at || ''}
                  onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>取消</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : deliverables.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无交付物</div>
              <div className="empty-description">点击上方按钮添加内容交付记录</div>
            </div>
          ) : (
            <div className="timeline">
              {deliverables.map(item => (
                <div className="timeline-item" key={item.id}>
                  <div className={`timeline-dot ${getTimelineDotClass(item.review_status)}`} />
                  <div className="timeline-content">
                    <div className="timeline-card">
                      <div className="timeline-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.platform && <span className="tag tag-primary">{item.platform}</span>}
                          {getReviewStatusTag(item.review_status)}
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditForm(item)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error-color)' }}
                              onClick={() => setDeleteId(item.id)}
                            >
                              移除
                            </button>
                          </div>
                        )}
                      </div>

                      {item.content_link && (
                        <div className="timeline-card-link">
                          <a href={item.content_link} target="_blank" rel="noopener noreferrer">
                            {item.content_link.length > 50 ? item.content_link.slice(0, 50) + '...' : item.content_link}
                          </a>
                        </div>
                      )}

                      <div className="timeline-card-meta">
                        <span>上线: {formatDate(item.published_at)}</span>
                        <span>记录: {formatDate(item.created_at)}</span>
                      </div>

                      {item.notes && (
                        <div className="timeline-card-notes">{item.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <div className="drawer-stats">
            共 {deliverables.length} 条交付物
            {deliverables.filter(d => d.review_status === 'pending').length > 0 && (
              <span className="tag tag-warning" style={{ marginLeft: '8px' }}>
                {deliverables.filter(d => d.review_status === 'pending').length} 条待审
              </span>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>关闭</button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="移除确认"
        message="确定要移除这条交付物记录吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </>
  );
};

export default DeliverableDrawer;
