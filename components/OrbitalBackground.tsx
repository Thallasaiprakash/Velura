import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Ellipse,
  LinearGradient
} from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  Easing,
  withDelay,
  useDerivedValue,
  withSequence
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface OrbitalBackgroundProps {
  achievementCount?: Animated.SharedValue<number> | number;
  variant?: 'home' | 'planner' | 'settings';
}

/**
 * OrbitalBackground - Cinematic Gargantua Edition
 * Optimized for native stability and visual excellence.
 */
export const OrbitalBackground: React.FC<OrbitalBackgroundProps> = ({ 
  achievementCount = 0,
  variant = 'home'
}) => {
  const nebulaPulse = useSharedValue(0.3);
  const planetRotation = useSharedValue(0);
  const diskScale = useSharedValue(1);
  const diskRotation = useSharedValue(0);

  // Convert achievementCount to a SharedValue for internal consistency if it's a number
  const achievementSV = typeof achievementCount === 'number' 
    ? useSharedValue(achievementCount) 
    : achievementCount;

  useEffect(() => {
    nebulaPulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 15000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    planetRotation.value = withRepeat(
      withTiming(360, { duration: 180000, easing: Easing.linear }),
      -1,
      false
    );

    diskScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    diskRotation.value = withRepeat(
      withTiming(360, { duration: 40000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      twinkleDelay: Math.random() * 5000,
    }));
  }, []);

  const orbits = [
    { rx: width * 0.45, ry: height * 0.18, planetSize: 4, color: '#E2E8F0', duration: 45000, delay: 0 },
    { rx: width * 0.75, ry: height * 0.3, planetSize: 7, color: '#FDA4AF', duration: 75000, delay: 3000, hasRing: true },
    { rx: width * 1.1, ry: height * 0.5, planetSize: 10, color: '#93C5FD', duration: 110000, delay: 1500 },
  ];

  return (
    <View style={styles.container}>
      {/* Background Layer - High Fidelity Galaxy */}
      <Image 
        source={require('../assets/images/cosmic_bg.png')} 
        style={styles.bgImage}
        resizeMode="cover"
      />
      
      <View style={styles.shade} />

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        <Defs>
          <RadialGradient id="nebulaBlue" cx="20%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaGold" cx="80%" cy="70%" r="80%">
            <Stop offset="0%" stopColor="#78350F" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#78350F" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="gargantuaSingularity" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000" stopOpacity="1" />
            <Stop offset="92%" stopColor="#000" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFF" stopOpacity="0.9" />
          </RadialGradient>

          <RadialGradient id="accretionGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
            <Stop offset="40%" stopColor="#D97706" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#B45309" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="eventHorizon" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF" stopOpacity="0" />
            <Stop offset="85%" stopColor="#60A5FA" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
          </RadialGradient>

          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FDA4AF" stopOpacity="0" />
            <Stop offset="50%" stopColor="#FDA4AF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Dynamic Nebulae */}
        <AnimatedCircle cx={width * 0.2} cy={height * 0.3} r={width * 0.8} fill="url(#nebulaBlue)" 
          animatedProps={useAnimatedProps(() => ({ opacity: nebulaPulse.value }))} />
        <AnimatedCircle cx={width * 0.8} cy={height * 0.7} r={width * 0.8} fill="url(#nebulaGold)" 
          animatedProps={useAnimatedProps(() => ({ opacity: nebulaPulse.value }))} />

        {/* Stars Layer */}
        {stars.map(star => (
          <TwinklingStar key={star.id} {...star} />
        ))}

        {/* Distant Orbits */}
        <G x={width / 2} y={height / 2}>
          {orbits.map((orb, i) => (
            <CelestialOrbital key={i} {...orb} />
          ))}
          
          {/* Achievement particles mapped to the center */}
          <AchievementField achievementCount={achievementSV} />
        </G>

        {/* CENTRAL GARGANTUA */}
        <G x={width / 2} y={height * 0.52}>
          {/* Main Accretion Disk */}
          <AnimatedAccretionDisk scale={diskScale} rotation={diskRotation} />
          
          {/* Gravitational Lensing (Warped Ring) */}
          <G transform="rotate(-15)">
             <Ellipse rx={width * 0.38} ry={width * 0.04} fill="url(#accretionGlow)" opacity={0.2} />
          </G>

          {/* Event Horizon Glow */}
          <Circle r={width * 0.16} fill="url(#eventHorizon)" />
          
          {/* The Singularity */}
          <Circle r={width * 0.13} fill="url(#gargantuaSingularity)" />
          
          {/* Subtle Photon Sphere */}
          <Circle r={width * 0.132} fill="none" stroke="#FFF" strokeOpacity="0.15" strokeWidth="0.5" />
        </G>
      </Svg>
    </View>
  );
};

const AnimatedAccretionDisk: React.FC<{ scale: Animated.SharedValue<number>, rotation: Animated.SharedValue<number> }> = ({ scale, rotation }) => {
  const animatedProps = useAnimatedProps(() => {
    // construction of transform string in a more stable way for native
    const s = scale.value.toFixed(3);
    const r = rotation.value.toFixed(1);
    return {
      transform: `scale(${s}) rotate(${r})`,
      opacity: 0.7
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
       <Ellipse rx={width * 0.45} ry={width * 0.07} fill="url(#accretionGlow)" />
       <Ellipse rx={width * 0.42} ry={width * 0.05} fill="#FFF" opacity={0.2} />
    </AnimatedG>
  );
};

const TwinklingStar: React.FC<{ x: number, y: number, size: number, opacity: number, twinkleDelay: number }> = ({ x, y, size, opacity, twinkleDelay }) => {
  const opac = useSharedValue(opacity);
  useEffect(() => {
    opac.value = withDelay(
      twinkleDelay,
      withRepeat(withTiming(opacity * 0.2, { duration: 3000 + Math.random() * 2000 }), -1, true)
    );
  }, []);
  const animatedProps = useAnimatedProps(() => ({ opacity: opac.value }));
  return <AnimatedCircle cx={x} cy={y} r={size} fill="white" animatedProps={animatedProps} />;
};

const CelestialOrbital: React.FC<{ rx: number, ry: number, planetSize: number, color: string, duration: number, delay: number, hasRing?: boolean }> = ({ 
  rx, ry, planetSize, color, duration, delay, hasRing 
}) => {
  const rot = useSharedValue(Math.random() * 360);
  useEffect(() => {
    rot.value = withDelay(delay, withRepeat(withTiming(rot.value + 360, { duration, easing: Easing.linear }), -1, false));
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rot.value * Math.PI) / 180;
    const tx = (Math.cos(rad) * rx).toFixed(2);
    const ty = (Math.sin(rad) * ry).toFixed(2);
    return {
      transform: `translate(${tx}, ${ty})`,
    };
  });

  return (
    <G>
      <Ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 6" />
      <AnimatedG animatedProps={animatedProps}>
        {hasRing && (
          <Ellipse 
            rx={planetSize * 2} 
            ry={planetSize * 0.7} 
            fill="none" 
            stroke="url(#ringGrad)" 
            strokeWidth="1" 
            transform="rotate(20)" 
          />
        )}
        <Circle r={planetSize} fill={color} />
      </AnimatedG>
    </G>
  );
};

const AchievementField: React.FC<{ achievementCount: Animated.SharedValue<number> }> = ({ achievementCount }) => {
  // Use a fixed array for rendering stability, control visibility via animated props
  return (
    <G>
      {Array.from({ length: 20 }).map((_, i) => (
        <AchievementParticle key={i} index={i} total={20} achievementCount={achievementCount} />
      ))}
    </G>
  );
};

const AchievementParticle: React.FC<{ index: number, total: number, achievementCount: Animated.SharedValue<number> }> = ({ index, total, achievementCount }) => {
  const rot = useSharedValue((index / total) * 360);
  const orbitX = width * 0.22;
  const orbitY = height * 0.1;
  
  useEffect(() => {
    rot.value = withRepeat(withTiming(rot.value + 360, { duration: 20000 + index * 1000, easing: Easing.linear }), -1, false);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rot.value * Math.PI) / 180;
    const tx = (Math.cos(rad) * orbitX).toFixed(2);
    const ty = (Math.sin(rad) * orbitY).toFixed(2);
    const isVisible = achievementCount.value > index;
    return {
      transform: `translate(${tx}, ${ty})`,
      opacity: isVisible ? 0.8 : 0,
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle r={1.5} fill="#FCD34D" />
      <Circle r={3} fill="#FCD34D" opacity={0.3} />
    </AnimatedG>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
