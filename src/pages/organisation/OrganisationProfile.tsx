import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Clock, Download, Upload, User, Phone, Mail, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SecurityQuestionsSection } from "@/components/profile/SecurityQuestionsSection";

interface Profile {
  id: string;
  organization_name: string | null;
  contact_person_name: string | null;
  phone: string | null;
  email: string;
  organization_description: string | null;
  security_question_1: string | null;
  security_question_2: string | null;
}

interface License {
  id: string;
  status: string;
  file_url: string;
  uploaded_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

interface CollectionHistory {
  id: string;
  portions_collected: number;
  collected_at: string;
  listing_title: string;
  vendor_stall_name: string;
}

interface FollowedVendor {
  id: string;
  vendor_id: string;
  vendor_stall_name: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_location: string;
}

export default function OrganisationProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Statistics
  const [totalReserved, setTotalReserved] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [followedVendorsCount, setFollowedVendorsCount] = useState(0);
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistory[]>([]);
  const [followedVendors, setFollowedVendors] = useState<FollowedVendor[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Form states
  const [organizationName, setOrganizationName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/organisation/auth");
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setOrganizationName(profileData.organization_name || "");
      setContactPersonName(profileData.contact_person_name || "");
      setPhone(profileData.phone || "");
      setDescription(profileData.organization_description || "");

      // Fetch license
      const { data: licenseData } = await supabase
        .from("licenses")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (licenseData) setLicense(licenseData);

      // Fetch statistics
      await fetchStatistics(user.id);
      await fetchCollectionHistory(user.id, 1);
      await fetchFollowedVendors(user.id);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async (userId: string) => {
    // Total reserved portions
    const { data: reservations } = await supabase
      .from("reservations")
      .select("portions_reserved")
      .eq("organisation_id", userId);

    const reserved = reservations?.reduce((sum, r) => sum + r.portions_reserved, 0) || 0;
    setTotalReserved(reserved);

    // Total collected portions
    const { data: collections } = await supabase
      .from("organisation_collections")
      .select("portions_collected")
      .eq("organisation_id", userId);

    const collected = collections?.reduce((sum, c) => sum + c.portions_collected, 0) || 0;
    setTotalCollected(collected);

    // Followed vendors count
    const { count } = await supabase
      .from("organisation_vendor_followers")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", userId);

    setFollowedVendorsCount(count || 0);
  };

  const fetchCollectionHistory = async (userId: string, page: number) => {
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("organisation_collections")
      .select(`
        id,
        portions_collected,
        collected_at,
        listing_id,
        food_listings!inner (
          title,
          vendor_id,
          profiles!inner (
            stall_name
          )
        )
      `)
      .eq("organisation_id", userId)
      .order("collected_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching history:", error);
      return;
    }

    const formattedHistory: CollectionHistory[] = data.map((item: any) => ({
      id: item.id,
      portions_collected: item.portions_collected,
      collected_at: item.collected_at,
      listing_title: item.food_listings.title,
      vendor_stall_name: item.food_listings.profiles.stall_name || "Unknown",
    }));

    if (page === 1) {
      setCollectionHistory(formattedHistory);
    } else {
      setCollectionHistory((prev) => [...prev, ...formattedHistory]);
    }

    setHasMoreHistory(formattedHistory.length === pageSize);
  };

  const fetchFollowedVendors = async (userId: string) => {
    const { data, error } = await supabase
      .from("organisation_vendor_followers")
      .select(`
        id,
        vendor_id,
        profiles!organisation_vendor_followers_vendor_id_fkey (
          stall_name,
          name,
          phone,
          location
        )
      `)
      .eq("organisation_id", userId);

    if (error) {
      console.error("Error fetching followed vendors:", error);
      return;
    }

    const formatted: FollowedVendor[] = data.map((item: any) => ({
      id: item.id,
      vendor_id: item.vendor_id,
      vendor_stall_name: item.profiles?.stall_name || "Unknown",
      vendor_name: item.profiles?.name || "N/A",
      vendor_phone: item.profiles?.phone || "N/A",
      vendor_location: item.profiles?.location || "N/A",
    }));

    setFollowedVendors(formatted);
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          organization_name: organizationName,
          contact_person_name: contactPersonName,
          phone: phone,
          organization_description: description,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setEditMode(false);
      await fetchProfileData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLicenseUpload = async () => {
    if (!licenseFile || !profile) return;

    setUploadingLicense(true);
    try {
      const fileExt = licenseFile.name.split(".").pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(filePath, licenseFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("licenses")
        .getPublicUrl(filePath);

      if (license) {
        // Update existing license
        const { error: updateError } = await supabase
          .from("licenses")
          .update({
            file_url: publicUrl,
            status: "pending",
            rejection_reason: null,
            uploaded_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq("id", license.id);

        if (updateError) throw updateError;
      } else {
        // Create new license
        const { error: insertError } = await supabase
          .from("licenses")
          .insert({
            user_id: profile.id,
            file_url: publicUrl,
            status: "pending",
          });

        if (insertError) throw insertError;
      }

      toast.success("License uploaded successfully and submitted for review");
      setLicenseFile(null);
      await fetchProfileData();
    } catch (error: any) {
      console.error("Error uploading license:", error);
      toast.error("Failed to upload license");
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleUnfollow = async (followId: string, vendorStallName: string) => {
    try {
      const { error } = await supabase
        .from("organisation_vendor_followers")
        .delete()
        .eq("id", followId);

      if (error) throw error;

      toast.success(`Unfollowed ${vendorStallName}`);
      setFollowedVendors((prev) => prev.filter((v) => v.id !== followId));
      setFollowedVendorsCount((prev) => prev - 1);
    } catch (error: any) {
      console.error("Error unfollowing vendor:", error);
      toast.error("Failed to unfollow vendor");
    }
  };

  const getLicenseStatusBadge = () => {
    if (!license) return null;

    const statusConfig = {
      approved: { icon: CheckCircle, color: "bg-green-500", text: "Approved" },
      pending: { icon: Clock, color: "bg-yellow-500", text: "Pending Review" },
      rejected: { icon: XCircle, color: "bg-red-500", text: "Rejected" },
    };

    const config = statusConfig[license.status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Profile not found</p>
            <Button onClick={() => navigate("/organisation/dashboard")} className="w-full mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/organisation/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Organization Profile</h1>
            <p className="text-muted-foreground">Manage your organization information</p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Basic Information</CardTitle>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} variant="outline">
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPersonName">Contact Person Name</Label>
                  <Input
                    id="contactPersonName"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Organization Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your organization's mission and activities"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setOrganizationName(profile.organization_name || "");
                      setContactPersonName(profile.contact_person_name || "");
                      setPhone(profile.phone || "");
                      setDescription(profile.organization_description || "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Organization:</span>
                  <span>{profile.organization_name || "Not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Contact Person:</span>
                  <span>{profile.contact_person_name || "Not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{profile.phone || "Not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{profile.email}</span>
                </div>
                {profile.organization_description && (
                  <div className="flex gap-2 pt-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-muted-foreground mt-1">{profile.organization_description}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* License Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>License Status</CardTitle>
              {getLicenseStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {license ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(license.uploaded_at).toLocaleString()}
                  </p>
                  {license.reviewed_at && (
                    <p className="text-sm text-muted-foreground">
                      Reviewed: {new Date(license.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {license.status === "rejected" && license.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="font-semibold text-destructive mb-2">Rejection Reason:</p>
                    <p className="text-sm">{license.rejection_reason}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(license.file_url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View License
                  </Button>

                  {license.status === "rejected" && (
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleLicenseUpload}
                        disabled={!licenseFile || uploadingLicense}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLicense ? "Uploading..." : "Re-upload"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No license uploaded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/5 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Reserved</p>
                <p className="text-3xl font-bold">{totalReserved}</p>
                <p className="text-xs text-muted-foreground">portions</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-3xl font-bold">{totalCollected}</p>
                <p className="text-xs text-muted-foreground">portions</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Following</p>
                <p className="text-3xl font-bold">{followedVendorsCount}</p>
                <p className="text-xs text-muted-foreground">vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection History */}
        <Card>
          <CardHeader>
            <CardTitle>Collection History</CardTitle>
          </CardHeader>
          <CardContent>
            {collectionHistory.length > 0 ? (
              <div className="space-y-3">
                {collectionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.listing_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.vendor_stall_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.collected_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {item.portions_collected} portions
                    </Badge>
                  </div>
                ))}
                {hasMoreHistory && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const nextPage = historyPage + 1;
                      setHistoryPage(nextPage);
                      fetchCollectionHistory(profile.id, nextPage);
                    }}
                  >
                    Load More
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No collection history yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Followed Vendors */}
        <Card>
          <CardHeader>
            <CardTitle>Followed Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            {followedVendors.length > 0 ? (
              <div className="space-y-3">
                {followedVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex justify-between items-start border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{vendor.vendor_stall_name}</p>
                      <p className="text-sm text-muted-foreground">{vendor.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.vendor_phone}</p>
                      <p className="text-xs text-muted-foreground">{vendor.vendor_location}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnfollow(vendor.id, vendor.vendor_stall_name)}
                    >
                      Unfollow
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You're not following any vendors yet</p>
                <Button onClick={() => navigate("/organisation/dashboard")}>
                  Browse Food Listings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Questions */}
        <SecurityQuestionsSection
          userId={profile.id}
          question1={profile.security_question_1 || undefined}
          question2={profile.security_question_2 || undefined}
        />
      </div>
    </div>
  );
}
