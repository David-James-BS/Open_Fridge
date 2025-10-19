import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FoodListing, CuisineType, DietaryType } from '@/types/food';
import { FoodListingCard } from '@/components/food/FoodListingCard';
import { FilterSidebar } from '@/components/food/FilterSidebar';
import { DeleteAccountDialog } from '@/components/shared/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Clock, LogOut, Trash2 } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';

interface FilterState {
  search: string;
  cuisines: CuisineType[];
  dietary: DietaryType[];
}

const ITEMS_PER_PAGE = 10;

export default function OrganisationDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [displayedListings, setDisplayedListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priorityTimeLeft, setPriorityTimeLeft] = useState<{ [key: string]: number }>({});
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('organisationFilters');
    return saved ? JSON.parse(saved) : { search: '', cuisines: [], dietary: [] };
  });

  useEffect(() => {
    fetchListings();

    // Set up realtime subscription
    const channel = supabase
      .channel('org_food_listings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_listings',
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('organisationFilters', JSON.stringify(filters));
    applyFilters();
  }, [filters, listings]);

  useEffect(() => {
    // Update countdown timers
    const interval = setInterval(() => {
      const newTimeLeft: { [key: string]: number } = {};
      listings.forEach((listing) => {
        if (listing.priority_until) {
          const seconds = differenceInSeconds(
            new Date(listing.priority_until),
            new Date()
          );
          if (seconds > 0) {
            newTimeLeft[listing.id] = seconds;
          }
        }
      });
      setPriorityTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [listings]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL active listings (charity priority is handled by priority_until)
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load food listings');
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
          listing.location.toLowerCase().includes(searchLower)
      );
    }

    // Cuisine filter
    if (filters.cuisines.length > 0) {
      filtered = filtered.filter((listing) =>
        filters.cuisines.includes(listing.cuisine)
      );
    }

    // Dietary filter
    if (filters.dietary.length > 0) {
      filtered = filtered.filter((listing) =>
        filters.dietary.some((diet) => listing.dietary_info.includes(diet))
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              ? 'No listings match your search criteria'
              : 'No food listings available at the moment'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedListings.map((listing) => (
              <div key={listing.id} className="relative">
                {priorityTimeLeft[listing.id] && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-orange-600 font-medium">
                    <Clock className="h-4 w-4" />
                    Priority time left: {formatTime(priorityTimeLeft[listing.id])}
                  </div>
                )}
                <FoodListingCard
                  listing={listing}
                  onClick={() => navigate(`/organisation/listing/${listing.id}`)}
                  showPriorityBadge={!!priorityTimeLeft[listing.id]}
                />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
      
      <DeleteAccountDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userRole="charitable_organisation"
      />
    </div>
  );
}
