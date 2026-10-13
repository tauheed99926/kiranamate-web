import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shop, ShopSetting } from '../types';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  settings: ShopSetting | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  setupShop: (data: any) => Promise<void>;
  logout: () => void;
  refreshShop: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [settings, setSettings] = useState<ShopSetting | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);

  const checkStatusAndAuth = async () => {
    setIsLoading(true);
    try {
      // 1. Check if shop is initialized
      const statusRes = await apiRequest('/auth/status');
      setIsInitialized(statusRes.initialized);

      if (!statusRes.initialized) {
        setIsLoading(false);
        return;
      }

      // 2. If token exists, load current user
      const token = getStoredToken();
      if (token) {
        try {
          const meRes = await apiRequest('/auth/me');
          if (meRes.success) {
            setUser(meRes.user);
            setShop(meRes.shop);
            setSettings(meRes.settings);
          }
        } catch (err) {
          // Token expired or invalid
          setStoredToken(null);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to initialize auth state', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.success) {
      setStoredToken(res.token);
      setUser(res.user);
      setShop(res.shop);
      setSettings(res.settings);
      setIsInitialized(true);
    }
  };

  const setupShop = async (data: any) => {
    const res = await apiRequest('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success) {
      setStoredToken(res.token);
      setUser(res.user);
      setShop(res.shop);
      setSettings(res.settings);
      setIsInitialized(true);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setShop(null);
    setSettings(null);
  };

  const refreshShop = async () => {
    try {
      const res = await apiRequest('/shop');
      if (res.success) {
        setShop(res.shop);
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Failed to refresh shop profile', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        settings,
        isLoading,
        isInitialized,
        login,
        setupShop,
        logout,
        refreshShop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
