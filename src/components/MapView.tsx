import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { LocationState, RiskZone } from '@/types';

interface MapViewProps {
  location: LocationState | null;
  riskZones: RiskZone[];
  isLoading?: boolean;
  className?: string;
}

export function MapView({ location, riskZones, isLoading, className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // For demo purposes, we'll show a static map representation
  // In production, integrate with Google Maps API or similar
  
  return (
    <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 ${className}`}>
      {/* Map placeholder with visual representation */}
      <div ref={mapRef} className="w-full h-full min-h-[300px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Grid pattern for map background */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/30" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Risk zone overlays */}
            {riskZones.map((zone, index) => (
              <div
                key={zone.id}
                className={`absolute rounded-full opacity-40 transition-all duration-300 ${
                  zone.risk_level === 'emergency'
                    ? 'bg-emergency'
                    : zone.risk_level === 'at_risk'
                    ? 'bg-at-risk'
                    : 'bg-safe'
                }`}
                style={{
                  width: `${Math.min(zone.radius_meters / 10, 150)}px`,
                  height: `${Math.min(zone.radius_meters / 10, 150)}px`,
                  top: `${20 + (index * 30) % 60}%`,
                  left: `${20 + (index * 40) % 60}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}

            {/* Current location marker */}
            {location && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {/* Accuracy circle */}
                <div 
                  className="absolute rounded-full bg-primary/20 border-2 border-primary/40"
                  style={{
                    width: `${Math.min(location.accuracy * 2, 200)}px`,
                    height: `${Math.min(location.accuracy * 2, 200)}px`,
                    transform: 'translate(-50%, -50%)',
                    top: '50%',
                    left: '50%',
                  }}
                />
                
                {/* Location dot */}
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center animate-pulse-soft">
                    <Navigation className="w-3 h-3 text-white" />
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                </div>
              </div>
            )}

            {/* Map info overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="glass-card rounded-xl p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {location 
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : 'Locating...'}
                    </span>
                  </div>
                  {location && (
                    <span className="text-muted-foreground">
                      ±{Math.round(location.accuracy)}m
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
