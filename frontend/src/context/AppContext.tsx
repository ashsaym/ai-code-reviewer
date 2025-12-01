import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { HealthStatus, CacheStats, Project } from '../types';
import { getHealth, getCacheStats, getProjects } from '../services/api';

interface AppContextType {
  health: HealthStatus | null;
  cacheStats: CacheStats | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshHealth: () => Promise<void>;
  refreshCacheStats: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const response = await getHealth();
      setHealth(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch health:', err);
      setHealth({
        status: 'unhealthy',
        databases: { postgres: false, redis: false, milvus: false },
      });
      setError('Failed to connect to backend');
    }
  }, []);

  const refreshCacheStats = useCallback(async () => {
    try {
      const response = await getCacheStats();
      setCacheStats(response.data);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
      setCacheStats(null);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const response = await getProjects();
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setProjects([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshHealth(),
      refreshCacheStats(),
      refreshProjects(),
    ]);
    setLoading(false);
  }, [refreshHealth, refreshCacheStats, refreshProjects]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Periodic health check every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshHealth, 30000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Listen for project updates
  useEffect(() => {
    const handleProjectUpdate = () => {
      refreshProjects();
    };
    window.addEventListener('projectsUpdated', handleProjectUpdate);
    return () => window.removeEventListener('projectsUpdated', handleProjectUpdate);
  }, [refreshProjects]);

  return (
    <AppContext.Provider
      value={{
        health,
        cacheStats,
        projects,
        loading,
        error,
        refreshHealth,
        refreshCacheStats,
        refreshProjects,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
