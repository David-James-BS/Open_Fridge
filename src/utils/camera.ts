/**
 * Camera access utilities for QR scanning
 * Handles iOS-specific security requirements and permission flows
 */

export type CameraAccessStatus = 
  | 'granted' 
  | 'denied' 
  | 'no-camera' 
  | 'insecure' 
  | 'unsupported' 
  | 'unknown';

export interface CameraAccessResult {
  status: CameraAccessStatus;
  message?: string;
}

/**
 * Detect if the device is running iOS
 */
export function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Check if the current context is secure (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

/**
 * Request camera access and return the permission status
 * Must be called from a user gesture (button click) for iOS
 */
export async function requestCameraAccess(): Promise<CameraAccessResult> {
  // Check for insecure context on iOS
  if (isIOSDevice() && !isSecureContext()) {
    return { 
      status: 'insecure',
      message: 'iPhone requires HTTPS for camera access. Please use the hosted preview or access via HTTPS.'
    };
  }

  // Check if getUserMedia is supported
  if (!navigator.mediaDevices?.getUserMedia) {
    return { 
      status: 'unsupported',
      message: 'Camera access is not supported in this browser.'
    };
  }

  try {
    // Request camera access with rear camera preference
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });

    // Immediately stop the stream - we just needed to trigger the permission
    // The html5-qrcode library will request access again when starting
    stream.getTracks().forEach(track => track.stop());

    return { status: 'granted' };
  } catch (error: any) {
    const errorName = error?.name || '';
    
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return { 
        status: 'denied',
        message: 'Camera permission was denied. Please enable camera access in your browser settings.'
      };
    }
    
    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorName === 'OverconstrainedError') {
      return { 
        status: 'no-camera',
        message: 'No camera found on this device.'
      };
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return { 
        status: 'denied',
        message: 'Camera is already in use by another application.'
      };
    }

    if (errorName === 'SecurityError') {
      return { 
        status: 'insecure',
        message: 'Camera access requires a secure connection (HTTPS).'
      };
    }

    return { 
      status: 'unknown',
      message: error?.message || 'An unknown error occurred while accessing the camera.'
    };
  }
}

/**
 * Get user-friendly instructions for enabling camera on iOS Safari
 */
export function getIOSCameraInstructions(): string[] {
  return [
    '1. Open iPhone Settings',
    '2. Scroll down and tap Safari',
    '3. Under "Settings for Websites", tap Camera',
    '4. Select "Allow" or "Ask"',
    '5. Return to this page and try again'
  ];
}
