package com.ellicottcityairporttaxi.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PermissionState;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * JS bridge for {@link DriverLocationService}.
 *
 * Permission order matters and Android enforces it:
 *   1. FINE/COARSE_LOCATION  — the runtime prompt
 *   2. BACKGROUND_LOCATION    — Android 11+ refuses to grant this in the same
 *                               dialog; it must be a separate request, and the
 *                               user has to pick "Allow all the time" in
 *                               Settings. We detect the "denied once" state and
 *                               tell JS so it can deep-link there.
 *   3. POST_NOTIFICATIONS     — Android 13+, required for the ongoing
 *                               foreground-service notification to be visible.
 */
@CapacitorPlugin(
    name = "DriverLocation",
    permissions = {
        @Permission(
            alias = DriverLocationPlugin.LOCATION,
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        ),
        @Permission(
            alias = DriverLocationPlugin.BACKGROUND_LOCATION,
            strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = DriverLocationPlugin.NOTIFICATIONS,
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class DriverLocationPlugin extends Plugin {

    static final String LOCATION = "location";

    /** True when the alias is currently granted. */
    private boolean granted(String alias) {
        return getPermissionState(alias) == PermissionState.GRANTED;
    }
    static final String BACKGROUND_LOCATION = "backgroundLocation";
    static final String NOTIFICATIONS = "notifications";

    /** Ask for foreground location, then move on to background. */
    @PluginMethod
    public void start(PluginCall call) {
        // Step 1: foreground location. Everything else is pointless without it.
        requestPermissionForAlias(LOCATION, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (!granted(LOCATION)) {
            call.reject("Location permission denied", "PERMISSION_DENIED");
            return;
        }

        // Step 2: background location. Optional — the app still works without it,
        // it just stops tracking when the screen locks. So a refusal is reported
        // rather than treated as a hard failure.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean hasBackground = granted(BACKGROUND_LOCATION);
            if (hasBackground) {
                startService(call);
                return;
            }
            // Ask; if Android will not show the dialog (user picked "deny", or
            // "allow only this time"), we still start the service so foreground
            // tracking works, and flag it so the UI can prompt for Settings.
            requestPermissionForAlias(BACKGROUND_LOCATION, call, "backgroundCallback");
            return;
        }

        startService(call);
    }

    @PermissionCallback
    private void backgroundCallback(PluginCall call) {
        boolean background = granted(BACKGROUND_LOCATION);
        if (!background) {
            // Not fatal: foreground tracking still functions.
            startService(call);
            call.getData().put("backgroundGranted", false);
            return;
        }
        startService(call);
    }

    private void startService(PluginCall call) {
        // Android 13+ will not show the foreground-service notification, and
        // therefore may kill the service, unless notifications are permitted.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && !granted(NOTIFICATIONS)) {
            requestPermissionForAlias(NOTIFICATIONS, call, "notificationCallback");
            return;
        }
        launchService(call);
    }

    @PermissionCallback
    private void notificationCallback(PluginCall call) {
        // Start regardless: a denied notification still permits the service, it
        // just won't be visible, which Android treats as a weaker guarantee.
        launchService(call);
        if (!granted(NOTIFICATIONS)) {
            call.getData().put("notificationsGranted", false);
        }
    }

    private void launchService(PluginCall call) {
        try {
            DriverLocationService.start(getContext());
            call.resolve(call.getData());
        } catch (Exception e) {
            call.reject("Could not start location service: " + e.getMessage(), "SERVICE_ERROR", e);
        }
    }

    /** Stop tracking. Safe to call when not running. */
    @PluginMethod
    public void stop(PluginCall call) {
        try {
            DriverLocationService.stop(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not stop location service: " + e.getMessage(), "SERVICE_ERROR", e);
        }
    }

    /**
     * Read the freshest fix the service has recorded. Returns null until the
     * first fix lands, and a `stale` flag once the fix is older than 2 minutes,
     * so the caller never uploads a position from a previous trip.
     */
    @PluginMethod
    public void getCurrent(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(DriverLocationService.PREF_NAME, Context.MODE_PRIVATE);
            String lat = prefs.getString(DriverLocationService.KEY_LAT, null);
            String lng = prefs.getString(DriverLocationService.KEY_LNG, null);
            long at = prefs.getLong(DriverLocationService.KEY_AT, 0L);

            if (lat == null || lng == null || at == 0L) {
                ret.put("available", false);
                call.resolve(ret);
                return;
            }
            try {
                ret.put("lat", Double.parseDouble(lat));
                ret.put("lng", Double.parseDouble(lng));
            } catch (NumberFormatException e) {
                ret.put("available", false);
                call.resolve(ret);
                return;
            }
            float acc = prefs.getFloat(DriverLocationService.KEY_ACCURACY, -1f);
            ret.put("available", true);
            ret.put("accuracy", acc);
            ret.put("speed", prefs.getFloat(DriverLocationService.KEY_SPEED, 0f));
            ret.put("heading", prefs.getFloat(DriverLocationService.KEY_HEADING, 0f));
            ret.put("at", at);
            ret.put("stale", (System.currentTimeMillis() - at) > DriverLocationService.STALE_MS);
        } catch (Exception e) {
            call.reject("Could not read location: " + e.getMessage(), "READ_ERROR", e);
            return;
        }
        call.resolve(ret);
    }

    /** Which permissions are already granted, so the UI can prompt precisely. */
    @PluginMethod
    public void permissionState(PluginCall call) {
        JSObject ret = new JSObject();
        boolean foreground = granted(LOCATION);
        ret.put("foreground", foreground);
        ret.put("background", granted(BACKGROUND_LOCATION));
        ret.put("notifications", granted(NOTIFICATIONS));
        ret.put("needsSettings", !granted(BACKGROUND_LOCATION)
            && getPermissionState(BACKGROUND_LOCATION) == PermissionState.DENIED);
        call.resolve(ret);
    }
}
