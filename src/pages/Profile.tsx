import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Phone, MapPin, LogOut, ChevronRight, Settings, HelpCircle, FileText } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  const { panchayats } = useLocation();

  const panchayat = panchayats.find(p => p.id === profile?.panchayat_id);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pb-20">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Login to view profile</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Sign in to access your account
        </p>
        <Button className="mt-6" onClick={() => navigate('/auth')}>
          Login / Sign Up
        </Button>
        <BottomNav />
      </div>
    );
  }

  const menuItems = [
    { icon: Settings, label: 'Account Settings', path: '/settings' },
    { icon: MapPin, label: 'Saved Addresses', path: '/addresses' },
    { icon: HelpCircle, label: 'Help & Support', path: '/support' },
    { icon: FileText, label: 'Terms & Conditions', path: '/terms' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">Profile</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{profile?.name || 'User'}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{profile?.mobile_number}</span>
                </div>
                {(panchayat || profile?.ward_number) && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {profile?.ward_number && `Ward ${profile.ward_number}`}
                      {profile?.ward_number && panchayat && ', '}
                      {panchayat?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Access (if applicable) */}
        {(role === 'super_admin' || role === 'admin') && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <Button 
                className="w-full justify-between" 
                variant="outline"
                onClick={() => navigate('/admin')}
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Admin Dashboard
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <React.Fragment key={item.path}>
                <button
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/50"
                  onClick={() => navigate(item.path)}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                {index < menuItems.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card>
          <CardContent className="p-0">
            <button
              className="flex w-full items-center gap-3 p-4 text-left text-destructive transition-colors hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </CardContent>
        </Card>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground">
          Penny Carbs v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
