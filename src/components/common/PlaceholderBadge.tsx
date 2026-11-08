import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PlaceholderBadgeProps {
  label?: string;
  milestone?: string;
  className?: string;
}

export const PlaceholderBadge: React.FC<PlaceholderBadgeProps> = ({
  label = 'Preview Shell — Offline',
  milestone = 'M1',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 border border-primary/30 text-primary ${className}`}
      role="status"
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-text font-bold">
        {milestone}
      </span>
    </div>
  );
};

