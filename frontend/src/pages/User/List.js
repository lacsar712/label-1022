import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const UserList = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [roles, setRoles] = useState([]);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Delete
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRoles();
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
      status: user.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update role
      if (formData.role_id) {
        await usersApi.updateRole(editingId, { role_id: parseInt(formData.role_id) });
      }
      
      // Update status
      if (formData.status) {
        await usersApi.updateStatus(editingId, { status: formData.status });
      }
      
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

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  };

  const getRoleLabel = (roleName) => {
    switch (roleName) {
      case 'admin': return '管理员';
      case 'operator': return '运营人员';
      case 'user': return '普通用户';
      default: return roleName;
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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">用户管理</h2>
      </div>

      {/* List */}
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
                        <span className="tag tag-primary">
                          {getRoleLabel(user.role?.name)}
                        </span>
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

      {/* Edit Modal */}
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

      {/* Delete Confirm */}
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
