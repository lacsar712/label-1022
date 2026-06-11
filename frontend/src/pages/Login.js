import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import { showToast } from '../components/Toast';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    nickname: ''
  });
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少3个字符';
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少6个字符';
    }
    
    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '两次输入的密码不一致';
      }
      
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '邮箱格式不正确';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isRegister) {
        // Register
        await authApi.register({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          nickname: formData.nickname || undefined
        });
        
        showToast('success', '注册成功，请登录');
        setIsRegister(false);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } else {
        // Login
        const data = await authApi.login({
          username: formData.username,
          password: formData.password
        });
        
        // Save token to localStorage FIRST before anything else
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Then update AuthContext
        login(data.user, data.access_token);
        
        showToast('success', '登录成功');
        
        // Small delay to ensure localStorage is fully committed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        navigate('/dashboard');
      }
    } catch (error) {
      // Error already handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🎯</div>
          <h1 className="login-title">Influencer管理平台</h1>
          <p className="login-subtitle">
            {isRegister ? '创建新账户' : '企业级网红资源管理系统'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              type="text"
              name="username"
              className="form-input"
              placeholder="请输入用户名"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
            {errors.username && <div className="form-error">{errors.username}</div>}
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">昵称</label>
                <input
                  type="text"
                  name="nickname"
                  className="form-input"
                  placeholder="请输入昵称（选填）"
                  value={formData.nickname}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="请输入邮箱（选填）"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="请输入密码"
              value={formData.password}
              onChange={handleChange}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">确认密码</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                placeholder="请再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="login-footer">
          {isRegister ? (
            <span>
              已有账户？
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setIsRegister(false); setErrors({}); }}
                style={{ marginLeft: '4px' }}
              >
                立即登录
              </a>
            </span>
          ) : (
            <span>
              还没有账户？
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setIsRegister(true); setErrors({}); }}
                style={{ marginLeft: '4px' }}
              >
                立即注册
              </a>
            </span>
          )}
        </div>

        {!isRegister && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '8px',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
              测试账号
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div>管理员: admin / 123456</div>
              <div>运营人员: operator / 123456</div>
              <div>普通用户: user / 123456</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
