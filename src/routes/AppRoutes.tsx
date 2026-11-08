import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteSkeleton } from '@/components/common/RouteSkeleton';
import { RequireAuth, RedirectIfAuth, RequireAdmin } from '@/routes/guards/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy-loaded routes
const LandingPage = lazy(() => import('@/routes/pages/LandingPage'));
const LoginPage = lazy(() => import('@/routes/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/routes/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/routes/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/routes/pages/ResetPasswordPage'));
const InviteLandingPage = lazy(() => import('@/routes/pages/InviteLandingPage'));
const NotFoundPage = lazy(() => import('@/routes/pages/NotFoundPage'));

// Protected App Views
const ChatsPage = lazy(() => import('@/routes/pages/ChatsPage'));
const ConversationPage = lazy(() => import('@/routes/pages/ConversationPage'));
const GroupsPage = lazy(() => import('@/routes/pages/GroupsPage'));
const ContactsPage = lazy(() => import('@/routes/pages/ContactsPage'));
const ProfilePage = lazy(() => import('@/routes/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/routes/pages/SettingsPage'));
const PrivacySettingsPage = lazy(() => import('@/routes/pages/PrivacySettingsPage'));
const NotificationSettingsPage = lazy(() => import('@/routes/pages/NotificationSettingsPage'));

// Admin Dashboard View
const AdminDashboardPage = lazy(() => import('@/routes/pages/admin/AdminDashboardPage'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        {/* PHASE 4: Initial entry point shows normal ORBIX messaging interface */}
        <Route path="/" element={<Navigate to="/app/chats" replace />} />
        <Route path="/landing" element={<LandingPage />} />

        {/* Authentication Routes */}
        <Route
          path="/login"
          element={
            <RedirectIfAuth>
              <LoginPage />
            </RedirectIfAuth>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuth>
              <RegisterPage />
            </RedirectIfAuth>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:code" element={<InviteLandingPage />} />

        {/* Messaging Interface (Public guest-accessible shell with protected features) */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/chats" replace />} />
          <Route path="chats" element={<ChatsPage />} />
          <Route path="chats/:conversationId" element={<ConversationPage />} />
          <Route
            path="groups"
            element={
              <RequireAuth>
                <GroupsPage />
              </RequireAuth>
            }
          />
          <Route
            path="contacts"
            element={
              <RequireAuth>
                <ContactsPage />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="settings/privacy"
            element={
              <RequireAuth>
                <PrivacySettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="settings/notifications"
            element={
              <RequireAuth>
                <NotificationSettingsPage />
              </RequireAuth>
            }
          />
        </Route>

        {/* PHASE 5: Admin Dashboard Core (Strictly Authorized Administrators Only) */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

