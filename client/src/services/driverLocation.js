import { registerPlugin, Capacitor } from '@capacitor/core';

// Native foreground-service bridge. Only exists on a real device build; in the
// browser (or a web-only dev run) the plugin is absent and every call here
// no-ops, so the same code path works in the Capacitor WebView and in Chrome.
const DriverLocation = registerPlugin('DriverLocation');

export const isNative = Capacitor.isNativePlatform();

/**
 * Start continuous background tracking.
 * Resolves with `{ backgroundGranted, notificationsGranted }` when the OS
 * refused an optional permission. Foreground location is required; the others
 * are advisory, so a partial grant still returns a usable service.
 */
export async function startTracking() {
  if (!isNative) return { backgroundGranted: false, notificationsGranted: false };
  try {
    return (await DriverLocation.start()) || {};
  } catch {
    // A refusal is not a crash: the driver can still work with foreground-only
    // tracking while the app is open.
    return { backgroundGranted: false, notificationsGranted: false };
  }
}

/** Stop tracking. Safe to call when not running. */
export async function stopTracking() {
  if (!isNative) return;
  try {
    await DriverLocation.stop();
  } catch {
    /* already stopped */
  }
}

/**
 * Newest fix the service has recorded.
 * @returns {Promise<null | {lat,lng,accuracy?,speed?,heading?,at,stale}>}
 *   `null` when nothing is available yet. `stale` is true once the fix is
 *   older than two minutes, which the caller must not upload — that would put
 *   a driver at their last known ride's pickup.
 */
export async function getCurrentPosition() {
  if (!isNative) return null;
  try {
    const r = await DriverLocation.getCurrent();
    if (!r || !r.available || r.stale) return null;
    return {
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy,
      speed: r.speed,
      heading: r.heading,
      at: r.at,
      stale: false,
    };
  } catch {
    return null;
  }
}

/** Which location permissions are granted, so the UI can prompt precisely. */
export async function permissionState() {
  if (!isNative) return { foreground: false, background: false, notifications: false };
  try {
    return await DriverLocation.permissionState();
  } catch {
    return { foreground: false, background: false, notifications: false };
  }
}
