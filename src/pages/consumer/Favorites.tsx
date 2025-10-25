import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart } from 'lucide-react';

export default function Favorites() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/consumer/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Favorites</CardTitle>
            </div>
            <CardDescription className="mt-2">
              You can manage the vendors you follow here
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add favorite vendors management UI here */}
        </CardContent>
      </Card>
    </div>
  );
}
