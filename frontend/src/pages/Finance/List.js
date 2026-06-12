import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { financeLedgerApi, collaborationsApi, influencersApi } from '../../api';
import { useAuth, isAdmin, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const MOCK_DATA = [
  {
    id: 1,
    collaboration_id: 1,
    collaboration: { id: 1, project_name: '618品牌推广活动', influencer: { id: 1, name: '小美同学', platform: '小红书' } },
    invoice_number: 'INV-2026-0001',
    invoice_amount: 15000,
    invoice_date: '2026-05-10',
    payment_status: 'unpaid',
    total_paid: 0,
    payments: [],
    remarks: '品牌方对账中',
    created_at: '2026-05-10T10:00:00Z'
  },
  {
    id: 2,
    collaboration_id: 2,
    collaboration: { id: 2, project_name: '春季新品上市推广', influencer: { id: 2, name: '时尚达人Lily', platform: '抖音' } },
    invoice_number: 'INV-2026-0002',
    invoice_amount: 28000,
    invoice_date: '2026-04-20',
    payment_status: 'partial',
    total_paid: 14000,
    payments: [
      { id: 1, amount: 14000, payment_date: '2026-05-05', method: 'bank_transfer', reference: 'BANK-20260505-001', remarks: '首付款50%' }
    ],
    remarks: '尾款预计6月15日前支付',
    created_at: '2026-04-20T14:30:00Z'
  },
  {
    id: 3,
    collaboration_id: 3,
    collaboration: { id: 3, project_name: '双11预热种草', influencer: { id: 3, name: '护肤师小王', platform: '微博' } },
    invoice_number: 'INV-2026-0003',
    invoice_amount: 42000,
    invoice_date: '2026-03-15',
    payment_status: 'paid',
    total_paid: 42000,
    payments: [
      { id: 1, amount: 21000, payment_date: '2026-03-25', method: 'bank_transfer', reference: 'BANK-20260325-008', remarks: '首付款' },
      { id: 2, amount: 21000, payment_date: '2026-04-20', method: 'bank_transfer', reference: 'BANK-20260420-015', remarks: '尾款' }
    ],
    remarks: '已全额结清',
    created_at: '2026-03-15T09:15:00Z'
  },
  {
    id: 4,
    collaboration_id: 4,
    collaboration: { id: 4, project_name: '母亲节专题内容', influencer: { id: 4, name: '宝妈日记', platform: '微信公众号' } },
    invoice_number: 'INV-2026-0004',
    invoice_amount: 18500,
    invoice_date: '2026-05-01',
    payment_status: 'unpaid',
    total_paid: 0,
    payments: [],
    remarks: '',
    created_at: '2026-05-01T16:45:00Z'
  },
  {
    id: 5,
    collaboration_id: 5,
    collaboration: { id: 5, project_name: '618直播间合作', influencer: { id: 5, name: '美妆测评师Amy', platform: '淘宝直播' } },
    invoice_number: 'INV-2026-0005',
    invoice_amount: 65000,
    invoice_date: '2026-05-25',
    payment_status: 'partial',
    total_paid: 32500,
    payments: [
      { id: 1, amount: 32500, payment_date: '2026-06-01', method: 'alipay', reference: 'ALI-20260601-888', remarks: '预付款50%' }
    ],
    remarks: '直播结束后支付尾款',
    created_at: '2026-05-25T11:20:00Z'
  },
  {
    id: 6,
    collaboration_id: 6,
    collaboration: { id: 6, project_name: '防晒产品测评合集', influencer: { id: 1, name: '小美同学', platform: '小红书' } },
    invoice_number: 'INV-2026-0006',
    invoice_amount: 12000,
    invoice_date: '2026-04-10',
    payment_status: 'paid',
    total_paid: 12000,
    payments: [
      { id: 1, amount: 12000, payment_date: '2026-04-28', method: 'bank_transfer', reference: 'BANK-20260428-022', remarks: '一次性付清' }
    ],
    remarks: '',
    created_at: '2026-04-10T08:30:00Z'
  }
];

const PAYMENT_STATUSES = [
  { value: 'unpaid', label: '未回款' },
  { value: 'partial', label: '部分回款' },
  { value: 'paid', label: '已回款' }
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信支付' },
  { value: 'cash', label: '现金' },
  { value: 'other', label: '其他' }
];

const FinanceLedgerList = () => {
  const { user } = useAuth();
  const canEdit = isAdmin(user) || isOperator(user);
  const [useMock, setUseMock] = useState(true);

  const [loading, setLoading] = useState(true);
  const [ledgerList, setLedgerList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [keyword, setKeyword] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const [summary, setSummary] = useState({ total_receivable: 0, total_paid: 0, total_unpaid: 0 });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentLedgerId, setCurrentLedgerId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({});
  const [paymentFormErrors, setPaymentFormErrors] = useState({});
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [collaborations, setCollaborations] = useState([]);

  const fetchOptions = async () => {
    try {
      const collabRes = await collaborationsApi.getList({ page_size: 200 });
      setCollaborations(collabRes.items || []);
    } catch (error) {
      if (useMock) {
        setCollaborations(MOCK_DATA.map(d => d.collaboration).filter(Boolean));
      }
    }
  };

  const fetchSummary = useCallback(async () => {
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (paymentStatus) params.payment_status = paymentStatus;
      if (monthFilter) params.month = monthFilter;

      const data = await financeLedgerApi.getSummary(params);
      setSummary(data);
    } catch (error) {
      if (useMock) {
        const filtered = filterMockData(MOCK_DATA);
        const totalReceivable = filtered.reduce((sum, item) => sum + (item.invoice_amount || 0), 0);
        const totalPaid = filtered.reduce((sum, item) => sum + (item.total_paid || 0), 0);
        setSummary({
          total_receivable: totalReceivable,
          total_paid: totalPaid,
          total_unpaid: totalReceivable - totalPaid
        });
      }
    }
  }, [keyword, paymentStatus, monthFilter, useMock]);

  const filterMockData = (data) => {
    return data.filter(item => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        const matchProject = item.collaboration?.project_name?.toLowerCase().includes(kw);
        const matchInvoice = item.invoice_number?.toLowerCase().includes(kw);
        const matchInfluencer = item.collaboration?.influencer?.name?.toLowerCase().includes(kw);
        if (!matchProject && !matchInvoice && !matchInfluencer) return false;
      }
      if (paymentStatus && item.payment_status !== paymentStatus) return false;
      if (monthFilter && !item.invoice_date?.startsWith(monthFilter)) return false;
      return true;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (paymentStatus) params.payment_status = paymentStatus;
      if (monthFilter) params.month = monthFilter;

      const data = await financeLedgerApi.getList(params);
      setLedgerList(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      if (useMock) {
        const filtered = filterMockData(MOCK_DATA);
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        setLedgerList(filtered.slice(start, end));
        setTotal(filtered.length);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, paymentStatus, monthFilter, useMock]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData();
    fetchSummary();
  }, [fetchData, fetchSummary]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
    fetchSummary();
  };

  const handleReset = () => {
    setKeyword('');
    setPaymentStatus('');
    setMonthFilter('');
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      collaboration_id: '',
      invoice_number: '',
      invoice_amount: 0,
      invoice_date: new Date().toISOString().split('T')[0],
      payment_status: 'unpaid',
      remarks: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (id) => {
    try {
      const data = await financeLedgerApi.getById(id);
      setEditingId(id);
      setFormData({
        collaboration_id: data.collaboration_id,
        invoice_number: data.invoice_number || '',
        invoice_amount: data.invoice_amount || 0,
        invoice_date: data.invoice_date || '',
        payment_status: data.payment_status || 'unpaid',
        remarks: data.remarks || ''
      });
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      if (useMock) {
        const item = MOCK_DATA.find(d => d.id === id);
        if (item) {
          setEditingId(id);
          setFormData({
            collaboration_id: item.collaboration_id,
            invoice_number: item.invoice_number || '',
            invoice_amount: item.invoice_amount || 0,
            invoice_date: item.invoice_date || '',
            payment_status: item.payment_status || 'unpaid',
            remarks: item.remarks || ''
          });
          setFormErrors({});
          setShowModal(true);
        }
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.collaboration_id) errors.collaboration_id = '请选择合作项目';
    if (!formData.invoice_number?.trim()) errors.invoice_number = '请输入发票编号';
    if (!formData.invoice_amount || formData.invoice_amount <= 0) errors.invoice_amount = '请输入有效的开票金额';
    if (!formData.invoice_date) errors.invoice_date = '请选择开票日期';
    if (!formData.payment_status) errors.payment_status = '请选择回款状态';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      collaboration_id: parseInt(formData.collaboration_id),
      invoice_amount: parseFloat(formData.invoice_amount) || 0
    };

    try {
      setSaving(true);

      if (editingId) {
        await financeLedgerApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await financeLedgerApi.create(submitData);
        showToast('success', '创建成功');
      }

      setShowModal(false);
      fetchData();
      fetchSummary();
    } catch (error) {
      if (useMock) {
        if (editingId) {
          const idx = MOCK_DATA.findIndex(d => d.id === editingId);
          if (idx !== -1) {
            MOCK_DATA[idx] = { ...MOCK_DATA[idx], ...submitData, id: editingId };
          }
          showToast('success', '更新成功（模拟数据）');
        } else {
          const newId = Math.max(...MOCK_DATA.map(d => d.id), 0) + 1;
          const collab = collaborations.find(c => c.id === parseInt(submitData.collaboration_id));
          MOCK_DATA.push({
            id: newId,
            ...submitData,
            total_paid: 0,
            payments: [],
            collaboration: collab,
            created_at: new Date().toISOString()
          });
          showToast('success', '创建成功（模拟数据）');
        }
        setShowModal(false);
        fetchData();
        fetchSummary();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await financeLedgerApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
      fetchSummary();
    } catch (error) {
      if (useMock) {
        const idx = MOCK_DATA.findIndex(d => d.id === deleteId);
        if (idx !== -1) MOCK_DATA.splice(idx, 1);
        showToast('success', '删除成功（模拟数据）');
        setDeleteId(null);
        fetchData();
        fetchSummary();
      }
    } finally {
      setDeleting(false);
    }
  };

  const openRecordPaymentModal = (ledgerId, paymentId = null) => {
    setCurrentLedgerId(ledgerId);
    setEditingPaymentId(paymentId);

    const ledger = useMock ? MOCK_DATA.find(d => d.id === ledgerId) : ledgerList.find(d => d.id === ledgerId);

    if (paymentId && ledger) {
      const payment = ledger.payments?.find(p => p.id === paymentId);
      if (payment) {
        setPaymentFormData({
          amount: payment.amount || 0,
          payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
          method: payment.method || 'bank_transfer',
          reference: payment.reference || '',
          remarks: payment.remarks || ''
        });
      }
    } else {
      const unpaid = ledger ? (ledger.invoice_amount || 0) - (ledger.total_paid || 0) : 0;
      setPaymentFormData({
        amount: unpaid > 0 ? unpaid : 0,
        payment_date: new Date().toISOString().split('T')[0],
        method: 'bank_transfer',
        reference: '',
        remarks: ''
      });
    }
    setPaymentFormErrors({});
    setShowPaymentModal(true);
  };

  const validatePaymentForm = () => {
    const errors = {};
    if (!paymentFormData.amount || paymentFormData.amount <= 0) errors.amount = '请输入有效的回款金额';
    if (!paymentFormData.payment_date) errors.payment_date = '请选择回款日期';
    if (!paymentFormData.method) errors.method = '请选择回款方式';

    setPaymentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePaymentSave = async () => {
    if (!validatePaymentForm()) return;

    const submitData = {
      ...paymentFormData,
      amount: parseFloat(paymentFormData.amount) || 0
    };

    try {
      setPaymentSaving(true);

      if (editingPaymentId) {
        await financeLedgerApi.updatePayment(currentLedgerId, editingPaymentId, submitData);
        showToast('success', '回款记录更新成功');
      } else {
        await financeLedgerApi.recordPayment(currentLedgerId, submitData);
        showToast('success', '回款登记成功');
      }

      setShowPaymentModal(false);
      fetchData();
      fetchSummary();
    } catch (error) {
      if (useMock) {
        const ledger = MOCK_DATA.find(d => d.id === currentLedgerId);
        if (ledger) {
          if (editingPaymentId) {
            const pIdx = ledger.payments?.findIndex(p => p.id === editingPaymentId);
            if (pIdx !== -1 && ledger.payments) {
              ledger.payments[pIdx] = { ...ledger.payments[pIdx], ...submitData };
            }
            showToast('success', '回款记录更新成功（模拟数据）');
          } else {
            const newPaymentId = ledger.payments ? Math.max(...ledger.payments.map(p => p.id), 0) + 1 : 1;
            if (!ledger.payments) ledger.payments = [];
            ledger.payments.push({ id: newPaymentId, ...submitData });
          }
          ledger.total_paid = (ledger.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
          if (ledger.total_paid >= ledger.invoice_amount) {
            ledger.payment_status = 'paid';
          } else if (ledger.total_paid > 0) {
            ledger.payment_status = 'partial';
          } else {
            ledger.payment_status = 'unpaid';
          }
          showToast('success', editingPaymentId ? '回款记录更新成功（模拟数据）' : '回款登记成功（模拟数据）');
        }
        setShowPaymentModal(false);
        fetchData();
        fetchSummary();
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDeletePayment = async (ledgerId, paymentId) => {
    if (!window.confirm('确定要删除这条回款记录吗？')) return;

    try {
      await financeLedgerApi.deletePayment(ledgerId, paymentId);
      showToast('success', '删除回款记录成功');
      fetchData();
      fetchSummary();
    } catch (error) {
      if (useMock) {
        const ledger = MOCK_DATA.find(d => d.id === ledgerId);
        if (ledger && ledger.payments) {
          const pIdx = ledger.payments.findIndex(p => p.id === paymentId);
          if (pIdx !== -1) {
            ledger.payments.splice(pIdx, 1);
            ledger.total_paid = ledger.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            if (ledger.total_paid >= ledger.invoice_amount) {
              ledger.payment_status = 'paid';
            } else if (ledger.total_paid > 0) {
              ledger.payment_status = 'partial';
            } else {
              ledger.payment_status = 'unpaid';
            }
            showToast('success', '删除回款记录成功（模拟数据）');
            fetchData();
            fetchSummary();
          }
        }
      }
    }
  };

  const formatMoney = (num) => {
    return '¥' + (num?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00');
  };

  const getPaymentStatusTag = (status) => {
    const map = {
      unpaid: { label: '未回款', class: 'tag-error' },
      partial: { label: '部分回款', class: 'tag-warning' },
      paid: { label: '已回款', class: 'tag-success' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const getPaymentMethodLabel = (method) => {
    return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
  };

  const getRowClass = (item) => {
    if (item.payment_status === 'unpaid') return 'row-highlight-unpaid';
    if (item.payment_status === 'partial') return 'row-highlight-partial';
    return '';
  };

  const isOverdue = (item) => {
    if (item.payment_status === 'paid') return false;
    if (!item.invoice_date) return false;
    const invoiceDate = new Date(item.invoice_date);
    const today = new Date();
    const diffDays = Math.floor((today - invoiceDate) / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="statistics-cards" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-icon">💰</span>
            <span className="stat-card-title">应收总额</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary-color)' }}>
            {formatMoney(summary.total_receivable)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-icon">✅</span>
            <span className="stat-card-title">已收总额</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success-color)' }}>
            {formatMoney(summary.total_paid)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-icon">⚠️</span>
            <span className="stat-card-title">待收总额</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--error-color)' }}>
            {formatMoney(summary.total_unpaid)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-icon">📊</span>
            <span className="stat-card-title">回款进度</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--warning-color)' }}>
            {summary.total_receivable > 0
              ? ((summary.total_paid / summary.total_receivable) * 100).toFixed(1)
              : '0.0'}%
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">财务台账</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 新建台账
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
                placeholder="搜索项目名称/发票编号/达人..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <select
              className="form-select"
              style={{ width: '150px' }}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="">全部回款状态</option>
              {PAYMENT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <input
              type="month"
              className="form-input"
              style={{ width: '160px' }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              placeholder="开票月份"
            />

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
          ) : ledgerList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📒</div>
              <div className="empty-title">暂无台账数据</div>
              <div className="empty-description">点击"新建台账"开始记录发票与回款信息</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>合作项目</th>
                    <th>Influencer</th>
                    <th>发票编号</th>
                    <th>开票金额</th>
                    <th>开票日期</th>
                    <th>回款状态</th>
                    <th>已回款</th>
                    <th>待回款</th>
                    <th style={{ minWidth: '240px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerList.map(item => (
                    <tr key={item.id} className={getRowClass(item)}>
                      <td>
                        <div style={{ fontWeight: '500' }}>
                          {item.collaboration?.project_name || '-'}
                          {isOverdue(item) && (
                            <span className="tag tag-error" style={{ marginLeft: '8px', fontSize: '11px' }}>
                              逾期
                            </span>
                          )}
                        </div>
                        {item.remarks && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {item.remarks}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar avatar-sm">
                            {item.collaboration?.influencer?.name?.[0] || '?'}
                          </div>
                          <div>
                            <div>{item.collaboration?.influencer?.name || '-'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.collaboration?.influencer?.platform || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace' }}>{item.invoice_number || '-'}</span>
                      </td>
                      <td style={{ fontWeight: '500' }}>
                        {formatMoney(item.invoice_amount)}
                      </td>
                      <td>
                        {item.invoice_date || '-'}
                      </td>
                      <td>
                        {getPaymentStatusTag(item.payment_status)}
                      </td>
                      <td style={{ color: 'var(--success-color)' }}>
                        {formatMoney(item.total_paid || 0)}
                      </td>
                      <td style={{ color: item.payment_status === 'unpaid' ? 'var(--error-color)' : 'var(--warning-color)' }}>
                        {formatMoney((item.invoice_amount || 0) - (item.total_paid || 0))}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {canEdit && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--success-color)' }}
                                onClick={() => openRecordPaymentModal(item.id)}
                              >
                                登记回款
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditModal(item.id)}
                            >
                              {canEdit ? '编辑' : '查看'}
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
                          {item.payments && item.payments.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>回款记录({item.payments.length})：</div>
                              {item.payments.map(p => (
                                <div key={p.id} style={{
                                  padding: '4px 8px',
                                  background: 'var(--bg-secondary)',
                                  borderRadius: '4px',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div>
                                    <span style={{ color: 'var(--success-color)' }}>{formatMoney(p.amount)}</span>
                                    <span style={{ margin: '0 6px' }}>·</span>
                                    <span>{p.payment_date}</span>
                                    <span style={{ margin: '0 6px' }}>·</span>
                                    <span>{getPaymentMethodLabel(p.method)}</span>
                                  </div>
                                  {canEdit && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        className="btn-link"
                                        style={{ fontSize: '11px' }}
                                        onClick={() => openRecordPaymentModal(item.id, p.id)}
                                      >
                                        编辑
                                      </button>
                                      <button
                                        className="btn-link"
                                        style={{ fontSize: '11px', color: 'var(--error-color)' }}
                                        onClick={() => handleDeletePayment(item.id, p.id)}
                                      >
                                        删除
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
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
        title={editingId ? '编辑台账' : '新建台账'}
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
          <label className="form-label">合作项目 *</label>
          <select
            className="form-select"
            value={formData.collaboration_id || ''}
            onChange={(e) => setFormData({ ...formData, collaboration_id: e.target.value })}
          >
            <option value="">请选择合作项目</option>
            {collaborations.map(c => (
              <option key={c.id} value={c.id}>
                {c.project_name} - {c.influencer?.name || ''}
              </option>
            ))}
          </select>
          {formErrors.collaboration_id && <div className="form-error">{formErrors.collaboration_id}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">发票编号 *</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：INV-2026-0001"
              value={formData.invoice_number || ''}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            />
            {formErrors.invoice_number && <div className="form-error">{formErrors.invoice_number}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">开票日期 *</label>
            <input
              type="date"
              className="form-input"
              value={formData.invoice_date || ''}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            />
            {formErrors.invoice_date && <div className="form-error">{formErrors.invoice_date}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">开票金额 (元) *</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              value={formData.invoice_amount || 0}
              onChange={(e) => setFormData({ ...formData, invoice_amount: e.target.value })}
            />
            {formErrors.invoice_amount && <div className="form-error">{formErrors.invoice_amount}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">回款状态 *</label>
            <select
              className="form-select"
              value={formData.payment_status || ''}
              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            >
              {PAYMENT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {formErrors.payment_status && <div className="form-error">{formErrors.payment_status}</div>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            placeholder="补充说明，如对账信息、预计回款时间等"
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      </Modal>

      {/* Payment Record Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={editingPaymentId ? '编辑回款记录' : '登记回款'}
        size="default"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>取消</button>
            <button className="btn btn-primary" onClick={handlePaymentSave} disabled={paymentSaving}>
              {paymentSaving ? '保存中...' : '确认'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">回款金额 (元) *</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              value={paymentFormData.amount || 0}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
            />
            {paymentFormErrors.amount && <div className="form-error">{paymentFormErrors.amount}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">回款日期 *</label>
            <input
              type="date"
              className="form-input"
              value={paymentFormData.payment_date || ''}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
            />
            {paymentFormErrors.payment_date && <div className="form-error">{paymentFormErrors.payment_date}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">回款方式 *</label>
            <select
              className="form-select"
              value={paymentFormData.method || ''}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {paymentFormErrors.method && <div className="form-error">{paymentFormErrors.method}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">交易流水号</label>
            <input
              type="text"
              className="form-input"
              placeholder="银行流水号/交易号"
              value={paymentFormData.reference || ''}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            placeholder="例如：首付款50%、尾款结清等"
            value={paymentFormData.remarks || ''}
            onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这条台账记录吗？关联的回款信息也将一并删除，此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default FinanceLedgerList;
