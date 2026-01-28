import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  MapPin, 
  Bell, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingState } from '@/types';

const steps = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Authentication', icon: Phone },
  { id: 3, title: 'Emergency Contacts', icon: Users },
  { id: 4, title: 'Location Access', icon: MapPin },
  { id: 5, title: 'Notifications', icon: Bell },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    name: '',
    age: '',
    address: '',
    email: '',
    phone: '',
    password: '',
    emergencyContacts: [{ name: '', phone: '', relationship: '', is_primary: true }],
    gpsPermission: null,
    notificationPermission: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addEmergencyContact = () => {
    updateState({
      emergencyContacts: [
        ...state.emergencyContacts,
        { name: '', phone: '', relationship: '', is_primary: false },
      ],
    });
  };

  const removeEmergencyContact = (index: number) => {
    if (state.emergencyContacts.length > 1) {
      updateState({
        emergencyContacts: state.emergencyContacts.filter((_, i) => i !== index),
      });
    }
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const updated = [...state.emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    updateState({ emergencyContacts: updated });
  };

  const requestGPSPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'granted') {
        updateState({ gpsPermission: true });
      } else if (result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(
          () => updateState({ gpsPermission: true }),
          () => updateState({ gpsPermission: false })
        );
      } else {
        updateState({ gpsPermission: false });
      }
    } catch {
      // Fallback for browsers that don't support permissions API
      navigator.geolocation.getCurrentPosition(
        () => updateState({ gpsPermission: true }),
        () => updateState({ gpsPermission: false })
      );
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      updateState({ notificationPermission: result === 'granted' });
    } else {
      updateState({ notificationPermission: false });
    }
  };

  const handleNext = async () => {
    if (state.step === 2) {
      // Create account
      setIsLoading(true);
      try {
        const { error } = await signUp(state.email, state.password);
        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to create account',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (state.step === 4) {
      await requestGPSPermission();
    }

    if (state.step === 5) {
      await requestNotificationPermission();
    }

    if (state.step < 5) {
      updateState({ step: state.step + 1 });
    } else {
      // Complete onboarding - save profile and contacts
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please sign in first',
          variant: 'destructive',
        });
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          name: state.name,
          age: parseInt(state.age) || null,
          address: state.address,
          phone: state.phone,
        });

      if (profileError) throw profileError;

      // Create emergency contacts
      const contactsToInsert = state.emergencyContacts
        .filter(c => c.name && c.phone)
        .map(c => ({
          user_id: user.id,
          name: c.name,
          phone: c.phone,
          relationship: c.relationship || null,
          is_primary: c.is_primary,
        }));

      if (contactsToInsert.length > 0) {
        const { error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      // Create user preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          gps_enabled: state.gpsPermission ?? false,
          notifications_enabled: state.notificationPermission ?? false,
        });

      if (prefsError) throw prefsError;

      toast({
        title: 'Welcome to SHElytics! 🛡️',
        description: 'Your safety profile has been created.',
      });

      navigate('/home');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.name.trim().length > 0;
      case 2:
        return state.email.includes('@') && state.password.length >= 6;
      case 3:
        return state.emergencyContacts.some(c => c.name && c.phone);
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="space-y-4 slide-up">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={state.name}
                onChange={e => updateState({ name: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Your age"
                value={state.age}
                onChange={e => updateState({ age: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Your home address"
                value={state.address}
                onChange={e => updateState({ address: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 slide-up">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={state.email}
                onChange={e => updateState({ email: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={state.phone}
                onChange={e => updateState({ phone: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={state.password}
                onChange={e => updateState({ password: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 slide-up">
            <p className="text-sm text-muted-foreground">
              Add trusted contacts who will be notified during emergencies.
            </p>
            {state.emergencyContacts.map((contact, index) => (
              <div key={index} className="p-4 rounded-xl bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contact {index + 1}</span>
                  {state.emergencyContacts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmergencyContact(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Name"
                  value={contact.name}
                  onChange={e => updateEmergencyContact(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="Phone Number"
                  value={contact.phone}
                  onChange={e => updateEmergencyContact(index, 'phone', e.target.value)}
                />
                <Input
                  placeholder="Relationship (e.g., Mother, Friend)"
                  value={contact.relationship}
                  onChange={e => updateEmergencyContact(index, 'relationship', e.target.value)}
                />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={addEmergencyContact}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Contact
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 slide-up text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Enable Location Access</h3>
              <p className="text-sm text-muted-foreground">
                SHElytics needs your location to provide real-time safety alerts and emergency assistance.
              </p>
            </div>
            {state.gpsPermission === null ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updateState({ gpsPermission: false })}
                >
                  Don't Allow
                </Button>
                <Button
                  className="flex-1"
                  onClick={requestGPSPermission}
                >
                  Allow
                </Button>
              </div>
            ) : (
              <div className={`p-4 rounded-xl ${state.gpsPermission ? 'bg-safe/10 text-safe' : 'bg-at-risk/10 text-at-risk'}`}>
                <Check className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">
                  {state.gpsPermission ? 'Location access granted!' : 'Location access denied'}
                </p>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 slide-up text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
              <Bell className="w-10 h-10 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Enable Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Get instant alerts about potential risks and safety updates in your area.
              </p>
            </div>
            {state.notificationPermission === null ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updateState({ notificationPermission: false })}
                >
                  Don't Allow
                </Button>
                <Button
                  className="flex-1"
                  onClick={requestNotificationPermission}
                >
                  Allow
                </Button>
              </div>
            ) : (
              <div className={`p-4 rounded-xl ${state.notificationPermission ? 'bg-safe/10 text-safe' : 'bg-at-risk/10 text-at-risk'}`}>
                <Check className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">
                  {state.notificationPermission ? 'Notifications enabled!' : 'Notifications disabled'}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Logo size="sm" />
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 ${index !== steps.length - 1 ? 'relative' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                  step.id <= state.step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id < state.step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    step.id < state.step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Step {state.step} of {steps.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6">
        <h2 className="text-2xl font-bold mb-6">{steps[state.step - 1].title}</h2>
        {renderStep()}
      </div>

      {/* Footer */}
      <div className="p-6 flex gap-3">
        {state.step > 1 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => updateState({ step: state.step - 1 })}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={handleNext}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            'Processing...'
          ) : state.step === 5 ? (
            <>
              Complete Setup
              <Shield className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
