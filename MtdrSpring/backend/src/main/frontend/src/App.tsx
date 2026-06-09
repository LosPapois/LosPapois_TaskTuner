import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import ArchivedProjectsPage from './Pages/ArchivedProjectsPage';
import TasksPage from './Pages/TasksPage';
import LoginPage from './Pages/LoginPage';
import SignupPage from './Pages/SignupPage';
import ProfilePage from './Pages/ProfilePage';
import TeamPage from './Pages/TeamPage';
import SprintPage from './Pages/SprintPage';
import StatisticsPage from './Pages/StatisticsPage';
import ProjectsPage from './Pages/ProjectsPage';
import { Sidebar, SidebarToggle } from './Components/Sidebar';
import PageBreadcrumb from './Components/Header/PageBreadcrumb';
import HomeButton from './Components/Header/HomeButton';

import {
  getFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from './Utils/storage';

function App() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === '/login' || location.pathname === '/signup';

  // Sidebar visibility — persisted across reloads via localStorage.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => getFromStorage<boolean>(STORAGE_KEYS.SIDEBAR_OPEN) ?? true
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), []);

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* Post-login landing — project selector cards. */}
      <Route path="/home" element={<HomePage />} />
      {/* Read-only landing for finalized projects. */}
      <Route path="/archive" element={<ArchivedProjectsPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      {/* Team and Sprint are scoped to a project — the projectId / */}
      {/* sprintId in the URL gives every sidebar link a unique address, */}
      {/* which keeps NavLink's active highlight per-group correct. */}
      <Route path="/projects/:projectId/team" element={<TeamPage />} />
      <Route path="/projects/:projectId/statistics" element={<StatisticsPage />} />
      {/* Project board (Backlog / Active / Completed) — reuses TasksPage in */}
      {/* board mode, triggered when the route carries a projectId param. */}
      <Route path="/projects/:projectId/board" element={<TasksPage />} />
      <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  // Auth pages render full-bleed without sidebar/header chrome.
  if (isAuthRoute) {
    return <>{routes}</>;
  }

  return (
    <div className="flex h-screen app-page-bg">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Brand-green header — matches the sidebar header so the top row */}
        {/* reads as a single coloured band across the whole app. h-16 keeps */}
        {/* the seam flush with the sidebar wordmark on the left. */}
        <header className="flex items-center gap-3 px-4 h-16 bg-brand">
          <SidebarToggle isOpen={sidebarOpen} onToggle={toggleSidebar} />
          <HomeButton />
          <PageBreadcrumb />
        </header>
        <main className="flex-1 overflow-auto">{routes}</main>
      </div>
    </div>
  );
}

export default App;
