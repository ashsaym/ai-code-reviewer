import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import theme from './theme';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import {
  Dashboard,
  Projects,
  ProjectOverview,
  Sources,
  Jobs,
  JobDetail,
  Chat,
  GitHubSettings,
  OpenWebUISettings,
  ProcessingSettings,
  CacheSettings,
  EmbeddingSettings,
  DatabaseSettings,
} from './pages';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Dashboard />} />

                {/* Projects */}
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectOverview />} />
                <Route path="/projects/:id/sources" element={<Sources />} />

                {/* Jobs */}
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:jobId" element={<JobDetail />} />

                {/* Chat */}
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:projectId" element={<Chat />} />
                <Route path="/chat/:projectId/:sessionId" element={<Chat />} />

                {/* Settings */}
                <Route path="/settings" element={<Navigate to="/settings/github" replace />} />
                <Route path="/settings/github" element={<GitHubSettings />} />
                <Route path="/settings/openwebui" element={<OpenWebUISettings />} />
                <Route path="/settings/processing" element={<ProcessingSettings />} />
                <Route path="/settings/cache" element={<CacheSettings />} />
                <Route path="/settings/embedding" element={<EmbeddingSettings />} />
                <Route path="/settings/database" element={<DatabaseSettings />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
