import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, Mail, Phone, MapPin, Store, Clock } from 'lucide-react';
import { FoodListing } from '@/types/food';
import { format } from 'date-fns';

interface VendorProfile {
  stall_name: string;
  email: string;
  phone: string;
  location: string;
}

export default function VendorProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [activeListing, setActiveListing] = useState<FoodListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchActiveListing();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stall_name, email, phone, location')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveListing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('vendor_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setActiveListing(data);
    } catch (error) {
      console.error('Error fetching active listing:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          stall_name: profile.stall_name,
          phone: profile.phone,
          location: profile.location,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const percentageLeft = activeListing
    ? (activeListing.remaining_portions / activeListing.total_portions) * 100
    : 0;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/vendor/dashboard')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor Profile</h1>
        {editMode ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stall-name">Stall Name</Label>
            {editMode ? (
              <Input
                id="stall-name"
                value={profile.stall_name || ''}
                onChange={(e) =>
                  setProfile({ ...profile, stall_name: e.target.value })
                }
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Store className="h-4 w-4" />
                <span>{profile.stall_name || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            {editMode ? (
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{profile.phone || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            {editMode ? (
              <Input
                id="location"
                value={profile.location || ''}
                onChange={(e) =>
                  setProfile({ ...profile, location: e.target.value })
                }
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.location || 'Not set'}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {activeListing && (
        <Card>
          <CardHeader>
            <CardTitle>Active Listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative h-48 md:h-64 rounded-lg overflow-hidden">
              {activeListing.image_url ? (
                <img
                  src={activeListing.image_url}
                  alt={activeListing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <Badge className="absolute top-4 right-4 bg-green-500">Active</Badge>
            </div>

            <h3 className="text-xl font-semibold">{activeListing.title}</h3>

            {activeListing.description && (
              <p className="text-muted-foreground">{activeListing.description}</p>
            )}

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{activeListing.location}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Best before: {format(new Date(activeListing.best_before), 'PPp')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Portions</span>
                <span className="font-medium">
                  {activeListing.remaining_portions} of {activeListing.total_portions}
                </span>
              </div>
              <Progress value={percentageLeft} className="h-3" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeListing.cuisine}</Badge>
              {activeListing.dietary_info.map((diet) => (
                <Badge key={diet} variant="outline">
                  {diet.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
