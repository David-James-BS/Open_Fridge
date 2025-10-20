import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function QRCodePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQRCode();
  }, [user]);

  const fetchQRCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vendor_qr_codes')
        .select('qr_code')
        .eq('vendor_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Create scan URL with the QR code
        const scanUrl = `${window.location.origin}/scan?code=${data.qr_code}`;
        setQrCode(scanUrl);
      } else {
        // Generate QR code if it doesn't exist
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'generate-vendor-qr'
        );

        if (functionError) throw functionError;
        const scanUrl = `${window.location.origin}/scan?code=${functionData.qrCode}`;
        setQrCode(scanUrl);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vendor-qr-code.png';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('QR code downloaded!');
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/vendor/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Your Vendor QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center">
            {qrCode && (
              <div ref={qrRef} className="bg-white p-6 rounded-lg">
                <QRCode value={qrCode} size={256} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Display this QR code at your location for customers to scan and collect food.
            </p>
            <p className="text-sm text-muted-foreground text-center font-medium">
              The QR code only works when you have an active food listing.
            </p>
          </div>

          <Button onClick={downloadQRCode} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download as PNG
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
