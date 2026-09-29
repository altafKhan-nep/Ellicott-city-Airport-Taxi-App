import { useEffect, useRef, useState } from 'react';
import { getCurrentPosition as getNativeFix, isNative } from '../services/driverLocation.js';

// Geolocation helper.
//
// Two modes, because they solve different problems:
//   - watch: streams fixes while the app is in the foreground. This is what the
//     booking map and the driver dashboard use.
//   - native: reads the latest fix recorded by DriverLocationService, which
//     keeps running when the app is backgrounded. Used as a fallback so a
//     driver who switches apps still publishes a fresh position.
//
// The previous implementation called getCurrentPosition() exactly once, so a
// driver's marker on a passenger's map never moved.
export default function useGeolocation(options = {}) {
  const {
    // Pass true to keep a watch open for as long as the component is mounted.
    watch = false,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchId = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const apply = (pos) => {
    if (!mounted.current) return;
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      at: Date.now(),
    });
  };

  const onError = (err) => {
    if (!mounted.current) return;
    setError(err?.message || 'Location unavailable');
    setLoading(false);
  };

  // Fallback poller for the native foreground service. Cheap (a SharedPreferences
  // read) and only runs when the page is visible.
  useEffect(() => {
    if (!isNative) return undefined;
    let cancelled = false;
    const poll = async () => {
      if (cancelled || document.hidden) return;
      const fix = await getNativeFix();
      if (!fix) return;
      setPosition((prev) => {
        // Keep a better fix if one already arrived from the OS watch.
        if (prev && prev.at > fix.at) return prev;
        return { ...fix, stale: false };
      });
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this device');
      return undefined;
    }

    const geo = { enableHighAccuracy, timeout, maximumAge };

    if (watch) {
      // Keep receiving fixes for the lifetime of this hook.
      setLoading(true);
      setError(null);
      watchId.current = navigator.geolocation.watchPosition(
        apply,
        onError,
        geo
      );
    } else {
      navigator.geolocation.getCurrentPosition(apply, onError, geo);
    }

    return undefined;
  }, [watch, enableHighAccuracy, timeout, maximumAge]);

  /** Re-request once, e.g. from a "turn on location" button. */
  const locate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this device');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        apply(pos);
        setLoading(false);
      },
      onError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  };

  return { position, error, loading, locate };
}
