import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteSkeleton } from '@/components/common/RouteSkeleton';
import { RequireAuth, RedirectIfAuth } from '@/routes/guards/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy-loaded routes per Part E
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

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
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

        {/* Protected App Routes */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/chats" replace />} />
          <Route path="chats" element={<ChatsPage />} />
          <Route path="chats/:conversationId" element={<ConversationPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="settings/notifications" element={<NotificationSettingsPage />} />
        </Route>

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

