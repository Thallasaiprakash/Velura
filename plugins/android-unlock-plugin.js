const { withAndroidManifest, withDangerousMod, withMainApplication, withPlugins, withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo Config Plugin to handle:
 * 1. Android Device Unlock (ACTION_USER_PRESENT) voice briefing
 * 2. Scheduled Task Reminders (Text + Voice synchronization)
 */
const withVeluraNative = (config) => {
  return withPlugins(config, [
    withVeluraManifest,
    withVeluraNativeCode,
    withVeluraMainApplication,
    withVeluraDependencies,
  ]);
};

const withVeluraDependencies = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('androidx.core:core:')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {\n    implementation "androidx.core:core:1.12.0"`
      );
    }
    return config;
  });
};

const withVeluraManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Ensure permissions
    const permissions = config.modResults.manifest['uses-permission'] || [];
    const requiredPermissions = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NOTIFICATION_POLICY',
      'android.permission.POST_NOTIFICATIONS',
    ];

    requiredPermissions.forEach(perm => {
      if (!permissions.some(p => p.$['android:name'] === perm)) {
        permissions.push({ $: { 'android:name': perm } });
      }
    });
    config.modResults.manifest['uses-permission'] = permissions;

    // Register UnlockReceiver
    if (!mainApplication.receiver) mainApplication.receiver = [];
    if (!mainApplication.receiver.some(r => r.$['android:name'] === 'com.saiprakash77.velura.UnlockReceiver')) {
      mainApplication.receiver.push({
        $: { 'android:name': 'com.saiprakash77.velura.UnlockReceiver', 'android:enabled': 'true', 'android:exported': 'true' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.USER_PRESENT' } }, { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }] }],
      });
    }

    // Register TaskAlarmReceiver
    if (!mainApplication.receiver.some(r => r.$['android:name'] === 'com.saiprakash77.velura.TaskAlarmReceiver')) {
      mainApplication.receiver.push({
        $: { 'android:name': 'com.saiprakash77.velura.TaskAlarmReceiver', 'android:enabled': 'true', 'android:exported': 'false' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'com.saiprakash77.velura.TASK_ALARM' } }] }],
      });
    }

    // Register VoiceNotificationService
    if (!mainApplication.service) mainApplication.service = [];
    if (!mainApplication.service.some(s => s.$['android:name'] === 'com.saiprakash77.velura.VoiceNotificationService')) {
      mainApplication.service.push({
        $: { 
          'android:name': 'com.saiprakash77.velura.VoiceNotificationService', 
          'android:enabled': 'true', 
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback'
        },
        'property': [
          { $: { 'android:name': 'android.app.foreground_service_type', 'android:value': 'mediaPlayback' } }
        ]
      });
    }

    return config;
  });
};

const withVeluraMainApplication = (config) => {
  return withMainApplication(config, (config) => {
    let content = config.modResults.contents;

    // Add import if not present (Handling both Java and Kotlin)
    const importPackage = 'import com.saiprakash77.velura.VeluraPackage';
    if (!content.includes(importPackage)) {
      if (content.includes('package ')) {
        const lines = content.split('\n');
        const packageLineIndex = lines.findIndex(line => line.startsWith('package '));
        lines.splice(packageLineIndex + 1, 0, '\n' + importPackage);
        content = lines.join('\n');
      }
    }

    // Register package in getPackages()
    
    // Pattern 1: One-liner return (Modern Expo 51 template)
    if (content.includes('return PackageList(this).packages')) {
      content = content.replace(
        'return PackageList(this).packages',
        'val packages = PackageList(this).packages.toMutableList()\n            packages.add(VeluraPackage())\n            return packages'
      );
    } 
    // Pattern 2: Multi-line MutableList creation
    else if (content.includes('val packages = PackageList(this).packages.toMutableList()')) {
      if (!content.includes('packages.add(VeluraPackage())')) {
        content = content.replace(
          'val packages = PackageList(this).packages.toMutableList()',
          'val packages = PackageList(this).packages.toMutableList()\n            packages.add(VeluraPackage())'
        );
      }
    }
    // Pattern 3: Java template
    else if (content.includes('List<ReactPackage> packages = new PackageList(this).getPackages();')) {
      if (!content.includes('packages.add(new VeluraPackage());')) {
        content = content.replace(
          'List<ReactPackage> packages = new PackageList(this).getPackages();',
          'List<ReactPackage> packages = new PackageList(this).getPackages();\n      packages.add(new VeluraPackage());'
        );
      }
    }

    config.modResults.contents = content;
    return config;
  });
};


const withVeluraNativeCode = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packagePath = 'com/saiprakash77/velura';
      const folder = path.join(projectRoot, 'android/app/src/main/java', packagePath);
      
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      // Write All Java Files
      fs.writeFileSync(path.join(folder, 'UnlockReceiver.java'), getUnlockReceiverCode());
      fs.writeFileSync(path.join(folder, 'TaskAlarmReceiver.java'), getTaskAlarmReceiverCode());
      fs.writeFileSync(path.join(folder, 'VoiceNotificationService.java'), getVoiceNotificationServiceCode());
      fs.writeFileSync(path.join(folder, 'VeluraAlarmModule.java'), getVeluraAlarmModuleCode());
      fs.writeFileSync(path.join(folder, 'VeluraPackage.java'), getVeluraPackageCode());

      return config;
    },
  ]);
};

// ==================== JAVA CODE GENERATORS ====================

function getUnlockReceiverCode() {
  return `package com.saiprakash77.velura;

public class UnlockReceiver extends android.content.BroadcastReceiver {
    private static final String TAG = "VeluraUnlockReceiver";
    private static final String CHANNEL_ID = "velura-unlock";
    private static final int NOTIFICATION_ID = 9001;
    private static final String PREFS_NAME = "VeluraUnlockPrefs";
    private static final String KEY_PENDING_BRIEFING = "pending_unlock_briefing";
    private static final String KEY_LAST_TRIGGER = "last_unlock_trigger";

    @Override
    public void onReceive(android.content.Context context, android.content.Intent intent) {
        String action = intent.getAction();
        if (android.content.Intent.ACTION_USER_PRESENT.equals(action)) {
            android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
            long now = System.currentTimeMillis();
            if (now - prefs.getLong(KEY_LAST_TRIGGER, 0) < 60000) return;
            
            prefs.edit().putLong(KEY_LAST_TRIGGER, now).putBoolean(KEY_PENDING_BRIEFING, true).apply();
            fireUnlockNotification(context);
        }
    }

    private void fireUnlockNotification(android.content.Context context) {
        android.app.NotificationManager nm = (android.app.NotificationManager) context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new android.app.NotificationChannel(CHANNEL_ID, "Unlock Briefing", android.app.NotificationManager.IMPORTANCE_HIGH));
        }

        android.content.Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) return;
        
        android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, 0, launchIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("VELURA")
            .setContentText("Your day awaits! Tap to hear your briefing.")
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        android.app.Notification notification = builder.build();
        nm.notify(NOTIFICATION_ID, notification);
    }
}
`;
}

function getTaskAlarmReceiverCode() {
  return `package com.saiprakash77.velura;

public class TaskAlarmReceiver extends android.content.BroadcastReceiver {
    @Override
    public void onReceive(android.content.Context context, android.content.Intent intent) {
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        android.util.Log.d("VeluraTaskAlarm", "Alarm fired for: " + title);

        showInstantNotification(context, title, body);

        android.content.Intent serviceIntent = new android.content.Intent(context, VoiceNotificationService.class);
        serviceIntent.putExtra("title", title);
        serviceIntent.putExtra("body", body);
        
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            android.util.Log.e("VeluraTaskAlarm", "Failed to start voice service", e);
        }
    }

    private void showInstantNotification(android.content.Context context, String title, String body) {
        android.app.NotificationManager nm = (android.app.NotificationManager) context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        String channelId = "velura-tasks";
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, "Task Reminders", android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.enableLights(true);
            channel.setLightColor(0xFFA78BFA);
            nm.createNotificationChannel(channel);
        }

        android.content.Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) return;

        android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, (int)System.currentTimeMillis(), launchIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.PendingIntent fullScreenPendingIntent = android.app.PendingIntent.getActivity(context, 0, launchIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX) 
            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFFA78BFA)
            .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_ALL);

        android.app.Notification notification = builder.build();
        nm.notify((int) System.currentTimeMillis(), notification);
    }
}
`;
}

function getVoiceNotificationServiceCode() {
  return `package com.saiprakash77.velura;

public class VoiceNotificationService extends android.app.Service implements android.speech.tts.TextToSpeech.OnInitListener {
    private android.speech.tts.TextToSpeech tts;
    private String title;
    private String body;
    private android.os.PowerManager.WakeLock wakeLock;
    private android.media.AudioManager audioManager;
    private android.media.AudioFocusRequest focusRequest;
    private int originalVolume = -1;

    private static final String TAG = "VeluraVoice";
    private static final int SERVICE_NOTIFICATION_ID = 1001;

    @Override
    public int onStartCommand(android.content.Intent intent, int flags, int startId) {
        android.util.Log.d(TAG, "=== VoiceNotificationService STARTED ===");
        
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        title = intent.getStringExtra("title");
        body = intent.getStringExtra("body");
        
        android.app.Notification notification = createStatusNotification("[VOICE ACTIVE] Speaking...");
        
        if (android.os.Build.VERSION.SDK_INT >= 34) {
            startForeground(SERVICE_NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            startForeground(SERVICE_NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }

        audioManager = (android.media.AudioManager) getSystemService(android.content.Context.AUDIO_SERVICE);
        try {
            originalVolume = audioManager.getStreamVolume(android.media.AudioManager.STREAM_ALARM);
            int maxVolume = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(android.media.AudioManager.STREAM_ALARM, maxVolume, 0);
        } catch (Exception e) {
            android.util.Log.e(TAG, "Volume boost failed", e);
        }

        requestAudioFocus();

        android.os.PowerManager pm = (android.os.PowerManager) getSystemService(android.content.Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "Velura:VoiceWakeLock");
            wakeLock.acquire(120000L);
        }

        tts = new android.speech.tts.TextToSpeech(this, this);
        return START_NOT_STICKY;
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.media.AudioAttributes playbackAttributes = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            focusRequest = new android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .build();
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(null, android.media.AudioManager.STREAM_ALARM, android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    private android.app.Notification createStatusNotification(String text) {
        String channelId = "velura-voice-service";
        android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        if (nm != null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, "Voice Service", android.app.NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(channel);
        }

        return new androidx.core.app.NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Velura Voice")
            .setContentText(text)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onInit(int status) {
        if (status == android.speech.tts.TextToSpeech.SUCCESS && tts != null) {
            tts.setLanguage(java.util.Locale.US);
            tts.setPitch(1.0f);
            tts.setSpeechRate(1.0f);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                android.media.AudioAttributes aa = new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                tts.setAudioAttributes(aa);
            }

            tts.speak(body, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "VeluraTaskID");
            
            new Thread(() -> {
                try { Thread.sleep(3000); } catch (Exception ignored) {} 
                while (tts != null && tts.isSpeaking()) {
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                }
                cleanup();
            }).start();
        } else {
            stopSelf();
        }
    }

    private void cleanup() {
        restoreVolume();
        abandonAudioFocus();
        if (android.os.Build.VERSION.SDK_INT >= 24) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void restoreVolume() {
        if (audioManager != null && originalVolume >= 0) {
            try {
                audioManager.setStreamVolume(android.media.AudioManager.STREAM_ALARM, originalVolume, 0);
            } catch (Exception ignored) {}
        }
    }

    private void abandonAudioFocus() {
        if (audioManager != null) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        super.onDestroy();
    }

    @Override public android.os.IBinder onBind(android.content.Intent intent) { return null; }
}
`;
}

function getVeluraAlarmModuleCode() {
  return `package com.saiprakash77.velura;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class VeluraAlarmModule extends ReactContextBaseJavaModule {
    public VeluraAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "VeluraAlarmModule";
    }

    @ReactMethod
    public void canScheduleExactAlarms(Promise promise) {
        Context context = getReactApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            promise.resolve(alarmManager != null && alarmManager.canScheduleExactAlarms());
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void openAlarmSettings() {
        Context context = getReactApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        Context context = getReactApplicationContext();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(pm.isIgnoringBatteryOptimizations(context.getPackageName()));
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void openBatteryOptimizationSettings() {
        Context context = getReactApplicationContext();
        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        Context context = getReactApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(context));
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void openOverlaySettings() {
        Context context = getReactApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    @ReactMethod
    public void isXiaomiDevice(Promise promise) {
        String manufacturer = Build.MANUFACTURER;
        promise.resolve(manufacturer != null && manufacturer.equalsIgnoreCase("Xiaomi"));
    }

    @ReactMethod
    public void scheduleAlarm(double timestamp, String title, String body, String id) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, TaskAlarmReceiver.class);
        intent.setAction("com.saiprakash77.velura.TASK_ALARM");
        intent.putExtra("title", title);
        intent.putExtra("body", body);

        PendingIntent pi = PendingIntent.getBroadcast(
            context, 
            id.hashCode(), 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, (long) timestamp, pi);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, (long) timestamp, pi);
        }
    }

    @ReactMethod
    public void cancelAlarm(String id) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, TaskAlarmReceiver.class);
        intent.setAction("com.saiprakash77.velura.TASK_ALARM");
        
        PendingIntent pi = PendingIntent.getBroadcast(
            context, 
            id.hashCode(), 
            intent, 
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );

        if (pi != null) {
            alarmManager.cancel(pi);
            pi.cancel();
        }
    }
}
`;
}

function getVeluraPackageCode() {
  return `package com.saiprakash77.velura;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class VeluraPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new VeluraAlarmModule(reactContext));
        return modules;
    }
}
`;
}

module.exports = withVeluraNative;

