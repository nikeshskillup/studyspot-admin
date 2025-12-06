import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
}

const QRScanner = ({ onScan, isActive }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent duplicate scans within 3 seconds
          if (decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            onScan(decodedText);

            // Clear the last scanned after 3 seconds
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }
            scanTimeoutRef.current = setTimeout(() => {
              lastScannedRef.current = "";
            }, 3000);
          }
        },
        () => {} // Ignore scan failures
      );

      setIsScanning(true);
    } catch (err: any) {
      setError(err.message || "Failed to start camera");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanner();
    } else if (!isActive && isScanning) {
      stopScanner();
    }

    return () => {
      stopScanner();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [isActive]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-muted">
          <div
            id="qr-reader"
            className="w-full aspect-square max-w-md mx-auto"
          />
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted">
              <Camera className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center px-4">
                Camera will activate when scanner is enabled
              </p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted p-4">
              <CameraOff className="h-16 w-16 text-destructive" />
              <p className="text-destructive text-center">{error}</p>
              <Button variant="outline" onClick={startScanner}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;
