package com.saiprakash77.velura;

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

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        title = intent.getStringExtra("title");
        body = intent.getStringExtra("body");
        
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Velura:VoiceWakeLock");
        wakeLock.acquire(5 * 60 * 1000L /*5 minutes*/);

        tts = new TextToSpeech(this, this);
        return START_NOT_STICKY;
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(Locale.US);
            tts.setPitch(0.9f); // Slightly deeper gentleman voice
            tts.setSpeechRate(0.95f);

            // 1. Fire Notification
            showNotification();

            // 2. Speak
            tts.speak(body, TextToSpeech.QUEUE_FLUSH, null, "VeluraTaskID");
            
            // Wait for speech to finish then stop service
            new Thread(() -> {
                while (tts.isSpeaking()) {
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                }
                stopSelf();
            }).start();
        } else {
            stopSelf();
        }
    }

    private void showNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "velura-tasks";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(channelId, "Task Reminders", NotificationManager.IMPORTANCE_HIGH));
        }

        // Add PendingIntent to open the app on tap
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setColor(0xFFA78BFA); // Match #a78bfa

        nm.notify((int) System.currentTimeMillis(), builder.build());
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

    @Override public IBinder onBind(Intent intent) { return null; }
}
