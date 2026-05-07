package com.saiprakash77.velura;

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
