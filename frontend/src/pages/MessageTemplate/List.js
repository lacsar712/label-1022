import React, { useState, useEffect, useCallback } from 'react';
import { messageTemplatesApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const MessageTemplateList = () => {
  const { user } = useAuth();
  const canEdit = isOperator(user);

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewVariables, setPreviewVariables] = useState({});
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const categoryColors = {
    '初次邀约': '#1890ff',
    '跟进催复': '#fa8c16',
    '合同确认': '#52c41a',
    '内容审核': '#722ed1',
    '日常维护': '#eb2f96'
  };

  const defaultCategories = ['初次邀约', '跟进催复', '合同确认', '内容审核', '日常维护'];

  const variableTips = [
    { key: '达人姓名', desc: '达人的姓名或昵称' },
    { key: '所属平台', desc: '达人所在的平台（小红书/抖音/B站等）' },
    { key: '领域', desc: '达人的内容领域（美妆/时尚/美食等）' },
    { key: '我方品牌', desc: '我司品牌名称' },
    { key: '联系人姓名', desc: '我方联系人姓名' },
    { key: '联系电话', desc: '我方联系电话' },
    { key: '联系邮箱', desc: '我方联系邮箱' },
    { key: '项目名称', desc: '合作项目名称' },
    { key: '合作形式', desc: '合作形式（图文/短视频/直播等）' },
    { key: '预算范围', desc: '预算金额范围' },
    { key: '预计时间', desc: '预计合作时间' },
    { key: '合作内容', desc: '合作内容描述' },
    { key: '合作金额', desc: '合作总金额' },
    { key: '交付时间', desc: '内容交付时间' },
    { key: '付款方式', desc: '付款方式说明' },
    { key: '审核反馈', desc: '内容审核反馈意见' },
    { key: '付款金额', desc: '本次付款金额' },
    { key: '付款时间', desc: '付款日期' },
    { key: '到账时间', desc: '预计到账时间' },
    { key: '节日', desc: '节日名称' },
    { key: '新品名称', desc: '新品产品名称' },
    { key: '产品卖点', desc: '产品核心卖点' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesData, categoriesData] = await Promise.all([
        messageTemplatesApi.getList(activeCategory !== 'all' ? { category: activeCategory } : {}),
        messageTemplatesApi.getCategories()
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parseVariables = (content) => {
    const pattern = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: '初次邀约',
      subject: '',
      content: '',
      description: '',
      sort_order: 0,
      is_active: 1
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      description: template.description || '',
      sort_order: template.sort_order,
      is_active: template.is_active
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openPreviewModal = (template) => {
    setPreviewTemplate(template);
    const variables = parseVariables(template.content);
    const vars = {};
    variables.forEach(v => {
      vars[v] = '';
    });
    setPreviewVariables(vars);
    setPreviewResult(null);
    setShowPreview(true);
  };

  const handlePreview = async () => {
    if (!previewTemplate) return;
    
    try {
      setPreviewLoading(true);
      const result = await messageTemplatesApi.preview({
        template_id: previewTemplate.id,
        variables: previewVariables
      });
      setPreviewResult(result);
    } catch (error) {
    } finally {
      setPreviewLoading(false);
    }
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{${variable}}`
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = '请输入模板名称';
    if (!formData.category) errors.category = '请选择模板分类';
    if (!formData.content?.trim()) errors.content = '请输入模板内容';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const submitData = {
        ...formData,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: parseInt(formData.is_active) || 1
      };

      if (editingId) {
        await messageTemplatesApi.update(editingId, submitData);
        showToast('success', '更新成功');
      } else {
        await messageTemplatesApi.create(submitData);
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
      await messageTemplatesApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || '#1890ff';
  };

  const allCategories = [
    { category: 'all', count: templates.length },
    ...categories,
    ...defaultCategories.filter(c => !categories.find(cat => cat.category === c)).map(c => ({ category: c, count: 0 }))
  ];

  const filteredTemplates = activeCategory === 'all'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  const groupByCategory = () => {
    const groups = {};
    filteredTemplates.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = [];
      }
      groups[t.category].push(t);
    });
    return groups;
  };

  const groupedTemplates = groupByCategory();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('success', '已复制到剪贴板');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">消息模板库</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 新建模板
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">模板分类</h3>
            </div>
            <div className="card-body" style={{ padding: '8px' }}>
              {allCategories.map(cat => (
                <div
                  key={cat.category}
                  onClick={() => setActiveCategory(cat.category)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                    backgroundColor: activeCategory === cat.category
                      ? 'var(--primary-color)'
                      : 'transparent',
                    color: activeCategory === cat.category
                      ? '#fff'
                      : 'var(--text-primary)'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>
                    {cat.category === 'all' ? '全部模板' : cat.category}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    backgroundColor: activeCategory === cat.category
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--bg-tertiary)',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {loading ? (
            <div className="card">
              <div className="card-body">
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <div className="empty-title">暂无模板</div>
                  <div className="empty-description">
                    {activeCategory === 'all'
                      ? '点击新建按钮创建第一个消息模板'
                      : '该分类下暂无模板'}
                  </div>
                  {canEdit && activeCategory === 'all' && (
                    <button className="btn btn-primary" onClick={openCreateModal}>
                      + 新建模板
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            Object.keys(groupedTemplates).map(category => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '16px',
                    backgroundColor: getCategoryColor(category),
                    borderRadius: '2px'
                  }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    color: 'var(--text-primary)'
                  }}>
                    {category}
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {groupedTemplates[category].length} 个模板
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px'
                }}>
                  {groupedTemplates[category].map(template => (
                    <div
                      key={template.id}
                      className="card"
                      style={{
                        borderTop: `3px solid ${getCategoryColor(template.category)}`,
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="card-body">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              marginBottom: '4px'
                            }}>
                              {template.name}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--text-tertiary)'
                            }}>
                              创建人：{template.creator_name || '-'}
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {template.is_active === 0 && (
                              <span className="tag tag-gray" style={{ fontSize: '11px' }}>
                                已停用
                              </span>
                            )}
                          </div>
                        </div>

                        {template.subject && (
                          <div style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                            padding: '6px 10px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px'
                          }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>主题：</span>
                            {template.subject}
                          </div>
                        )}

                        <div style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.6',
                          maxHeight: '120px',
                          overflow: 'hidden',
                          position: 'relative',
                          marginBottom: '12px',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {template.content.substring(0, 150)}
                          {template.content.length > 150 && '...'}
                        </div>

                        {template.variables && (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: '12px'
                          }}>
                            {template.variables.split(',').filter(v => v).map((v, idx) => (
                              <span
                                key={idx}
                                className="tag tag-primary"
                                style={{ fontSize: '11px' }}
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        )}

                        {template.description && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            marginBottom: '12px',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px'
                          }}>
                            💡 {template.description}
                          </div>
                        )}

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-color)'
                        }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {formatDateTime(template.updated_at || template.created_at)}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreviewModal(template);
                              }}
                            >
                              预览
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(template.content);
                              }}
                            >
                              复制
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(template);
                                  }}
                                >
                                  编辑
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--error-color)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(template.id);
                                  }}
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑模板' : '新建模板'}
        size="large"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">模板名称 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：初次邀约邮件"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {formErrors.name && <div className="form-error">{formErrors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">模板分类 *</label>
              <select
                className="form-input"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {defaultCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && <div className="form-error">{formErrors.category}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">邮件主题</label>
            <input
              type="text"
              className="form-input"
              placeholder="邮件的主题，支持变量如 {项目名称}"
              value={formData.subject || ''}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              可选，用于邮件类模板
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>模板内容 *</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {variableTips.slice(0, 8).map(tip => (
                  <span
                    key={tip.key}
                    className="tag tag-primary"
                    style={{
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                    onClick={() => insertVariable(tip.key)}
                    title={tip.desc}
                  >
                    + {tip.key}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              className="form-textarea"
              style={{ minHeight: '200px', fontFamily: 'monospace' }}
              placeholder="使用 {变量名} 插入动态变量，例如：您好{达人姓名}..."
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
            {formErrors.content && <div className="form-error">{formErrors.content}</div>}
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              使用 {'{变量名}'} 格式插入动态变量，系统将自动识别。点击上方标签可快速插入常用变量。
            </div>
          </div>

          {formData.content && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                检测到的变量：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parseVariables(formData.content).length > 0 ? (
                  parseVariables(formData.content).map((v, idx) => (
                    <span key={idx} className="tag tag-primary" style={{ fontSize: '12px' }}>
                      {v}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    未检测到变量
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">使用说明</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '60px' }}
              placeholder="简要描述这个模板的使用场景和注意事项..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">排序值</label>
              <input
                type="number"
                className="form-input"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                越小越靠前
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">状态</label>
              <select
                className="form-input"
                value={formData.is_active ?? 1}
                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
              >
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="模板预览"
        size="large"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
              关闭
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={previewLoading}
            >
              {previewLoading ? '渲染中...' : '生成预览'}
            </button>
          </>
        }
      >
        {previewTemplate && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">模板信息</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>模板名称</span>
                    <span>{previewTemplate.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>分类</span>
                    <span
                      className="tag"
                      style={{
                        backgroundColor: getCategoryColor(previewTemplate.category) + '15',
                        color: getCategoryColor(previewTemplate.category),
                        border: `1px solid ${getCategoryColor(previewTemplate.category)}30`
                      }}
                    >
                      {previewTemplate.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">变量填充</h3>
              </div>
              <div className="card-body">
                {Object.keys(previewVariables).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {Object.keys(previewVariables).map(key => {
                      const tip = variableTips.find(t => t.key === key);
                      return (
                        <div className="form-group" key={key}>
                          <label className="form-label">
                            {key}
                            {tip && <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', marginLeft: '4px' }}>
                              ({tip.desc})
                            </span>}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder={`请输入${key}`}
                            value={previewVariables[key] || ''}
                            onChange={(e) => setPreviewVariables({
                              ...previewVariables,
                              [key]: e.target.value
                            })}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>
                    该模板不包含任何变量
                  </div>
                )}
              </div>
            </div>

            {previewResult && (
              <div className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">预览结果</h3>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyToClipboard(
                        previewResult.subject
                          ? `主题：${previewResult.subject}\n\n${previewResult.content}`
                          : previewResult.content
                      )}
                    >
                      复制文案
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {previewResult.subject && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        主题
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {previewResult.subject}
                      </div>
                    </div>
                  )}
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    minHeight: '150px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                    fontSize: '14px',
                    color: 'var(--text-primary)'
                  }}>
                    {previewResult.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这个模板吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default MessageTemplateList;
