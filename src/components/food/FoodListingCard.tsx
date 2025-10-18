import { FoodListing } from '@/types/food';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface FoodListingCardProps {
  listing: FoodListing;
  onClick: () => void;
  showPriorityBadge?: boolean;
}

export function FoodListingCard({ listing, onClick, showPriorityBadge }: FoodListingCardProps) {
  const percentageLeft = (listing.remaining_portions / listing.total_portions) * 100;
  const isPriority = listing.priority_until && new Date(listing.priority_until) > new Date();

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-48">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Utensils className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {showPriorityBadge && isPriority && (
          <Badge className="absolute top-2 right-2 bg-orange-500">
            Priority Access
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {listing.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="line-clamp-1">{listing.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Best before: {format(new Date(listing.best_before), 'MMM d, h:mm a')}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-medium">
              {listing.remaining_portions} of {listing.total_portions} portions
            </span>
          </div>
          <Progress value={percentageLeft} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {listing.cuisine}
          </Badge>
          {listing.dietary_info.map((diet) => (
            <Badge key={diet} variant="outline" className="text-xs">
              {diet}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
