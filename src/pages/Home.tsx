import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Settings, 
  User,
  Phone,
  Navigation,
  Shield,
  AlertTriangle,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { SOSButton } from '@/components/SOSButton';
import { RiskIndicator } from '@/components/RiskIndicator';
import { MapView } from '@/components/MapView';
import { SpeedIndicator } from '@/components/SpeedIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useRiskZones } from '@/hooks/useRiskZones';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userName, setUserName] = useState('');

  // Location tracking
  const { location, error: locationError, startTracking, isTracking } = useLocation({
    watchPosition: true,
    enableHighAccuracy: true,
  });

  // Risk zone detection
  const { riskZones, currentRisk, riskScore, nearbyRiskZone } = useRiskZones(location);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserName(data.name);
      }
    };

    fetchProfile();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Log location updates to database
  useEffect(() => {
    if (!user || !location) return;

    const logLocation = async () => {
      await supabase
        .from('location_logs')
        .insert({
          user_id: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          accuracy: location.accuracy,
        });
    };

    // Log every 30 seconds
    const interval = setInterval(logLocation, 30000);
    logLocation(); // Log immediately

    return () => clearInterval(interval);
  }, [user, location?.latitude, location?.longitude]);

  // Handle SOS
  const handleSOS = useCallback(async () => {
    if (!user || !location) {
      toast({
        title: 'Error',
        description: 'Location not available. Please enable GPS.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Create incident
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          user_id: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          alert_type: 'sos',
          risk_level: currentRisk,
          status: 'active',
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // Fetch emergency contacts
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id);

      const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const message = `🚨 EMERGENCY ALERT from ${userName || 'SHElytics User'}!\n\nI need help! My live location: ${locationUrl}\n\nSent via SHElytics Safety App`;

      // Create alerts for each contact
      if (contacts && contacts.length > 0) {
        const alertsToCreate = contacts.map(contact => ({
          incident_id: incident.id,
          contact_id: contact.id,
          sent_to_police: false,
          message,
          latitude: location.latitude,
          longitude: location.longitude,
        }));

        await supabase.from('alerts').insert(alertsToCreate);
      }

      // Create police alert
      await supabase.from('alerts').insert({
        incident_id: incident.id,
        sent_to_police: true,
        message: `EMERGENCY: ${userName || 'User'} at coordinates (${location.latitude}, ${location.longitude}) requires immediate assistance.`,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      toast({
        title: '🚨 SOS Alert Sent!',
        description: 'Emergency contacts and authorities have been notified.',
      });

      // Trigger fake call simulation
      setTimeout(() => {
        triggerFakeCall();
      }, 2000);

    } catch (error) {
      console.error('SOS Error:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, location, currentRisk, userName, toast]);

  const triggerFakeCall = () => {
    // Play ringtone and show fake call UI
    const audio = new Audio('https://www.soundjay.com/phone/phone-calling-1.mp3');
    audio.loop = true;
    audio.play().catch(() => {});

    toast({
      title: '📞 Incoming Call',
      description: 'Emergency Services is calling...',
      duration: 10000,
    });

    setTimeout(() => {
      audio.pause();
    }, 10000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-soft">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 gap-4">
        {/* Greeting */}
        <div className="slide-up">
          <h1 className="text-2xl font-bold">
            Hello, {userName ? userName.split(' ')[0] : 'there'} 👋
          </h1>
          <p className="text-muted-foreground">Stay safe, we're watching over you</p>
        </div>

        {/* Risk Indicator */}
        <div className="slide-up" style={{ animationDelay: '0.1s' }}>
          <RiskIndicator
            level={currentRisk}
            score={riskScore}
            zoneName={nearbyRiskZone?.name}
          />
        </div>

        {/* Map View */}
        <div className="flex-1 min-h-[250px] slide-up" style={{ animationDelay: '0.2s' }}>
          <MapView
            location={location}
            riskZones={riskZones}
            isLoading={!isTracking}
            className="h-full"
          />
        </div>

        {/* Speed and Location Info */}
        <div className="flex items-center justify-between p-4 glass-card rounded-2xl slide-up" style={{ animationDelay: '0.3s' }}>
          <SpeedIndicator speed={location?.speed || 0} />
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {isTracking ? 'Tracking active' : 'Starting...'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 slide-up" style={{ animationDelay: '0.4s' } as React.CSSProperties}>
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-xs">Contacts</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <Shield className="w-5 h-5 text-safe" />
            <span className="text-xs">Safe Zones</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <AlertTriangle className="w-5 h-5 text-at-risk" />
            <span className="text-xs">Report</span>
          </Button>
        </div>
      </main>

      {/* SOS Button - Fixed at bottom */}
      <div className="sticky bottom-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex justify-center">
          <SOSButton onSOS={handleSOS} isLoading={isSending} />
        </div>
      </div>

      {/* Side Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 fade-in" onClick={() => setIsMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-card shadow-lg p-6 slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <Logo size="sm" />
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-3">
                <User className="w-5 h-5" />
                Profile
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Phone className="w-5 h-5" />
                Emergency Contacts
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Shield className="w-5 h-5" />
                Safe Zones
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Settings className="w-5 h-5" />
                Settings
              </Button>
            </nav>

            <div className="absolute bottom-6 left-6 right-6">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
