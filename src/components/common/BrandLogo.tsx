import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  asLink?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  className = '',
  asLink = true,
}) => {
  const content = (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {variant === 'mark' ? (
        <img
          src="/logo-mark.svg"
          alt="ORBIX mark"
          className="h-9 w-9 object-contain"
        />
      ) : (
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-mark.svg"
            alt="ORBIX logo"
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-extrabold tracking-wider text-xl leading-none font-mono">
              ORB<span className="text-primary">I</span>X
            </span>
            <span className="text-[7.5px] font-bold tracking-[0.2em] text-primary leading-tight mt-0.5 uppercase">
              Beyond Limits
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className="inline-flex items-center focus-visible:outline-primary rounded-md transition-opacity hover:opacity-90"
        aria-label="ORBIX Home"
      >
        {content}
      </Link>
    );
  }

  return content;
};

