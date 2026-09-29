package com.ellicottcityairporttaxi.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before super so the plugin is available to the first
        // JavaScript call after the WebView loads.
        registerPlugin(DriverLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
