import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { RiskLevel } from '@/types';
import { cn } from '@/lib/utils';

interface RiskIndicatorProps {
  level: RiskLevel;
  score: number;
  zoneName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const riskConfig = {
  safe: {
    icon: Shield,
    label: 'Safe',
    bgClass: 'bg-safe-muted',
    textClass: 'text-safe',
    borderClass: 'border-safe',
    description: 'No immediate threats detected',
  },
  at_risk: {
    icon: AlertTriangle,
    label: 'At Risk',
    bgClass: 'bg-at-risk-muted',
    textClass: 'text-at-risk',
    borderClass: 'border-at-risk',
    description: 'Elevated risk in this area',
  },
  emergency: {
    icon: AlertCircle,
    label: 'Emergency',
    bgClass: 'bg-emergency-muted',
    textClass: 'text-emergency',
    borderClass: 'border-emergency',
    description: 'High risk - Stay alert!',
  },
};

const sizeClasses = {
  sm: {
    container: 'p-3',
    icon: 'w-5 h-5',
    title: 'text-sm',
    score: 'text-lg',
  },
  md: {
    container: 'p-4',
    icon: 'w-6 h-6',
    title: 'text-base',
    score: 'text-2xl',
  },
  lg: {
    container: 'p-6',
    icon: 'w-8 h-8',
    title: 'text-lg',
    score: 'text-3xl',
  },
};

export function RiskIndicator({
  level,
  score,
  zoneName,
  className,
  size = 'md',
}: RiskIndicatorProps) {
  const config = riskConfig[level];
  const Icon = config.icon;
  const sizes = sizeClasses[size];
  const percentage = Math.round(score * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border-2 transition-all duration-300',
        config.bgClass,
        config.borderClass,
        sizes.container,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-xl p-2',
              level === 'safe' ? 'bg-safe/20' : level === 'at_risk' ? 'bg-at-risk/20' : 'bg-emergency/20'
            )}
          >
            <Icon className={cn(sizes.icon, config.textClass)} />
          </div>
          <div>
            <h3 className={cn('font-bold', sizes.title, config.textClass)}>
              {config.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {zoneName || config.description}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <span className={cn('font-bold', sizes.score, config.textClass)}>
            {percentage}%
          </span>
          <p className="text-xs text-muted-foreground">Risk Score</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-white/50 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            level === 'safe' ? 'bg-safe' : level === 'at_risk' ? 'bg-at-risk' : 'bg-emergency'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
