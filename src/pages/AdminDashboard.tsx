import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  MapPin,
  Activity,
  Clock,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Incident, RiskZone } from '@/types';

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  totalUsers: number;
  riskZones: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    activeIncidents: 0,
    totalUsers: 0,
    riskZones: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      try {
        // Fetch incidents count
        const { count: totalIncidents } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true });

        const { count: activeIncidents } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch profiles count
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch risk zones
        const { data: zonesData, count: zonesCount } = await supabase
          .from('risk_zones')
          .select('*', { count: 'exact' });

        // Fetch recent incidents
        const { data: incidentsData } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setStats({
          totalIncidents: totalIncidents || 0,
          activeIncidents: activeIncidents || 0,
          totalUsers: totalUsers || 0,
          riskZones: zonesCount || 0,
        });

        setRiskZones((zonesData as RiskZone[]) || []);
        setRecentIncidents((incidentsData as Incident[]) || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Set up realtime subscription for incidents
    const channel = supabase
      .channel('admin-incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('Incident update:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    color 
  }: { 
    icon: any; 
    title: string; 
    value: number; 
    color: string;
  }) => (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-emergency text-emergency-foreground';
      case 'at_risk': return 'bg-at-risk text-at-risk-foreground';
      default: return 'bg-safe text-safe-foreground';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-soft">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Logo size="sm" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
          <RefreshCw className="w-5 h-5" />
        </Button>
      </header>

      <main className="p-4 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor safety analytics and incidents</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={AlertTriangle} 
            title="Total Incidents" 
            value={stats.totalIncidents}
            color="bg-emergency"
          />
          <StatCard 
            icon={Activity} 
            title="Active Alerts" 
            value={stats.activeIncidents}
            color="bg-at-risk"
          />
          <StatCard 
            icon={Users} 
            title="Users" 
            value={stats.totalUsers}
            color="bg-primary"
          />
          <StatCard 
            icon={MapPin} 
            title="Risk Zones" 
            value={stats.riskZones}
            color="bg-accent"
          />
        </div>

        {/* Recent Incidents */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Incidents</h2>
          {recentIncidents.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Shield className="w-12 h-12 mx-auto text-safe mb-3" />
              <p className="text-muted-foreground">No incidents reported yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(incident.risk_level || 'safe')}`}>
                      {incident.alert_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      incident.status === 'active' 
                        ? 'bg-emergency/20 text-emergency' 
                        : incident.status === 'pending'
                        ? 'bg-at-risk/20 text-at-risk'
                        : 'bg-safe/20 text-safe'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(incident.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk Zones */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Risk Zones</h2>
          <div className="space-y-3">
            {riskZones.map((zone) => (
              <div key={zone.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{zone.name || 'Unnamed Zone'}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(zone.risk_level)}`}>
                    {Math.round(zone.risk_score * 100)}% Risk
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Radius: {zone.radius_meters}m</span>
                  <span>Incidents: {zone.incident_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
