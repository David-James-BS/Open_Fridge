import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';

import { CuisineType, DietaryType } from '@/types/food';
import { Checkbox } from '@/components/ui/checkbox';

const CUISINE_OPTIONS: CuisineType[] = [
  'chinese', 'malay', 'indian', 'western', 'japanese', 
  'korean', 'thai', 'vietnamese', 'italian', 'mexican', 'other'
];

const DIETARY_OPTIONS: DietaryType[] = [
  'vegetarian', 'vegan', 'halal', 'kosher', 
  'gluten_free', 'dairy_free', 'nut_free', 'none'
];

export default function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    cuisine: '' as CuisineType,
    totalPortions: '',
    bestBefore: '',
    availableForCharity: false,
  });
  
  const [dietaryInfo, setDietaryInfo] = useState<DietaryType[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Ensure datetime-local min is now in local time (no past selections)
  const minDateTimeLocal = (() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const local = new Date(now.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  })();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }
    
    setImageFile(file);
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
    
    if (!user) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    // Check if vendor already has 5 active listings
    const { count, error: countError } = await supabase
      .from("food_listings")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .eq("status", "active");

    if (countError) {
      console.error("Error checking listing count:", countError);
      toast.error("Failed to verify listing limit");
      return;
    }

    if (count && count >= 5) {
      toast.error("You can only have 5 active listings at a time");
      return;
    }

    if (!formData.title || !formData.location || !formData.cuisine || 
        !formData.totalPortions || !formData.bestBefore) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate best before is in the future (local time)
    const selected = new Date(formData.bestBefore);
    if (isNaN(selected.getTime())) {
      toast.error('Invalid date/time selected');
      return;
    }
    if (selected.getTime() <= Date.now()) {
      toast.error('Best before must be in the future');
      return;
    }

    if (!imageFile) {
      toast.error('Please upload a food image');
      return;
    }

    setLoading(true);

    try {
      // Upload image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath);

      // Calculate priority_until if charity priority is enabled
      const priorityUntil = formData.availableForCharity 
        ? new Date(Date.now() + 10 * 60 * 1000).toISOString() 
        : null;

      // Create listing
      const { error: listingError } = await supabase
        .from('food_listings')
        .insert({
          vendor_id: user.id,
          title: formData.title,
          description: formData.description || null,
          location: formData.location,
          cuisine: formData.cuisine,
          dietary_info: dietaryInfo.length > 0 ? dietaryInfo : ['none'],
          total_portions: parseInt(formData.totalPortions),
          remaining_portions: parseInt(formData.totalPortions),
          best_before: new Date(formData.bestBefore).toISOString(),
          image_url: publicUrl,
          priority_until: priorityUntil,
          available_for_charity: formData.availableForCharity,
          status: 'active',
        });

      if (listingError) throw listingError;

      toast.success('Food listing created successfully!');
      navigate('/vendor/dashboard');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>Create Food Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Chicken Rice"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell customers about your food..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., 123 Main Street, Singapore 123456"
                required
              />
            </div>

            <div>
              <Label htmlFor="cuisine">Cuisine *</Label>
              <Select
                value={formData.cuisine}
                onValueChange={(value) => setFormData({ ...formData, cuisine: value as CuisineType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cuisine type" />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <SelectItem key={cuisine} value={cuisine}>
                      {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
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
              <Label htmlFor="totalPortions">Total Portions *</Label>
              <Input
                id="totalPortions"
                type="number"
                min="1"
                value={formData.totalPortions}
                onChange={(e) => setFormData({ ...formData, totalPortions: e.target.value })}
                placeholder="Number of portions available"
                required
              />
            </div>

            <div>
              <Label htmlFor="bestBefore">Best Before *</Label>
              <Input
                id="bestBefore"
                type="datetime-local"
                value={formData.bestBefore}
                min={minDateTimeLocal}
                onChange={(e) => setFormData({ ...formData, bestBefore: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="image">Food Image * (Max 10MB)</Label>
              <div className="mt-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4">
              <div className="space-y-0.5">
                <Label htmlFor="charity-priority">Priority for Charitable Organizations</Label>
                <p className="text-sm text-muted-foreground">
                  Give charities a 10-minute priority window to reserve this food
                </p>
              </div>
              <Switch
                id="charity-priority"
                checked={formData.availableForCharity}
                onCheckedChange={(checked) => setFormData({ ...formData, availableForCharity: checked })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Listing...
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
