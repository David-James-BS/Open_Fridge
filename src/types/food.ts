export type CuisineType = 
  | 'chinese'
  | 'malay'
  | 'indian'
  | 'western'
  | 'japanese'
  | 'korean'
  | 'thai'
  | 'vietnamese'
  | 'italian'
  | 'mexican'
  | 'other';

export type DietaryType = 
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'none';

export interface FoodListing {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  location: string;
  cuisine: CuisineType;
  dietary_info: DietaryType[];
  total_portions: number;
  remaining_portions: number;
  best_before: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  image_url: string | null;
  priority_until: string | null;
  available_for_charity: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  listing_id: string;
  organisation_id: string;
  portions_reserved: number;
  deposit_amount: number;
  deposit_status: 'pending' | 'paid' | 'refunded';
  collected: boolean;
  collected_at: string | null;
  pickup_time: string | null;
  created_at: string;
}

export interface Collection {
  id: string;
  consumer_id: string;
  listing_id: string;
  portions_collected: number;
  collected_at: string;
}
