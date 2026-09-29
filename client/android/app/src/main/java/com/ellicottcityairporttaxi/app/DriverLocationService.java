package com.ellicottcityairporttaxi.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Keeps broadcasting the driver's position while a ride is in progress, even
 * when the screen is locked or the app is in the background.
 *
 * Why this exists: a plain WebView geolocation watch (what @capacitor/geolocation
 * gives us) is suspended by Android as soon as the app is backgrounded, and
 * `getCurrentPosition` resolves exactly once. For a passenger watching their
 * driver on a map, that means a marker that never moves. A foreground service
 * with an ongoing notification is the only way Android permits continuous
 * location in the background.
 *
 * The service does NOT talk to the network. It only records the latest fix to
 * SharedPreferences; the web layer reads it and pushes it over the socket, so
 * there is exactly one upload path and it keeps working when the WebView is
 * alive. That also means no credentials or network code live in the service.
 */
public class DriverLocationService extends Service implements LocationListener {

    private static final String TAG = "DriverLocationSvc";
    public static final String CHANNEL_ID = "driver_location";
    public static final int NOTIFICATION_ID = 4711;
    /** Our own action string — android.content.Intent has no ACTION_STOP. */
    public static final String ACTION_STOP = "com.ellicottcityairporttaxi.app.STOP_TRACKING";

    /** SharedPreferences keys — mirrored in the JS layer (see driverLocation.js). */
    public static final String PREF_NAME = "driver_location";
    public static final String KEY_LAT = "lat";
    public static final String KEY_LNG = "lng";
    public static final String KEY_ACCURACY = "accuracy";
    public static final String KEY_SPEED = "speed";
    public static final String KEY_HEADING = "heading";
    public static final String KEY_AT = "at";
    /** Guards against a dead fix being replayed when the app reopens. */
    public static final long STALE_MS = 120000L;

    private static final long MIN_INTERVAL_MS = 2000L;
    private static final float MIN_DISTANCE_M = 0f;

    private LocationManager locationManager;
    private volatile boolean tracking = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // An OS-killed service is restarted rather than left dead, because a
        // driver mid-ride must keep publishing their position.
        if (intent == null || intent.getAction() == null) {
            return START_STICKY;
        }
        if (ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
        }

        // Must call startForeground() within seconds of startService, or the
        // system throws ForegroundServiceDidNotStartInTimeException.
        startForegroundCompat();
        startTracking();
        return START_STICKY;
    }

    private void startForegroundCompat() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("On an active trip")
            .setContentText("Ellicott City Airport Taxi is sharing your location with your passenger.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pi)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // API 29+: the type is mandatory on the notification.
            startForeground(
                NOTIFICATION_ID, notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void startTracking() {
        if (tracking) return;
        if (!hasLocationPermission()) {
            Log.w(TAG, "location permission not granted; service will not track");
            stopSelf();
            return;
        }
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) { stopSelf(); return; }

        // Seed with the last known fix so the passenger's marker appears at the
        // right place immediately instead of waiting for a fresh one.
        try {
            Location last = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (last != null) persist(last);
            else {
                Location net = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if (net != null) persist(net);
            }
        } catch (SecurityException e) {
            Log.w(TAG, "last known location unavailable: " + e.getMessage());
        }

        // GPS for accuracy while moving, network as a fallback indoors.
        requestUpdates(LocationManager.GPS_PROVIDER);
        requestUpdates(LocationManager.NETWORK_PROVIDER);

        tracking = true;
        Log.i(TAG, "tracking started");
    }

    private void requestUpdates(String provider) {
        try {
            if (!locationManager.isProviderEnabled(provider)) return;
            locationManager.requestLocationUpdates(
                provider, MIN_INTERVAL_MS, MIN_DISTANCE_M, this
            );
        } catch (SecurityException e) {
            Log.w(TAG, "requestLocationUpdates denied for " + provider + ": " + e.getMessage());
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "provider unavailable: " + provider);
        }
    }

    private void stopTracking() {
        if (locationManager != null && tracking) {
            try { locationManager.removeUpdates(this); } catch (SecurityException ignored) { }
        }
        tracking = false;
        Log.i(TAG, "tracking stopped");
    }

    @Override
    public void onDestroy() {
        stopTracking();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    // ---- LocationListener ------------------------------------------------

    @Override
    public void onLocationChanged(Location location) { persist(location); }

    @Override public void onProviderEnabled(String provider) { }
    @Override public void onProviderDisabled(String provider) { }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) { }

    // ---- persistence -----------------------------------------------------

    private void persist(Location loc) {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(KEY_LAT, String.valueOf(loc.getLatitude()))
            .putString(KEY_LNG, String.valueOf(loc.getLongitude()))
            .putFloat(KEY_ACCURACY, loc.hasAccuracy() ? loc.getAccuracy() : -1f)
            .putFloat(KEY_SPEED, loc.hasSpeed() ? loc.getSpeed() : 0f)
            .putFloat(KEY_HEADING, loc.hasBearing() ? loc.getBearing() : 0f)
            .putLong(KEY_AT, System.currentTimeMillis())
            .apply();
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Active trip",
            NotificationManager.IMPORTANCE_LOW   // silent: a tracking notice should not buzz
        );
        channel.setDescription("Shown while you are on an active trip so your passenger can follow you.");
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }

    // ---- control ---------------------------------------------------------

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, DriverLocationService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    public static void stop(Context ctx) {
        Intent i = new Intent(ctx, DriverLocationService.class);
        i.setAction(ACTION_STOP);
        try { ctx.startService(i); } catch (Exception ignored) { }
        ctx.stopService(new Intent(ctx, DriverLocationService.class));
    }
}
