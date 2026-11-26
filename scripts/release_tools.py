#!/usr/bin/env python3
"""Fail-closed Android release builder. Never creates a key or installs an app."""
import argparse
import base64
import binascii
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
APP_ID = 'br.com.jornadacafe.app'
ANDROID_NS = '{http://schemas.android.com/apk/res/android}'
REQUIRED_ENV = ('ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD')


def fail(message):
    raise RuntimeError(message)


def redact(output):
    # Redaction is only for display. Never change bytes/text used by validators.
    for name in ('ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_PASSWORD'):
        secret = os.environ.get(name)
        if secret:
            output = output.replace(secret, '[REDACTED]')
    return output


def run(args, cwd=ROOT, quiet=False, pass_fds=(), binary=False):
    result = subprocess.run([str(a) for a in args], cwd=cwd, text=not binary,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE if binary else subprocess.STDOUT,
                            pass_fds=pass_fds)
    # Binary stdout can be DER. Keep stderr separate and never decode/log DER.
    diagnostic = result.stderr.decode('utf-8', errors='replace') if binary else result.stdout
    if result.returncode:
        fail(f'Falha em {Path(str(args[0])).name} (código {result.returncode}):\n{redact(diagnostic)[-14000:]}')
    if not quiet and not binary:
        print(redact(diagnostic), end='', flush=True)
    return result.stdout


def load_config():
    config = json.loads((ROOT / 'config/release.json').read_text())
    if config['applicationId'] != APP_ID:
        fail('ApplicationId divergente.')
    if config['versionCode'] <= config['lastDistributedVersionCode']:
        fail('versionCode deve superar lastDistributedVersionCode.')
    if json.loads((ROOT / 'package.json').read_text())['version'] != config['versionName']:
        fail('Versão de package.json divergente.')
    if json.loads((ROOT / 'package-lock.json').read_text())['packages']['']['version'] != config['versionName']:
        fail('Versão de package-lock.json divergente.')
    gradle = (ROOT / 'android/app/build.gradle').read_text()
    if 'versionCode releaseInfo.versionCode' not in gradle or 'versionName releaseInfo.versionName' not in gradle:
        fail('Gradle deve ler a configuração central de versão.')
    return config


def tools():
    for name in ('node', 'npm', 'npx', 'java', 'keytool', 'jarsigner'):
        if not shutil.which(name):
            fail(f'Ferramenta ausente: {name}')
    sdk = Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or Path.home() / 'Android/Sdk')
    choices = sorted((sdk / 'build-tools').glob('*'), key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.name)))
    choices = [p for p in choices if all((p / n).is_file() for n in ('apksigner', 'zipalign', 'aapt'))]
    if not choices:
        fail('Android build-tools com apksigner, zipalign e aapt não encontrados.')
    return choices[-1]


def normalize_sha256(value):
    if not isinstance(value, str):
        fail('Fingerprint SHA-256 ausente ou inválido.')
    digest = re.sub(r'[:\s]', '', value)
    if not re.fullmatch(r'[0-9a-fA-F]{64}', digest):
        fail('Fingerprint SHA-256 ausente ou inválido; esperado certificado de 32 bytes.')
    return digest.upper()


def is_debug_certificate(output):
    return bool(re.search(r'\bCN\s*=\s*Android\s+Debug\b', output, re.IGNORECASE))


def certificate_sha256(der):
    # keytool exports a DER X.509 certificate. Empty/non-DER output must fail closed.
    if not isinstance(der, bytes) or len(der) < 2 or der[0] != 0x30:
        fail('Certificado DER ausente ou inválido.')
    return hashlib.sha256(der).hexdigest().upper()


def keystore_certificate_sha256(key, alias):
    der = run(['keytool', '-J-Duser.language=en', '-exportcert', '-keystore', key,
               '-alias', alias, '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD'],
              quiet=True, binary=True)
    return certificate_sha256(der)


def apk_certificate_sha256(output):
    if is_debug_certificate(output):
        fail('Certificado debug não é permitido no APK release.')
    counts = re.findall(r'^Number of signers:\s*(\d+)\s*$', output, re.MULTILINE | re.IGNORECASE)
    if counts != ['1']:
        fail('APK deve conter exatamente um assinante de upload.')
    # Build-tools <=36: "Signer #1 certificate ..."; 37: "V2 Signer: certificate ...".
    # Scheme-specific labels can repeat the SAME certificate across v1/v2/v3.
    prefix = r'(?:Signer #1|V[1-4](?:\.[0-9]+)? Signer(?: #1)?)'
    digests = []
    for line in output.splitlines():
        match = re.fullmatch(prefix + r':?\s+certificate\s+SHA-?256\s+digest\s*:\s*(.*)',
                             line.strip(), re.IGNORECASE)
        if match:
            digests.append(normalize_sha256(match[1]))
    if not digests:
        fail('Fingerprint SHA-256 do certificado APK ausente ou inválido.')
    if len(set(digests)) != 1:
        fail('Certificados APK divergentes entre esquemas de assinatura.')
    return digests[0]


def aab_certificate_sha256(aab):
    output = run(['keytool', '-J-Duser.language=en', '-printcert', '-rfc', '-jarfile', aab], quiet=True)
    if is_debug_certificate(output):
        fail('Certificado debug não é permitido no AAB release.')
    signers = re.findall(r'^Signer #(\d+):\s*$', output, re.MULTILINE)
    if signers != ['1']:
        fail('AAB deve conter exatamente um assinante de upload.')
    certs = re.findall(r'-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----', output, re.DOTALL)
    if not certs:
        fail('Certificado DER do assinante AAB ausente.')
    try:
        # keytool prints the signer's leaf certificate first, followed by its chain.
        der = base64.b64decode(re.sub(r'\s', '', certs[0]), validate=True)
    except (ValueError, binascii.Error):
        fail('Certificado DER do assinante AAB inválido.')
    return certificate_sha256(der)


def verify_aab_signature(aab, key, cert):
    # A fingerprint match alone does not verify signed JAR entries.
    run(['jarsigner', '-J-Duser.language=en', '-verify', '-strict', '-keystore', key,
         '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD', aab], quiet=True)
    if aab_certificate_sha256(aab) != normalize_sha256(cert):
        fail('Certificado AAB não corresponde à chave de upload.')


def preflight():
    for name in REQUIRED_ENV:
        if not os.environ.get(name, '').strip():
            fail(f'Variável obrigatória ausente: {name}. Nenhum fallback debug será usado.')
    key = Path(os.environ['ANDROID_KEYSTORE_PATH']).expanduser().resolve()
    if not key.is_file() or key.is_relative_to(ROOT):
        fail('Keystore deve existir fora do repositório.')
    alias = os.environ['ANDROID_KEY_ALIAS']
    if any(word in (str(key) + ' ' + alias).lower() for word in ('booknook', 'debug')):
        fail('Utilize uma chave de upload própria, sem assinatura debug ou chave do BookNook.')
    cert = run(['keytool', '-J-Duser.language=en', '-list', '-v', '-keystore', key,
                '-alias', alias, '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD'], quiet=True)
    if 'PrivateKeyEntry' not in cert or is_debug_certificate(cert):
        fail('Alias não contém chave privada de produção válida.')
    os.environ['ANDROID_KEYSTORE_PATH'] = str(key)
    bundletool = Path(os.environ.get('BUNDLETOOL_JAR', '')).expanduser()
    if not bundletool.is_file():
        fail('Defina BUNDLETOOL_JAR para o bundletool-all.jar oficial. A validação AAB/16 KB é obrigatória neste script.')
    run(['java', '-jar', bundletool.resolve(), 'version'], quiet=True)
    return key, keystore_certificate_sha256(key, alias), bundletool.resolve()


def elf_alignment(data):
    if data[:4] != b'\x7fELF' or data[4] not in (1, 2) or data[5] not in (1, 2):
        fail('Biblioteca nativa com cabeçalho ELF inválido.')
    end = '<' if data[5] == 1 else '>'
    is64 = data[4] == 2
    header = struct.unpack_from(end + ('HHIQQQIHHHHHH' if is64 else 'HHIIIIIHHHHHH'), data, 16)
    offset, size, count = header[4], header[8], header[9]
    aligns = []
    for i in range(count):
        ph = struct.unpack_from(end + ('IIQQQQQQ' if is64 else 'IIIIIIII'), data, offset + size * i)
        if ph[0] == 1:  # PT_LOAD
            file_offset, vaddr, alignment = (ph[2], ph[3], ph[7]) if is64 else (ph[1], ph[2], ph[7])
            if alignment < 16384 or alignment & (alignment - 1) or (vaddr - file_offset) % 16384:
                fail('ELF PT_LOAD incompatível com páginas de 16 KB.')
            aligns.append(alignment)
    if not aligns:
        fail('ELF sem segmentos PT_LOAD.')
    return aligns


def audit_zip(path):
    native = []
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            fail(f'ZIP corrompido: {path.name}')
        for info in archive.infolist():
            if info.filename.endswith('.so'):
                native.append({'path': info.filename, 'loadAlignments': elf_alignment(archive.read(info))})
    return native


def apk_info(path, bt, expected, cert):
    signature = run([bt / 'apksigner', 'verify', '--verbose', '--print-certs', path], quiet=True)
    if apk_certificate_sha256(signature) != normalize_sha256(cert):
        fail('Certificado APK não corresponde à chave de upload.')
    run([bt / 'zipalign', '-c', '-P', '16', '-v', '4', path], quiet=True)
    badging = run([bt / 'aapt', 'dump', 'badging', path], quiet=True)
    values = {key: re.search(pattern, badging) for key, pattern in {
        'applicationId': r"package: name='([^']+)'", 'versionCode': r"versionCode='([^']+)'",
        'versionName': r"versionName='([^']+)'", 'minSdk': r"sdkVersion:'([^']+)'", 'targetSdk': r"targetSdkVersion:'([^']+)'", 'compileSdk': r"compileSdkVersion='([^']+)'"}.items()}
    if not all(values.values()):
        fail('Metadados APK incompletos.')
    info = {key: value[1] for key, value in values.items()}
    for key in ('applicationId', 'versionCode', 'versionName'):
        if str(expected[key]) != info[key]:
            fail(f'{key} divergente no APK.')
    if int(info['targetSdk']) < 36 or int(info['compileSdk']) < int(info['targetSdk']) or int(info['minSdk']) != 24:
        fail('SDKs inesperados (mínimo 24, alvo pelo menos 36).')
    permissions = re.findall(r"uses-permission(?:-sdk-23)?: name='([^']+)'", badging)
    allowed = {'android.permission.INTERNET', APP_ID + '.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'}
    if set(permissions) - allowed or 'android.permission.INTERNET' not in permissions:
        fail('Permissões APK divergentes da auditoria: ' + ', '.join(permissions))
    xml = run([bt / 'aapt', 'dump', 'xmltree', path, 'AndroidManifest.xml'], quiet=True)
    if re.search(r'android:debuggable[^\n]*0xffffffff', xml):
        fail('APK release está debuggable.')
    if not re.search(r'android:allowBackup[^\n]*0x0', xml):
        fail('Backup automático deve permanecer desabilitado.')
    info.update(permissions=permissions, nativeLibraries=audit_zip(path), signatureVerified=True, zipAligned16KB=True)
    return info


def bundle_manifest(aab, jar, expected, apk_metadata):
    import xml.etree.ElementTree as ET
    text = run(['java', '-jar', jar, 'dump', 'manifest', f'--bundle={aab}', '--module=base'], quiet=True)
    root = ET.fromstring(text)
    if root.attrib['package'] != APP_ID or root.attrib[ANDROID_NS + 'versionName'] != expected['versionName'] or int(root.attrib[ANDROID_NS + 'versionCode']) != expected['versionCode']:
        fail('Identidade/versão divergentes no AAB.')
    sdk = root.find('uses-sdk')
    if sdk is None or sdk.attrib[ANDROID_NS + 'minSdkVersion'] != apk_metadata['minSdk'] or sdk.attrib[ANDROID_NS + 'targetSdkVersion'] != apk_metadata['targetSdk']:
        fail('SDKs AAB divergentes do APK.')
    permissions = sorted(el.attrib[ANDROID_NS + 'name'] for el in root if el.tag.startswith('uses-permission'))
    if permissions != sorted(apk_metadata['permissions']):
        fail('Permissões AAB divergentes do APK.')
    app = root.find('application')
    if app is None or app.attrib.get(ANDROID_NS + 'debuggable', 'false') != 'false' or app.attrib.get(ANDROID_NS + 'allowBackup') != 'false':
        fail('Configuração de segurança AAB divergente.')
    exported = []
    for el in app:
        if el.attrib.get(ANDROID_NS + 'exported') == 'true':
            name = el.attrib.get(ANDROID_NS + 'name', '')
            permission = el.attrib.get(ANDROID_NS + 'permission')
            # AndroidX ProfileInstaller receiver is guarded by the platform DUMP permission.
            if name not in (APP_ID + '.MainActivity', '.MainActivity') and not (name == 'androidx.profileinstaller.ProfileInstallReceiver' and permission == 'android.permission.DUMP'):
                fail('Componente exportado inesperado no AAB: ' + name)
            exported.append({'name': name, 'permission': permission})
    provider = next((el for el in app.findall('provider') if el.attrib.get(ANDROID_NS + 'name') == 'androidx.core.content.FileProvider'), None)
    if provider is None or provider.attrib.get(ANDROID_NS + 'exported') != 'false' or provider.attrib.get(ANDROID_NS + 'authorities') != APP_ID + '.fileprovider':
        fail('FileProvider AAB divergente.')
    return exported


def build(args):
    config = load_config()
    if not re.fullmatch(r'\d+\.\d+\.\d+', args.version_name):
        fail('version-name deve ter formato X.Y.Z.')
    if not config['lastDistributedVersionCode'] < args.version_code <= 2100000000:
        fail('version-code deve superar o último distribuído e respeitar o limite Android.')
    bt = tools()
    key, cert, jar = preflight()  # No mutation before every prerequisite succeeds.
    stem = f'jornada-cafe-v{args.version_name}-build{args.version_code}'
    release_dir = ROOT / 'release'
    if release_dir.is_symlink():
        fail('release/ não pode ser link simbólico.')
    if any((release_dir / name).exists() for name in (stem + '.apk', stem + '.aab', 'release-manifest.json', 'SHA256SUMS')):
        fail('Artefatos existentes não serão sobrescritos. Arquive a entrega anterior fora de release/ antes de repetir.')
    config.update(versionName=args.version_name, versionCode=args.version_code)
    (ROOT / 'config/release.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    for filename in ('package.json', 'package-lock.json'):
        path = ROOT / filename
        package = json.loads(path.read_text())
        package['version'] = args.version_name
        if filename == 'package-lock.json':
            package['packages']['']['version'] = args.version_name
        path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n')
    run(['npm', 'run', 'typecheck'])
    run(['npm', 'test'])
    run(['npm', 'run', 'test:release'])
    run(['npm', 'run', 'build'])
    run(['npm', 'run', 'privacy:site'])
    run(['npx', '--no-install', 'cap', 'sync', 'android'])
    run(['bash', './gradlew', '--no-daemon', '--no-configuration-cache', 'clean', ':app:assembleRelease', ':app:bundleRelease'], cwd=ROOT / 'android')
    apk = ROOT / 'android/app/build/outputs/apk/release/app-release.apk'
    aab = ROOT / 'android/app/build/outputs/bundle/release/app-release.aab'
    apk_metadata = apk_info(apk, bt, config, cert)
    verify_aab_signature(aab, key, cert)
    run(['java', '-jar', jar, 'validate', f'--bundle={aab}'], quiet=True)
    exported = bundle_manifest(aab, jar, config, apk_metadata)
    bundle_config = json.loads(run(['java', '-jar', jar, 'dump', 'config', f'--bundle={aab}'], quiet=True))
    if bundle_config.get('optimizations', {}).get('uncompressNativeLibraries', {}).get('alignment') != 'PAGE_ALIGNMENT_16K':
        fail('Bundle não declara PAGE_ALIGNMENT_16K.')
    bundle_native = audit_zip(aab)
    derived_count = 0
    # Pass secrets via anonymous pipes; never command arguments or password files on disk.
    with tempfile.TemporaryDirectory(prefix='jornada-release-') as tmp:
        temp = Path(tmp)
        descriptors = []
        try:
            for name in ('ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_PASSWORD'):
                read_fd, write_fd = os.pipe()
                os.write(write_fd, (os.environ[name] + '\n').encode())
                os.close(write_fd)
                descriptors.append(read_fd)
            apks = temp / 'derived.apks'
            run(['java', '-jar', jar, 'build-apks', f'--bundle={aab}', f'--output={apks}', f'--ks={key}',
                 '--ks-key-alias=' + os.environ['ANDROID_KEY_ALIAS'], f'--ks-pass=file:/proc/self/fd/{descriptors[0]}',
                 f'--key-pass=file:/proc/self/fd/{descriptors[1]}'], quiet=True, pass_fds=tuple(descriptors))
        finally:
            for fd in descriptors:
                os.close(fd)
        with zipfile.ZipFile(apks) as archive:
            if archive.testzip() is not None:
                fail('Arquivo de APKs derivados corrompido.')
            for index, name in enumerate(archive.namelist()):
                if name.endswith('.apk'):
                    derived = temp / f'derived-{index}.apk'
                    derived.write_bytes(archive.read(name))
                    run([bt / 'apksigner', 'verify', '--verbose', derived], quiet=True)
                    run([bt / 'zipalign', '-c', '-P', '16', '-v', '4', derived], quiet=True)
                    audit_zip(derived)
                    derived_count += 1
        if not derived_count:
            fail('Nenhum APK derivado validado.')
    report = {
        'applicationId': APP_ID, 'versionName': config['versionName'], 'versionCode': config['versionCode'],
        'createdAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'certificateSHA256': cert,
        'sdk': {'min': int(apk_metadata['minSdk']), 'target': int(apk_metadata['targetSdk']), 'compile': int(apk_metadata['compileSdk'])},
        'apk': apk_metadata, 'aab': {'jarSignatureVerified': True, 'bundletoolValidated': True,
            'manifestVerified': True, 'exportedComponents': exported, 'nativeLibraries': bundle_native,
            'pageAlignment': 'PAGE_ALIGNMENT_16K', 'derivedAPKsVerified': derived_count},
        'checks': {'typecheck': True, 'tests': True, 'webBuild': True, 'catalogueCheck': True,
            'runtime16KBDeviceTest': 'pending', 'playConsoleSubmission': 'not-performed'},
        'artifacts': [],
    }
    # No output is promoted to release/ until mandatory verification has succeeded.
    with tempfile.TemporaryDirectory(prefix='.jornada-promote-', dir=ROOT) as tmp:
        stage = Path(tmp)
        sums = []
        for source, suffix in ((apk, '.apk'), (aab, '.aab')):
            target = stage / (stem + suffix)
            shutil.copyfile(source, target)
            digest = hashlib.sha256(target.read_bytes()).hexdigest()
            report['artifacts'].append({'file': target.name, 'bytes': target.stat().st_size, 'sha256': digest})
            sums.append(f'{digest}  {target.name}')
        manifest = stage / 'release-manifest.json'
        manifest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        sums.append(f'{hashlib.sha256(manifest.read_bytes()).hexdigest()}  {manifest.name}')
        (stage / 'SHA256SUMS').write_text('\n'.join(sums) + '\n')
        release_dir.mkdir(exist_ok=True)
        for path in stage.iterdir():
            if (release_dir / path.name).exists():
                fail('Destino criado durante build; entrega interrompida sem sobrescrever.')
        for path in stage.iterdir():
            shutil.move(path, release_dir / path.name)
    print('APK e AAB assinados e verificados em release/. Publicação e teste de execução em dispositivo 16 KB permanecem manuais.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('check', help='Confere versões e ferramentas; não exige chave nem compila.')
    builder = sub.add_parser('build')
    builder.add_argument('--version-name', required=True)
    builder.add_argument('--version-code', type=int, required=True)
    args = parser.parse_args()
    os.chdir(ROOT)
    if args.command == 'check':
        config = load_config()
        tools()
        print(f"Configuração válida: {APP_ID}, {config['versionName']} / {config['versionCode']}. Assinatura não verificada por este comando.")
    else:
        build(args)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, zipfile.BadZipFile, struct.error) as error:
        print(f'RELEASE INTERROMPIDO: {error}', file=sys.stderr)
        sys.exit(1)
