package com.saiprakash77.velura;

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
            promise.resolve(alarmManager.canScheduleExactAlarms());
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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
