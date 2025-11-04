import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Shield, History, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SECURITY_QUESTIONS } from "@/constants/securityQuestions";
import { hashSecurityAnswer } from "@/utils/securityHash";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProfileData {
  email: string;
  name: string;
  phone: string;
  security_question_1: string | null;
  security_question_2: string | null;
}

interface ReviewActivity {
  id: string;
  status: string;
  reviewed_at: string;
  vendor_email: string;
  rejection_reason: string | null;
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    email: "",
    name: "",
    phone: "",
    security_question_1: null,
    security_question_2: null,
  });
  const [securityAnswers, setSecurityAnswers] = useState({
    answer1: "",
    answer2: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reviewHistory, setReviewHistory] = useState<ReviewActivity[]>([]);

  useEffect(() => {
    loadProfile();
    loadReviewHistory();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin/auth');
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast({
          title: "Unauthorized",
          description: "You must be an admin to access this page",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('email, name, phone, security_question_1, security_question_2')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profileData) {
        setProfile({
          email: profileData.email || user.email || "",
          name: profileData.name || "",
          phone: profileData.phone || "",
          security_question_1: profileData.security_question_1,
          security_question_2: profileData.security_question_2,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviewHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('licenses')
        .select(`
          id,
          status,
          reviewed_at,
          rejection_reason,
          profiles!licenses_user_id_fkey (email)
        `)
        .eq('reviewed_by', user.id)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item: any) => ({
          id: item.id,
          status: item.status,
          reviewed_at: item.reviewed_at,
          vendor_email: item.profiles?.email || 'Unknown',
          rejection_reason: item.rejection_reason,
        }));
        setReviewHistory(formattedData);
      }
    } catch (error) {
      console.error('Error loading review history:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile
      const updateData: any = {
        name: profile.name,
        phone: profile.phone,
      };

      // Add security questions if provided
      if (profile.security_question_1 && securityAnswers.answer1) {
        updateData.security_question_1 = profile.security_question_1;
        updateData.security_answer_1_hash = await hashSecurityAnswer(securityAnswers.answer1);
      }

      if (profile.security_question_2 && securityAnswers.answer2) {
        updateData.security_question_2 = profile.security_question_2;
        updateData.security_answer_2_hash = await hashSecurityAnswer(securityAnswers.answer2);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Clear security answers after saving
      setSecurityAnswers({ answer1: "", answer2: "" });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Admin Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and security</p>
        </div>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Enter your phone number"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Security Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Questions
          </CardTitle>
          <CardDescription>
            Set up security questions for account recovery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question1">Security Question 1</Label>
            <Select
              value={profile.security_question_1 || ""}
              onValueChange={(value) => setProfile({ ...profile, security_question_1: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((question, index) => (
                  <SelectItem key={index} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {profile.security_question_1 && (
            <div className="space-y-2">
              <Label htmlFor="answer1">Answer</Label>
              <Input
                id="answer1"
                type="password"
                value={securityAnswers.answer1}
                onChange={(e) => setSecurityAnswers({ ...securityAnswers, answer1: e.target.value })}
                placeholder="Enter your answer"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="question2">Security Question 2</Label>
            <Select
              value={profile.security_question_2 || ""}
              onValueChange={(value) => setProfile({ ...profile, security_question_2: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((question, index) => (
                  <SelectItem key={index} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {profile.security_question_2 && (
            <div className="space-y-2">
              <Label htmlFor="answer2">Answer</Label>
              <Input
                id="answer2"
                type="password"
                value={securityAnswers.answer2}
                onChange={(e) => setSecurityAnswers({ ...securityAnswers, answer2: e.target.value })}
                placeholder="Enter your answer"
              />
            </div>
          )}

          {(securityAnswers.answer1 || securityAnswers.answer2) && (
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Security Questions
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handleChangePassword}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Review Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Review Activity History
          </CardTitle>
          <CardDescription>
            All licenses you have reviewed ({reviewHistory.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewHistory.length === 0 ? (
            <Alert>
              <AlertDescription>
                No review activity yet
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed Date</TableHead>
                    <TableHead>Rejection Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewHistory.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.vendor_email}</TableCell>
                      <TableCell>
                        <Badge variant={activity.status === 'approved' ? 'default' : 'destructive'}>
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(activity.reviewed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {activity.rejection_reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
