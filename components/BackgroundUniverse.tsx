import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Ellipse,
  LinearGradient
} from 'react-native-svg';
import AnimatedRN, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  interpolate,
  withDelay,
  Easing as ReanimatedEasing
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = AnimatedRN.createAnimatedComponent(Circle);
const AnimatedG = AnimatedRN.createAnimatedComponent(G);
const AnimatedEllipse = AnimatedRN.createAnimatedComponent(Ellipse);

interface BackgroundUniverseProps {
  energyState?: 'force' | 'flow' | 'fade';
  achievementCount?: number;
}

/**
 * BackgroundUniverse
 * A premium, realistic cosmic background featuring a central Earth-like planet,
 * elliptical orbits, and dynamic celestial bodies.
 */
export const BackgroundUniverse: React.FC<BackgroundUniverseProps> = ({ 
  energyState = 'flow', 
  achievementCount = 0 
}) => {
  // Ensure achievementCount is a valid non-negative integer
  const validStarsCount = Math.max(0, Math.floor(achievementCount || 0));
  
  // Rotation for the atmosphere/clouds
  const cloudRotation = useSharedValue(0);

  useEffect(() => {
    cloudRotation.value = withRepeat(
      withTiming(360, { duration: 120000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );
  }, []);

  // Theme colors based on energy state
  const themeColor = useMemo(() => {
    switch (energyState) {
      case 'force': return Colors.danger;
      case 'fade': return Colors.primary;
      case 'flow': 
      default: return Colors.success;
    }
  }, [energyState]);

  // Generate stable star positions
  const staticStars = useMemo(() => {
    return Array.from({ length: 120 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 5000,
    }));
  }, []);

  // Orbital definitions for realism
  const orbits = [
    { rx: width * 0.45, ry: height * 0.2, planetSize: 7, color: '#94A3B8', duration: 35000 },
    { rx: width * 0.7, ry: height * 0.35, planetSize: 10, color: '#FDA4AF', duration: 55000, hasRing: true },
    { rx: width * 1.1, ry: height * 0.6, planetSize: 12, color: '#BAE6FD', duration: 85000 },
  ];

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Deep Space Background */}
          <RadialGradient id="spaceGrad" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#0F172A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </RadialGradient>

          {/* Nebula Clouds */}
          <RadialGradient id="nebulaBlue" cx="20%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#1E40AF" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaPurple" cx="80%" cy="70%" r="80%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </RadialGradient>

          {/* Earth Body Gradient */}
          <RadialGradient id="earthGrad" cx="30%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#93C5FD" /> 
            <Stop offset="40%" stopColor="#3B82F6" />
            <Stop offset="80%" stopColor="#1E40AF" />
            <Stop offset="100%" stopColor="#172554" />
          </RadialGradient>

          {/* Atmospheric Glow (Scattering) */}
          <RadialGradient id="atmosGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="70%" stopColor={themeColor} stopOpacity="0" />
            <Stop offset="85%" stopColor={themeColor} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={themeColor} stopOpacity="0" />
          </RadialGradient>
          
          {/* Cloud Texture Linear Gradient */}
          <LinearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <Stop offset="50%" stopColor="white" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="white" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Space Base */}
        <Rect width={width} height={height} fill="url(#spaceGrad)" />
        
        {/* Nebula Overlays */}
        <Rect width={width} height={height} fill="url(#nebulaBlue)" />
        <Rect width={width} height={height} fill="url(#nebulaPurple)" />

        {/* Twinkling Field */}
        {staticStars.map(star => (
          <Star key={star.id} {...star} />
        ))}

        {/* Elliptical Orbits */}
        <G x={width / 2} y={height / 2}>
          {orbits.map((orb, i) => (
            <OrbitingBody key={i} {...orb} />
          ))}

          {/* Achievement Field - Only show first 20 for performance */}
          {Array.from({ length: Math.min(validStarsCount, 20) }).map((_, i) => (
            <AchievementStar 
              key={i} 
              index={i} 
              total={Math.min(validStarsCount, 20)} 
              color={themeColor}
            />
          ))}
        </G>

        {/* CENTRAL PLANET (EARTH) */}
        <G x={width / 2} y={height / 2}>
          {/* Atmospheric Bloom */}
          <Circle r={width * 0.18} fill="url(#atmosGlow)" />
          
          {/* Main Body */}
          <Circle r={width * 0.15} fill="url(#earthGrad)" />
          
          {/* Rotating Cloud Systems */}
          <AnimatedClouds size={width * 0.15} rotation={cloudRotation} />
          
          {/* Subtle Shadow Overlay */}
          <Circle r={width * 0.15} fill="black" fillOpacity="0.1" cx={width * 0.02} cy={width * 0.02} />
        </G>
      </Svg>
    </View>
  );
};

const Star: React.FC<{ x: number, y: number, size: number, opacity: number, delay: number }> = ({ x, y, size, opacity, delay }) => {
  const opac = useSharedValue(opacity);
  useEffect(() => {
    opac.value = withDelay(delay, withRepeat(withTiming(opacity * 0.2, { duration: 3000 }), -1, true));
  }, []);
  const animatedProps = useAnimatedProps(() => ({ opacity: opac.value }));
  return <AnimatedCircle cx={x} cy={y} r={size} fill="white" animatedProps={animatedProps} />;
};

const OrbitingBody: React.FC<{ rx: number, ry: number, planetSize: number, color: string, duration: number, hasRing?: boolean }> = ({ 
  rx, ry, planetSize, color, duration, hasRing 
}) => {
  const rot = useSharedValue(Math.random() * 360);
  useEffect(() => {
    rot.value = withRepeat(withTiming(rot.value + 360, { duration, easing: ReanimatedEasing.linear }), -1, false);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rot.value * Math.PI) / 180;
    return {
      transform: [
        { translateX: Math.cos(rad) * rx },
        { translateY: Math.sin(rad) * ry },
      ],
    };
  });

  return (
    <G>
      <Ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="5 5" />
      <AnimatedG animatedProps={animatedProps}>
        {hasRing && (
          <Ellipse rx={planetSize * 2.2} ry={planetSize * 0.8} fill="none" stroke={color} strokeWidth="1" opacity={0.4} transform={[{ rotate: '25deg' }]} />
        )}
        <Circle r={planetSize} fill={color} />
        <Circle r={planetSize * 1.5} fill="white" opacity={0.1} />
      </AnimatedG>
    </G>
  );
};

const AchievementStar: React.FC<{ index: number, total: number, color: string }> = ({ index, total, color }) => {
  const rot = useSharedValue((index / total) * 360);
  const orbitX = width * 0.25;
  const orbitY = height * 0.12;
  
  useEffect(() => {
    rot.value = withRepeat(withTiming(rot.value + 360, { duration: 15000 + index * 1000, easing: ReanimatedEasing.linear }), -1, false);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rot.value * Math.PI) / 180;
    return {
      transform: [
        { translateX: Math.cos(rad) * orbitX },
        { translateY: Math.sin(rad) * orbitY },
      ],
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle r={2.5} fill={color} />
      <Circle r={5} fill={color} opacity={0.3} />
    </AnimatedG>
  );
};

const AnimatedClouds: React.FC<{ size: number, rotation: AnimatedRN.SharedValue<number> }> = ({ size, rotation }) => {
  const animatedProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Ellipse cx={-size * 0.4} cy={-size * 0.2} rx={size * 0.5} ry={size * 0.2} fill="url(#cloudGrad)" />
      <Ellipse cx={size * 0.3} cy={size * 0.3} rx={size * 0.6} ry={size * 0.25} fill="url(#cloudGrad)" />
      <Ellipse cx={-size * 0.2} cy={size * 0.5} rx={size * 0.4} ry={size * 0.15} fill="url(#cloudGrad)" />
    </AnimatedG>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
});
