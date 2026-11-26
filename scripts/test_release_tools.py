"""Security and compatibility regressions for the release boundary; no test key is generated."""
import base64
import contextlib
import hashlib
import importlib.util
import io
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


class SignatureTests(unittest.TestCase):
    DIGEST = '657766e21ea480814568b43b734ecc75ea5f331c47fb422ed5d8d962cdd9bf41'
    EXPECTED = {'applicationId': release.APP_ID, 'versionName': '1.0.0', 'versionCode': 19}
    BADGING = ("package: name='br.com.jornadacafe.app' versionCode='19' versionName='1.0.0' compileSdkVersion='36'\n"
               "sdkVersion:'24'\ntargetSdkVersion:'36'\nuses-permission: name='android.permission.INTERNET'\n")

    def signature(self, label='V2 Signer:', digest=None):
        return ('Verifies\nNumber of signers: 1\n'
                + label + ' certificate DN: CN=Release Owner\n'
                + label + ' certificate SHA-256 digest: ' + (digest or self.DIGEST) + '\n'
                + label + ' public key SHA-256 digest: ' + 'A' * 64 + '\n')

    def test_equivalent_formatting_accepted_by_apk_validation(self):
        formats = [self.DIGEST, self.DIGEST.upper(), ':'.join(self.DIGEST[i:i + 2] for i in range(0, 64, 2)),
                   '  ' + ' '.join(self.DIGEST[i:i + 2] for i in range(0, 64, 2)) + '  ']
        for label in ('Signer #1', 'V1 Signer #1:', 'V2 Signer:', 'V3 Signer:', 'V3.1 Signer:', 'V3.2 Signer:'):
            for formatted in formats:
                with self.subTest(label=label, digest=formatted):
                    outputs = [self.signature(label, formatted), '', self.BADGING, 'android:allowBackup=(type 0x12)0x0']
                    with patch.object(release, 'run', side_effect=outputs), patch.object(release, 'audit_zip', return_value=[]):
                        result = release.apk_info(Path('release.apk'), Path('/tools'), self.EXPECTED, formats[-1])
                        self.assertTrue(result['signatureVerified'])
                        self.assertTrue(result['zipAligned16KB'])

    def test_different_certificate_rejected(self):
        with patch.object(release, 'run', return_value=self.signature()), self.assertRaisesRegex(RuntimeError, 'não corresponde'):
            release.apk_info(Path('release.apk'), Path('/tools'), self.EXPECTED, 'B' * 64)

    def test_missing_invalid_and_non_sha256_values_rejected(self):
        for value in (None, '', 'A' * 63, 'A' * 65, 'G' * 64, 'A' * 40, 'A' * 32, '[REDACTED]' + 'A' * 64):
            with self.subTest(value=value), self.assertRaisesRegex(RuntimeError, 'ausente ou inválido'):
                release.normalize_sha256(value)

    def test_missing_certificate_digest_does_not_use_public_key_or_source_stamp(self):
        output = ('Number of signers: 1\nV2 Signer: public key SHA-256 digest: ' + self.DIGEST
                  + '\nSource Stamp Signer certificate SHA-256 digest: ' + self.DIGEST + '\n')
        with self.assertRaisesRegex(RuntimeError, 'certificado APK ausente'):
            release.apk_certificate_sha256(output)

    def test_debug_certificates_remain_blocked_in_apk(self):
        for label in ('Signer #1', 'V2 Signer:'):
            output = self.signature(label).replace('CN=Release Owner', 'cn = Android Debug, O=Android')
            with self.assertRaisesRegex(RuntimeError, 'debug'):
                release.apk_certificate_sha256(output)

    def test_multiple_signers_and_divergent_schemes_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'exatamente um'):
            release.apk_certificate_sha256(self.signature().replace('Number of signers: 1', 'Number of signers: 2'))
        with self.assertRaisesRegex(RuntimeError, 'divergentes'):
            release.apk_certificate_sha256(self.signature() + 'V3 Signer: certificate SHA-256 digest: ' + 'B' * 64)
        self.assertEqual(release.apk_certificate_sha256(self.signature() + 'V3 Signer: certificate SHA-256 digest: ' + self.DIGEST), self.DIGEST.upper())

    def test_keystore_digest_comes_from_exported_der_not_displayed_fingerprint(self):
        der = b'\x30\x03\x02\x01\x01'  # synthetic DER bytes returned by the mocked keytool
        with patch.object(release, 'run', return_value=der) as command:
            self.assertEqual(release.keystore_certificate_sha256(Path('/upload.jks'), 'upload'), hashlib.sha256(der).hexdigest().upper())
            args = command.call_args.args[0]
            self.assertIn('-exportcert', args)
            self.assertIn('-storepass:env', args)
            self.assertTrue(command.call_args.kwargs['binary'])
            self.assertTrue(command.call_args.kwargs['quiet'])

    def test_empty_or_non_der_export_rejected(self):
        for der in (b'', b'not-DER', 'not-bytes'):
            with self.assertRaisesRegex(RuntimeError, 'DER ausente ou inválido'):
                release.certificate_sha256(der)

    def test_redaction_does_not_modify_parser_input(self):
        # The fake password deliberately appears inside the real public digest.
        output = self.signature()
        fake = type('Result', (), {'returncode': 0, 'stdout': output})()
        display = io.StringIO()
        with patch.dict(os.environ, {'ANDROID_KEYSTORE_PASSWORD': '6577', 'ANDROID_KEY_PASSWORD': 'not-used'}), \
             patch.object(release.subprocess, 'run', return_value=fake), contextlib.redirect_stdout(display):
            raw = release.run(['apksigner'])
            self.assertEqual(release.apk_certificate_sha256(raw), self.DIGEST.upper())
        self.assertEqual(raw, output)
        self.assertNotIn('6577', display.getvalue())
        self.assertIn('[REDACTED]', display.getvalue())

    def test_binary_export_is_not_decoded_logged_or_mixed_with_stderr(self):
        der = b'\x30\x03\xff\xfe\x00'
        fake = type('Result', (), {'returncode': 0, 'stdout': der, 'stderr': b'Warning: keytool'})()
        display = io.StringIO()
        with patch.object(release.subprocess, 'run', return_value=fake) as command, contextlib.redirect_stdout(display):
            self.assertEqual(release.run(['keytool'], binary=True), der)
            self.assertEqual(command.call_args.kwargs['stderr'], release.subprocess.PIPE)
        self.assertEqual(display.getvalue(), '')

    def test_binary_command_error_redacts_both_passwords(self):
        fake = type('Result', (), {'returncode': 1, 'stdout': b'', 'stderr': b'failed store-secret and key-secret'})()
        with patch.dict(os.environ, {'ANDROID_KEYSTORE_PASSWORD': 'store-secret', 'ANDROID_KEY_PASSWORD': 'key-secret'}), \
             patch.object(release.subprocess, 'run', return_value=fake):
            with self.assertRaises(RuntimeError) as error:
                release.run(['keytool'], binary=True)
            self.assertNotIn('store-secret', str(error.exception))
            self.assertNotIn('key-secret', str(error.exception))

    def test_aab_certificate_uses_leaf_der_and_rejects_absence_debug_or_multiple_signers(self):
        der = b'\x30\x03\x02\x01\x01'
        pem = '-----BEGIN CERTIFICATE-----\n' + base64.b64encode(der).decode() + '\n-----END CERTIFICATE-----'
        output = 'Signer #1:\nCertificate #1:\nCertificate owner: CN=Release Owner\n' + pem
        with patch.object(release, 'run', return_value=output):
            self.assertEqual(release.aab_certificate_sha256('release.aab'), hashlib.sha256(der).hexdigest().upper())
        for bad in ('Signer #1:\n', output + '\nSigner #2:\n' + pem, output.replace('CN=Release Owner', 'CN=Android Debug'), output.replace(base64.b64encode(der).decode(), '!invalid!')):
            with patch.object(release, 'run', return_value=bad), self.assertRaises(RuntimeError):
                release.aab_certificate_sha256('release.aab')

    def test_aab_jar_signature_and_certificate_are_both_mandatory(self):
        with patch.object(release, 'run', side_effect=RuntimeError('assinatura JAR inválida')), \
             patch.object(release, 'aab_certificate_sha256') as certificate:
            with self.assertRaisesRegex(RuntimeError, 'JAR inválida'):
                release.verify_aab_signature('release.aab', '/upload.jks', self.DIGEST)
            certificate.assert_not_called()
        with patch.object(release, 'run') as command, patch.object(release, 'aab_certificate_sha256', return_value='B' * 64):
            with self.assertRaisesRegex(RuntimeError, 'não corresponde'):
                release.verify_aab_signature('release.aab', '/upload.jks', self.DIGEST)
            args = command.call_args.args[0]
            for required in ('jarsigner', '-verify', '-strict', '-keystore', '-storepass:env'):
                self.assertIn(required, args)
        with patch.object(release, 'run'), patch.object(release, 'aab_certificate_sha256', return_value=self.DIGEST.upper()):
            release.verify_aab_signature('release.aab', '/upload.jks', self.DIGEST)

    def test_apk_metadata_and_page_size_checks_remain_mandatory(self):
        for old, new in (("name='br.com.jornadacafe.app'", "name='wrong.app'"), ("versionName='1.0.0'", "versionName='0.9.0'"),
                         ("versionCode='19'", "versionCode='18'"), ("targetSdkVersion:'36'", "targetSdkVersion:'35'")):
            with patch.object(release, 'run', side_effect=[self.signature(), '', self.BADGING.replace(old, new)]), self.assertRaises(RuntimeError):
                release.apk_info(Path('release.apk'), Path('/tools'), self.EXPECTED, self.DIGEST)
        def zipalign_failure(args, **kwargs):
            if Path(args[0]).name == 'zipalign':
                self.assertIn('16', args)
                raise RuntimeError('zipalign failure')
            return self.signature()
        with patch.object(release, 'run', side_effect=zipalign_failure), self.assertRaisesRegex(RuntimeError, 'zipalign failure'):
            release.apk_info(Path('release.apk'), Path('/tools'), self.EXPECTED, self.DIGEST)
        with patch.object(release, 'run', side_effect=[self.signature(), '', self.BADGING, 'android:allowBackup=(type 0x12)0x0']), \
             patch.object(release, 'audit_zip', side_effect=RuntimeError('ELF 16 KB inválido')), self.assertRaisesRegex(RuntimeError, 'ELF 16 KB'):
            release.apk_info(Path('release.apk'), Path('/tools'), self.EXPECTED, self.DIGEST)


if __name__ == '__main__':
    unittest.main()
