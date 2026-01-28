import { useState, useCallback } from 'react';
import { Phone, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SOSButtonProps {
  onSOS: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SOSButton({ onSOS, isLoading = false, disabled = false }: SOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handlePressStart = useCallback(() => {
    if (disabled || isLoading) return;
    
    setIsPressed(true);
    
    // Trigger SOS after 1 second hold (for safety, prevent accidental triggers)
    const timer = setTimeout(async () => {
      try {
        await onSOS();
        toast({
          title: "🚨 SOS Alert Sent",
          description: "Emergency contacts and authorities have been notified with your location.",
          variant: "destructive",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send SOS. Please try again.",
          variant: "destructive",
        });
      }
    }, 1000);
    
    setPressTimer(timer);
  }, [disabled, isLoading, onSOS, toast]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;
    
    try {
      await onSOS();
      toast({
        title: "🚨 SOS Alert Sent",
        description: "Emergency contacts and authorities have been notified with your location.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SOS. Please try again.",
        variant: "destructive",
      });
    }
  }, [disabled, isLoading, onSOS, toast]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-32 h-32 rounded-full bg-emergency/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-28 h-28 rounded-full bg-emergency/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Main SOS button */}
      <Button
        variant="sos"
        size="sos"
        onClick={handleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        disabled={disabled || isLoading}
        className={`relative z-10 ${isPressed ? 'scale-95' : ''} transition-transform`}
      >
        {isLoading ? (
          <Loader2 className="w-10 h-10 animate-spin" />
        ) : (
          <div className="flex flex-col items-center">
            <AlertTriangle className="w-8 h-8 mb-1" />
            <span className="text-lg font-bold">SOS</span>
          </div>
        )}
      </Button>
      
      {/* Helper text */}
      <p className="mt-4 text-sm text-muted-foreground text-center">
        Tap to send emergency alert
      </p>
    </div>
  );
}
