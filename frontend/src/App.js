import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, isBrandUser, isInternalUser, getDashboardRoute } from './contexts/AuthContext';
import Layout from './components/Layout';
import BrandPortalLayout from './components/BrandPortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InfluencerList from './pages/Influencer/List';
import InfluencerDetail from './pages/Influencer/Detail';
import InfluencerPipeline from './pages/Influencer/Pipeline';
import CollaborationList from './pages/Collaboration/List';
import CategoryList from './pages/Category/List';
import TierList from './pages/Tier/List';
import UserList from './pages/User/List';
import Profile from './pages/Profile';
import BrandAdminList from './pages/BrandAdmin/List';
import BrandDashboard from './pages/Brand/Dashboard';
import BrandCollaborations from './pages/Brand/Collaborations';
import BrandCollaborationDetail from './pages/Brand/CollaborationDetail';
import BrandInfluencers from './pages/Brand/Influencers';
import OperatorKPIDashboard from './pages/Operator/KPIDashboard';
import FinanceLedgerList from './pages/Finance/List';
import CompetitiveIntelligenceList from './pages/CompetitiveIntelligence/List';
import Toast from './components/Toast';

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
  
  if (roles && roles.length > 0) {
    const userRole = user?.role?.name;
    if (!roles.includes(userRole)) {
      const defaultRoute = getDashboardRoute(user);
      return <Navigate to={defaultRoute} replace />;
    }
  }
  
  return children;
};

const AppRoutes = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const userRole = user?.role?.name;
  const defaultDashboard = isAuthenticated ? getDashboardRoute(user) : '/login';

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={defaultDashboard} replace /> : <Login />
      } />

      <Route path="/" element={
        !isAuthenticated ? <Navigate to="/login" replace /> :
        <Navigate to={defaultDashboard} replace />
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute roles={['admin', 'operator', 'user']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
      </Route>

      <Route element={
        <ProtectedRoute roles={['admin', 'operator', 'user']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/influencers" element={<InfluencerList />} />
        <Route path="/influencers/:id" element={<InfluencerDetail />} />
        <Route path="/pipeline" element={<InfluencerPipeline />} />
        <Route path="/collaborations" element={<CollaborationList />} />
        <Route path="/categories" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <CategoryList />
          </ProtectedRoute>
        } />
        <Route path="/tiers" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <TierList />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}>
            <UserList />
          </ProtectedRoute>
        } />
        <Route path="/brands" element={
          <ProtectedRoute roles={['admin']}>
            <BrandAdminList />
          </ProtectedRoute>
        } />
        <Route path="/operator-kpi" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <OperatorKPIDashboard />
          </ProtectedRoute>
        } />
        <Route path="/finance" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <FinanceLedgerList />
          </ProtectedRoute>
        } />
        <Route path="/competitive-intelligence" element={
          <ProtectedRoute roles={['admin', 'operator', 'user']}>
            <CompetitiveIntelligenceList />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/brand" element={
        <ProtectedRoute roles={['brand']}>
          <BrandPortalLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/brand/dashboard" replace />} />
        <Route path="dashboard" element={<BrandDashboard />} />
        <Route path="collaborations" element={<BrandCollaborations />} />
        <Route path="collaborations/:id" element={<BrandCollaborationDetail />} />
        <Route path="influencers" element={<BrandInfluencers />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to={defaultDashboard} replace />} />
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
