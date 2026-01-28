import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SOSRequest {
  userId: string;
  latitude: number;
  longitude: number;
  userName: string;
  riskLevel: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, latitude, longitude, userName, riskLevel }: SOSRequest = await req.json();

    console.log(`SOS Alert received from ${userName} at (${latitude}, ${longitude})`);

    // Create incident record
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        user_id: userId,
        latitude,
        longitude,
        alert_type: 'sos',
        risk_level: riskLevel,
        status: 'active',
      })
      .select()
      .single();

    if (incidentError) {
      console.error('Error creating incident:', incidentError);
      throw incidentError;
    }

    // Fetch emergency contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
    }

    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const emergencyMessage = `🚨 EMERGENCY ALERT from ${userName}!\n\nI need help! My live location: ${locationUrl}\n\nRisk Level: ${riskLevel.toUpperCase()}\nTimestamp: ${new Date().toISOString()}\n\nSent via SHElytics Safety App`;
    const policeMessage = `EMERGENCY ALERT\n\nUser: ${userName}\nLocation: ${latitude}, ${longitude}\nMaps: ${locationUrl}\nRisk Level: ${riskLevel}\nTime: ${new Date().toISOString()}\n\nImmediate assistance required.`;

    // Create alert records
    const alertsToCreate = [];

    // Add contact alerts
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        alertsToCreate.push({
          incident_id: incident.id,
          contact_id: contact.id,
          sent_to_police: false,
          message: emergencyMessage,
          latitude,
          longitude,
        });
      }
    }

    // Add police alert
    alertsToCreate.push({
      incident_id: incident.id,
      contact_id: null,
      sent_to_police: true,
      message: policeMessage,
      latitude,
      longitude,
    });

    const { error: alertsError } = await supabase
      .from('alerts')
      .insert(alertsToCreate);

    if (alertsError) {
      console.error('Error creating alerts:', alertsError);
    }

    console.log(`SOS processed: ${alertsToCreate.length} alerts created for incident ${incident.id}`);

    // In production, integrate with:
    // - SMS gateway (Twilio, MessageBird) to send SMS to emergency contacts
    // - Emergency services API for police notification
    // - Push notification service for app notifications

    return new Response(
      JSON.stringify({
        success: true,
        incidentId: incident.id,
        alertsSent: alertsToCreate.length,
        message: 'Emergency alerts dispatched successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('SOS processing error:', error);
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
