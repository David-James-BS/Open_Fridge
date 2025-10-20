import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Upload, Clock } from "lucide-react";

const OrganisationAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLicenseUpload, setShowLicenseUpload] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("licenses")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setLicenseStatus(data.status);
      if (data.status === "approved") {
        navigate("/organisation/dashboard");
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      if (data.user) {
        // Profile is created automatically by trigger
        // Add user role
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "charitable_organisation"
        });

        toast({
          title: "Account created!",
          description: "Please upload your organisation license to continue.",
        });

        setShowLicenseUpload(true);
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "charitable_organisation")
        .single();

      if (!userRole) {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as a charitable organisation");
      }

      const { data: license } = await supabase
        .from("licenses")
        .select("status")
        .eq("user_id", data.user.id)
        .single();

      if (!license) {
        setShowLicenseUpload(true);
        return;
      }

      setLicenseStatus(license.status);

      if (license.status === "approved") {
        toast({
          title: "Welcome back!",
          description: "Signed in successfully.",
        });
        navigate("/organisation/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseUpload = async () => {
    if (!licenseFile) return;
    setLoading(true);

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
        .upsert({
          user_id: user.id,
          file_url: publicUrl,
          status: "pending"
        });

      if (dbError) throw dbError;

      toast({
        title: "License uploaded!",
        description: "Your license is pending admin approval.",
      });

      setLicenseStatus("pending");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (licenseStatus === "pending") {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20">
            <Clock className="h-10 w-10 text-accent-foreground animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">License Under Review</h2>
            <p className="text-muted-foreground">
              Your organisation license is currently being reviewed by our administrators.
              You'll receive a notification once it's approved.
            </p>
          </div>
          <Button onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  if (licenseStatus === "rejected") {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-destructive">License Rejected</h2>
            <p className="text-muted-foreground mb-4">
              Unfortunately, your license was not approved. Please upload a new license document.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="license-reupload">Upload New License</Label>
              <Input
                id="license-reupload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>
            <Button onClick={handleLicenseUpload} disabled={!licenseFile || loading} className="w-full">
              {loading ? "Uploading..." : "Upload License"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showLicenseUpload) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary shadow-primary">
              <Upload className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Upload Organisation License</h2>
            <p className="text-muted-foreground">
              Please upload your charitable organisation registration or license for verification.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="license">License Document (PDF, JPG, PNG)</Label>
              <Input
                id="license"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>
            <Button onClick={handleLicenseUpload} disabled={!licenseFile || loading} className="w-full">
              {loading ? "Uploading..." : "Upload License"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to role selection
        </Button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary shadow-primary">
            <Heart className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Organisation Portal</h1>
          <p className="text-muted-foreground">Reserve and redistribute food to those in need</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default OrganisationAuth;
