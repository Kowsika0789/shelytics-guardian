import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RiskCheckRequest {
  latitude: number;
  longitude: number;
  userId?: string;
}

// Calculate distance between two coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { latitude, longitude, userId }: RiskCheckRequest = await req.json();

    console.log(`Risk check for location: (${latitude}, ${longitude})`);

    // Fetch all risk zones
    const { data: riskZones, error: zonesError } = await supabase
      .from('risk_zones')
      .select('*');

    if (zonesError) {
      throw zonesError;
    }

    // Check if user is in any risk zone
    let highestRisk = {
      level: 'safe' as 'safe' | 'at_risk' | 'emergency',
      score: 0,
      zone: null as any,
      inZone: false,
    };

    const hour = new Date().getHours();
    const timeOfDay = hour >= 18 || hour < 6 ? 'night' : 'day';

    for (const zone of riskZones || []) {
      const distance = getDistanceInMeters(latitude, longitude, zone.latitude, zone.longitude);
      
      if (distance <= zone.radius_meters) {
        // User is within this risk zone
        const timeRisk = zone.time_of_day_risk?.[timeOfDay] || zone.risk_score;
        
        if (timeRisk > highestRisk.score) {
          highestRisk = {
            level: zone.risk_level,
            score: timeRisk,
            zone: zone,
            inZone: true,
          };
        }
      } else if (distance <= zone.radius_meters * 1.5) {
        // User is approaching a risk zone
        const approachingScore = zone.risk_score * 0.5;
        if (approachingScore > highestRisk.score && highestRisk.level === 'safe') {
          highestRisk = {
            level: 'at_risk',
            score: approachingScore,
            zone: zone,
            inZone: false,
          };
        }
      }
    }

    // If user entered a high-risk zone, create auto-alert for emergency contacts
    if (highestRisk.inZone && highestRisk.level === 'emergency' && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .single();

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('auto_alert_on_risk_zone')
        .eq('user_id', userId)
        .single();

      if (prefs?.auto_alert_on_risk_zone) {
        // Create auto-alert incident
        const { data: incident } = await supabase
          .from('incidents')
          .insert({
            user_id: userId,
            latitude,
            longitude,
            alert_type: 'risk_zone_entry',
            risk_level: highestRisk.level,
            status: 'pending',
            description: `Auto-alert: Entered ${highestRisk.zone?.name || 'high-risk zone'}`,
          })
          .select()
          .single();

        if (incident) {
          // Fetch and alert emergency contacts
          const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', userId);

          if (contacts && contacts.length > 0) {
            const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
            const alertMessage = `⚠️ Safety Alert: ${profile?.name || 'Your contact'} has entered a high-risk area.\n\nZone: ${highestRisk.zone?.name || 'Unknown'}\nLocation: ${locationUrl}\n\nThis is an automatic safety notification from SHElytics.`;

            const alertsToCreate = contacts.map(contact => ({
              incident_id: incident.id,
              contact_id: contact.id,
              sent_to_police: false,
              message: alertMessage,
              latitude,
              longitude,
            }));

            await supabase.from('alerts').insert(alertsToCreate);

            console.log(`Auto-alert sent to ${contacts.length} contacts for risk zone entry`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        riskLevel: highestRisk.level,
        riskScore: highestRisk.score,
        inRiskZone: highestRisk.inZone,
        zoneName: highestRisk.zone?.name || null,
        zoneDescription: highestRisk.zone?.description || null,
        nearbyZones: riskZones?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Risk check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
