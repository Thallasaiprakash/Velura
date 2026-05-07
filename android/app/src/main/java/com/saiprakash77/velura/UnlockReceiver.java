package com.saiprakash77.velura;

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
