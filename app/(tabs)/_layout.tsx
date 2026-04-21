import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { BackgroundUniverse } from '../../components/BackgroundUniverse';
import { getCurrentEnergyState } from '../../services/auraService';
import { Chronotype } from '../../services/taskService';
import Svg, { Ellipse, Circle, Path, Rect } from 'react-native-svg';

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12H15V22" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlannerIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={color} strokeWidth="1.8" />
      <Path d="M19.4 15C19.1 15.7 19.3 16.5 19.9 17L19.9 17C20.4 17.5 20.6 18.3 20.4 19C20.1 19.7 19.6 20.4 19 20.8C18.4 21.2 17.6 21.4 16.9 21.2C16.2 21 15.7 20.4 15.5 19.7C15.2 19 14.4 18.6 13.6 18.7M10.4 18.7C9.6 18.5 8.8 19 8.5 19.7C8.3 20.4 7.8 21 7.1 21.2C6.4 21.4 5.6 21.2 5 20.8C4.4 20.4 3.9 19.7 3.6 19C3.4 18.3 3.6 17.5 4.1 17C4.7 16.5 4.9 15.7 4.6 15L4.6 15C4.3 14.3 3.6 13.8 2.8 13.8C2.1 13.7 1.5 13.3 1.2 12.7C0.9 12.1 0.9 11.4 1.2 10.8C1.5 10.2 2.1 9.8 2.8 9.7C3.6 9.6 4.3 9.1 4.6 8.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}


export default function TabLayout() {
  const [achievementStars, setAchievementStars] = React.useState(0);
  const [chronotype, setChronotype] = React.useState<Chronotype>('third-bird');

  React.useEffect(() => {
    const loadUniverseData = async () => {
      const [stars, ct] = await Promise.all([
        AsyncStorage.getItem('velura_session_stars'),
        AsyncStorage.getItem('velura_chronotype'),
      ]);
      if (stars) setAchievementStars(parseInt(stars));
      if (ct) setChronotype(ct as Chronotype);
    };

    loadUniverseData();
    // Refresh periodically or on focus if possible
    const interval = setInterval(loadUniverseData, 5000);
    return () => clearInterval(interval);
  }, []);

  const energyState = getCurrentEnergyState(chronotype);

  return (
    <View style={styles.container}>
      <BackgroundUniverse 
        energyState={energyState as any} 
        achievementCount={achievementStars} 
      />
      
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: 'rgba(7, 7, 26, 0.85)', // Glassmorphic translucent tab bar
            borderTopColor: 'rgba(167,139,250,0.1)',
            borderTopWidth: 1,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 80 : 60,
            position: 'absolute', // Make it float for glass effect
            elevation: 0,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textUltraMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
          headerShown: false,
        }}
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size - 2} />,
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: 'Planner',
            tabBarIcon: ({ color, size }) => <PlannerIcon color={color} size={size - 2} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size - 2} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
});
