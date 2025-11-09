import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Upload, Clock } from "lucide-react";
import { SECURITY_QUESTIONS } from "@/constants/securityQuestions";
import { hashSecurityAnswer } from "@/utils/securityHash";

const OrganisationAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [securityQuestion1, setSecurityQuestion1] = useState("");
  const [securityAnswer1, setSecurityAnswer1] = useState("");
  const [securityQuestion2, setSecurityQuestion2] = useState("");
  const [securityAnswer2, setSecurityAnswer2] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLicenseUpload, setShowLicenseUpload] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSecurityAnswer1, setResetSecurityAnswer1] = useState("");
  const [resetSecurityAnswer2, setResetSecurityAnswer2] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fetchedQuestion1, setFetchedQuestion1] = useState("");
  const [fetchedQuestion2, setFetchedQuestion2] = useState("");
  const [questionsFetched, setQuestionsFetched] = useState(false);
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
      if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
        throw new Error("Please select both security questions and provide answers");
      }

      if (securityQuestion1 === securityQuestion2) {
        throw new Error("Please select different security questions");
      }

      if (!organizationName || !contactPersonName || !phoneNumber || !organizationDescription) {
        throw new Error("Please fill in all organization information");
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
        // Hash answers before storing
        const answer1Hash = await hashSecurityAnswer(securityAnswer1);
        const answer2Hash = await hashSecurityAnswer(securityAnswer2);

        // Update profile with all organization information
        await supabase
          .from("profiles")
          .update({
            organization_name: organizationName,
            contact_person_name: contactPersonName,
            phone: phoneNumber,
            organization_description: organizationDescription,
            security_question_1: securityQuestion1,
            security_answer_1_hash: answer1Hash,
            security_question_2: securityQuestion2,
            security_answer_2_hash: answer2Hash,
          })
          .eq("id", data.user.id);

        // Add user role
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "charitable_organisation",
        });

        toast({
          title: "Account created!",
          description: "Please upload your organization license for verification.",
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

  const handleFetchSecurityQuestions = async () => {
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
        .select('security_question_1, security_question_2')
        .eq('email', resetEmail)
        .single();

      if (error || !profile?.security_question_1 || !profile?.security_question_2) {
        throw new Error("No security questions found for this email");
      }

      setFetchedQuestion1(profile.security_question_1);
      setFetchedQuestion2(profile.security_question_2);
      setQuestionsFetched(true);
      toast({
        title: "Security questions found",
        description: "Please answer both security questions",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not find security questions for this email",
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
          securityAnswer1: resetSecurityAnswer1,
          securityAnswer2: resetSecurityAnswer2,
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
      setResetSecurityAnswer1("");
      setResetSecurityAnswer2("");
      setNewPassword("");
      setConfirmNewPassword("");
      setFetchedQuestion1("");
      setFetchedQuestion2("");
      setQuestionsFetched(false);
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
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
      const timestamp = Date.now();
      const filePath = `${user.id}/license_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(filePath, licenseFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("licenses").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("licenses").insert({
        user_id: user.id,
        file_url: publicUrl,
        status: "pending",
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
      });

      if (dbError) throw dbError;

      toast({
        title: "License uploaded!",
        description: "Your license is pending admin approval.",
      });

      setLicenseStatus("pending");
      navigate('/organisation/license-pending');
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="mb-2 sm:mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary shadow-primary">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Reset Password</h1>
            <p className="text-sm sm:text-base text-muted-foreground px-2">Answer your security question to reset your password</p>
          </div>

          <Card className="p-4 sm:p-6">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setQuestionsFetched(false);
                    setFetchedQuestion1("");
                    setFetchedQuestion2("");
                  }}
                  required
                  disabled={questionsFetched}
                />
              </div>
              
              {!questionsFetched && (
                <Button 
                  type="button" 
                  onClick={handleFetchSecurityQuestions} 
                  className="w-full" 
                  disabled={loading || !resetEmail}
                >
                  {loading ? "Checking..." : "Continue"}
                </Button>
              )}

              {questionsFetched && (
                <>
                  <div className="space-y-2">
                    <Label>Security Question 1</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {fetchedQuestion1}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-security-answer-1">Answer 1</Label>
                    <Input
                      id="reset-security-answer-1"
                      type="text"
                      value={resetSecurityAnswer1}
                      onChange={(e) => setResetSecurityAnswer1(e.target.value)}
                      placeholder="Enter your answer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Security Question 2</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {fetchedQuestion2}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-security-answer-2">Answer 2</Label>
                    <Input
                      id="reset-security-answer-2"
                      type="text"
                      value={resetSecurityAnswer2}
                      onChange={(e) => setResetSecurityAnswer2(e.target.value)}
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-md p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-md p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-md p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary shadow-primary">
              <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Upload Organisation License</h2>
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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-2 sm:mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to role selection
        </Button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary shadow-primary">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Organisation Portal</h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2">Reserve and redistribute food to those in need</p>
        </div>

        <Card className="p-4 sm:p-6">
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
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Security Questions (for password recovery)
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="security-question-1">Security Question 1</Label>
                    <Select value={securityQuestion1} onValueChange={setSecurityQuestion1} required>
                      <SelectTrigger id="security-question-1">
                        <SelectValue placeholder="Select first question" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((question) => (
                          <SelectItem key={question} value={question} disabled={question === securityQuestion2}>
                            {question}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="security-answer-1">Answer 1</Label>
                    <Input
                      id="security-answer-1"
                      type="text"
                      value={securityAnswer1}
                      onChange={(e) => setSecurityAnswer1(e.target.value)}
                      placeholder="Your answer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="security-question-2">Security Question 2</Label>
                    <Select value={securityQuestion2} onValueChange={setSecurityQuestion2} required>
                      <SelectTrigger id="security-question-2">
                        <SelectValue placeholder="Select second question" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((question) => (
                          <SelectItem key={question} value={question} disabled={question === securityQuestion1}>
                            {question}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="security-answer-2">Answer 2</Label>
                    <Input
                      id="security-answer-2"
                      type="text"
                      value={securityAnswer2}
                      onChange={(e) => setSecurityAnswer2(e.target.value)}
                      placeholder="Your answer"
                      required
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Organisation Information
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization-name">Organization Name *</Label>
                    <Input
                      id="organization-name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                      placeholder="Enter organization name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person Name *</Label>
                    <Input
                      id="contact-person"
                      value={contactPersonName}
                      onChange={(e) => setContactPersonName(e.target.value)}
                      required
                      placeholder="Enter contact person name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-description">Organization Description *</Label>
                    <Textarea
                      id="org-description"
                      value={organizationDescription}
                      onChange={(e) => setOrganizationDescription(e.target.value)}
                      required
                      placeholder="Describe your organization's mission and activities"
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tell vendors and the community about your organization's charitable work
                    </p>
                  </div>
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
