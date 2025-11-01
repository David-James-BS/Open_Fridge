import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Camera, AlertCircle, Keyboard } from 'lucide-react';
import { requestCameraAccess, isIOSDevice, getIOSCameraInstructions, isSecureContext } from '@/utils/camera';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    // Don't auto-start - wait for user to tap "Start Camera"
    return () => {
      stopScanner();
    };
  }, []);

  const handleStartCamera = async () => {
    setError(null);
    
    // Check camera permission first
    const result = await requestCameraAccess();
    
    if (result.status === 'insecure') {
      setError(
        isIOSDevice() 
          ? '📱 iPhone requires HTTPS for camera access.\n\n' +
            'Please use the hosted preview link or access this page via HTTPS.\n\n' +
            'For local development, use a tool like ngrok to get an HTTPS URL.'
          : 'Camera access requires HTTPS. Please access this page over HTTPS.'
      );
      setShowManualEntry(true);
      return;
    }
    
    if (result.status === 'denied') {
      if (isIOSDevice()) {
        setError(
          '🔒 Camera permission denied.\n\n' +
          'To enable camera access:\n' +
          getIOSCameraInstructions().join('\n') + '\n\n' +
          'You can also use manual entry below.'
        );
      } else {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
      }
      setShowManualEntry(true);
      return;
    }
    
    if (result.status === 'no-camera') {
      setError('No camera found on this device. Please use manual entry below.');
      setShowManualEntry(true);
      return;
    }
    
    if (result.status !== 'granted') {
      setError(result.message || 'Failed to access camera. Please try again or use manual entry.');
      setShowManualEntry(true);
      return;
    }
    
    // Permission granted, start the scanner
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned
          onScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scan error (this fires continuously, so we don't set error state)
          console.log('Scan error:', errorMessage);
        }
      );

      setIsScanning(true);
      setCameraReady(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please try again or use manual entry below.');
      setShowManualEntry(true);
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

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
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

          {!isScanning && !cameraReady ? (
            <div className="space-y-4">
              {!isSecureContext() && isIOSDevice() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Camera requires HTTPS on iPhone. Manual entry available below.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button onClick={handleStartCamera} size="lg" className="w-full">
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="w-full"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Enter Code Manually
              </Button>

              {showManualEntry && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="manual-code">QR Code</Label>
                    <Input
                      id="manual-code"
                      placeholder="Paste or type the QR code here"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualSubmit();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={!manualCode.trim()}
                    className="w-full"
                  >
                    Submit Code
                  </Button>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm whitespace-pre-line">
                  {error}
                </AlertDescription>
              </Alert>

              {showManualEntry && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-code-fallback">QR Code (Manual Entry)</Label>
                    <Input
                      id="manual-code-fallback"
                      placeholder="Paste or type the QR code here"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualSubmit();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={!manualCode.trim()}
                    className="w-full"
                  >
                    Submit Code
                  </Button>
                </div>
              )}

              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <>
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden border-2 border-primary"
              />
              <p className="text-sm text-muted-foreground text-center mt-4">
                Position the vendor's QR code within the frame
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
