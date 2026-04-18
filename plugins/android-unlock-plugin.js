const { withAndroidManifest, withDangerousMod, withMainApplication, withPlugins, withProjectBuildGradle } = require('@expo/config-plugins');
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
  ]);
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
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
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

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class UnlockReceiver extends BroadcastReceiver {
    private static final String TAG = "VeluraUnlockReceiver";
    private static final String CHANNEL_ID = "velura-unlock";
    private static final int NOTIFICATION_ID = 9001;
    private static final String PREFS_NAME = "VeluraUnlockPrefs";
    private static final String KEY_PENDING_BRIEFING = "pending_unlock_briefing";
    private static final String KEY_LAST_TRIGGER = "last_unlock_trigger";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_USER_PRESENT.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            long now = System.currentTimeMillis();
            if (now - prefs.getLong(KEY_LAST_TRIGGER, 0) < 60000) return;
            
            prefs.edit().putLong(KEY_LAST_TRIGGER, now).putBoolean(KEY_PENDING_BRIEFING, true).apply();
            fireUnlockNotification(context);
        }
    }

    private void fireUnlockNotification(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Unlock Briefing", NotificationManager.IMPORTANCE_HIGH));
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("VELURA \\u2728")
            .setContentText("Your day awaits! Tap to hear your briefing.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(NOTIFICATION_ID, builder.build());
    }
}
`;
}

function getTaskAlarmReceiverCode() {
  return `package com.saiprakash77.velura;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class TaskAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        Log.d("VeluraTaskAlarm", "Alarm fired for: " + title);

        // 1. SHOW TEXT NOTIFICATION IMMEDIATELY (Safety first)
        showInstantNotification(context, title, body);

        // 2. START VOICE SERVICE
        Intent serviceIntent = new Intent(context, VoiceNotificationService.class);
        serviceIntent.putExtra("title", title);
        serviceIntent.putExtra("body", body);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }

    private void showInstantNotification(Context context, String title, String body) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "velura-tasks";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Task Reminders", NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(context, (int)System.currentTimeMillis(), launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX) // High priority for Xiaomi
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFFA78BFA);

        nm.notify((int) System.currentTimeMillis(), builder.build());
    }
}
`;
}

function getVoiceNotificationServiceCode() {
  return `package com.saiprakash77.velura;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import androidx.core.app.NotificationCompat;

import java.util.Locale;

public class VoiceNotificationService extends Service implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private String title;
    private String body;
    private PowerManager.WakeLock wakeLock;

    private static final int SERVICE_NOTIFICATION_ID = 1001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        title = intent.getStringExtra("title");
        body = intent.getStringExtra("body");
        
        // Start foreground immediately with a subtle status notification
        startForeground(SERVICE_NOTIFICATION_ID, createStatusNotification("Velura is speaking..."));

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Velura:VoiceWakeLock");
        wakeLock.acquire(1 * 60 * 1000L /*1 minute is plenty for speech*/);

        tts = new TextToSpeech(this, this);
        return START_NOT_STICKY;
    }

    private android.app.Notification createStatusNotification(String text) {
        String channelId = "velura-voice-service";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Voice Service", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(channel);
        }

        return new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Velura Voice Assistant")
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(Locale.US);
            tts.setPitch(0.9f); 
            tts.setSpeechRate(0.95f);

            // We no longer call showNotification() here because TaskAlarmReceiver did it!
            
            tts.speak(body, TextToSpeech.QUEUE_FLUSH, null, "VeluraTaskID");
            
            new Thread(() -> {
                try { Thread.sleep(2000); } catch (Exception ignored) {} // Give it a head start
                while (tts != null && tts.isSpeaking()) {
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                }
                stopForeground(true);
                stopSelf();
            }).start();
        } else {
            stopSelf();
        }
    }

    // Function showNotification() removed - moved to TaskAlarmReceiver for better reliability

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

    @Override public IBinder onBind(Intent intent) { return null; }
}
`;
}

function getVeluraAlarmModuleCode() {
  return `package com.saiprakash77.velura;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

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
    public void scheduleAlarm(double timestamp, String title, String body, String id) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

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
        Log.d("VeluraAlarm", "Scheduled alarm: " + id + " at " + (long)timestamp);
    }

    @ReactMethod
    public void cancelAlarm(String id) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
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

