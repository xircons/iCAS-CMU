import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { QrCode, Key, Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { checkinApi } from '../features/checkin/api/checkinApi';
import type { User } from '../App';

interface CheckInViewProps {
  user: User;
}

export function CheckInView({ user }: CheckInViewProps) {
  const [passcode, setPasscode] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isPasscodeDialogOpen, setIsPasscodeDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const qrCodeScannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const stopQRScanner = useCallback(async () => {
    if (qrCodeScannerRef.current) {
      try {
        await qrCodeScannerRef.current.stop();
        await qrCodeScannerRef.current.clear();
        qrCodeScannerRef.current = null;
        setIsScanning(false);
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  }, []);

  const handleQRCodeScanned = useCallback(async (qrCodeData: string) => {
    await stopQRScanner();
    setIsQRScannerOpen(false);

    try {
      const result = await checkinApi.checkInViaQR(undefined, qrCodeData);
      toast.success(result.message || 'Successfully checked in via QR code!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in. Please try again.');
    }
  }, [stopQRScanner]);

  const startQRScanner = useCallback(async () => {
    if (!Html5Qrcode) {
      setCameraError('QR scanner library not loaded. Please refresh the page.');
      toast.error('QR scanner library not available');
      return;
    }

    const elementId = 'qr-reader';
    const element = document.getElementById(elementId);
    
    if (!element) {
      console.error('QR reader element not found');
      setCameraError('Scanner element not found. Please try again.');
      return;
    }

    // Stop any existing scanner
    if (qrCodeScannerRef.current) {
      try {
        await qrCodeScannerRef.current.stop();
        await qrCodeScannerRef.current.clear();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    try {
      const scanner = new Html5Qrcode(elementId);
      qrCodeScannerRef.current = scanner;

      // Request camera permission and start scanner
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scanning:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setCameraError(null);
    } catch (error: any) {
      console.error('QR Scanner error:', error);
      setIsScanning(false);
      
      let errorMessage = 'Failed to start camera. ';
      if (error.message?.includes('Permission denied') || error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.message?.includes('NotFoundError') || error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera device.';
      } else if (error.message?.includes('NotReadableError') || error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else {
        errorMessage += error.message || 'Please check your camera permissions.';
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  }, [handleQRCodeScanned]);

  // Start scanner when dialog opens
  useEffect(() => {
    if (isQRScannerOpen) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        startQRScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Stop scanner when dialog closes
      stopQRScanner();
    }
  }, [isQRScannerOpen, startQRScanner, stopQRScanner]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopQRScanner();
    };
  }, [stopQRScanner]);

  const handleQRScanClick = () => {
    setCameraError(null);
    setIsQRScannerOpen(true);
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passcode || passcode.length !== 6) {
      toast.error('Please enter a valid 6-digit passcode');
      return;
    }

    try {
      const result = await checkinApi.checkInViaPasscode(undefined, passcode);
      toast.success(result.message || 'Successfully checked in via passcode!');
      setPasscode('');
      setIsPasscodeDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in. Please try again.');
    }
  };

  const handleCloseQRScanner = async () => {
    await stopQRScanner();
    setIsQRScannerOpen(false);
    setCameraError(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="mb-2">Check In</h1>
        <p className="text-muted-foreground">
          Check in to events using QR code scanning or passcode
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Check-In</CardTitle>
          <CardDescription>
            Choose your check-in method - scan QR code or enter passcode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleQRScanClick}
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <Camera className="h-6 w-6" />
              <span>Scan QR Code</span>
            </Button>

            <Button
              onClick={() => setIsPasscodeDialogOpen(true)}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <Key className="h-6 w-6" />
              <span>Enter Passcode</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={isQRScannerOpen} onOpenChange={handleCloseQRScanner}>
        <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[80vh] !max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="shrink-0 p-4 sm:p-6 pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Scan QR Code</DialogTitle>
            <DialogDescription className="text-sm">
              Point your camera at the QR code to check in
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
              <div
                id="qr-reader"
                ref={scannerContainerRef}
                className="w-full"
                style={{ minHeight: '300px' }}
              />
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-center text-white">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Requesting camera access...</p>
                  </div>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 p-4">
                  <div className="text-center text-white">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                    <p className="text-sm mb-2">{cameraError}</p>
                    <Button
                      onClick={() => {
                        setCameraError(null);
                        setTimeout(() => {
                          startQRScanner();
                        }, 100);
                      }}
                      variant="outline"
                      className="mt-2"
                      size="sm"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {isScanning && (
              <div className="text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Scanning... Please point your camera at the QR code</span>
                </div>
              </div>
            )}
            <Button
              onClick={handleCloseQRScanner}
              variant="outline"
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Passcode Dialog */}
      <Dialog open={isPasscodeDialogOpen} onOpenChange={setIsPasscodeDialogOpen}>
        <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[80vh] !max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="shrink-0 p-4 sm:p-6 pb-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">Enter Passcode</DialogTitle>
            <DialogDescription className="text-sm">
              Enter the 6-digit passcode displayed by the event leader
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={passcode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Only numbers
                  setPasscode(value);
                }}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 h-10 sm:h-11 text-sm sm:text-base" disabled={passcode.length !== 6}>
                Check In
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 sm:h-11 text-sm sm:text-base"
                onClick={() => {
                  setIsPasscodeDialogOpen(false);
                  setPasscode('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

