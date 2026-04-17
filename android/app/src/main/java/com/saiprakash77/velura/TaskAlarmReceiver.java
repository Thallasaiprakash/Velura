package com.saiprakash77.velura;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class TaskAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("VeluraTaskAlarm", "Alarm fired!");
        Intent serviceIntent = new Intent(context, VoiceNotificationService.class);
        serviceIntent.putExtra("title", intent.getStringExtra("title"));
        serviceIntent.putExtra("body", intent.getStringExtra("body"));
        context.startService(serviceIntent);
    }
}
