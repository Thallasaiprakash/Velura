package com.saiprakash77.velura;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.util.Locale;

public class VoiceNotificationService extends Service implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private String title;
    private String body;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private int originalVolume = -1;

    private static final String TAG = "VeluraVoice";
    private static final int SERVICE_NOTIFICATION_ID = 1001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "=== VoiceNotificationService STARTED ===");
        
        if (intent == null) {
            Log.e(TAG, "Intent is null, stopping");
            stopSelf();
            return START_NOT_STICKY;
        }

        title = intent.getStringExtra("title");
        body = intent.getStringExtra("body");
        Log.d(TAG, "Will speak: " + body);
        
        startForeground(SERVICE_NOTIFICATION_ID, createStatusNotification("[VOICE ACTIVE] Speaking..."));

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        
        // FORCE VOLUME: Save current and boost to max on ALARM stream
        try {
            originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
            Log.d(TAG, "Volume forced to max: " + maxVolume + " (was " + originalVolume + ")");
        } catch (Exception e) {
            Log.e(TAG, "Volume boost failed: " + e.getMessage());
        }

        requestAudioFocus();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Velura:VoiceWakeLock");
        wakeLock.acquire(2 * 60 * 1000L);

        Log.d(TAG, "Initializing TTS engine...");
        tts = new TextToSpeech(this, this);
        return START_NOT_STICKY;
    }

    private void requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .build();
            int result = audioManager.requestAudioFocus(focusRequest);
            Log.d(TAG, "Audio focus result: " + result);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
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
            .setContentTitle("Velura Voice")
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onInit(int status) {
        Log.d(TAG, "TTS onInit called with status: " + status);
        if (status == TextToSpeech.SUCCESS) {
            int langResult = tts.setLanguage(Locale.US);
            Log.d(TAG, "TTS language set result: " + langResult);
            tts.setPitch(1.0f);
            tts.setSpeechRate(1.0f);

            // Use ALARM stream for TTS - this is NEVER muted on Xiaomi
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                tts.setAudioAttributes(aa);
                Log.d(TAG, "TTS AudioAttributes set to USAGE_ALARM");
            }

            Log.d(TAG, "Speaking now: " + body);
            int speakResult = tts.speak(body, TextToSpeech.QUEUE_FLUSH, null, "VeluraTaskID");
            Log.d(TAG, "TTS speak() result: " + speakResult);
            
            new Thread(() -> {
                try { Thread.sleep(3000); } catch (Exception ignored) {} 
                while (tts != null && tts.isSpeaking()) {
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                }
                Log.d(TAG, "Speech finished, cleaning up");
                restoreVolume();
                abandonAudioFocus();
                if (android.os.Build.VERSION.SDK_INT >= 24) { // Service.STOP_FOREGROUND_REMOVE
                    stopForeground(Service.STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                stopSelf();
            }).start();
        } else {
            Log.e(TAG, "TTS initialization FAILED with status: " + status);
            restoreVolume();
            stopSelf();
        }
    }

    private void restoreVolume() {
        if (audioManager != null && originalVolume >= 0) {
            try {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
                Log.d(TAG, "Volume restored to: " + originalVolume);
            } catch (Exception e) {
                Log.e(TAG, "Volume restore failed: " + e.getMessage());
            }
        }
    }

    private void abandonAudioFocus() {
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "VoiceNotificationService destroyed");
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        restoreVolume();
        abandonAudioFocus();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
