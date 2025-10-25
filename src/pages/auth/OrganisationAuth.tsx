import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Upload, Clock } from "lucide-react";

const SECURITY_QUESTIONS = [
  "What is your favorite food as a child?",
  "What is the name of the first school you attended?",
  "What is your best friend's name?",
  "What is your favorite book?",
];

const OrganisationAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLicenseUpload, setShowLicenseUpload] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSecurityAnswer, setResetSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fetchedSecurityQuestion, setFetchedSecurityQuestion] = useState("");
  const [questionFetched, setQuestionFetched] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("licenses").select("status").eq("user_id", user.id).single();

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
      if (!securityQuestion || !securityAnswer) {
        throw new Error("Please select a security question and provide an answer");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with security question
        await supabase
          .from("profiles")
          .update({
            security_question: securityQuestion,
            security_answer: securityAnswer.toLowerCase(),
          })
          .eq("id", data.user.id);

        // Add user role
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "charitable_organisation",
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
        variant: "destructive",
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
        password,
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

      const { data: license } = await supabase.from("licenses").select("status").eq("user_id", data.user.id).single();

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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSecurityQuestion = async () => {
    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('security_question')
        .eq('email', resetEmail)
        .single();

      if (error || !profile?.security_question) {
        throw new Error("No security question found for this email");
      }

      setFetchedSecurityQuestion(profile.security_question);
      setQuestionFetched(true);
      toast({
        title: "Security question found",
        description: "Please answer your security question",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not find security question for this email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmNewPassword) {
        throw new Error("Passwords do not match");
      }

      const { data, error } = await supabase.functions.invoke("reset-password-with-security", {
        body: {
          email: resetEmail,
          securityAnswer: resetSecurityAnswer,
          newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password reset successful!",
        description: "You can now sign in with your new password.",
      });

      setShowForgotPassword(false);
      setResetEmail("");
      setResetSecurityAnswer("");
      setNewPassword("");
      setConfirmNewPassword("");
      setFetchedSecurityQuestion("");
      setQuestionFetched(false);
    } catch (error: any) {
      if (error.message.includes("Incorrect security answer")) {
        toast({
          title: "Incorrect answer",
          description: "The answer is incorrect.",
          variant: "destructive",
        });
        setShowForgotPassword(false);
        setResetEmail("");
        setResetSecurityAnswer("");
        setNewPassword("");
        setConfirmNewPassword("");
        setFetchedSecurityQuestion("");
        setQuestionFetched(false);
      } else {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseUpload = async () => {
    if (!licenseFile) return;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = licenseFile.name.split(".").pop();
      const filePath = `${user.id}/license.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(filePath, licenseFile, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("licenses").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("licenses").upsert(
        {
          user_id: user.id,
          file_url: publicUrl,
          status: "pending",
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
        },
        { onConflict: "user_id" },
      );

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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary shadow-primary">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground">Answer your security question to reset your password</p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setQuestionFetched(false);
                    setFetchedSecurityQuestion("");
                  }}
                  required
                  disabled={questionFetched}
                />
              </div>
              
              {!questionFetched && (
                <Button 
                  type="button" 
                  onClick={handleFetchSecurityQuestion} 
                  className="w-full" 
                  disabled={loading || !resetEmail}
                >
                  {loading ? "Checking..." : "Continue"}
                </Button>
              )}

              {questionFetched && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="security-question-display">Your Security Question</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {fetchedSecurityQuestion}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-security-answer">Your Answer</Label>
                    <Input
                      id="reset-security-answer"
                      type="text"
                      value={resetSecurityAnswer}
                      onChange={(e) => setResetSecurityAnswer(e.target.value)}
                      placeholder="Enter your answer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </>
              )}
            </form>
          </Card>
        </div>
      </div>
    );
  }

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
              Your organisation license is currently being reviewed by our administrators. You'll receive a notification
              once it's approved.
            </p>
          </div>
          <Button onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>Sign Out</Button>
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
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
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
                <div className="space-y-2">
                  <Label htmlFor="security-question">Security Question</Label>
                  <Select value={securityQuestion} onValueChange={setSecurityQuestion} required>
                    <SelectTrigger id="security-question">
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECURITY_QUESTIONS.map((question) => (
                        <SelectItem key={question} value={question}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security-answer">Security Answer</Label>
                  <Input
                    id="security-answer"
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Your answer"
                    required
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
