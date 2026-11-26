package br.com.jornadacafe.app;

import static org.junit.Assert.*;
import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.test.platform.app.InstrumentationRegistry;
import android.app.Instrumentation;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.lang.reflect.Method;
import java.security.MessageDigest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class DataFilesPluginTest {
    static class Call extends PluginCall {
        final CountDownLatch done = new CountDownLatch(1); JSObject value; String error;
        Call(String method, JSObject data) { super(null,"DataFiles","test",method,data); }
        @Override public void resolve(JSObject value) { this.value=value;done.countDown(); }
        @Override public void resolve() { done.countDown(); }
        @Override public void reject(String error) { this.error=error;done.countDown(); }
        void await() throws Exception { assertTrue("Native response timeout",done.await(15,TimeUnit.SECONDS)); }
    }
    @Test public void fileProviderSharesOnlyTransferCache() throws Exception {
        android.content.Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("br.com.jornadacafe.sandbox", context.getPackageName());
        String authority = context.getPackageName() + ".fileprovider";
        java.io.File allowed = new java.io.File(context.getCacheDir(), "data-sharing/visibility-test.zip");
        Uri uri = androidx.core.content.FileProvider.getUriForFile(context, authority, allowed);
        assertEquals("content", uri.getScheme());
        assertTrue(uri.getPath().startsWith("/shared_backups/"));
        for (java.io.File forbidden : new java.io.File[] {
                new java.io.File(context.getCacheDir(), "private-test.zip"),
                new java.io.File(context.getFilesDir(), "private-test.zip"),
                new java.io.File(context.getCacheDir(), "data-sharing/../private-test.zip") }) {
            try {
                androidx.core.content.FileProvider.getUriForFile(context, authority, forbidden);
                fail("Private paths must not be shared by FileProvider");
            } catch (IllegalArgumentException expected) { }
        }
    }

    @Test public void nativeDestinationFailuresCancellationAndRetry() throws Exception {
        assertEquals("br.com.jornadacafe.sandbox", androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName());
        // MIUI rejects background launches from the instrumented app. Launch through
        // the test runner's shell after registering the lifecycle observer.
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        AtomicReference<MainActivity> activityRef = new AtomicReference<>();
        Application application = (Application) instrumentation.getTargetContext().getApplicationContext();
        Application.ActivityLifecycleCallbacks callbacks = new Application.ActivityLifecycleCallbacks() {
            public void onActivityResumed(Activity activity) { if (activity instanceof MainActivity) activityRef.set((MainActivity) activity); }
            public void onActivityCreated(Activity activity, Bundle state) { }
            public void onActivityStarted(Activity activity) { }
            public void onActivityPaused(Activity activity) { }
            public void onActivityStopped(Activity activity) { }
            public void onActivitySaveInstanceState(Activity activity, Bundle state) { }
            public void onActivityDestroyed(Activity activity) { }
        };
        application.registerActivityLifecycleCallbacks(callbacks);
        try (android.os.ParcelFileDescriptor command = instrumentation.getUiAutomation().executeShellCommand(
                "am start -W -n br.com.jornadacafe.sandbox/br.com.jornadacafe.app.MainActivity");
                java.io.InputStream output = new android.os.ParcelFileDescriptor.AutoCloseInputStream(command)) {
            byte[] buffer = new byte[1024];
            while (output.read(buffer) != -1) { }
        }
        long deadline = SystemClock.uptimeMillis() + 15000;
        while (activityRef.get() == null && SystemClock.uptimeMillis() < deadline) SystemClock.sleep(100);
        application.unregisterActivityLifecycleCallbacks(callbacks);
        assertNotNull("Sandbox Activity did not resume", activityRef.get());
        {
            AtomicReference<DataFilesPlugin> ref=new AtomicReference<>();
            instrumentation.runOnMainSync(() -> ref.set((DataFilesPlugin)activityRef.get().getBridge().getPlugin("DataFiles").getInstance()));
            DataFilesPlugin plugin=ref.get(); Call prepare=new Call("prepare",new JSObject());plugin.prepare(prepare);prepare.await();assertNull(prepare.error);
            AtomicReference<ReferenceLinksPlugin> links = new AtomicReference<>();
            instrumentation.runOnMainSync(() -> links.set((ReferenceLinksPlugin) activityRef.get().getBridge().getPlugin("ReferenceLinks").getInstance()));
            for (String url : new String[] { "javascript:alert(1)", "data:text/html,x", "file:///private/file", "intent://app", "https:", "" }) {
                Call invalidUrl = new Call("open", new JSObject().put("url", url));
                links.get().open(invalidUrl); invalidUrl.await();
                assertNotNull(invalidUrl.error); assertNull(invalidUrl.value);
            }
            String token=prepare.value.getString("token");byte[] bytes=new byte[512*1024];new java.util.Random(71).nextBytes(bytes);
            for(int offset=0;offset<bytes.length;offset+=131072) {Call append=new Call("append",new JSObject().put("token",token).put("offset",offset).put("base64",Base64.encodeToString(java.util.Arrays.copyOfRange(bytes,offset,offset+131072),Base64.NO_WRAP)));plugin.append(append);append.await();assertNull(append.error);}
            StringBuilder hash=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))hash.append(String.format("%02x",b&255));
            JSObject options=new JSObject().put("token",token).put("name","jornada-cafe-backup-completo-2026-11-21-0000.zip").put("size",bytes.length).put("sha256",hash.toString());
            Method saved=DataFilesPlugin.class.getDeclaredMethod("saved",PluginCall.class,ActivityResult.class);saved.setAccessible(true);
            Call cancelled=new Call("save",options);saved.invoke(plugin,cancelled,new ActivityResult(Activity.RESULT_CANCELED,null));cancelled.await();assertTrue(cancelled.value.getBool("cancelled"));
            for(String mode:new String[]{"write-fail","corrupt","ok"}) {
                Uri uri=Uri.parse("content://br.com.jornadacafe.sandbox.test.transfer/document/"+mode);
                Call save=new Call("save",options);saved.invoke(plugin,save,new ActivityResult(Activity.RESULT_OK,new Intent().setData(uri)));save.await();
                if(mode.equals("ok")) {assertNull(save.error);assertTrue(save.value.getBool("saved"));assertEquals(bytes.length,(int)save.value.getInteger("bytes"));plugin.getContext().getContentResolver().delete(uri,null,null);}
                else {assertNotNull(save.error);assertNull(save.value);android.database.Cursor cursor=plugin.getContext().getContentResolver().query(uri,null,null,null,null);assertTrue(cursor.moveToFirst());assertEquals("Partial document was removed",0,cursor.getInt(0));cursor.close();}
            }
            Call discard=new Call("discard",new JSObject().put("token",token));plugin.discard(discard);discard.await();assertNull(discard.error);
            Call invalid=new Call("save",options);plugin.save(invalid);invalid.await();assertNotNull(invalid.error);
        }
    }
}
