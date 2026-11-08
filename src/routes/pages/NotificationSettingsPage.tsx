import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationSettingsPage: React.FC = () => {
  const { settings, updateSettings } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [enterIsSend, setEnterIsSend] = useState(true);
  const [activeSuppression, setActiveSuppression] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setNotificationsEnabled(settings.notifications_enabled);
      setSoundEnabled(settings.sound_enabled);
      setEnterIsSend(settings.enter_is_send);
      setActiveSuppression(settings.active_suppression);
    }
  }, [settings]);

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateSettings({ [key]: value });
      setSuccessMsg('Preference saved.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleRequestBrowserNotification = async () => {
    if (typeof Notification === 'undefined') {
      alert('Browser notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      new Notification('ORBIX Alerts Active', {
        body: 'Realtime notifications are now enabled.',
        icon: '/favicon.svg',
      });
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </Link>

        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-text">Notifications & Alerts</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure system audio, browser alerts, and focus suppression.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-surface border border-border space-y-6">
          {/* Browser Notifications Request */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Browser Desktop Notifications</h3>
              <p className="text-xs text-text-muted">
                Status:{' '}
                <span className="font-mono font-bold capitalize text-primary">
                  {browserPermission}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={browserPermission === 'granted'}
              onClick={handleRequestBrowserNotification}
              className="text-xs shrink-0"
            >
              {browserPermission === 'granted' ? 'Enabled' : 'Request Permission'}
            </Button>
          </div>

          {/* Sound Alert Toggle */}
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Audio Sound Chimes</h3>
              <p className="text-xs text-text-muted">Play alert sounds for incoming messages</p>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                setSoundEnabled(e.target.checked);
                handleToggle('sound_enabled', e.target.checked);
              }}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Notifications Master Switch */}
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Enable Notifications</h3>
              <p className="text-xs text-text-muted">Receive popups and counter increments</p>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => {
                setNotificationsEnabled(e.target.checked);
                handleToggle('notifications_enabled', e.target.checked);
              }}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Enter key to send */}
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Enter to Send</h3>
              <p className="text-xs text-text-muted">Press Enter in composer to dispatch immediately</p>
            </div>
            <input
              type="checkbox"
              checked={enterIsSend}
              onChange={(e) => {
                setEnterIsSend(e.target.checked);
                handleToggle('enter_is_send', e.target.checked);
              }}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Active Viewport Suppression */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Active Conversation Suppression</h3>
              <p className="text-xs text-text-muted">
                Suppress audible chimes when the conversation is actively focused
              </p>
            </div>
            <input
              type="checkbox"
              checked={activeSuppression}
              onChange={(e) => {
                setActiveSuppression(e.target.checked);
                handleToggle('active_suppression', e.target.checked);
              }}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default NotificationSettingsPage;
