import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FoodListing } from '@/types/food';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QRScanner } from '@/components/scanner/QRScanner';
import { isMobileDevice } from '@/utils/deviceDetection';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, MapPin, Clock, QrCode, Heart, HeartOff, Monitor } from 'lucide-react';
import { format } from 'date-fns';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<FoodListing | null>(null);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth/consumer');
      return;
    }
    setIsMobile(isMobileDevice());
    fetchListing();
    checkFollowStatus();
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setListing(data);

      // Fetch vendor info
      const { data: vendorData } = await supabase
        .from('profiles')
        .select('stall_name, location, phone')
        .eq('id', data.vendor_id)
        .single();

      setVendorInfo(vendorData);
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
      navigate('/consumer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!listing) return;

    try {
      const { data } = await supabase
        .from('vendor_followers')
        .select('id')
        .eq('consumer_id', user?.id)
        .eq('vendor_id', listing.vendor_id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!listing) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('vendor_followers')
          .delete()
          .eq('consumer_id', user?.id)
          .eq('vendor_id', listing.vendor_id);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('Unfollowed vendor');
      } else {
        const { error } = await supabase
          .from('vendor_followers')
          .insert({
            consumer_id: user?.id,
            vendor_id: listing.vendor_id
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success('Following vendor - you\'ll be notified of new listings');
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleScanQR = () => {
    if (!isMobile) {
      toast.error('QR code scanning is only available on mobile devices');
      return;
    }

    if (!listing) return;
    setShowScanner(true);
  };

  const handleQRCodeScanned = async (scannedCode: string) => {
    setShowScanner(false);

    if (!listing) return;

    try {
      // Verify the scanned QR code belongs to this listing's vendor
      const { data: qrData, error } = await supabase
        .from('vendor_qr_codes')
        .select('vendor_id')
        .eq('qr_code', scannedCode)
        .single();

      if (error) throw error;

      if (qrData.vendor_id !== listing.vendor_id) {
        toast.error('This QR code does not match the selected listing');
        return;
      }

      // Navigate to portions input page
      navigate(`/scan?code=${scannedCode}&listingId=${listing.id}`);
    } catch (error) {
      console.error('Error validating QR code:', error);
      toast.error('Invalid QR code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Listing not found</p>
            <Button onClick={() => navigate('/consumer/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentageLeft = (listing.remaining_portions / listing.total_portions) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/consumer/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Listings
      </Button>

      <Card>
        <div className="relative h-64 md:h-96">
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-t-lg" />
          )}
        </div>

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{listing.title}</CardTitle>
              {vendorInfo?.stall_name && (
                <p className="text-muted-foreground mt-1">by {vendorInfo.stall_name}</p>
              )}
            </div>
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <HeartOff className="h-4 w-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Follow Vendor
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {listing.description && (
            <p className="text-muted-foreground">{listing.description}</p>
          )}

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>{listing.location}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Best before: {format(new Date(listing.best_before), 'PPp')}</span>
            </div>

            {vendorInfo?.phone && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Contact:</span>
                <span>{vendorInfo.phone}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              {listing.cuisine}
            </Badge>
            {listing.dietary_info.map((diet) => (
              <Badge key={diet} variant="outline" className="text-sm">
                {diet.replace('_', ' ')}
              </Badge>
            ))}
          </div>

          <div className="border-t pt-6 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Available Portions</span>
                <span className="font-medium">
                  {listing.remaining_portions} of {listing.total_portions}
                </span>
              </div>
              <Progress value={percentageLeft} className="h-3" />
            </div>

            {listing.status === 'active' && listing.remaining_portions > 0 && (
              <>
                <Button 
                  onClick={handleScanQR} 
                  size="lg" 
                  className="w-full"
                  disabled={!isMobile}
                >
                  {isMobile ? (
                    <>
                      <QrCode className="h-5 w-5 mr-2" />
                      Scan QR Code to Collect
                    </>
                  ) : (
                    <>
                      <Monitor className="h-5 w-5 mr-2" />
                      QR Scanning Available on Mobile Only
                    </>
                  )}
                </Button>
                {!isMobile && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please access this page from a mobile device to scan the vendor's QR code
                  </p>
                )}
              </>
            )}

            {listing.status !== 'active' && (
              <div className="text-center py-4">
                <Badge variant="secondary">
                  This listing is {listing.status}
                </Badge>
              </div>
            )}

            {listing.status === 'active' && listing.remaining_portions === 0 && (
              <div className="text-center py-4">
                <Badge variant="secondary">All portions have been collected</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showScanner && (
        <QRScanner 
          onScan={handleQRCodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
