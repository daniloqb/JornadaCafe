"""Security and compatibility regressions for the release boundary; no test key is generated."""
import importlib.util
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release_tools', Path(__file__).with_name('release_tools.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseBoundaryTests(unittest.TestCase):
    def test_missing_credentials_fail_before_build_or_version_change(self):
        before = (release.ROOT / 'config/release.json').read_bytes()
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(RuntimeError, 'ANDROID_KEYSTORE_PATH'):
            release.preflight()
        self.assertEqual(before, (release.ROOT / 'config/release.json').read_bytes())

    def test_repo_keystore_and_debug_alias_rejected_without_opening_key(self):
        with tempfile.TemporaryDirectory(dir=release.ROOT) as directory:
            key = Path(directory) / 'upload.jks'
            key.touch()
            env = {name: 'unused' for name in release.REQUIRED_ENV}
            env['ANDROID_KEYSTORE_PATH'] = str(key)
            with patch.dict(os.environ, env), patch.object(release, 'run') as command:
                with self.assertRaisesRegex(RuntimeError, 'fora do repositório'):
                    release.preflight()
                command.assert_not_called()
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory) / 'upload.jks'
            key.touch()
            env['ANDROID_KEYSTORE_PATH'] = str(key)
            env['ANDROID_KEY_ALIAS'] = 'androiddebugkey'
            with patch.dict(os.environ, env), patch.object(release, 'run') as command:
                with self.assertRaisesRegex(RuntimeError, 'chave de upload própria'):
                    release.preflight()
                command.assert_not_called()

    def test_debug_certificate_rejected_even_with_innocent_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory) / 'upload.jks'
            key.touch()
            env = {name: 'unused' for name in release.REQUIRED_ENV}
            env['ANDROID_KEYSTORE_PATH'] = str(key)
            with patch.dict(os.environ, env), patch.object(release, 'run', return_value='PrivateKeyEntry Owner: CN=Android Debug'):
                with self.assertRaisesRegex(RuntimeError, 'produção válida'):
                    release.preflight()

    def test_corrupt_elf_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'ELF inválido'):
            release.elf_alignment(b'not-elf')

    def test_4kb_and_incongruent_segments_rejected_for_32_and_64_bit(self):
        for is64 in (False, True):
            ident = b'\x7fELF' + bytes([2 if is64 else 1, 1, 1]) + bytes(9)
            header_format = '<HHIQQQIHHHHHH' if is64 else '<HHIIIIIHHHHHH'
            ph_format = '<IIQQQQQQ' if is64 else '<IIIIIIII'
            phoff = 64 if is64 else 52
            header = struct.pack(header_format, 3, 183, 1, 0, phoff, 0, 0, phoff, struct.calcsize(ph_format), 1, 0, 0, 0)
            for alignment, offset, addr, accepted in ((4096, 0, 0, False), (16384, 0, 4096, False), (16384, 0, 16384, True)):
                values = (1, 5, offset, addr, 0, 1, 1, alignment) if is64 else (1, offset, addr, 0, 1, 1, 5, alignment)
                data = ident + header + struct.pack(ph_format, *values)
                if accepted:
                    self.assertEqual(release.elf_alignment(data), [16384])
                else:
                    with self.assertRaisesRegex(RuntimeError, '16 KB'):
                        release.elf_alignment(data)

    def test_aab_rejects_unexpected_exported_component(self):
        xml = '''<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="br.com.jornadacafe.app" android:versionCode="19" android:versionName="1.0.0"><uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36"/><uses-permission android:name="android.permission.INTERNET"/><application android:allowBackup="false"><receiver android:name="UnsafeReceiver" android:exported="true"/></application></manifest>'''
        expected = {'versionCode': 19, 'versionName': '1.0.0'}
        apk = {'minSdk': '24', 'targetSdk': '36', 'permissions': ['android.permission.INTERNET']}
        with patch.object(release, 'run', return_value=xml), self.assertRaisesRegex(RuntimeError, 'Componente exportado inesperado'):
            release.bundle_manifest('unused', 'unused', expected, apk)

    def test_secret_not_printed_on_command_failure(self):
        with patch.dict(os.environ, {'ANDROID_KEYSTORE_PASSWORD': 'super-secret-value'}):
            fake = type('Result', (), {'returncode': 1, 'stdout': 'failed with super-secret-value'})()
            with patch.object(release.subprocess, 'run', return_value=fake):
                with self.assertRaises(RuntimeError) as error:
                    release.run(['some-command'])
                self.assertNotIn('super-secret-value', str(error.exception))
                self.assertIn('[REDACTED]', str(error.exception))


if __name__ == '__main__':
    unittest.main()
