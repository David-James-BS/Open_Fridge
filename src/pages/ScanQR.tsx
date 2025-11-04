import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MapPin, Clock, CheckCircle } from 'lucide-react';
import { FoodListing } from '@/types/food';
import { format } from 'date-fns';

export default function ScanQR() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrCode = searchParams.get('code');
  const listingId = searchParams.get('listingId');
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listing, setListing] = useState<FoodListing | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [portionText, setPortionText] = useState('1');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to scan QR codes');
      navigate('/');
      return;
    }

    fetchListingData();
  }, [qrCode, user]);

  const fetchListingData = async () => {
    if (!qrCode || !user) return;

    try {
      // Get vendor from QR code
      const { data: qrData, error: qrError } = await supabase
        .from('vendor_qr_codes')
        .select('vendor_id')
        .eq('qr_code', qrCode)
        .single();

      if (qrError) throw qrError;

      // If listingId is provided, fetch that specific listing
      // Otherwise, get the active listing from this vendor
      let listingData;
      if (listingId) {
        const { data, error: listingError } = await supabase
          .from('food_listings')
          .select('*')
          .eq('id', listingId)
          .eq('vendor_id', qrData.vendor_id)
          .single();

        if (listingError) throw listingError;
        listingData = data;
      } else {
        const { data, error: listingError } = await supabase
          .from('food_listings')
          .select('*')
          .eq('vendor_id', qrData.vendor_id)
          .eq('status', 'active')
          .maybeSingle();

        if (listingError) throw listingError;
        listingData = data;
      }

      if (!listingData) {
        toast.error('No active listing available from this vendor');
        return;
      }

      setListing(listingData);

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData.role);

      // If charitable organization, get their reservation
      if (roleData.role === 'charitable_organisation') {
        const { data: resData } = await supabase
          .from('reservations')
          .select('*')
          .eq('listing_id', listingData.id)
          .eq('organisation_id', user.id)
          .eq('collected', false)
          .maybeSingle();

        setReservation(resData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load listing information');
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!user || !listing) return;

    setProcessing(true);

    try {
      const maxAllowed = Math.min(5, listing.remaining_portions);
      const entered = parseInt(portionText || '1', 10);
      const portionsVal = userRole === 'consumer' ? Math.min(maxAllowed, Math.max(1, isNaN(entered) ? 1 : entered)) : undefined;
      const body: any = { qrCode };
      if (userRole === 'consumer') {
        body.portionsToCollect = portionsVal;
      }
      if (userRole === 'charitable_organisation') {
        body.reservationId = reservation?.id || null;
      }

      const { data, error } = await supabase.functions.invoke('validate-qr-scan', {
        body,
      });

      // Check for errors in multiple places
      if (error) {
        const errorMessage = error.context?.body?.error || error.message || 'Failed to collect food';
        throw new Error(errorMessage);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error('Failed to collect food');
      }

      setSuccess(true);
      toast.success('Food collected successfully!');
      
      // Refresh listing data
      setTimeout(() => {
        fetchListingData();
      }, 1500);
    } catch (error: any) {
      console.error('Error collecting food:', error);
      toast.error(error.message || 'Failed to collect food');
    } finally {
      setProcessing(false);
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
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No active listing found</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">Successfully Collected!</h2>
            <p className="text-muted-foreground">
              You have collected {userRole === 'charitable_organisation' ? reservation?.portions_reserved : (parseInt(portionText || '1', 10) || 1)} portion(s)
            </p>
            <Button onClick={() => navigate('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card>
        <div className="relative h-48 md:h-64">
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
          <CardTitle>{listing.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {listing.description && (
            <p className="text-muted-foreground">{listing.description}</p>
          )}

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{listing.location}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Best before: {format(new Date(listing.best_before), 'PPp')}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{listing.cuisine}</Badge>
            {listing.dietary_info.map((diet) => (
              <Badge key={diet} variant="outline">
                {diet.replace('_', ' ')}
              </Badge>
            ))}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Available portions: <span className="font-medium text-foreground">{listing.remaining_portions}</span>
            </p>

            {userRole === 'consumer' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="portions">How many portions? (1-5, max {Math.min(5, listing.remaining_portions)})</Label>
                  <Input
                    id="portions"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={portionText}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (raw === '') {
                        setPortionText('');
                        return;
                      }
                      const max = Math.min(5, listing.remaining_portions);
                      const val = parseInt(raw, 10);
                      const clamped = Math.min(max, Math.max(1, isNaN(val) ? 1 : val));
                      setPortionText(String(clamped));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const max = Math.min(5, listing.remaining_portions);
                      const val = parseInt(raw || '1', 10);
                      const clamped = Math.min(max, Math.max(1, isNaN(val) ? 1 : val));
                      setPortionText(String(clamped));
                    }}
                    className="mt-2"
                  />
                </div>
                <Button 
                  onClick={handleCollect} 
                  className="w-full" 
                  disabled={
                    processing ||
                    (parseInt(portionText || '0', 10) || 0) < 1 ||
                    (parseInt(portionText || '0', 10) || 0) > listing.remaining_portions
                  }
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Collecting...
                    </>
                  ) : (
                    `Collect ${parseInt(portionText || '1', 10) || 1} Portion${(parseInt(portionText || '1', 10) || 1) > 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            )}

            {userRole === 'charitable_organisation' && reservation && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium">Your Reservation</p>
                  <p className="text-2xl font-bold">{reservation.portions_reserved} portions</p>
                </div>
                <Button 
                  onClick={handleCollect} 
                  className="w-full" 
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming Collection...
                    </>
                  ) : (
                    'Confirm Collection'
                  )}
                </Button>
              </div>
            )}

            {userRole === 'charitable_organisation' && !reservation && (
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  You don't have a reservation for this listing
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
