package br.com.jornadacafe.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.UUID;

/** SAF reads/writes user-selected documents; no storage permission or private path is exported. */
@CapacitorPlugin(name = "DataFiles")
public class DataFilesPlugin extends Plugin {
    private static final int MAX_BYTES = 96 * 1024 * 1024;
    @PluginMethod
    public void choose(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/x-zip-compressed", "application/octet-stream"});
        startActivityForResult(call, intent, "selected");
    }
    @ActivityCallback
    private void selected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { cancelled(call); return; }
        Uri uri = result.getData().getData();
        getBridge().execute(() -> {
            try (InputStream input = getContext().getContentResolver().openInputStream(uri); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                if (input == null) throw new Exception();
                byte[] buffer = new byte[32768]; int length;
                while ((length = input.read(buffer)) != -1) { if (output.size() + length > MAX_BYTES) throw new Exception(); output.write(buffer, 0, length); }
                JSObject value = new JSObject(); value.put("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)); call.resolve(value);
            } catch (Exception error) { call.reject("Não foi possível ler o arquivo. Escolha um ZIP de até 96 MB."); }
        });
    }
    // Only opaque cache tokens, counts and hashes may reach an Activity PluginCall.
    // Capacitor saves the entire options object twice when the Activity stops.
    private File staged(String token) throws IOException {
        if (token == null || !token.matches("[a-f0-9-]{36}")) throw new IOException();
        File directory = new File(getContext().getCacheDir(), "data-sharing");
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException();
        return new File(directory, token + ".zip");
    }
    private void launch(PluginCall call, Intent intent, String callback) {
        getActivity().runOnUiThread(() -> {
            try { startActivityForResult(call, intent, callback); }
            catch (Exception error) { call.reject("Não foi possível abrir o seletor ou compartilhamento. Seus dados permanecem no aplicativo. Tente novamente."); }
        });
    }
    @PluginMethod
    public void prepare(PluginCall call) {
        getBridge().execute(() -> {
            try {
                String token = UUID.randomUUID().toString(); File file = staged(token);
                File[] old = file.getParentFile().listFiles();
                if (old != null) for (File item : old) if (System.currentTimeMillis() - item.lastModified() > 86400000) item.delete();
                if (!file.createNewFile()) throw new IOException();
                call.resolve(new JSObject().put("token", token));
            } catch (Exception error) { call.reject("Não foi possível preparar o arquivo temporário."); }
        });
    }
    @PluginMethod
    public void append(PluginCall call) {
        getBridge().execute(() -> {
            try {
                File file = staged(call.getString("token")); String data = call.getString("base64");
                Integer offset = call.getInt("offset");
                if (!file.isFile() || offset == null || offset != file.length() || data == null || data.length() > 262144) throw new IOException();
                byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
                if (bytes.length == 0 || bytes.length > 192 * 1024 || file.length() + bytes.length > MAX_BYTES) throw new IOException();
                try (OutputStream output = new FileOutputStream(file, true)) { output.write(bytes); }
                call.resolve();
            } catch (Exception error) { call.reject("Não foi possível preparar o arquivo. Seus dados permanecem no aplicativo."); }
        });
    }
    @PluginMethod
    public void discard(PluginCall call) {
        try { File file = staged(call.getString("token")); if (file.exists() && !file.delete()) throw new IOException(); call.resolve(); }
        catch (Exception error) { call.reject("Não foi possível remover o arquivo temporário."); }
    }
    private String hash(InputStream input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256"); byte[] buffer = new byte[32768]; int length;
        while ((length = input.read(buffer)) != -1) digest.update(buffer, 0, length);
        StringBuilder value = new StringBuilder(); for (byte b : digest.digest()) value.append(String.format("%02x", b & 255));
        return value.toString();
    }
    private File verified(PluginCall call) throws Exception {
        File file = staged(call.getString("token")); Integer size = call.getInt("size"); String expected = call.getString("sha256");
        if (!validName(call.getString("name")) || size == null || size <= 0 || size > MAX_BYTES || file.length() != size || expected == null || !expected.matches("[a-f0-9]{64}")) throw new IOException();
        try (InputStream input = new FileInputStream(file)) { if (!expected.equals(hash(input))) throw new IOException(); }
        return file;
    }
    @PluginMethod
    public void save(PluginCall call) {
        getBridge().execute(() -> {
            try {
                verified(call);
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/zip").addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_TITLE, call.getString("name"));
                launch(call, intent, "saved");
            } catch (Exception error) { call.reject("Arquivo temporário inválido. Gere o backup novamente. Seus dados permanecem no aplicativo."); }
        });
    }
    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { cancelled(call); return; }
        Uri uri = result.getData().getData();
        getBridge().execute(() -> {
            long written = 0;
            try {
                File file = verified(call);
                // ACTION_CREATE_DOCUMENT returns a newly created document, never an existing one.
                try (InputStream input = new FileInputStream(file); OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IOException();
                    byte[] buffer = new byte[32768]; int length;
                    while ((length = input.read(buffer)) != -1) { output.write(buffer, 0, length); written += length; }
                    output.flush();
                }
                if (written != file.length() || written == 0) throw new IOException();
                // A provider may be write-only; if it permits opening, a failed/mismatched read is an error.
                InputStream reread;
                try { reread = getContext().getContentResolver().openInputStream(uri); }
                catch (java.io.FileNotFoundException | SecurityException unavailable) { reread = null; }
                if (reread != null) { try (InputStream input = reread) { if (!call.getString("sha256").equals(hash(input))) throw new IOException(); } }
                call.resolve(new JSObject().put("saved", true).put("bytes", written));
            } catch (Exception error) {
                boolean removed = false;
                try { removed = DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); } catch (Exception ignored) { }
                call.reject(removed ? "Não foi possível concluir o salvamento. A cópia incompleta foi removida. Seus dados permanecem no aplicativo. Tente novamente." : "Não foi possível concluir o salvamento. Pode haver um arquivo vazio ou incompleto no destino; não utilize essa cópia. Seus dados permanecem no aplicativo. Tente novamente.");
            }
        });
    }
    @PluginMethod
    public void share(PluginCall call) {
        getBridge().execute(() -> {
            try {
                File file = verified(call);
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file, call.getString("name"));
                Intent intent = new Intent(Intent.ACTION_SEND).setType("application/zip").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                launch(call, Intent.createChooser(intent, "Compartilhar arquivo"), "shared");
            } catch (Exception error) { call.reject("Não foi possível abrir o compartilhamento."); }
        });
    }
    @ActivityCallback
    private void shared(PluginCall call, ActivityResult result) { if (call != null) call.resolve(new JSObject().put("opened", true)); }
    private boolean validName(String name) { return name != null && name.matches("jornada-cafe-(backup-completo|biblioteca)-[0-9-]+\\.zip"); }
    private void cancelled(PluginCall call) { call.resolve(new JSObject().put("cancelled", true)); }
}
