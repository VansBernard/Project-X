/**
 * AppContext - Global State Management
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Types from '../types';

interface AppContextType {
  // User
  currentUser: Types.AdminUser | null;
  setCurrentUser: (user: Types.AdminUser | null) => void;

  // Settings
  userSettings: Types.UserSettings;
  updateSettings: (settings: Partial<Types.UserSettings>) => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeNotification: (id: string) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Selected filters
  selectedDealerId?: string;
  setSelectedDealerId: (id: string | undefined) => void;
  selectedCustomerId?: string;
  setSelectedCustomerId: (id: string | undefined) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Types.AdminUser | null>(null);
  const [userSettings, setUserSettings] = useState<Types.UserSettings>({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    smsNotifications: false,
    twoFactorEnabled: true,
    sessionTimeout: 3600,
  });
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: 'success' | 'error' | 'info' | 'warning';
      message: string;
      timestamp: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();

  const updateSettings = useCallback((updates: Partial<Types.UserSettings>) => {
    setUserSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const addNotification = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setNotifications((prev) => [
        ...prev,
        { id, type, message, timestamp: Date.now() },
      ]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    userSettings,
    updateSettings,
    notifications,
    addNotification,
    removeNotification,
    isLoading,
    setIsLoading,
    selectedDealerId,
    setSelectedDealerId,
    selectedCustomerId,
    setSelectedCustomerId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
