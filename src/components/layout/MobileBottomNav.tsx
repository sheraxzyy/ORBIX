import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Users, UserCheck, User, Settings } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const navItems = [
    { to: '/app/chats', label: 'Chats', icon: MessageSquare, badge: '3' },
    { to: '/app/groups', label: 'Groups', icon: Users, badge: null },
    { to: '/app/contacts', label: 'Contacts', icon: UserCheck, badge: null },
    { to: '/app/profile', label: 'Profile', icon: User, badge: null },
    { to: '/app/settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around z-40 select-none pb-safe"
      aria-label="Mobile Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors focus-visible:outline-primary ${
                isActive ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5" aria-hidden="true" />
              {item.badge && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="mt-1">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

