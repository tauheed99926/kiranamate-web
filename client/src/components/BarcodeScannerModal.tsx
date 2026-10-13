import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, AlertCircle, Keyboard } from 'lucide-react';
import { playBeep } from '../lib/utils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-reader-viewport';
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    // Reset states
    setErrorMessage(null);
    setManualCode('');
    setTorchOn(false);

    // Wait a brief tick for DOM element to render
    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        const now = Date.now();
        // Prevent repeated triggers for the same barcode within 1.5 seconds
        if (now - lastScannedTimeRef.current < 1500) {
          return;
        }
        lastScannedTimeRef.current = now;

        playBeep('success');
        onScan(decodedText.trim());
      };

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.33,
      };

      // Try environment (rear) camera first, fallback to user camera
      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        qrCodeSuccessCallback,
        undefined
      );

      setIsScanning(true);

      // Check torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsScanning(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or enter the barcode manually below.');
      } else if (err?.name === 'NotFoundError' || String(err).includes('NotFound')) {
        setErrorMessage('No camera found on this device. You can enter the barcode manually below.');
      } else {
        setErrorMessage(`Camera error: ${err.message || 'Unable to access camera'}. Note: Camera requires HTTPS or localhost.`);
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.debug('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBeep('success');
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-black flex items-center justify-center min-h-[280px]">
          <div id={scannerContainerId} className="w-full h-full min-h-[260px] overflow-hidden" />

          {/* Torch toggle button if supported */}
          {hasTorch && isScanning && (
            <button
              onClick={toggleTorch}
              className={`absolute top-4 right-4 z-10 p-2.5 rounded-full shadow-lg transition-all ${
                torchOn ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title="Toggle Flashlight"
            >
              <Flashlight className="w-5 h-5" />
            </button>
          )}

          {/* Error Message banner */}
          {errorMessage && (
            <div className="absolute inset-0 bg-gray-900/90 text-white p-6 flex flex-col items-center justify-center text-center z-10">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <p className="text-sm font-medium mb-2">{errorMessage}</p>
              <p className="text-xs text-gray-400">
                You can still type the barcode manually or use a USB barcode scanner below.
              </p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback & Scanner Guidance */}
        <div className="p-5 bg-white space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Point camera at barcode or EAN code
            </span>
            <span>Supports EAN-13, EAN-8, UPC, Code 128</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter or scan barcode manually..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
