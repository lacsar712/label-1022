import React, { useState, useEffect, useCallback } from 'react';
import { brandsApi, collaborationsApi } from '../../api';
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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authBrand, setAuthBrand] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authSaving, setAuthSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [existingAuths, setExistingAuths] = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [collabTotal, setCollabTotal] = useState(0);
  const [collabPage, setCollabPage] = useState(1);
  const [collabPageSize] = useState(10);
  const [authKeyword, setAuthKeyword] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);

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

  const getCollabStatusTag = (s) => {
    const m = {
      pending: ['待开始', 'tag-gray'],
      in_progress: ['进行中', 'tag-primary'],
      completed: ['已完成', 'tag-success'],
      cancelled: ['已取消', 'tag-error']
    };
    const [l, c] = m[s] || [s, 'tag-gray'];
    return <span className={`tag ${c}`}>{l}</span>;
  };

  const openAuthModal = async (brand) => {
    setAuthBrand(brand);
    setCollabPage(1);
    setAuthKeyword('');
    setAuthStatus('');
    setSelectedIds([]);
    setExistingAuths([]);
    setAuthLoading(true);
    setShowAuthModal(true);
    try {
      if (statusOptions.length === 0) {
        const sts = await collaborationsApi.getStatuses();
        setStatusOptions(sts);
      }
      await loadAuthData(brand.id, 1);
    } finally { setAuthLoading(false); }
  };

  const loadAuthData = useCallback(async (brandId, curPage, kw='', st='') => {
    const [authsRes, collabsRes] = await Promise.all([
      brandsApi.getAuthorizations(brandId),
      collaborationsApi.getList({
        page: curPage,
        page_size: collabPageSize,
        ...(kw && { keyword: kw }),
        ...(st && { status: st })
      })
    ]);
    const auths = Array.isArray(authsRes) ? authsRes : authsRes.items || [];
    setExistingAuths(auths);
    setCollabs(collabsRes.items || []);
    setCollabTotal(collabsRes.total || 0);
    setSelectedIds(prev => {
      const newSet = new Set(auths.map(a => a.collaboration_id));
      prev.forEach(id => newSet.add(id));
      return Array.from(newSet);
    });
  }, [collabPageSize]);

  const refreshCollabs = async () => {
    setAuthLoading(true);
    try {
      await loadAuthData(authBrand.id, collabPage, authKeyword, authStatus);
    } finally { setAuthLoading(false); }
  };

  const handleAuthSearch = () => {
    setCollabPage(1);
    loadAuthData(authBrand.id, 1, authKeyword, authStatus);
  };

  const toggleId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllVisible = () => {
    const visibleIds = collabs.map(c => c.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const saveAuthorizations = async () => {
    try {
      setAuthSaving(true);
      const existingIds = existingAuths.map(a => a.collaboration_id);
      const toAdd = selectedIds.filter(id => !existingIds.includes(id));
      const toRemove = existingAuths.filter(a => !selectedIds.includes(a.collaboration_id));

      if (toAdd.length) {
        await brandsApi.createAuthorizations(authBrand.id, { collaboration_ids: toAdd });
      }
      for (const auth of toRemove) {
        await brandsApi.deleteAuthorization(authBrand.id, auth.id);
      }
      showToast('success', `授权配置已更新：新增 ${toAdd.length} 条，撤销 ${toRemove.length} 条`);
      setShowAuthModal(false);
      fetchData();
    } finally { setAuthSaving(false); }
  };

  const visibleCount = collabs.length;
  const visibleSelectedCount = collabs.filter(c => selectedIds.includes(c.id)).length;

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
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 10px' }}
                        onClick={() => openAuthModal(b)}
                      >
                        <span className="tag tag-primary" style={{ marginRight: '6px' }}>{getAuthCount(b)}</span>
                        配置授权
                      </button>
                    </td>
                    <td>{getStatusTag(b.status)}</td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'}</td>
                    <td style={{ display:'flex', gap:'8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openAuthModal(b)}>授权</button>
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
      </Modal>

      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={`🎯 授权配置 - ${authBrand?.name || ''}`}
        size="xlarge"
        footer={<>
          <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '13px' }}>
            已勾选 {selectedIds.length} 个营销战役（跨分页自动保留）
          </div>
          <button className="btn btn-secondary" onClick={refreshCollabs} disabled={authLoading || authSaving}>
            刷新
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAuthModal(false)}>
            取消
          </button>
          <button className="btn btn-primary" onClick={saveAuthorizations} disabled={authLoading || authSaving}>
            {authSaving ? '保存中...' : '保存授权'}
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
          💡 勾选下方的营销战役，代表品牌方用户可以在其门户中查看这些合作的进度、预算和效果数据（达人联系方式自动脱敏）。取消勾选即撤销该授权。
        </div>

        <div className="search-bar" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '220px' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text" className="form-input"
              placeholder="搜索项目名称..."
              value={authKeyword}
              onChange={e => setAuthKeyword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAuthSearch()}
            />
          </div>
          <select
            className="form-select" style={{ width: '140px' }}
            value={authStatus}
            onChange={e => setAuthStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleAuthSearch}>筛选</button>
          <button className="btn btn-secondary" onClick={() => {
            setAuthKeyword(''); setAuthStatus(''); setCollabPage(1);
            loadAuthData(authBrand.id, 1, '', '');
          }}>重置</button>
        </div>

        {authLoading ? (
          <div className="loading" style={{ minHeight: '300px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="table" style={{ minWidth: '700px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '48px' }}>
                    <input
                      type="checkbox"
                      checked={visibleCount > 0 && visibleCount === visibleSelectedCount}
                      onChange={toggleAllVisible}
                      title="全选本页"
                    />
                  </th>
                  <th>项目名称</th>
                  <th>Influencer</th>
                  <th>状态</th>
                  <th>预算</th>
                  <th>时间范围</th>
                </tr>
              </thead>
              <tbody>
                {collabs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' }}>
                    暂无营销战役数据
                  </td></tr>
                ) : collabs.map(c => (
                  <tr key={c.id} style={{ background: selectedIds.includes(c.id) ? 'var(--primary-bg)' : 'transparent' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleId(c.id)}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{c.project_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ID: {c.id}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar avatar-sm" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                          {c.influencer?.name?.[0]}
                        </div>
                        <span>{c.influencer?.name}</span>
                      </div>
                    </td>
                    <td>{getCollabStatusTag(c.status)}</td>
                    <td>¥{c.budget?.toLocaleString() || 0}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div>{c.start_date || '-'} ~ {c.end_date || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {collabTotal > collabPageSize && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              current={collabPage}
              total={collabTotal}
              pageSize={collabPageSize}
              onChange={(p) => {
                setCollabPage(p);
                loadAuthData(authBrand.id, p, authKeyword, authStatus);
              }}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} title="删除确认"
        message="确定要删除这个品牌吗？关联的用户和授权数据将被解绑。"
        type="danger" loading={deleting} />
    </div>
  );
};

export default BrandList;
