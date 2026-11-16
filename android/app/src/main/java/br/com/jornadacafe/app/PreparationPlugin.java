package br.com.jornadacafe.app;

import android.view.HapticFeedbackConstants;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Foreground screen/back controls and optional haptics, without permissions or services. */
@CapacitorPlugin(name = "Preparation")
public class PreparationPlugin extends Plugin {
    private OnBackPressedCallback backCallback;
    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            backCallback = new OnBackPressedCallback(false) {
                @Override public void handleOnBackPressed() { notifyListeners("back", new JSObject()); }
            };
            getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), backCallback);
        });
    }
    @PluginMethod
    public void setActive(PluginCall call) {
        boolean awake = Boolean.TRUE.equals(call.getBoolean("awake", false));
        getActivity().runOnUiThread(() -> {
            if (awake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
    @PluginMethod
    public void setNavigationActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        getActivity().runOnUiThread(() -> {
            if (backCallback != null) backCallback.setEnabled(active);
            call.resolve();
        });
    }
    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> { call.resolve(); getActivity().finish(); });
    }
    @PluginMethod
    public void vibrate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getBridge().getWebView().performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
            call.resolve();
        });
    }
    private void visibility(boolean active) { JSObject data = new JSObject(); data.put("active", active); notifyListeners("visibility", data); }
    @Override protected void handleOnPause() { visibility(false); }
    @Override protected void handleOnResume() { visibility(true); }
    @Override protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (backCallback != null) backCallback.remove();
        });
    }
}
