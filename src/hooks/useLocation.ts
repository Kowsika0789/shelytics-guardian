import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationState } from '@/types';

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface UseLocationReturn {
  location: LocationState | null;
  error: string | null;
  isLoading: boolean;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<LocationState | null>;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watchPosition = false,
  } = options;

  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const calculateSpeed = useCallback((currentPosition: GeolocationPosition): number => {
    // If the API provides speed, use it
    if (currentPosition.coords.speed !== null && currentPosition.coords.speed >= 0) {
      return currentPosition.coords.speed * 3.6; // Convert m/s to km/h
    }

    // Otherwise calculate from previous position
    if (lastPositionRef.current) {
      const timeDiff = (currentPosition.timestamp - lastPositionRef.current.timestamp) / 1000;
      if (timeDiff > 0) {
        const distance = getDistanceFromLatLonInKm(
          lastPositionRef.current.coords.latitude,
          lastPositionRef.current.coords.longitude,
          currentPosition.coords.latitude,
          currentPosition.coords.longitude
        );
        return (distance / timeDiff) * 3600; // km/h
      }
    }
    return 0;
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const speed = calculateSpeed(position);
    
    const newLocation: LocationState = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    };
    
    lastPositionRef.current = position;
    setLocation(newLocation);
    setError(null);
    setIsLoading(false);
  }, [calculateSpeed]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage: string;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
      default:
        errorMessage = 'An unknown error occurred';
    }
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<LocationState | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return null;
    }

    setIsLoading(true);
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);
          const speed = calculateSpeed(position);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp),
          });
        },
        (error) => {
          handleError(error);
          resolve(null);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handlePosition, handleError, calculateSpeed]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    setIsLoading(true);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  useEffect(() => {
    if (watchPosition) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [watchPosition, startTracking, stopTracking]);

  return {
    location,
    error,
    isLoading,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}

// Helper function to calculate distance between two points
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export { getDistanceFromLatLonInKm };
