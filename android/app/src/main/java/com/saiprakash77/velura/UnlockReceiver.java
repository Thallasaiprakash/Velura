package com.saiprakash77.velura;

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
            .setContentTitle("VELURA \u2728")
            .setContentText("Your day awaits! Tap to hear your briefing.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(NOTIFICATION_ID, builder.build());
    }
}
