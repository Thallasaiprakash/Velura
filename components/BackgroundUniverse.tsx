import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  useSharedValue, 
  withDelay, 
  Easing,
  withSpring 
} from 'react-native-reanimated';
import Svg, { Circle, Rect, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const STAR_COUNT = 50;
const ACHIEVEMENT_STAR_COUNT = 20; // Max special stars

const AchievementStar = ({ index, active }: { index: number, active: boolean }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (active) {
      scale.value = withSpring(1, { damping: 10, stiffness: 80 });
      opacity.value = withRepeat(
        withTiming(1, { duration: 1500 + Math.random() * 1000 }),
        -1,
        true
      );
    }
  }, [active]);

  // Fixed positions for a "constellation" look
  const x = useMemo(() => {
    const angle = (index / ACHIEVEMENT_STAR_COUNT) * Math.PI * 2;
    const r = width * 0.35;
    return width / 2 + Math.cos(angle * 1.5) * r * (0.8 + Math.random() * 0.4);
  }, [index]);

  const y = useMemo(() => {
    const angle = (index / ACHIEVEMENT_STAR_COUNT) * Math.PI * 2;
    const r = height * 0.3;
    return height / 2 + Math.sin(angle * 2.1) * r * (0.8 + Math.random() * 0.4);
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!active) return null;

  return (
    <Animated.View 
      style={[
        styles.star, 
        { 
          left: x, 
          top: y, 
          width: 4, 
          height: 4, 
          backgroundColor: '#a78bfa',
          shadowColor: '#a78bfa',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
          elevation: 5,
        }, 
        animatedStyle
      ]} 
    />
  );
};


const Star = ({ index }: { index: number }) => {
  const opacity = useSharedValue(Math.random());
  
  React.useEffect(() => {
    opacity.value = withRepeat(
      withDelay(
        Math.random() * 2000,
        withTiming(Math.random() * 0.8 + 0.2, { 
          duration: 1000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.ease)
        })
      ),
      -1,
      true
    );
  }, []);

  const x = useMemo(() => Math.random() * width, []);
  const y = useMemo(() => Math.random() * height, []);
  const size = useMemo(() => Math.random() * 2 + 0.5, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.star, 
        { left: x, top: y, width: size, height: size }, 
        animatedStyle
      ]} 
    />
  );
};

interface BackgroundUniverseProps {
  energyState?: 'force' | 'flow' | 'fade';
  achievementCount?: number;
}

export const BackgroundUniverse = ({ energyState = 'flow', achievementCount = 0 }: BackgroundUniverseProps) => {
  const nebulaOpacity = useSharedValue(0.3);
  const nebulaScale = useSharedValue(1);
  const coreRotation = useSharedValue(0);

  React.useEffect(() => {
    const duration = energyState === 'force' ? 2000 : energyState === 'flow' ? 4000 : 7000;
    const baseOpacity = 0.4; 
    const peakOpacity = energyState === 'force' ? 0.7 : energyState === 'flow' ? 0.5 : 0.3;
    
    nebulaOpacity.value = withRepeat(
      withTiming(peakOpacity, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    nebulaScale.value = withRepeat(
      withTiming(1.3, { duration: duration * 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    coreRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, [energyState]);


  const themeColors = useMemo(() => {
    switch (energyState) {
      case 'force': return { primary: '#ff4d4d', secondary: '#f59e0b', accent: '#dc2626' };
      case 'flow': return { primary: '#a78bfa', secondary: '#3b82f6', accent: '#8b5cf6' };
      case 'fade': return { primary: '#4b5563', secondary: '#1f2937', accent: '#374151' };
      default: return { primary: '#a78bfa', secondary: '#3b82f6', accent: '#8b5cf6' };
    }
  }, [energyState]);

  const animatedNebulaStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
    transform: [{ scale: nebulaScale.value }]
  }));

  const animatedCoreStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${coreRotation.value}deg` }]
  }));


  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Deep Space Base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020205' }]} />
      
      {/* Distant Nebula */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedNebulaStyle]}>
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient id="nebula1" cx="30%" cy="40%" r="70%">
              <Stop offset="0%" stopColor={themeColors.primary} stopOpacity="0.15" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebula2" cx="70%" cy="60%" r="70%">
              <Stop offset="0%" stopColor={themeColors.secondary} stopOpacity="0.1" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebula1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebula2)" />
        </Svg>
      </Animated.View>

      {/* The Central Orbit Core (The "Galaxy" look) */}
      <View style={styles.coreContainer}>
         <Animated.View style={[styles.coreGlow, animatedCoreStyle]}>
            <Svg height={width * 1.5} width={width * 1.5} viewBox="0 0 100 100">
               <Defs>
                  <RadialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
                     <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                     <Stop offset="20%" stopColor={themeColors.primary} stopOpacity="0.3" />
                     <Stop offset="50%" stopColor={themeColors.secondary} stopOpacity="0.1" />
                     <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </RadialGradient>
               </Defs>
               <Circle cx="50" cy="50" r="45" fill="url(#coreGrad)" />
               
               {/* Multiple Orbit Rings */}
               {[...Array(6)].map((_, i) => (
                 <Ellipse 
                   key={`ring-${i}`}
                   cx="50" 
                   cy="50" 
                   rx={30 + i * 8} 
                   ry={10 + i * 3} 
                   fill="none" 
                   stroke={themeColors.primary} 
                   strokeWidth="0.15" 
                   strokeOpacity={0.4 - i * 0.05} 
                   transform={`rotate(${i * 30} 50 50)`} 
                 />
               ))}
            </Svg>
         </Animated.View>
      </View>

      {/* Static Stars */}
      {[...Array(STAR_COUNT)].map((_, i) => (
        <Star key={i} index={i} />
      ))}

      {/* Achievement Constellation */}
      {[...Array(ACHIEVEMENT_STAR_COUNT)].map((_, i) => (
        <AchievementStar key={`ach-${i}`} index={i} active={i < achievementCount} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  coreContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  coreGlow: {
    width: width * 1.5,
    height: width * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
