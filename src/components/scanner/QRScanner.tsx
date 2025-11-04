import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'initializing' | 'ready' | 'scanning'>('initializing');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setScanStatus('initializing');
      console.log('Starting QR scanner...');
      
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      // Wait a moment for the DOM element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Scanner initialized, requesting camera...');

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Make the scanning box 70% of the smaller dimension
            const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minDimension * 0.7);
            console.log('QR box size:', qrboxSize);
            return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1.0, // Square aspect ratio for QR codes
        },
        (decodedText) => {
          // Successfully scanned
          console.log('QR code scanned:', decodedText);
          setScanStatus('scanning');
          onScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scan error (this fires continuously, so we don't set error state)
          // Only log periodically to avoid spam
          if (Math.random() < 0.01) {
            console.log('Scanning...');
          }
        }
      );

      console.log('Camera started successfully');
      setScanStatus('ready');
      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to access camera. Please check permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <h3 className="font-semibold">Scan QR Code</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {error ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-destructive text-sm">{error}</p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <div 
                  id="qr-reader" 
                  className="w-full rounded-lg overflow-hidden border-2 border-primary"
                  style={{
                    minHeight: '300px',
                    maxWidth: '100%',
                    position: 'relative'
                  }}
                />
                {scanStatus === 'ready' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="text-center text-white bg-black/50 p-4 rounded-lg">
                      <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Point camera at QR code</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Position the vendor's QR code within the frame
              </p>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Can't scan? Enter code manually:
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter QR code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                  />
                  <Button 
                    onClick={() => {
                      if (manualCode.trim()) {
                        onScan(manualCode.trim());
                      }
                    }}
                    size="sm"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
