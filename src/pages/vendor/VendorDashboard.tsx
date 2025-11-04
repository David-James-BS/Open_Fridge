import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FoodListing } from "@/types/food";
import { DeleteAccountDialog } from "@/components/shared/DeleteAccountDialog";
import { PortionStatusBar } from "@/components/food/PortionStatusBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeListings, setActiveListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActiveListings();

      const channel = supabase
        .channel('food_listings_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'food_listings',
            filter: `vendor_id=eq.${user.id}`
          },
          () => {
            fetchActiveListings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchActiveListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("vendor_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setActiveListings(data || []);
    } catch (error: any) {
      console.error("Error fetching active listings:", error);
      toast.error("Failed to load your active listings");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;

    try {
      const { error } = await supabase
        .from("food_listings")
        .update({ status: "cancelled" })
        .eq("id", listingToDelete);

      if (error) throw error;

      toast.success("Listing cancelled successfully");
      setDeleteDialogOpen(false);
      setListingToDelete(null);
      fetchActiveListings();
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to cancel listing");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const hasReachedLimit = activeListings.length >= 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {activeListings.length} of 5 active listings
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => navigate("/vendor/create-listing")} 
            disabled={hasReachedLimit}
          >
            {hasReachedLimit ? "Max Listings Reached" : "Create New Listing"}
          </Button>
          <Button onClick={() => navigate("/vendor/qr-code")} variant="default">
            View QR Code
          </Button>
          <Button onClick={() => navigate("/vendor/history")} variant="outline">
            View History
          </Button>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
          <Button
            onClick={() => setDeleteAccountDialogOpen(true)}
            variant="destructive"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {hasReachedLimit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          You have reached the maximum of 5 active listings. Please cancel or complete a listing to create a new one.
        </div>
      )}

      {activeListings.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeListings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="p-6">
                {listing.image_url && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{listing.title}</h2>
                    {listing.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2">{listing.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="line-clamp-1">{listing.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Best Before: {format(new Date(listing.best_before), "PPp")}</span>
                    </div>
                  </div>

                  <PortionStatusBar
                    totalPortions={listing.total_portions}
                    remainingPortions={listing.remaining_portions}
                    reservedPortions={listing.reserved_portions || 0}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{listing.cuisine}</Badge>
                    {listing.dietary_info.slice(0, 2).map((diet) => (
                      <Badge key={diet} variant="outline">
                        {diet.replace("_", " ")}
                      </Badge>
                    ))}
                    {listing.dietary_info.length > 2 && (
                      <Badge variant="outline">+{listing.dietary_info.length - 2} more</Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => navigate(`/vendor/edit-listing/${listing.id}`)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => {
                        setListingToDelete(listing.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">No Active Listings</h2>
              <p className="text-muted-foreground">
                You don't have any active food listings at the moment.
              </p>
              <Button onClick={() => navigate("/vendor/create-listing")}>
                Create New Listing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel this listing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteListing}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteAccountDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen} userRole="vendor" />
    </div>
  );
}
