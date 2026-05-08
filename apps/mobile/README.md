# BizOS Mobile App

Flutter app for cashiers and employees. Uses the same backend API as the web dashboard.

## Targets
- Android API 24+ (Android 7.0+)
- iOS 14+

## Getting Started

### Prerequisites
- Flutter 3.x (stable channel)
- Android Studio or Xcode
- Firebase project for push notifications

### Setup
```bash
cd apps/mobile

# Install dependencies
flutter pub get

# Run code generation (Hive adapters + Riverpod)
dart run build_runner build --delete-conflicting-outputs

# Run on device/emulator
flutter run --dart-define=API_URL=http://localhost:3001
```

### Environment Variables
Pass at build time via `--dart-define`:

| Variable | Description |
|---|---|
| `API_URL` | BizOS API base URL (e.g. `https://api.bizos.pk`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key (public) |

### Build for production
```bash
# Android
flutter build apk --release \
  --dart-define=API_URL=https://api.bizos.pk \
  --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=xxx

# iOS
flutter build ipa --release \
  --dart-define=API_URL=https://api.bizos.pk
```

## Architecture

```
lib/
├── main.dart                # App entry — Hive init, Supabase, Firebase
├── app.dart                 # GoRouter + MaterialApp theme
├── core/
│   ├── api/                 # HTTP client + endpoint constants
│   ├── auth/                # OTP + PIN auth service & Riverpod providers
│   ├── offline/             # Hive boxes (products, inventory, queue) + sync
│   ├── printing/            # Bluetooth thermal printer + ESC/POS builder
│   └── theme/               # BizOS colour palette + text styles
├── features/
│   ├── auth/                # Login (OTP) + PIN lock screens
│   ├── pos/                 # POS screen, product grid, cart, payment, receipt
│   ├── employee/            # Clock-in/out, schedule, attendance, leave, salary
│   └── settings/            # Printer pairing
└── shared/
    ├── widgets/             # OfflineBanner, LoadingOverlay, UrduText
    └── utils/               # CurrencyUtils (Rs formatting), Validators
```

## Key Features
- **Offline-first POS** — all sales go to Hive first; auto-sync on reconnect
- **Bluetooth thermal printing** — 80mm ESC/POS receipts with FBR NTN
- **Employee self-service** — GPS clock-in/out, leave requests, salary slips
- **Biometric PIN lock** — 6-digit PIN + fingerprint/Face ID after idle
- **Urdu/RTL support** — Noto Nastaliq font, Directionality widget
- **Same API** as the web dashboard — no duplicate backend needed

## Fonts
Place the following font files in `assets/fonts/` before building:
- `NotoNastaliqUrdu-Regular.ttf` — from Google Fonts
- `NotoNaskhArabic-Regular.ttf` — from Google Fonts
