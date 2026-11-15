package br.com.jornadacafe.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Match the native inset background to the web theme without storing preferences natively. */
@CapacitorPlugin(name = "Appearance")
public class AppearancePlugin extends Plugin {
    @PluginMethod
    public void setTheme(PluginCall call) {
        String theme = call.getString("theme");
        if (!"light".equals(theme) && !"dark".equals(theme)) {
            call.reject("Aparência inválida.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            int color = getContext().getColor(
                "dark".equals(theme) ? R.color.colorAppBackgroundDark : R.color.colorAppBackgroundLight
            );
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            getBridge().getWebView().setBackgroundColor(color);
            call.resolve();
        });
    }
}
