import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient, ApiError } from '../lib/api';

export interface User {
  userId: string;
  dealerId: string;
  roleId?: string;
  roleName?: string;
  permissions: string[];
  sessionId: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, dealerSlug: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUserData = useCallback(async () => {
    try {
      const response = await apiClient.getMe();
      setUser(response.data);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      throw apiError;
    }
  }, []);

  const syncAuthState = useCallback(async () => {
    if (apiClient.isAuthenticated()) {
      try {
        await refreshUserData();
      } catch {
        await apiClient.logout();
        setUser(null);
      }
      return;
    }

    setUser(null);
  }, [refreshUserData]);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      await syncAuthState();
      setLoading(false);
    };

    checkAuth();

    const handleAuthStateChange = () => {
      void syncAuthState();
    };

    window.addEventListener('auth:tokens-updated', handleAuthStateChange);
    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('auth:tokens-cleared', handleAuthStateChange);

    return () => {
      window.removeEventListener('auth:tokens-updated', handleAuthStateChange);
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('auth:tokens-cleared', handleAuthStateChange);
    };
  }, [syncAuthState]);

  const login = useCallback(async (email: string, password: string, dealerSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.login(email, password, dealerSlug);
      await refreshUserData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshUserData]);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Logout failed');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: refreshUserData,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
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
