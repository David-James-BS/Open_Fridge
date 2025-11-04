import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FoodListing } from "@/types/food";
import { FoodListingCard } from "@/components/food/FoodListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function VendorPublicProfile() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [vendorProfile, setVendorProfile] = useState<{
    stall_name: string;
    location: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    if (vendorId) {
      fetchVendorData();
    }
  }, [vendorId]);

  const fetchVendorData = async () => {
    try {
      // Fetch vendor profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stall_name, location, phone")
        .eq("id", vendorId)
        .single();

      if (profileError) throw profileError;
      setVendorProfile(profile);

      // Fetch active listings
      const { data: listingsData, error: listingsError } = await supabase
        .from("food_listings")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);
    } catch (error: any) {
      console.error("Error fetching vendor data:", error);
      toast.error("Failed to load vendor information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Vendor Info Card */}
      <div className="bg-card rounded-lg border p-6 space-y-3">
        <h1 className="text-3xl font-bold">{vendorProfile?.stall_name || "Vendor"}</h1>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          {vendorProfile?.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{vendorProfile.location}</span>
            </div>
          )}
          {vendorProfile?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{vendorProfile.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Listings */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Active Listings ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            This vendor has no active listings at the moment.
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <FoodListingCard
                key={listing.id}
                listing={listing}
                vendorName={vendorProfile?.stall_name || "Vendor"}
                onClick={() => navigate(`/listing/${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
