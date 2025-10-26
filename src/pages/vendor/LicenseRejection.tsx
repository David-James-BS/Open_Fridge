import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Upload, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LicenseRejection = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [rejectionData, setRejectionData] = useState<{
    rejection_reason: string | null;
    reviewed_at: string | null;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkLicenseAndAuth();
  }, []);

  const checkLicenseAndAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/vendor");
        return;
      }

      // Check if user has vendor role
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "vendor")
        .single();

      if (!userRole) {
        navigate("/auth/vendor");
        return;
      }

      // Fetch license details
      const { data: license, error } = await supabase
        .from("licenses")
        .select("status, rejection_reason, reviewed_at")
        .eq("user_id", user.id)
        .single();

      if (error || !license) {
        navigate("/auth/vendor");
        return;
      }

      // If not rejected, redirect to appropriate page
      if (license.status === "approved") {
        navigate("/vendor/dashboard");
        return;
      } else if (license.status === "pending") {
        navigate("/auth/vendor");
        return;
      }

      // If rejected, show rejection details
      setRejectionData({
        rejection_reason: license.rejection_reason,
        reviewed_at: license.reviewed_at
      });
    } catch (error) {
      console.error("Error checking license:", error);
      navigate("/auth/vendor");
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseUpload = async () => {
    if (!licenseFile) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = licenseFile.name.split('.').pop();
      const filePath = `${user.id}/license.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, licenseFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("licenses")
        .update({
          file_url: publicUrl,
          status: "pending",
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null
        })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      toast({
        title: "License uploaded!",
        description: "Your new license is pending admin approval.",
      });

      // Redirect to login page
      await supabase.auth.signOut();
      navigate("/auth/vendor");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    navigate("/auth/vendor");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-2xl p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-destructive mb-2">License Rejected</h1>
              <p className="text-muted-foreground">
                Your vendor license application was not approved. Please review the reason below and submit a new license.
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription className="mt-2">
              {rejectionData?.rejection_reason || "No specific reason provided. Please ensure your license document is clear, valid, and meets all requirements."}
            </AlertDescription>
          </Alert>

          {rejectionData?.reviewed_at && (
            <p className="text-sm text-muted-foreground text-center">
              Reviewed on: {new Date(rejectionData.reviewed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New License
              </h2>
              <p className="text-sm text-muted-foreground">
                Please upload a clear, valid business or food-handling license (PDF, JPG, or PNG)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="license">Select License Document</Label>
                <Input
                  id="license"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>
              
              <Button 
                onClick={handleLicenseUpload} 
                disabled={!licenseFile || uploading} 
                className="w-full"
              >
                {uploading ? "Uploading..." : "Upload New License"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              onClick={handleBackToLogin}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LicenseRejection;
