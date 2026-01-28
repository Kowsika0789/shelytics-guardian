export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  address: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface LocationLog {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  timestamp: string;
}

export interface RiskZone {
  id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  risk_score: number;
  risk_level: 'safe' | 'at_risk' | 'emergency';
  incident_count: number;
  time_of_day_risk: Record<string, number>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  alert_type: 'sos' | 'risk_zone_entry' | 'auto_alert';
  status: 'active' | 'resolved' | 'pending';
  risk_level: 'safe' | 'at_risk' | 'emergency' | null;
  description: string | null;
  audio_url: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Alert {
  id: string;
  incident_id: string;
  contact_id: string | null;
  sent_to_police: boolean;
  message: string;
  latitude: number;
  longitude: number;
  sent_at: string;
  delivered: boolean;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  gps_enabled: boolean;
  background_tracking: boolean;
  auto_alert_on_risk_zone: boolean;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = 'safe' | 'at_risk' | 'emergency';

export interface LocationState {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  timestamp: Date;
}

export interface OnboardingState {
  step: number;
  name: string;
  age: string;
  address: string;
  email: string;
  phone: string;
  password: string;
  emergencyContacts: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at'>[];
  gpsPermission: boolean | null;
  notificationPermission: boolean | null;
}
