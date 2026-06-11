import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Auth Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    // Both token AND user must exist for authenticated state
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Invalid user data, clear everything
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      // If either token or user is missing, clear both to ensure clean state
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Role checking utilities
export const hasRole = (user, roles) => {
  if (!user || !user.role) return false;
  const roleNames = Array.isArray(roles) ? roles : [roles];
  return roleNames.includes(user.role.name);
};

export const isAdmin = (user) => hasRole(user, 'admin');
export const isOperator = (user) => hasRole(user, ['admin', 'operator']);
export const isBrandUser = (user) => hasRole(user, 'brand');
export const isInternalUser = (user) => hasRole(user, ['admin', 'operator', 'user']);

export const getDashboardRoute = (user) => {
  if (isBrandUser(user)) {
    return '/brand/dashboard';
  }
  return '/dashboard';
};

export const getRoleLabel = (roleName) => {
  switch (roleName) {
    case 'admin': return '管理员';
    case 'operator': return '运营人员';
    case 'user': return '普通用户';
    case 'brand': return '品牌方';
    default: return roleName;
  }
};
