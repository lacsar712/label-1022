import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { competitiveIntelligenceApi, influencersApi } from '../../api';
import { useAuth, isOperator, isAdmin } from '../../contexts/AuthContext';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const CompetitiveIntelligenceList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = isOperator(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [filters, setFilters] = useState({
    keyword: '',
    competitor_name: '',
    discovery_date_from: '',
    discovery_date_to: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    competitor_name: '',
    influencer_id: '',
    estimated_amount: '',
    source: '',
    discovery_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [influencerOptions, setInfluencerOptions] = useState([]);
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [showInfluencerDropdown, setShowInfluencerDropdown] = useState(false);
  const influencerDropdownRef = useRef(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.page_size]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (influencerDropdownRef.current && !influencerDropdownRef.current.contains(event.target)) {
        setShowInfluencerDropdown(false);
      }
    };
    if (showInfluencerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfluencerDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      const data = await competitiveIntelligenceApi.getList(params);
      setRecords(data.items);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchInfluencers = async (keyword) => {
    if (!keyword) {
      setInfluencerOptions([]);
      return;
    }
    try {
      const data = await influencersApi.getList({ keyword, page_size: 20 });
      setInfluencerOptions(data.items);
    } catch (error) {
      console.error('Failed to search influencers:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (influencerSearch) {
        searchInfluencers(influencerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [influencerSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(fetchData, 0);
  };

  const handleReset = () => {
    setFilters({
      keyword: '',
      competitor_name: '',
      discovery_date_from: '',
      discovery_date_to: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(fetchData, 0);
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      competitor_name: '',
      influencer_id: '',
      estimated_amount: '',
      source: '',
      discovery_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setInfluencerSearch('');
    setInfluencerOptions([]);
    setShowInfluencerDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      competitor_name: record.competitor_name,
      influencer_id: record.influencer_id,
      estimated_amount: String(record.estimated_amount || ''),
      source: record.source || '',
      discovery_date: record.discovery_date || new Date().toISOString().split('T')[0],
      notes: record.notes || ''
    });
    setInfluencerSearch(record.influencer?.name || '');
    setShowInfluencerDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.influencer_id) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'error', message: '请选择关联达人' }
        }));
        return;
      }

      const submitData = {
        ...formData,
        influencer_id: Number(formData.influencer_id),
        estimated_amount: Number(formData.estimated_amount) || 0
      };

      if (editingRecord) {
        await competitiveIntelligenceApi.update(editingRecord.id, submitData);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: '更新成功' }
        }));
      } else {
        await competitiveIntelligenceApi.create(submitData);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: '创建成功' }
        }));
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await competitiveIntelligenceApi.delete(deleteId);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: '删除成功' }
      }));
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const formatMoney = (num) => {
    return '¥' + (Number(num)?.toLocaleString() || '0');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const getSelectedInfluencerName = () => {
    if (!formData.influencer_id) return '';
    const found = influencerOptions.find(i => i.id === formData.influencer_id);
    if (found) return found.name;
    if (editingRecord?.influencer) return editingRecord.influencer.name;
    return '';
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">🔍 检索条件</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">关键词</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="搜索竞品名称、来源、备注"
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">竞品名称</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="精确搜索竞品"
                  value={filters.competitor_name}
                  onChange={(e) => setFilters(prev => ({ ...prev, competitor_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">发现日期（起）</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.discovery_date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, discovery_date_from: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">发现日期（止）</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.discovery_date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, discovery_date_to: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">搜索</button>
              <button type="button" className="btn btn-ghost" onClick={handleReset}>重置</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 竞品情报列表</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                + 新增情报
              </button>
            )}
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading" style={{ minHeight: '300px' }}>
              <div className="spinner"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无竞品情报记录</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: '8px' }}>
                点击「新增情报」开始记录竞品投放动态
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>竞品名称</th>
                    <th>关联达人</th>
                    <th>推测合作金额</th>
                    <th>信息来源</th>
                    <th>发现日期</th>
                    <th>录入人</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id}>
                      <td style={{ fontWeight: '500' }}>{record.competitor_name}</td>
                      <td>
                        {record.influencer ? (
                          <span
                            style={{ color: 'var(--primary-color)', cursor: 'pointer' }}
                            onClick={() => navigate(`/influencers/${record.influencer_id}`)}
                          >
                            {record.influencer.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ color: '#f5222d', fontWeight: '500' }}>
                        {formatMoney(record.estimated_amount)}
                      </td>
                      <td style={{ maxWidth: '200px', color: 'var(--text-secondary)' }}>
                        {record.source || '-'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(record.discovery_date)}</td>
                      <td>
                        {record.creator ? (record.creator.nickname || record.creator.username) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canEdit && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => openEditModal(record)}
                              >
                                编辑
                              </button>
                              <button
                                className="btn btn-ghost btn-xs danger"
                                onClick={() => handleDelete(record.id)}
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
          {pagination.total > 0 && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
              <Pagination
                total={pagination.total}
                page={pagination.page}
                pageSize={pagination.page_size}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        title={editingRecord ? '编辑竞品情报' : '新增竞品情报'}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="large"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">
                  竞品名称 <span style={{ color: '#f5222d' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：完美日记"
                  value={formData.competitor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, competitor_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">
                  推测合作金额 <span style={{ color: '#f5222d' }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="单位：元"
                  value={formData.estimated_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div ref={influencerDropdownRef}>
              <label className="form-label">
                关联达人 <span style={{ color: '#f5222d' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="搜索达人名称..."
                  value={influencerSearch}
                  onChange={(e) => {
                    setInfluencerSearch(e.target.value);
                    setShowInfluencerDropdown(true);
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, influencer_id: '' }));
                    }
                  }}
                  onFocus={() => setShowInfluencerDropdown(true)}
                />
                {showInfluencerDropdown && influencerOptions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {influencerOptions.map(inf => (
                      <div
                        key={inf.id}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: formData.influencer_id === inf.id ? 'var(--bg-tertiary)' : 'transparent'
                        }}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, influencer_id: inf.id }));
                          setInfluencerSearch(inf.name);
                          setShowInfluencerDropdown(false);
                        }}
                      >
                        <span>{inf.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {inf.platform} · {formatNumber(inf.followers)}粉丝
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {formData.influencer_id && getSelectedInfluencerName() && !showInfluencerDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'var(--primary-color)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    已选择
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">信息来源</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：小红书发现、抖音热门、达人主页"
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">
                  发现日期 <span style={{ color: '#f5222d' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.discovery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, discovery_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">备注</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="记录合作形式、内容方向、投放策略等信息"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editingRecord ? '保存修改' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="确认删除"
        message="确定要删除这条竞品情报记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onClose={() => setShowDeleteConfirm(false)}
        type="danger"
      />
    </div>
  );
};

export default CompetitiveIntelligenceList;
