# Release signing

Version-tag builds are fail-closed: GitHub Releases are created only after the Windows and macOS installers have been signed. Manual workflow runs may still produce explicitly labelled unsigned test artifacts.

Configure these GitHub Actions secrets before pushing a `v*` tag:

- `WINDOWS_CERTIFICATE`: Base64/certutil-encoded PFX certificate.
- `WINDOWS_CERTIFICATE_PASSWORD`: PFX export password.
- `WINDOWS_TIMESTAMP_URL`: Timestamp service supplied by the certificate issuer.
- `APPLE_CERTIFICATE`: Base64-encoded Developer ID Application P12 certificate.
- `APPLE_CERTIFICATE_PASSWORD`: P12 export password.
- `KEYCHAIN_PASSWORD`: Ephemeral CI keychain password.
- `APPLE_ID`: Apple developer account email used for notarization.
- `APPLE_PASSWORD`: App-specific Apple password.
- `APPLE_TEAM_ID`: Apple developer team identifier.

The workflow imports certificates only into ephemeral runner storage. Secrets and certificate bodies must never be committed. Linux `.deb` packages do not have an equivalent Tauri code-signing step; all published installers are covered by the generated `SHA256SUMS` file.
