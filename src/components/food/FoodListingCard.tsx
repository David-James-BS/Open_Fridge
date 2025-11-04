import { FoodListing } from "@/types/food";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface FoodListingCardProps {
  listing: FoodListing;
  vendorName?: string;
  onClick?: () => void;
  showPriorityBadge?: boolean;
}

export function FoodListingCard({ listing, vendorName = "Vendor", onClick, showPriorityBadge }: FoodListingCardProps) {
  const availablePortions = listing.remaining_portions - (listing.reserved_portions || 0);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex flex-col md:flex-row">
        {listing.image_url && (
          <div className="relative w-full md:w-48 h-48 flex-shrink-0 overflow-hidden">
            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            {showPriorityBadge && <Badge className="absolute top-2 right-2 bg-orange-500">Priority Access</Badge>}
          </div>
        )}

        <CardContent className="flex-1 p-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold line-clamp-1">{listing.title}</h3>
              <p className="text-sm text-muted-foreground">by {vendorName}</p>
            </div>

            {listing.description && <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>}

            <div className="flex flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{listing.location}</span>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(listing.best_before), "MMM d, h:mm a")}</span>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{availablePortions} available</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {listing.cuisine}
              </Badge>
              {listing.dietary_info.slice(0, 3).map((diet) => (
                <Badge key={diet} variant="outline" className="text-xs">
                  {diet.replace("_", " ")}
                </Badge>
              ))}
              {listing.dietary_info.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{listing.dietary_info.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
