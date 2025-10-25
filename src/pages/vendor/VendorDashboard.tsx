import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FoodListing } from "@/types/food";
import { DeleteAccountDialog } from "@/components/shared/DeleteAccountDialog";
import { PortionStatusBar } from "@/components/food/PortionStatusBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogDelete,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, QrCode, Edit, X, Clock, MapPin, LogOut, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeListing, setActiveListing] = useState<FoodListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchActiveListing();

    // Set up realtime subscription for listings
    const listingsChannel = supabase
      .channel("vendor_listings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
          filter: `vendor_id=eq.${user.id}`,
        },
        () => {
          fetchActiveListing();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listingsChannel);
    };
  }, [user]);

  const fetchActiveListing = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("vendor_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      setActiveListing(data);
    } catch (error) {
      console.error("Error fetching active listing:", error);
      toast.error("Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!activeListing || !user) return;

    try {
      const { error } = await supabase
        .from("food_listings")
        .update({ status: "deleted" })
        .eq("id", activeListing.id)
        .eq("vendor_id", user.id);

      if (error) throw error;

      toast.success("Listing deleted");
      fetchActiveListing();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing");
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
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/vendor/qr-code")} variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            My QR Code
          </Button>
          {!activeListing && (
            <Button onClick={() => navigate("/vendor/create-listing")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          )}
        </div>
      </div>

      {activeListing ? (
        <Card className="overflow-hidden">
          <div className="relative h-48 md:h-64">
            {activeListing.image_url ? (
              <img src={activeListing.image_url} alt={activeListing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            <Badge className="absolute top-4 right-4 bg-green-500">Active</Badge>
          </div>

          <CardHeader>
            <CardTitle className="flex items-start justify-between">
              <span>{activeListing.title}</span>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigate(`/vendor/edit-listing/${activeListing.id}`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="outline">
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Listing</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this listing? This action cannot be undone and the listing will
                        be moved to history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogDelete>No, keep listing</AlertDialogDelete>
                      <AlertDialogAction onClick={handleDeleteListing}>Yes, delete listing</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeListing.description && <p className="text-muted-foreground">{activeListing.description}</p>}

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{activeListing.location}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Best before: {format(new Date(activeListing.best_before), "PPp")}</span>
              </div>
            </div>

            <PortionStatusBar
              totalPortions={activeListing.total_portions}
              remainingPortions={activeListing.remaining_portions}
              reservedPortions={activeListing.reserved_portions || 0}
            />

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeListing.cuisine}</Badge>
              {activeListing.dietary_info.map((diet) => (
                <Badge key={diet} variant="outline">
                  {diet.replace("_", " ")}
                </Badge>
              ))}
            </div>

            {activeListing.available_for_charity && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                Available for Charitable Organisations
              </Badge>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No active listing</p>
            <Button onClick={() => navigate("/vendor/create-listing")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Listing
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => navigate("/vendor/history")}>
          View History
        </Button>
        <Button variant="ghost" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </div>

      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} userRole="vendor" />
    </div>
  );
}
