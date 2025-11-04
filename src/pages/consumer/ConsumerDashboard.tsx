import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FoodListing, CuisineType, DietaryType } from "@/types/food";
import { FoodListingCard } from "@/components/food/FoodListingCard";
import { FilterSidebar } from "@/components/food/FilterSidebar";
import { DeleteAccountDialog } from "@/components/shared/DeleteAccountDialog";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut, Trash2, User, Settings, Heart } from "lucide-react";

interface FilterState {
  search: string;
  cuisines: CuisineType[];
  dietary: DietaryType[];
}

const ITEMS_PER_PAGE = 10;

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [displayedListings, setDisplayedListings] = useState<FoodListing[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem("consumerFilters");
    return saved ? JSON.parse(saved) : { search: "", cuisines: [], dietary: [] };
  });

  useEffect(() => {
    fetchListings();

    // Set up realtime subscription with more specific filtering
    const channel = supabase
      .channel("consumer_food_listings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
        },
        (payload) => {
          console.log("Listing changed:", payload);
          // Refetch to get updated data
          fetchListings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("consumerFilters", JSON.stringify(filters));
    applyFilters();
  }, [filters, listings]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("food_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      // Only show listings where priority window has expired or doesn't exist
      query = query.or("priority_until.is.null,priority_until.lt.now()");

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);

      // Fetch all unique vendor names
      if (data && data.length > 0) {
        const vendorIds = [...new Set(data.map((l) => l.vendor_id))];
        const { data: vendors, error: vendorError } = await supabase
          .from("profiles")
          .select("id, stall_name, name, email")
          .in("id", vendorIds);

        console.log("Vendor IDs:", vendorIds);
        console.log("Vendors fetched:", vendors);
        console.log("Vendor fetch error:", vendorError);

        const namesMap: Record<string, string> = {};
        vendors?.forEach((v) => {
          namesMap[v.id] = v.stall_name || v.name || v.email?.split("@")[0] || "Vendor";
        });
        console.log("Names map:", namesMap);
        setVendorNames(namesMap);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to load food listings");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.title.toLowerCase().includes(searchLower) ||
          listing.description?.toLowerCase().includes(searchLower) ||
          listing.location.toLowerCase().includes(searchLower),
      );
    }

    // Cuisine filter
    if (filters.cuisines.length > 0) {
      filtered = filtered.filter((listing) => filters.cuisines.includes(listing.cuisine));
    }

    // Dietary filter
    if (filters.dietary.length > 0) {
      filtered = filtered.filter((listing) =>
        filters.dietary.some((diet) => listing.dietary_info.includes(diet as any)),
      );
    }

    setDisplayedListings(filtered);
    setPage(1);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 500);
  };

  const paginatedListings = displayedListings.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = displayedListings.length > paginatedListings.length;

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
        <h1 className="text-2xl font-bold">Available Food</h1>
        <div className="flex items-center gap-2">
          <FilterSidebar filters={filters} onFilterChange={setFilters} />
          <NotificationsDropdown />
          <Button variant="ghost" size="icon" onClick={() => navigate("/consumer/favorites")} title="Manage Favorites">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/consumer/notifications-settings")}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/consumer/profile")}>
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </div>

      {paginatedListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filters.search || filters.cuisines.length > 0 || filters.dietary.length > 0
              ? "No listings match your search criteria"
              : "No food listings available at the moment"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedListings.map((listing) => (
              <FoodListingCard
                key={listing.id}
                listing={listing}
                vendorName={vendorNames[listing.vendor_id]}
                onClick={() => navigate(`/listing/${listing.id}`)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline">
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} userRole="consumer" />
    </div>
  );
}
