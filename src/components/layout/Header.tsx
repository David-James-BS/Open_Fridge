import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './MobileNav';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { NotificationsDropdown } from './NotificationsDropdown';

export function Header() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <MobileNav />
        
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <h1 className="text-lg font-bold">Nourish NextDoor</h1>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            {role === 'vendor' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/vendor/profile')}
              >
                <User className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
