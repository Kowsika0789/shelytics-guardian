import { Gauge } from 'lucide-react';

interface SpeedIndicatorProps {
  speed: number;
  className?: string;
}

export function SpeedIndicator({ speed, className }: SpeedIndicatorProps) {
  const displaySpeed = Math.round(speed);
  
  const getSpeedStatus = () => {
    if (speed < 5) return { label: 'Stationary', color: 'text-muted-foreground' };
    if (speed < 15) return { label: 'Walking', color: 'text-safe' };
    if (speed < 40) return { label: 'Vehicle', color: 'text-primary' };
    return { label: 'Fast', color: 'text-at-risk' };
  };

  const status = getSpeedStatus();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="p-2 rounded-xl bg-primary/10">
        <Gauge className="w-5 h-5 text-primary" />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{displaySpeed}</span>
          <span className="text-sm text-muted-foreground">km/h</span>
        </div>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>
    </div>
  );
}
