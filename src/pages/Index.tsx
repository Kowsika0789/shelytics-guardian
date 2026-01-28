import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, Bell, Users, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const features = [
  {
    icon: Shield,
    title: 'Real-time Protection',
    description: 'AI-powered risk detection keeps you safe 24/7',
  },
  {
    icon: MapPin,
    title: 'Location Tracking',
    description: 'Share your live location with trusted contacts',
  },
  {
    icon: Bell,
    title: 'Instant SOS Alerts',
    description: 'One-tap emergency alerts to contacts & authorities',
  },
  {
    icon: Users,
    title: 'Emergency Network',
    description: 'Connect with nearby help when you need it',
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, signIn, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (user && !authLoading) {
    navigate('/home');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        navigate('/home');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-6">
          <button onClick={() => setShowLogin(false)} className="text-muted-foreground">
            ← Back
          </button>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex flex-col justify-center px-6 pb-12">
          <div className="mb-8 text-center">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your safety dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto w-full">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <button
              className="text-primary font-medium"
              onClick={() => navigate('/onboarding')}
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 slide-up">
          <Logo size="xl" className="justify-center" />
        </div>

        {/* Tagline */}
        <div className="text-center mb-12 slide-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold mb-3 text-balance">
            Your Safety,{' '}
            <span className="gradient-text">Our Priority</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Empowering women with AI-powered safety analytics and real-time protection
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-4 slide-up"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="p-6 space-y-3 slide-up" style={{ animationDelay: '0.6s' }}>
        <Button
          className="w-full h-14 text-lg"
          onClick={() => navigate('/onboarding')}
        >
          Get Started
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          variant="outline"
          className="w-full h-14"
          onClick={() => setShowLogin(true)}
        >
          I already have an account
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-xs text-muted-foreground">
        <p>By continuing, you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}
