# AVAX-3D Photo AI Haul — Android TWA

This is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/) wrapper that turns the FastAPI PWA into a publishable Google Play app. The app is essentially the web PWA running in a trusted Chrome Custom Tab, so the backend, PWA UI, and scan pipeline remain unchanged.

## What you need before building

1. A public HTTPS domain pointing at the deployed `app.py` server (for example, the Oracle VM deployed by `.github/workflows/deploy-photo-ai-haul.yml`, or Fly.io/Vercel).
2. A signing keystore (`release.keystore`) for Play Console.
3. Android SDK (Build-Tools 34, Compile SDK 34). Android Studio installs these automatically.

## Files to edit after you have a domain

- `app/src/main/AndroidManifest.xml` — replace `https://REPLACE_WITH_YOUR_DOMAIN/` with your real HTTPS URL.
- `app/src/main/res/values/strings.xml` — replace `https://REPLACE_WITH_YOUR_DOMAIN/.well-known/assetlinks.json` in `asset_statements`.
- `public/assetlinks.json` in the repo root — update `package_name`, `sha256_cert_fingerprints` with your release keystore SHA-256 fingerprint, and serve it at `https://YOUR_DOMAIN/.well-known/assetlinks.json`.
- `app/build.gradle` — bump `versionCode` / `versionName` for each Play Console release.

## Build the release AAB

```bash
cd android/photo-ai-haul-twa
./gradlew bundleRelease
```

The Play-Store-ready `.aab` is written to `app/build/outputs/bundle/release/`.

## Digital Asset Links

Chrome validates the TWA by fetching `/.well-known/assetlinks.json` from your domain. The FastAPI server already serves the template at that path. After you create your release keystore, update the SHA-256 fingerprint in both:

- `public/assetlinks.json`
- the deployed `/.well-known/assetlinks.json` on your domain

Generate the fingerprint:

```bash
keytool -list -v -keystore release.keystore -alias upload -keypass PASSWORD -storepass PASSWORD | grep SHA256
```

## Upload to Play Console

1. Create a new app in [Google Play Console](https://play.google.com/console/).
2. In **Release > App bundle explorer**, upload the `.aab`.
3. Complete store listing, content rating, and pricing.
4. Publish to internal / closed / production track.

## Notes

- `minSdk` is 23 (Android 6.0). TWA requires Chrome 72+ on the device.
- Camera permission is declared because the PWA uses `<input type="file" capture="environment">`.
