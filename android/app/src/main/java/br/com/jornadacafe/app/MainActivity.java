package br.com.jornadacafe.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(AppearancePlugin.class);
        registerPlugin(DataFilesPlugin.class);
        registerPlugin(ReferenceLinksPlugin.class);
        registerPlugin(PreparationPlugin.class);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
