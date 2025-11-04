import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Edit, Save, X } from 'lucide-react';
import { SECURITY_QUESTIONS } from '@/constants/securityQuestions';
import { supabase } from '@/integrations/supabase/client';
import { hashSecurityAnswer } from '@/utils/securityHash';
import { toast } from 'sonner';

interface SecurityQuestionsSectionProps {
  userId: string;
  question1?: string;
  question2?: string;
}

export function SecurityQuestionsSection({ userId, question1, question2 }: SecurityQuestionsSectionProps) {
  const [editMode, setEditMode] = useState(!question1 || !question2);
  const [saving, setSaving] = useState(false);
  const [securityQuestion1, setSecurityQuestion1] = useState(question1 || '');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState(question2 || '');
  const [securityAnswer2, setSecurityAnswer2] = useState('');

  const handleSave = async () => {
    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
      toast.error('Please fill in both security questions and answers');
      return;
    }

    if (securityQuestion1 === securityQuestion2) {
      toast.error('Please select different security questions');
      return;
    }

    setSaving(true);
    try {
      const answer1Hash = await hashSecurityAnswer(securityAnswer1);
      const answer2Hash = await hashSecurityAnswer(securityAnswer2);

      const { error } = await supabase
        .from('profiles')
        .update({
          security_question_1: securityQuestion1,
          security_answer_1_hash: answer1Hash,
          security_question_2: securityQuestion2,
          security_answer_2_hash: answer2Hash
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Security questions updated successfully');
      setEditMode(false);
      setSecurityAnswer1('');
      setSecurityAnswer2('');
    } catch (error: any) {
      console.error('Error updating security questions:', error);
      toast.error('Failed to update security questions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Questions
          </CardTitle>
          {!editMode && (question1 || question2) && (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editMode ? (
          <>
            <p className="text-sm text-muted-foreground">
              These questions will be used for password recovery. Choose questions only you know the answer to.
            </p>
            <div className="space-y-4">
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
                  placeholder="Your answer (case-insensitive)"
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
                  placeholder="Your answer (case-insensitive)"
                  required
                />
              </div>
              <div className="flex gap-2">
                {(question1 || question2) && (
                  <Button variant="outline" onClick={() => {
                    setEditMode(false);
                    setSecurityQuestion1(question1 || '');
                    setSecurityQuestion2(question2 || '');
                    setSecurityAnswer1('');
                    setSecurityAnswer2('');
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Security Questions'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Question 1:</p>
              <p className="text-sm text-muted-foreground">{question1}</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Question 2:</p>
              <p className="text-sm text-muted-foreground">{question2}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your answers are securely hashed and used for password recovery.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
