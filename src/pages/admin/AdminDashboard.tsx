import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LicenseReviewCard } from '@/components/admin/LicenseReviewCard';
import { DeleteAccountDialog } from '@/components/shared/DeleteAccountDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Trash2 } from 'lucide-react';

interface License {
  id: string;
  user_id: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  rejection_reason?: string;
  reviewed_at?: string;
}

interface LicenseWithProfile extends License {
  profiles: {
    email: string;
  };
  user_roles: {
    role: string;
  }[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading, signOut } = useAuth();
  const [licenses, setLicenses] = useState<LicenseWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin' as any)) {
      navigate('/admin');
    }
  }, [user, role, authLoading, navigate]);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          *,
          profiles!licenses_user_id_fkey(email)
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user roles for each license
      const licensesWithRoles = await Promise.all(
        (data || []).map(async (license) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', license.user_id);
          
          return {
            ...license,
            user_roles: roles || [],
          };
        })
      );

      setLicenses(licensesWithRoles as any);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'admin' as any) {
      fetchLicenses();

      // Set up realtime subscription
      const channel = supabase
        .channel('licenses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'licenses',
          },
          () => {
            fetchLicenses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const pendingVendors = licenses.filter(
    (l) => l.status === 'pending' && l.user_roles.some((r) => r.role === 'vendor')
  );

  const pendingOrganizations = licenses.filter(
    (l) => l.status === 'pending' && l.user_roles.some((r) => r.role === 'charitable_organisation')
  );

  const approved = licenses.filter((l) => l.status === 'approved');
  const rejected = licenses.filter((l) => l.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
                  <CardDescription>Manage license requests and approvals</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="pending-vendors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending-vendors">
              Pending Vendors ({pendingVendors.length})
            </TabsTrigger>
            <TabsTrigger value="pending-organizations">
              Pending Organizations ({pendingOrganizations.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-vendors" className="space-y-4">
            {pendingVendors.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No pending vendor licenses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingVendors.map((license) => (
                  <LicenseReviewCard
                    key={license.id}
                    license={license}
                    userEmail={license.profiles.email}
                    onStatusChange={fetchLicenses}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-organizations" className="space-y-4">
            {pendingOrganizations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No pending organization licenses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingOrganizations.map((license) => (
                  <LicenseReviewCard
                    key={license.id}
                    license={license}
                    userEmail={license.profiles.email}
                    onStatusChange={fetchLicenses}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approved.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No approved licenses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approved.map((license) => (
                  <LicenseReviewCard
                    key={license.id}
                    license={license}
                    userEmail={license.profiles.email}
                    onStatusChange={fetchLicenses}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejected.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No rejected licenses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rejected.map((license) => (
                  <LicenseReviewCard
                    key={license.id}
                    license={license}
                    userEmail={license.profiles.email}
                    onStatusChange={fetchLicenses}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DeleteAccountDialog 
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userRole="admin"
        />
      </div>
    </div>
  );
}
