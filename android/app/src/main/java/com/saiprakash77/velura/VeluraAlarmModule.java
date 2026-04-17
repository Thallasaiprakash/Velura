package com.saiprakash77.velura;

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
