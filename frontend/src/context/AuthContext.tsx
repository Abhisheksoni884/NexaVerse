import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../utils/api';

export type Role = 'admin' | 'analyst' | 'viewer';

export interface User {
  username: string;
  role: Role;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing token and validate it
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Optionally verify the token is still valid
        authAPI.getProfile()
          .then(profile => {
            // Token is valid, update user with fresh profile data
            const updatedUser = { ...parsedUser, username: profile.username, role: profile.role as Role };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          })
          .catch(() => {
            // Token expired or invalid
            setUser(null);
            localStorage.removeItem('user');
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      const newUser: User = {
        username: response.username,
        role: response.role as Role,
        token: response.access_token,
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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
