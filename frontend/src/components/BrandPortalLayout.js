import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleLabel } from '../contexts/AuthContext';

const BrandPortalLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/brand/dashboard') return '数据概览';
    if (path.startsWith('/brand/collaborations')) return '营销战役';
    if (path.startsWith('/brand/influencers')) return '合作达人';
    if (path.startsWith('/brand/profile')) return '个人中心';
    return '';
  };

  const navItems = [
    { path: '/brand/dashboard', icon: '📊', label: '数据概览' },
    { path: '/brand/collaborations', icon: '🎯', label: '营销战役' },
    { path: '/brand/influencers', icon: '👥', label: '合作达人' }
  ];

  const userRole = user?.role?.name;
  const brandName = user?.brand?.name || '品牌中心';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🏢</div>
            <span className="sidebar-logo-text">{brandName}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">{getPageTitle()}</h1>
          </div>
          <div className="header-right">
            <div className="dropdown" ref={dropdownRef}>
              <div
                className="user-menu"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="user-avatar">
                  {user?.nickname?.[0] || user?.username?.[0] || 'B'}
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.nickname || user?.username}</span>
                  <span className="user-role">{getRoleLabel(userRole)}</span>
                </div>
              </div>

              {showDropdown && (
                <div className="dropdown-menu">
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/brand/profile');
                    }}
                  >
                    <span>👤</span>
                    <span>个人中心</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div
                    className="dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <span>🚪</span>
                    <span>退出登录</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BrandPortalLayout;
