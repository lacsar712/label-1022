import React, { useState, useEffect } from 'react';
import { usersApi, brandsApi } from '../../api';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { getRoleLabel } from '../../contexts/AuthContext';

const UserList = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [roles, setRoles] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchRoles = async () => {
    try {
      const data = await usersApi.getRoles();
      setRoles(data);
    } catch (error) {
      // Handled by interceptor
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await brandsApi.getList({ page_size: 100 });
      setBrands(data.items || []);
    } catch (error) {
      // Handled by interceptor
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getList({ page, page_size: pageSize });
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setEditingId(user.id);
    setFormData({
      role_id: user.role_id,
      status: user.status,
      brand_id: user.brand_id || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (formData.role_id) {
        await usersApi.updateRole(editingId, { role_id: parseInt(formData.role_id) });
      }
      
      if (formData.status) {
        await usersApi.updateStatus(editingId, { status: formData.status });
      }

      const isBrandRole = roles.find(r => r.id === parseInt(formData.role_id))?.name === 'brand';
      const newBrandId = isBrandRole && formData.brand_id ? parseInt(formData.brand_id) : null;
      await usersApi.updateBrand(editingId, { brand_id: newBrandId });
      
      showToast('success', '更新成功');
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
      await usersApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  const getStatusTag = (status) => {
    const map = {
      active: { label: '正常', class: 'tag-success' },
      inactive: { label: '禁用', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const selectedRoleName = formData.role_id
    ? roles.find(r => r.id === parseInt(formData.role_id))?.name
    : null;
  const showBrandField = selectedRoleName === 'brand';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">用户管理</h2>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>昵称</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>所属品牌</th>
                    <th>状态</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">
                            {user.username?.[0]}
                          </div>
                          <span>{user.username}</span>
                        </div>
                      </td>
                      <td>{user.nickname || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>
                        <span className={`tag ${user.role?.name === 'admin' ? 'tag-primary' : 'tag-gray'}`}>
                          {getRoleLabel(user.role?.name)}
                        </span>
                      </td>
                      <td>
                        {user.brand ? (
                          <span className="tag tag-secondary">🏢 {user.brand.name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                        )}
                      </td>
                      <td>{getStatusTag(user.status)}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(user)}
                          >
                            编辑
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error-color)' }}
                            onClick={() => setDeleteId(user.id)}
                            disabled={user.role?.name === 'admin'}
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="编辑用户"
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
          <label className="form-label">角色</label>
          <select
            className="form-select"
            value={formData.role_id || ''}
            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{getRoleLabel(r.name)}</option>
            ))}
          </select>
        </div>

        {showBrandField && (
          <div className="form-group">
            <label className="form-label">
              所属品牌
              <span style={{ color: 'var(--error-color)', marginLeft: '4px' }}>*</span>
            </label>
            <select
              className="form-select"
              value={formData.brand_id || ''}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
            >
              <option value="">请选择品牌</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>🏢 {b.name}</option>
              ))}
            </select>
            {brands.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--warning-color)', marginTop: '6px' }}>
                ⚠️ 暂无品牌数据，请先在品牌管理中创建品牌
              </div>
            )}
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">状态</label>
          <select
            className="form-select"
            value={formData.status || ''}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">正常</option>
            <option value="inactive">禁用</option>
          </select>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个用户吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default UserList;
