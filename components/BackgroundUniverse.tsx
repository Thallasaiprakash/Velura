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
import Svg, { Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
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

  React.useEffect(() => {
    const duration = energyState === 'force' ? 2000 : energyState === 'flow' ? 4000 : 7000;
    const baseOpacity = 0.4 + (achievementCount * 0.05); // More stars = more nebula vibrancy
    const peakOpacity = Math.min(0.85, 0.65 + (achievementCount * 0.05));
    
    nebulaOpacity.value = withRepeat(
      withTiming(peakOpacity, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    nebulaScale.value = withRepeat(
      withTiming(1.25, { duration: duration * 1.5, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [energyState, achievementCount]);


  const nebulaColor = useMemo(() => {
    switch (energyState) {
      case 'force': return '#ff4d4d'; // Reddish for intense
      case 'flow': return '#a78bfa';  // Purple/Indigo for flow
      case 'fade': return '#4b5563';  // Grayish for fade
      default: return Colors.primary;
    }
  }, [energyState]);

  const animatedNebulaStyle = useAnimatedStyle(() => ({
    opacity: nebulaOpacity.value,
    transform: [{ scale: nebulaScale.value }]
  }));


  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Deep Space Base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]} />
      
      {/* Nebula Glows */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedNebulaStyle]}>
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient id="nebula1" cx="20%" cy="30%" r="50%">
              <Stop offset="0%" stopColor={nebulaColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebula2" cx="80%" cy="70%" r="50%">
              <Stop offset="0%" stopColor={energyState === 'force' ? '#f59e0b' : '#3b82f6'} stopOpacity="0.3" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebula1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebula2)" />
        </Svg>
      </Animated.View>

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
});
