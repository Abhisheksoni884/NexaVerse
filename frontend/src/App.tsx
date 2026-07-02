import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleRoute } from './components/RoleRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { DocumentLibrary } from './pages/DocumentLibrary';
import { MyUsage } from './pages/MyUsage';
import { AdminAudit } from './pages/AdminAudit';
import { AdminUsage } from './pages/AdminUsage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Common Routes */}
            <Route element={<RoleRoute allowedRoles={['admin', 'analyst', 'viewer']} />}>
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<DocumentLibrary />} />
              <Route path="/usage" element={<MyUsage />} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/admin/audit" element={<AdminAudit />} />
              <Route path="/admin/analytics" element={<AdminUsage />} />
            </Route>

            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
