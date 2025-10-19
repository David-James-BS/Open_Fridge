import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CuisineType, DietaryType, FoodListing } from '@/types/food';
import { Checkbox } from '@/components/ui/checkbox';

const CUISINE_OPTIONS: CuisineType[] = [
  'chinese', 'malay', 'indian', 'western', 'japanese', 
  'korean', 'thai', 'vietnamese', 'italian', 'mexican', 'other'
];

const DIETARY_OPTIONS: DietaryType[] = [
  'vegetarian', 'vegan', 'halal', 'kosher', 
  'gluten_free', 'dairy_free', 'nut_free', 'none'
];

export default function EditListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<FoodListing | null>(null);
  
  const [cuisine, setCuisine] = useState<CuisineType>('chinese');
  const [dietaryInfo, setDietaryInfo] = useState<DietaryType[]>([]);
  const [bestBefore, setBestBefore] = useState('');

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('id', id)
        .eq('vendor_id', user.id)
        .single();

      if (error) throw error;

      setListing(data);
      setCuisine(data.cuisine);
      setDietaryInfo(data.dietary_info);
      setBestBefore(data.best_before.slice(0, 16));
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
      navigate('/vendor/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDietaryToggle = (diet: DietaryType) => {
    setDietaryInfo(prev => 
      prev.includes(diet) 
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('food_listings')
        .update({
          cuisine,
          dietary_info: dietaryInfo.length > 0 ? dietaryInfo : ['none'],
          best_before: bestBefore,
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success('Listing updated successfully!');
      navigate('/vendor/dashboard');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/vendor/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Listing: {listing.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cuisine">Cuisine *</Label>
              <Select
                value={cuisine}
                onValueChange={(value) => setCuisine(value as CuisineType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dietary Restrictions</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {DIETARY_OPTIONS.map((diet) => (
                  <div key={diet} className="flex items-center space-x-2">
                    <Checkbox
                      id={diet}
                      checked={dietaryInfo.includes(diet)}
                      onCheckedChange={() => handleDietaryToggle(diet)}
                    />
                    <Label htmlFor={diet} className="font-normal cursor-pointer">
                      {diet.replace('_', ' ').charAt(0).toUpperCase() + diet.replace('_', ' ').slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="bestBefore">Best Before *</Label>
              <Input
                id="bestBefore"
                type="datetime-local"
                value={bestBefore}
                onChange={(e) => setBestBefore(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/vendor/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
