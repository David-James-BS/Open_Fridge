import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, History, ArrowLeft, AlertCircle } from "lucide-react";

interface LicenseHistory {
  id: string;
  status: string;
  uploaded_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function OrganisationLicensePending() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [licenseHistory, setLicenseHistory] = useState<LicenseHistory[]>([]);

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/organisation');
        return;
      }

      // Check if user is a charitable organisation
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'charitable_organisation')
        .single();

      if (!roleData) {
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

      // Check latest license status
      const latestLicense = licenses?.[0];
      if (latestLicense?.status === 'approved') {
        navigate('/organisation/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      navigate('/auth/organisation');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    navigate("/auth/organisation");
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10">
              <Clock className="h-10 w-10 text-secondary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">License Under Review</h1>
              <p className="text-muted-foreground">
                Your organisation license is currently being reviewed by our admin team. You will be notified once the review is complete.
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The review process typically takes 1-2 business days. Please check back later or wait for an email notification.
            </AlertDescription>
          </Alert>

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
                      <Alert variant="destructive">
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
