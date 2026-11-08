import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 text-center">
      <BrandLogo className="justify-center mb-8" />
      <div className="p-4 rounded-full bg-surface border border-border text-primary mb-4 shadow-crimson-sm">
        <Compass className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-text font-mono mb-2">404</h1>
      <p className="text-lg font-bold text-text mb-1">Trajectory Not Found</p>
      <p className="text-xs text-text-muted max-w-sm mb-6">
        The destination you are navigating to is outside known orbital coordinates.
      </p>
      <Button asChild>
        <Link to="/" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </Button>
    </div>
  );
};
export default NotFoundPage;

