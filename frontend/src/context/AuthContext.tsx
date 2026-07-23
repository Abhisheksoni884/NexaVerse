import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../utils/api';

export type Role = 'admin' | 'analyst' | 'viewer';

export interface User {
  username: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by fetching current profile
    // The auth_token cookie is automatically sent by the browser
    authAPI.getProfile()
      .then(profile => {
        setUser({
          username: profile.username,
          role: profile.role as Role,
        });
        // Try to get session ID from sessionStorage
        const storedSessionId = sessionStorage.getItem('nexaverse_session_id');
        if (storedSessionId) {
          setSessionId(storedSessionId);
        }
      })
      .catch(() => {
        // Not authenticated or token expired
        setUser(null);
        setSessionId(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      
      // Use session ID from backend response
      const newSessionId = response.sessionId || `session_${Date.now()}`;
      
      setSessionId(newSessionId);
      sessionStorage.setItem('nexaverse_session_id', newSessionId);
      
      setUser({
        username: response.username,
        role: response.role as Role,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessionId(null);
      sessionStorage.removeItem('nexaverse_session_id');
    }
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
