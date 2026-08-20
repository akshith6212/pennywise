# App Signing Setup

## Generate Release Keystore

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore pennywise-release.keystore \
  -alias pennywise-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## Configure Signing

### Option A: Local Development

Add to `~/.gradle/gradle.properties` (NOT committed to git):

```properties
PENNYWISE_UPLOAD_STORE_FILE=../pennywise-release.keystore
PENNYWISE_UPLOAD_STORE_PASSWORD=your_store_password
PENNYWISE_UPLOAD_KEY_ALIAS=pennywise-key
PENNYWISE_UPLOAD_KEY_PASSWORD=your_key_password
```

### Option B: CI/CD (GitHub Actions)

Store as GitHub repository secrets:
- `KEYSTORE_BASE64`: Base64-encoded keystore file
- `KEYSTORE_PASSWORD`: Store password
- `KEY_ALIAS`: Key alias (pennywise-key)
- `KEY_PASSWORD`: Key password

## Get SHA Fingerprints (for Firebase)

```bash
# Debug
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android

# Release
keytool -list -v -keystore pennywise-release.keystore -alias pennywise-key
```

Add both SHA-1 and SHA-256 fingerprints to Firebase Console > Project Settings > Android app.

## Build Signed APK/AAB

```bash
# APK
cd android && ./gradlew assembleRelease

# AAB (for Play Store)
cd android && ./gradlew bundleRelease
```

Output locations:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
