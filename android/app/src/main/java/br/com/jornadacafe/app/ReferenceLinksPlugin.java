package br.com.jornadacafe.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Explicit external navigation: the WebView need not support target=_blank windows. */
@CapacitorPlugin(name = "ReferenceLinks")
public class ReferenceLinksPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String value = call.getString("url");
        Uri uri;
        try {
            uri = Uri.parse(value == null ? "" : value);
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getHost().isEmpty()) {
                call.reject("Informe uma referência HTTP ou HTTPS válida.");
                return;
            }
        } catch (Exception error) {
            call.reject("Informe uma referência HTTP ou HTTPS válida.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception error) {
                call.reject("Não foi possível abrir o navegador. Verifique se há um aplicativo para abrir links.");
            }
        });
    }
}
