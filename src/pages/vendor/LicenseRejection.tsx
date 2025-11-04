import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Upload, History, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LicenseHistory {
  id: string;
  status: string;
  uploaded_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function LicenseRejection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseHistory, setLicenseHistory] = useState<LicenseHistory[]>([]);
  const [rejectionData, setRejectionData] = useState<{
    reason: string;
    reviewedAt: string;
  } | null>(null);

  useEffect(() => {
    checkLicenseAndAuth();
  }, []);

  const checkLicenseAndAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/vendor');
        return;
      }

      // Check if user is a vendor
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'vendor')
        .single();

      if (!roleData) {
        toast({
          title: "Unauthorized",
          description: "You must be a vendor to access this page",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch all license history
      const { data: licenses, error: historyError } = await supabase
        .from('licenses')
        .select('id, status, uploaded_at, reviewed_at, rejection_reason')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching license history:', historyError);
      } else if (licenses) {
        setLicenseHistory(licenses);
      }

      // Fetch latest license status
      const { data: license, error } = await supabase
        .from('licenses')
        .select('status, rejection_reason, reviewed_at')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching license:', error);
        navigate('/auth/vendor');
        return;
      }

      if (license.status === 'rejected') {
        setRejectionData({
          reason: license.rejection_reason || 'No reason provided',
          reviewedAt: license.reviewed_at || '',
        });
      } else if (license.status === 'approved') {
        navigate('/vendor/dashboard');
      } else if (license.status === 'pending') {
        toast({
          title: "License Pending Review",
          description: "Your license is currently under review",
        });
        navigate('/auth/vendor');
      }
    } catch (error) {
      console.error('Error:', error);
      navigate('/auth/vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseUpload = async () => {
    if (!licenseFile) {
      toast({
        title: "No file selected",
        description: "Please select a license file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload new file with timestamp to make it unique
      const timestamp = Date.now();
      const fileExt = licenseFile.name.split('.').pop();
      const filePath = `${user.id}/license_${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, licenseFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('licenses')
        .insert({
          user_id: user.id,
          file_url: publicUrl,
          status: 'pending',
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
        });

      if (dbError) throw dbError;

      toast({
        title: "License Uploaded",
        description: "Your new license has been submitted for review",
      });

      navigate('/vendor/license-pending');
    } catch (error) {
      console.error('Error uploading license:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload license",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/vendor';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/auth/vendor';
    }
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

          {rejectionData && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Rejection Reason</AlertTitle>
                <AlertDescription className="mt-2">
                  {rejectionData.reason}
                </AlertDescription>
              </Alert>

              {rejectionData.reviewedAt && (
                <p className="text-sm text-muted-foreground text-center">
                  Reviewed on: {new Date(rejectionData.reviewedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </>
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

        {licenseHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                License Submission History
              </CardTitle>
              <CardDescription>
                View all your previous license submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {licenseHistory.map((license) => (
                <Collapsible key={license.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          license.status === 'approved' ? 'default' :
                          license.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {license.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Uploaded: {new Date(license.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      {license.reviewed_at && (
                        <p className="text-sm text-muted-foreground">
                          Reviewed: {new Date(license.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {license.rejection_reason && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          View Reason
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                  {license.rejection_reason && (
                    <CollapsibleContent className="px-4 py-2">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {license.rejection_reason}
                        </AlertDescription>
                      </Alert>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
