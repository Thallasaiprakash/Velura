package com.saiprakash77.velura;

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
            return android.app.Service.START_NOT_STICKY;
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
        return android.app.Service.START_NOT_STICKY;
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
            stopForeground(android.app.Service.STOP_FOREGROUND_REMOVE);
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
