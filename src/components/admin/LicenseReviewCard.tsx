import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Download, Calendar, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface License {
  id: string;
  user_id: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  rejection_reason?: string;
  reviewed_at?: string;
  profiles?: {
    email: string;
  };
}

interface LicenseReviewCardProps {
  license: License;
  userEmail: string;
  onStatusChange: () => void;
}

export function LicenseReviewCard({ license, userEmail, onStatusChange }: LicenseReviewCardProps) {
  const { toast } = useToast();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('approve-license', {
        body: {
          licenseId: license.id,
          status: 'approved',
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'License approved',
        description: 'The license has been approved successfully',
      });

      onStatusChange();
      setShowApproveDialog(false);
    } catch (error: any) {
      toast({
        title: 'Approval failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('approve-license', {
        body: {
          licenseId: license.id,
          status: 'rejected',
          rejectionReason: rejectionReason,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'License rejected',
        description: 'The license has been rejected',
      });

      onStatusChange();
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: 'Rejection failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('download-license', {
        body: { licenseId: license.id },
      });

      if (response.error) throw response.error;

      const { signedUrl } = response.data;
      
      // Download using the signed URL
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `license-${license.id}`;
      a.target = '_blank';
      a.click();

      toast({
        title: 'Download successful',
        description: 'License file downloaded successfully',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download license file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">License Request</CardTitle>
            <Badge variant={
              license.status === 'approved' ? 'default' :
              license.status === 'rejected' ? 'destructive' :
              'secondary'
            }>
              {license.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{userEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Uploaded: {new Date(license.uploaded_at).toLocaleDateString()}</span>
          </div>
          {license.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
              <p className="text-sm text-muted-foreground">{license.rejection_reason}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download License
          </Button>
          {license.status === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowApproveDialog(true)}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectDialog(true)}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve License</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this license for {userEmail}? This action will grant them access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={loading}>
              {loading ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject License</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this license. The user will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
