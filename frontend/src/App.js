import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InfluencerList from './pages/Influencer/List';
import InfluencerDetail from './pages/Influencer/Detail';
import CollaborationList from './pages/Collaboration/List';
import CategoryList from './pages/Category/List';
import UserList from './pages/User/List';
import Profile from './pages/Profile';
import Toast from './components/Toast';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check roles if provided
  if (roles && roles.length > 0) {
    const userRole = user?.role?.name;
    if (!roles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

// App Routes
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="influencers" element={<InfluencerList />} />
        <Route path="influencers/:id" element={<InfluencerDetail />} />
        <Route path="collaborations" element={<CollaborationList />} />
        <Route path="categories" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <CategoryList />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['admin']}>
            <UserList />
          </ProtectedRoute>
        } />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { type, message } = event.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, message }]);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toast toasts={toasts} onRemove={removeToast} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
