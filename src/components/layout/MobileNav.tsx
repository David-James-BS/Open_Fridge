import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Plus, QrCode, User, Bell, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, signOut } = useAuth();

  const getNavItems = () => {
    switch (role) {
      case 'consumer':
        return [
          { icon: Home, label: 'Home', path: '/consumer/dashboard' },
          { icon: QrCode, label: 'Scan QR', path: '/scan' },
          { icon: History, label: 'My Collections', path: '/consumer/collections' },
          { icon: Bell, label: 'Notifications', path: '/consumer/notifications' },
        ];
      case 'vendor':
        return [
          { icon: Home, label: 'Dashboard', path: '/vendor/dashboard' },
          { icon: Plus, label: 'Create Listing', path: '/vendor/create-listing' },
          { icon: QrCode, label: 'My QR Code', path: '/vendor/qr-code' },
          { icon: History, label: 'History', path: '/vendor/history' },
          { icon: Bell, label: 'Notifications', path: '/vendor/notifications' },
        ];
      case 'charitable_organisation':
        return [
          { icon: Home, label: 'Home', path: '/organisation/dashboard' },
          { icon: History, label: 'My Reservations', path: '/organisation/reservations' },
          { icon: QrCode, label: 'Scan QR', path: '/scan' },
          { icon: Bell, label: 'Notifications', path: '/organisation/notifications' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2">
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
