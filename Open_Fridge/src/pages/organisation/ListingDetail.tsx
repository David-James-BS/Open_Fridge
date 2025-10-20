import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FoodListing } from '@/types/food';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PortionStatusBar } from '@/components/food/PortionStatusBar';
import { QRScanner } from '@/components/scanner/QRScanner';
import { isMobileDevice } from '@/utils/deviceDetection';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, MapPin, Clock, QrCode, Monitor, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function OrganisationListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<FoodListing | null>(null);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingReservation, setExistingReservation] = useState<any>(null);
  const [totalReservedPortions, setTotalReservedPortions] = useState(0);
  const [portionsToReserve, setPortionsToReserve] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const MAX_RESERVE_PERCENTAGE = 0.85;

  useEffect(() => {
    if (!user) {
      navigate('/auth/organisation');
      return;
    }
    setIsMobile(isMobileDevice());
    fetchListing();
    checkExistingReservation();
    fetchTotalReservedPortions();

    // Real-time subscription for listings
    if (id) {
      const listingChannel = supabase
        .channel(`org_listing_detail_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'food_listings',
            filter: `id=eq.${id}`
          },
          () => {
            fetchListing();
          }
        )
        .subscribe();

      // Real-time subscription for reservations
      const reservationChannel = supabase
        .channel(`org_reservations_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
            filter: `listing_id=eq.${id}`
          },
          () => {
            checkExistingReservation();
            fetchTotalReservedPortions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(listingChannel);
        supabase.removeChannel(reservationChannel);
      };
    }
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
      navigate('/organisation/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingReservation = async () => {
    if (!id || !user) return;

    try {
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('listing_id', id)
        .eq('organisation_id', user.id)
        .eq('collected', false)
        .maybeSingle();

      setExistingReservation(data);
    } catch (error) {
      console.error('Error checking reservation:', error);
    }
  };

  const fetchTotalReservedPortions = async () => {
    if (!id) return;

    try {
      // Read reserved_portions from the listing itself (maintained by trigger)
      const { data, error } = await supabase
        .from('food_listings')
        .select('reserved_portions')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      setTotalReservedPortions(data?.reserved_portions || 0);
    } catch (error) {
      console.error('Error fetching reserved portions:', error);
    }
  };

  const handleReserve = async () => {
    if (!listing || !user) return;

    // Calculate available portions (remaining - already reserved by others)
    const availableToReserve = listing.remaining_portions - totalReservedPortions;
    const maxAllowed = Math.floor(availableToReserve * MAX_RESERVE_PERCENTAGE);
    
    if (portionsToReserve > maxAllowed) {
      toast.error(`You can only reserve up to ${maxAllowed} portions (85% of available: ${availableToReserve})`);
      return;
    }

    setReserving(true);

    try {
      // Dummy payment processing - flat $50 deposit
      const depositAmount = 50;
      
      toast.info(`Processing deposit payment of $${depositAmount}...`);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create reservation with paid deposit (does NOT decrease remaining_portions)
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          listing_id: listing.id,
          organisation_id: user.id,
          portions_reserved: portionsToReserve,
          deposit_amount: depositAmount,
          deposit_status: 'paid'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Reservation successful! Deposit paid. Scan QR code to collect.');
      setExistingReservation(data);
      fetchTotalReservedPortions();
    } catch (error: any) {
      console.error('Error making reservation:', error);
      toast.error(error.message || 'Failed to make reservation');
    } finally {
      setReserving(false);
    }
  };

  const handleScanQR = () => {
    if (!isMobile) {
      toast.error('QR code scanning is only available on mobile devices');
      return;
    }

    if (!existingReservation) {
      toast.error('You need a reservation to collect food');
      return;
    }

    setShowScanner(true);
  };

  const handleQRCodeScanned = async (scannedText: string) => {
    setShowScanner(false);

    if (!listing || !existingReservation) return;

    try {
      // Extract code from URL if needed
      let scannedCode = scannedText;
      try {
        if (scannedText.startsWith('http')) {
          const url = new URL(scannedText);
          const codeParam = url.searchParams.get('code');
          if (codeParam) scannedCode = codeParam;
        }
      } catch {}

      // Verify QR code matches vendor
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

      // Navigate to collection page
      navigate(`/scan?code=${scannedCode}&listingId=${listing.id}&reservationId=${existingReservation.id}`);
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
            <Button onClick={() => navigate('/organisation/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableToReserve = listing.remaining_portions - totalReservedPortions;
  const maxAllowed = Math.floor(availableToReserve * MAX_RESERVE_PERCENTAGE);
  const collectedPortions = listing.total_portions - listing.remaining_portions;
  
  // Calculate percentages for the progress bar
  const collectedPercentage = (collectedPortions / listing.total_portions) * 100;
  const reservedPercentage = (totalReservedPortions / listing.total_portions) * 100;
  const availablePercentage = (availableToReserve / listing.total_portions) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/organisation/dashboard')}
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
          <CardTitle className="text-2xl">{listing.title}</CardTitle>
          {vendorInfo?.stall_name && (
            <p className="text-muted-foreground">by {vendorInfo.stall_name}</p>
          )}
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
            <PortionStatusBar
              totalPortions={listing.total_portions}
              remainingPortions={listing.remaining_portions}
              reservedPortions={totalReservedPortions}
            />

            {!existingReservation && listing.status === 'active' && availableToReserve > 0 && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="portions">
                    How many portions to reserve? (Max: {maxAllowed} - 85% of {availableToReserve} available)
                  </Label>
                  <Input
                    id="portions"
                    type="number"
                    min="1"
                    max={maxAllowed}
                    value={portionsToReserve}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1 && value <= maxAllowed) {
                        setPortionsToReserve(value);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deposit: $50 (flat rate). Portions will be held for you after payment.
                  </p>
                </div>
                <Button 
                  onClick={handleReserve} 
                  className="w-full" 
                  disabled={reserving || portionsToReserve > maxAllowed}
                >
                  {reserving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Reserve & Pay Deposit
                    </>
                  )}
                </Button>
              </div>
            )}

            {existingReservation && !existingReservation.collected && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Your Reservation</p>
                  <p className="text-2xl font-bold">{existingReservation.portions_reserved} portions</p>
                  <p className="text-xs text-muted-foreground">
                    Deposit paid: ${existingReservation.deposit_amount}
                  </p>
                </div>
                
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
              </div>
            )}

            {existingReservation?.collected && (
              <div className="bg-muted p-4 rounded-lg text-center">
                <Badge variant="secondary">Already Collected</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Collected on {format(new Date(existingReservation.collected_at), 'PPp')}
                </p>
              </div>
            )}

            {listing.status !== 'active' && (
              <div className="text-center py-4">
                <Badge variant="secondary">
                  This listing is {listing.status}
                </Badge>
              </div>
            )}

            {listing.status === 'active' && availableToReserve === 0 && (
              <div className="text-center py-4">
                <Badge variant="secondary">
                  {listing.remaining_portions === 0 
                    ? 'All portions have been collected' 
                    : 'All available portions have been reserved'}
                </Badge>
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
