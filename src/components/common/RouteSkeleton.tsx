import React from 'react';

export const RouteSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full p-6 space-y-4 animate-pulse bg-background">
      <div className="h-8 bg-surface rounded-lg w-1/4" />
      <div className="h-4 bg-surface rounded-lg w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="h-32 bg-surface rounded-xl" />
        <div className="h-32 bg-surface rounded-xl" />
        <div className="h-32 bg-surface rounded-xl" />
      </div>
      <div className="flex-1 bg-surface rounded-2xl min-h-[250px]" />
    </div>
  );
};

