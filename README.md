# VELURA 👁️
### *"Your day, spoken the moment you awaken your screen."*

A personalized, voice-driven daily task reminder built with React Native (Expo). Every morning, VELURA greets you by name, speaks your tasks aloud, and shows a stunning animated overlay — the first thing you experience when you start your day.

---

## ✨ Features

- **Voice Greeting** — Speaks your name + today's tasks aloud every morning (expo-speech TTS)
- **Animated Unlock Overlay** — Glowing orb, floating particles, waveform bars, task cards slide in one-by-one
- **3 Voice Styles** — Calm 🌙, Energetic ⚡, Formal 👔 with different speech rates and pitches
- **Smart Silence** — If all tasks are done, the morning greeting is skipped entirely
- **Weekly Planner** — Plan your entire week on Sunday, per-day task management
- **Streak Tracking** — Bronze (3d), Silver (7d), Gold (21d) badges mentioned in your voice greeting
- **Daily Motivational Quotes** — 100 curated quotes, rotated daily, spoken by Velura
- **Firebase Sync** — Tasks sync to Firestore with offline local cache fallback
- **Priority Tags** — Urgent 🔴, Normal 🟣, Low ⚪ — urgent tasks spoken first
- **Carry Forward** — Incomplete tasks can be moved to the next day
- **Weekly Review** — Sunday evening summary of your completion rate

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Navigation | expo-router v3 |
| Animations | React Native Reanimated 3 |
| Graphics | react-native-svg |
| TTS | expo-speech (device-native, free) |
| Notifications | expo-notifications + expo-task-manager |
| Database | Firebase Firestore (free Spark plan) |
| Auth | Firebase Anonymous Auth |
| Storage | AsyncStorage (local cache) |
| Haptics | expo-haptics |
| Build | EAS Build (free tier APK) |

---

## 🚀 Setup & Installation

### 1. Firebase Setup (Required)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (start in test mode)
4. Enable **Authentication** → Anonymous sign-in
5. Go to Project Settings → Add a **Web app**
6. Copy the config values

### 2. Configure Environment Variables

Create a `.env` file in the `velura/` folder:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> For EAS cloud builds, use EAS Secrets instead of `.env`

### 3. Install Dependencies

```bash
cd velura
npm install --legacy-peer-deps
```

### 4. Run Locally (Expo Go)

```bash
npx expo start
```

Then scan the QR code with Expo Go on your Android device.

> ⚠️ Background notifications & background fetch only work on a development build or APK, not Expo Go.

---

## 📦 Build APK (Android)

### Prerequisites
- Expo account: [expo.dev](https://expo.dev) (free)
- EAS CLI installed: `npm install -g eas-cli`

### Steps

```bash
# 1. Login to Expo
eas login

# 2. Configure EAS (one-time)
eas build:configure

# 3. Build APK (free tier)
eas build -p android --profile preview

# 4. Download APK from the Expo dashboard
# Install on device via ADB or direct transfer
```

> The build runs in Expo's cloud — no local Android SDK needed!

---

## 📁 Project Structure

```
velura/
├── app/
│   ├── _layout.tsx              # Root navigator
│   ├── splash.tsx               # Animated splash
│   ├── unlock-overlay.tsx       # 🌟 Hero unlock experience
│   ├── weekly-review.tsx        # Sunday review
│   ├── onboarding/
│   │   ├── step-name.tsx        # Name input
│   │   ├── step-voice.tsx       # Voice style picker
│   │   ├── step-permissions.tsx # Notification permission
│   │   └── step-first-week.tsx  # First week planner
│   └── (tabs)/
│       ├── _layout.tsx          # Tab bar
│       ├── index.tsx            # Home dashboard
│       ├── planner.tsx          # Weekly planner
│       └── settings.tsx         # Settings
├── components/
│   ├── OrbAnimation.tsx         # Glowing pulsing orb
│   ├── ParticleField.tsx        # Floating particle dots
│   ├── VoiceWaveform.tsx        # TTS waveform bars
│   ├── TaskCard.tsx             # Unlock overlay task
│   ├── TaskRow.tsx              # Home/planner task row
│   ├── ProgressRing.tsx         # SVG progress circle
│   ├── StreakBadge.tsx          # Flame streak badge
│   └── WeekDayTabs.tsx          # Mon-Sun tab strip
├── hooks/
│   ├── useAuth.tsx              # Firebase anonymous auth
│   ├── useTasks.ts              # Task CRUD + cache
│   ├── useVoice.ts              # TTS state management
│   ├── useStreak.ts             # Streak calculation
│   └── useNotifications.ts     # Schedule notifications
├── services/
│   ├── firebase.ts              # Firebase init
│   ├── taskService.ts           # Firestore + local cache
│   ├── notificationService.ts   # Schedule/cancel notifs
│   └── speechService.ts        # Greeting builder + TTS
└── constants/
    ├── colors.ts                # Full color palette
    ├── theme.ts                 # Spacing, typography
    └── quotes.ts                # 100 motivational quotes
```

---

## 🎨 Branding

| Element | Value |
|---|---|
| Primary Color | `#a78bfa` (Violet) |
| Secondary Color | `#6366f1` (Indigo) |
| Background | `#07071a` (Deep Space) |
| Gold | `#fbbf24` |
| Font | System (Inter/SF Pro) |

---

## 📱 Screens

1. **Splash** — Logo spring animation + radial rays
2. **Onboarding** (4 steps) — Name → Voice → Permissions → First Week
3. **Unlock Overlay** — Hero experience with orb, particles, TTS, task cards
4. **Home Dashboard** — Progress ring, today's tasks, streak, quick actions
5. **Weekly Planner** — Per-day task management with priority tags
6. **Settings** — Voice, greeting time, days, smart silence, avatar
7. **Weekly Review** — Completion stats + next week CTA

---

## 🔔 Notification Schedule

| Notification | When | Purpose |
|---|---|---|
| Morning Greeting | Daily at user's set time | Opens unlock overlay |
| Weekly Planner | Sunday at 8 PM | Prompts weekly planning |
| Night Check | 9 PM daily | Reminds of pending tasks |

---

## 🔐 Firestore Security Rules

Add these to your Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /weeks/{weekId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🤝 Contributing

This is a personal productivity app built for real-world use. Feel free to fork and customize.

---

*Built with ❤️ using Expo + React Native + Firebase*
