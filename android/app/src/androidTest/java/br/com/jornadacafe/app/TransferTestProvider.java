package br.com.jornadacafe.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** Test APK only: a document provider that fails writes or returns corrupt bytes. */
public class TransferTestProvider extends ContentProvider {
    public boolean onCreate() { return true; }
    private File file(Uri uri) { return new File(getContext().getCacheDir(), "transfer-" + uri.getLastPathSegment()); }
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws java.io.FileNotFoundException {
        File document = file(uri);
        try {
            if (mode.contains("w")) {
                document.createNewFile();
                if (uri.getLastPathSegment().equals("write-fail")) {
                    ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createReliablePipe();
                    new Thread(() -> { try (ParcelFileDescriptor.AutoCloseInputStream input = new ParcelFileDescriptor.AutoCloseInputStream(pipe[0])) { input.read(new byte[32768]); pipe[0].closeWithError("Simulated full destination"); } catch (IOException ignored) {} }).start();
                    return pipe[1];
                }
            } else if (uri.getLastPathSegment().equals("corrupt")) {
                try (FileOutputStream output = new FileOutputStream(document)) { output.write(new byte[]{1,2,3}); }
            }
            return ParcelFileDescriptor.open(document, mode.contains("w") ? ParcelFileDescriptor.MODE_WRITE_ONLY | ParcelFileDescriptor.MODE_TRUNCATE : ParcelFileDescriptor.MODE_READ_ONLY);
        } catch (IOException error) { throw new java.io.FileNotFoundException(); }
    }
    public int delete(Uri uri, String selection, String[] args) { return file(uri).delete() ? 1 : 0; }
    // DocumentsContract routes deleteDocument through call(), as a SAF provider would.
    public android.os.Bundle call(String method, String arg, android.os.Bundle extras) {
        if ("android:deleteDocument".equals(method)) { Uri uri=extras.getParcelable("uri"); delete(uri,null,null); return new android.os.Bundle(); }
        return super.call(method,arg,extras);
    }
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) { MatrixCursor result = new MatrixCursor(new String[]{"exists"});result.addRow(new Object[]{file(uri).exists()?1:0});return result; }
    public String getType(Uri uri) { return "application/zip"; }
    public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
