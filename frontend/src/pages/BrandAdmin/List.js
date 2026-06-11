import React, { useState, useEffect } from 'react';
import { brandsApi } from '../../api';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const BrandList = () => {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await brandsApi.getList({ page, page_size: pageSize });
      setBrands(data.items || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', industry: '', contact_name: '',
      contact_phone: '', contact_email: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setFormData({
      name: b.name || '', industry: b.industry || '',
      contact_name: b.contact_name || '', contact_phone: b.contact_phone || '',
      contact_email: b.contact_email || '', description: b.description || '',
      status: b.status || 'active'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name?.trim()) { showToast('error', '请输入品牌名称'); return; }
      if (editingId) {
        await brandsApi.update(editingId, formData);
        showToast('success', '更新成功');
      } else {
        await brandsApi.create(formData);
        showToast('success', '创建成功');
      }
      setShowModal(false); fetchData();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await brandsApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null); fetchData();
    } finally { setDeleting(false); }
  };

  const getAuthCount = (b) => b.authorization_count ?? b._count?.brand_authorizations ?? 0;

  const getStatusTag = (s) => {
    const m = { active: ['正常', 'tag-success'], inactive: ['停用', 'tag-error'] };
    const [l, c] = m[s] || [s, 'tag-gray'];
    return <span className={`tag ${c}`}>{l}</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 className="page-title">品牌方管理</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ 新增品牌</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading"><div className="spinner"></div></div> :
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>品牌名称</th><th>行业</th><th>联系人</th>
                <th>联系电话</th><th>授权战役数</th><th>状态</th>
                <th>创建时间</th><th>操作</th>
              </tr></thead>
              <tbody>
                {brands.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' }}>
                    暂无品牌，请点击右上角「新增品牌」创建
                  </td></tr>
                ) : brands.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.industry || '-'}</td>
                    <td>{b.contact_name || '-'}</td>
                    <td>{b.contact_phone || '-'}</td>
                    <td><span className="tag tag-primary">{getAuthCount(b)}</span></td>
                    <td>{getStatusTag(b.status)}</td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'}</td>
                    <td style={{ display:'flex', gap:'8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>编辑</button>
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--error-color)' }}
                        onClick={() => setDeleteId(b.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
        {total > pageSize && (
          <div style={{ padding:'16px', borderTop:'1px solid var(--border-color)' }}>
            <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingId ? '编辑品牌' : '新增品牌'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">品牌名称 <span style={{color:'var(--error-color)'}}>*</span></label>
          <input className="form-input" value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="请输入品牌名称" />
        </div>
        <div className="form-group">
          <label className="form-label">所属行业</label>
          <input className="form-input" value={formData.industry || ''}
            onChange={e => setFormData({...formData, industry: e.target.value})}
            placeholder="如：美妆、服饰、餐饮" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div className="form-group">
            <label className="form-label">联系人</label>
            <input className="form-input" value={formData.contact_name || ''}
              onChange={e => setFormData({...formData, contact_name: e.target.value})}
              placeholder="对接人姓名" />
          </div>
          <div className="form-group">
            <label className="form-label">联系电话</label>
            <input className="form-input" value={formData.contact_phone || ''}
              onChange={e => setFormData({...formData, contact_phone: e.target.value})}
              placeholder="联系电话" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">联系邮箱</label>
          <input className="form-input" type="email" value={formData.contact_email || ''}
            onChange={e => setFormData({...formData, contact_email: e.target.value})}
            placeholder="邮箱地址" />
        </div>
        <div className="form-group">
          <label className="form-label">品牌简介</label>
          <textarea className="form-input" rows={3} value={formData.description || ''}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="简要描述品牌信息" />
        </div>
        <div className="form-group">
          <label className="form-label">状态</label>
          <select className="form-select" value={formData.status || 'active'}
            onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="active">正常</option>
            <option value="inactive">停用</option>
          </select>
        </div>
        <div style={{
          padding:'12px', background:'var(--bg-secondary)', borderRadius:'8px',
          fontSize:'13px', color:'var(--text-secondary)'
        }}>
          💡 提示：创建品牌后，可在「用户管理」中为品牌方账号分配所属品牌，
          并通过「合作管理」或授权接口配置品牌可见的营销战役范围。
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} title="删除确认"
        message="确定要删除这个品牌吗？关联的用户和授权数据将被解绑。"
        type="danger" loading={deleting} />
    </div>
  );
};

export default BrandList;
