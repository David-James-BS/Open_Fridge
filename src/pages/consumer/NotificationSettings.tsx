import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';

interface FollowedVendor {
  id: string;
  vendor_id: string;
  vendor_name: string;
  stall_name: string;
  created_at: string;
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [followedVendors, setFollowedVendors] = useState<FollowedVendor[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/consumer');
      return;
    }
    fetchFollowedVendors();
  }, [user]);

  const fetchFollowedVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_followers')
        .select(`
          id,
          vendor_id,
          created_at
        `)
        .eq('consumer_id', user?.id);

      if (error) throw error;

      // Fetch vendor details
      const vendorIds = data.map(f => f.vendor_id);
      const { data: vendorData } = await supabase
        .from('profiles')
        .select('id, stall_name, email')
        .in('id', vendorIds);

      const vendorMap = new Map(vendorData?.map(v => [v.id, v]) || []);

      const followedWithDetails = data.map(follow => ({
        ...follow,
        vendor_name: vendorMap.get(follow.vendor_id)?.email || 'Unknown',
        stall_name: vendorMap.get(follow.vendor_id)?.stall_name || 'Unknown Vendor'
      }));

      setFollowedVendors(followedWithDetails);
    } catch (error) {
      console.error('Error fetching followed vendors:', error);
      toast.error('Failed to load followed vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followId: string, stallName: string) => {
    try {
      const { error } = await supabase
        .from('vendor_followers')
        .delete()
        .eq('id', followId);

      if (error) throw error;

      setFollowedVendors(prev => prev.filter(f => f.id !== followId));
      toast.success(`Unfollowed ${stallName}`);
    } catch (error: any) {
      console.error('Error unfollowing vendor:', error);
      toast.error(error.message || 'Failed to unfollow vendor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/consumer/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Manage which vendors you follow. You'll receive notifications when they post new food listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followedVendors.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                You're not following any vendors yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Click the "Follow Vendor" button on any food listing to get notified about their new posts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {followedVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{vendor.stall_name}</p>
                    <p className="text-sm text-muted-foreground">{vendor.vendor_name}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnfollow(vendor.id, vendor.stall_name)}
                  >
                    Unfollow
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
