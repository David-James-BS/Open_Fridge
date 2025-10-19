import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function DeleteAccountDialog({ open, onOpenChange, userRole }: DeleteAccountDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const getWarningMessage = () => {
    switch (userRole) {
      case 'vendor':
        return 'Deleting your account will permanently remove all your food listings and data.';
      case 'charitable_organisation':
        return 'Deleting your account will permanently remove all your reservations and data.';
      case 'admin':
        return 'Deleting your admin account will free up a slot for another admin to be created.';
      default:
        return 'This action cannot be undone. All your data will be permanently deleted.';
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to confirm deletion',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Sign out and clear local storage
      await supabase.auth.signOut();
      localStorage.clear();

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });

      // Redirect to home page
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Deletion failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p className="font-semibold text-foreground">{getWarningMessage()}</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Enter your password to confirm</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Type DELETE to confirm</Label>
                <Input
                  id="confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE' || !password}
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
