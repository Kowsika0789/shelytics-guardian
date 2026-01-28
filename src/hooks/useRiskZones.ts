import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RiskZone, RiskLevel, LocationState } from '@/types';
import { getDistanceFromLatLonInKm } from './useLocation';

interface UseRiskZonesReturn {
  riskZones: RiskZone[];
  currentRisk: RiskLevel;
  riskScore: number;
  nearbyRiskZone: RiskZone | null;
  isLoading: boolean;
  error: string | null;
  checkRiskAtLocation: (lat: number, lng: number) => { level: RiskLevel; score: number; zone: RiskZone | null };
}

// Sample risk zones for demo (in production, these would come from the database)
const sampleRiskZones: RiskZone[] = [
  {
    id: '1',
    name: 'Downtown Area',
    latitude: 28.6139,
    longitude: 77.2090,
    radius_meters: 1000,
    risk_score: 0.7,
    risk_level: 'at_risk',
    incident_count: 15,
    time_of_day_risk: { night: 0.8, day: 0.4 },
    description: 'Moderate risk area - stay alert',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Industrial Zone',
    latitude: 28.6200,
    longitude: 77.2150,
    radius_meters: 800,
    risk_score: 0.85,
    risk_level: 'emergency',
    incident_count: 25,
    time_of_day_risk: { night: 0.95, day: 0.6 },
    description: 'High risk area - avoid if possible',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useRiskZones(location: LocationState | null): UseRiskZonesReturn {
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [currentRisk, setCurrentRisk] = useState<RiskLevel>('safe');
  const [riskScore, setRiskScore] = useState(0);
  const [nearbyRiskZone, setNearbyRiskZone] = useState<RiskZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch risk zones from database
  useEffect(() => {
    const fetchRiskZones = async () => {
      try {
        const { data, error } = await supabase
          .from('risk_zones')
          .select('*');

        if (error) throw error;

        // Combine database zones with sample zones for demo
        const allZones = data && data.length > 0 
          ? (data as RiskZone[])
          : sampleRiskZones;
        
        setRiskZones(allZones);
      } catch (err) {
        console.error('Error fetching risk zones:', err);
        setRiskZones(sampleRiskZones);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiskZones();
  }, []);

  const checkRiskAtLocation = useCallback(
    (lat: number, lng: number): { level: RiskLevel; score: number; zone: RiskZone | null } => {
      let highestRisk: RiskLevel = 'safe';
      let highestScore = 0;
      let closestZone: RiskZone | null = null;

      for (const zone of riskZones) {
        const distance = getDistanceFromLatLonInKm(lat, lng, zone.latitude, zone.longitude) * 1000; // Convert to meters
        
        if (distance <= zone.radius_meters) {
          // User is within this risk zone
          const hour = new Date().getHours();
          const timeOfDay = hour >= 18 || hour < 6 ? 'night' : 'day';
          const timeRisk = zone.time_of_day_risk[timeOfDay] || zone.risk_score;
          
          if (timeRisk > highestScore) {
            highestScore = timeRisk;
            highestRisk = zone.risk_level;
            closestZone = zone;
          }
        } else if (distance <= zone.radius_meters * 1.5) {
          // User is approaching a risk zone
          const approachingScore = zone.risk_score * 0.5;
          if (approachingScore > highestScore && highestRisk === 'safe') {
            highestScore = approachingScore;
            highestRisk = 'at_risk';
            closestZone = zone;
          }
        }
      }

      return { level: highestRisk, score: highestScore, zone: closestZone };
    },
    [riskZones]
  );

  // Update risk based on current location
  useEffect(() => {
    if (location && riskZones.length > 0) {
      const { level, score, zone } = checkRiskAtLocation(location.latitude, location.longitude);
      setCurrentRisk(level);
      setRiskScore(score);
      setNearbyRiskZone(zone);
    }
  }, [location, riskZones, checkRiskAtLocation]);

  return {
    riskZones,
    currentRisk,
    riskScore,
    nearbyRiskZone,
    isLoading,
    error,
    checkRiskAtLocation,
  };
}
