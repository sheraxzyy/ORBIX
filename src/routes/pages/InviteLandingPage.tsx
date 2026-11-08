import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';

export const InviteLandingPage: React.FC = () => {
  const { code } = useParams();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md space-y-6 text-center">
        <BrandLogo className="justify-center mb-4" />

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center mx-auto shadow-crimson-sm">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-text">Group Invitation</h1>
            <p className="text-xs font-mono text-primary mt-1">Invitation Code: {code}</p>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Connect directly with your team inside the ORBIX workspace.
            </p>
          </div>

          <div className="pt-2">
            <Button asChild className="w-full">
              <Link to="/app/chats" className="flex items-center justify-center gap-2">
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InviteLandingPage;
