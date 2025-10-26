import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SECURITY_QUESTIONS } from '@/constants/securityQuestions';
import { hashSecurityAnswer } from '@/utils/securityHash';

export default function AdminAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSecurityAnswer1, setResetSecurityAnswer1] = useState('');
  const [resetSecurityAnswer2, setResetSecurityAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fetchedQuestion1, setFetchedQuestion1] = useState('');
  const [fetchedQuestion2, setFetchedQuestion2] = useState('');
  const [questionsFetched, setQuestionsFetched] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
      toast({
        title: 'Missing information',
        description: 'Please select both security questions and provide answers',
        variant: 'destructive',
      });
      return;
    }

    if (securityQuestion1 === securityQuestion2) {
      toast({
        title: 'Invalid selection',
        description: 'Please select different security questions',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Hash answers before sending
      const answer1Hash = await hashSecurityAnswer(securityAnswer1);
      const answer2Hash = await hashSecurityAnswer(securityAnswer2);

      // Call edge function to create admin user
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { 
          email, 
          password,
          securityQuestion1,
          securityAnswer1Hash: answer1Hash,
          securityQuestion2,
          securityAnswer2Hash: answer2Hash
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Admin account created',
        description: 'You can now sign in with your credentials',
      });

      // Clear signup fields and switch to sign in
      setPassword('');
      setConfirmPassword('');
      setSecurityQuestion1('');
      setSecurityAnswer1('');
      setSecurityQuestion2('');
      setSecurityAnswer2('');
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      toast({
        title: 'Login successful',
        description: 'Welcome to the admin dashboard',
      });

      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSecurityQuestions = async () => {
    if (!resetEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
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
        throw new Error('No security questions found for this email');
      }

      setFetchedQuestion1(profile.security_question_1);
      setFetchedQuestion2(profile.security_question_2);
      setQuestionsFetched(true);
      toast({
        title: 'Security questions found',
        description: 'Please answer both security questions',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not find security questions for this email',
        variant: 'destructive',
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

      const { data, error } = await supabase.functions.invoke('reset-password-with-security', {
        body: {
          email: resetEmail,
          securityAnswer1: resetSecurityAnswer1,
          securityAnswer2: resetSecurityAnswer2,
          newPassword
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password reset successful!",
        description: "You can now sign in with your new password.",
      });

      setShowForgotPassword(false);
      setResetEmail('');
      setResetSecurityAnswer1('');
      setResetSecurityAnswer2('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFetchedQuestion1('');
      setFetchedQuestion2('');
      setQuestionsFetched(false);
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowForgotPassword(false)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>

          <Card>
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                  Answer your security question to reset your password
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
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
                      setFetchedQuestion1('');
                      setFetchedQuestion2('');
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
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">Admin Portal</CardTitle>
              <CardDescription>
                Sign in or create an admin account
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
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
                      placeholder="admin@example.com"
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
                    {loading ? 'Signing in...' : 'Sign In'}
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
                      placeholder="admin@example.com"
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Admin Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
