import { Shield } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-medium`}
      >
        <Shield className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : 'w-12 h-12'} text-white`} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold tracking-tight`}>
            <span className="text-primary">SHE</span>
            <span className="text-accent">lytics</span>
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              Women Safety Analytics
            </span>
          )}
        </div>
      )}
    </div>
  );
}
