import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Ellipse,
  Rect,
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode
} from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  Easing,
  withDelay,
  useAnimatedStyle,
  interpolate,
  withSequence
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface OrbitalBackgroundProps {
  achievementCount?: number;
  variant?: 'home' | 'planner' | 'settings';
}

/**
 * OrbitalBackground
 * A high-fidelity, realistic cosmic background designed to WOW the user.
 * Features a deep nebula, a realistic Earth with atmosphere, and physics-inspired orbits.
 */
export const OrbitalBackground: React.FC<OrbitalBackgroundProps> = ({ 
  achievementCount = 0,
  variant = 'home'
}) => {
  // Animation values
  const nebulaPulse = useSharedValue(0.4);
  const planetRotation = useSharedValue(0);
  const atmospherePulse = useSharedValue(1);

  useEffect(() => {
    // Subtle nebula breathing
    nebulaPulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Planet slow rotation
    planetRotation.value = withRepeat(
      withTiming(360, { duration: 180000, easing: Easing.linear }),
      -1,
      false
    );

    // Atmosphere scattering pulse
    atmospherePulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Generate a field of stars with varying depth
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.2,
      opacity: Math.random() * 0.7 + 0.1,
      depth: Math.random(), // 0 to 1 for parallax or effect
      twinkleDelay: Math.random() * 5000,
    }));
  }, []);

  // Orbital paths definitions
  const orbits = [
    { rx: width * 0.48, ry: height * 0.22, planetSize: 6, color: '#E2E8F0', duration: 45000, delay: 0 },
    { rx: width * 0.75, ry: height * 0.38, planetSize: 9, color: '#FDA4AF', duration: 75000, delay: 5000, hasRing: true },
    { rx: width * 1.15, ry: height * 0.65, planetSize: 14, color: '#93C5FD', duration: 110000, delay: 2000 },
  ];

  const animatedNebulaProps = useAnimatedProps(() => ({
    opacity: nebulaPulse.value
  }));

  const animatedAtmosphereProps = useAnimatedProps(() => ({
    transform: [{ scale: atmospherePulse.value }]
  }));

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Deepest Void */}
          <RadialGradient id="void" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#0B0E1B" />
            <Stop offset="100%" stopColor="#02040A" />
          </RadialGradient>
          
          {/* Nebula Layers */}
          <RadialGradient id="nebulaBlue" cx="20%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaMagenta" cx="85%" cy="75%" r="80%">
            <Stop offset="0%" stopColor="#701A75" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#701A75" stopOpacity="0" />
          </RadialGradient>

          {/* Realistic Planet Gradient */}
          <RadialGradient id="planetBody" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#BFDBFE" />
            <Stop offset="30%" stopColor="#3B82F6" />
            <Stop offset="70%" stopColor="#1E3A8A" />
            <Stop offset="100%" stopColor="#111827" />
          </RadialGradient>

          {/* Atmosphere Glow */}
          <RadialGradient id="atmosGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="75%" stopColor="#60A5FA" stopOpacity="0" />
            <Stop offset="90%" stopColor="#60A5FA" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </RadialGradient>

          {/* Ring Gradient */}
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FDA4AF" stopOpacity="0" />
            <Stop offset="50%" stopColor="#FDA4AF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Background Base */}
        <Rect width={width} height={height} fill="url(#void)" />

        {/* Dynamic Nebula Overlay */}
        <AnimatedCircle cx={width * 0.2} cy={height * 0.3} r={width} fill="url(#nebulaBlue)" animatedProps={animatedNebulaProps} />
        <AnimatedCircle cx={width * 0.8} cy={height * 0.7} r={width} fill="url(#nebulaMagenta)" animatedProps={animatedNebulaProps} />

        {/* Distant Stars */}
        {stars.map(star => (
          <TwinklingStar key={star.id} {...star} />
        ))}

        {/* Orbital Paths & Bodies */}
        <G x={width / 2} y={height / 2}>
          {orbits.map((orb, i) => (
            <CelestialOrbital key={i} {...orb} />
          ))}

          {/* Achievement Particle Field */}
          {Array.from({ length: Math.min(achievementCount, 30) }).map((_, i) => (
            <AchievementParticle key={i} index={i} total={Math.min(achievementCount, 30)} />
          ))}
        </G>

        {/* CENTRAL EARTH-LIKE PLANET */}
        <G x={width / 2} y={height / 2}>
          {/* Atmospheric Bloom */}
          <AnimatedCircle r={width * 0.18} fill="url(#atmosGlow)" animatedProps={animatedAtmosphereProps} />
          
          {/* Planet Main Body */}
          <Circle r={width * 0.15} fill="url(#planetBody)" />
          
          {/* Moving Clouds */}
          <PlanetClouds size={width * 0.15} rotation={planetRotation} />
          
          {/* Dark Side Shadow */}
          <Circle r={width * 0.15} fill="black" fillOpacity="0.25" cx={width * 0.03} cy={width * 0.03} />
        </G>
      </Svg>
    </View>
  );
};

const TwinklingStar: React.FC<{ x: number, y: number, size: number, opacity: number, twinkleDelay: number }> = ({ x, y, size, opacity, twinkleDelay }) => {
  const opac = useSharedValue(opacity);
  useEffect(() => {
    opac.value = withDelay(
      twinkleDelay,
      withRepeat(withTiming(opacity * 0.2, { duration: 2500 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }), -1, true)
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
    return {
      transform: [
        { translateX: Math.cos(rad) * rx },
        { translateY: Math.sin(rad) * ry },
      ],
    };
  });

  return (
    <G>
      <Ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" strokeDasharray="6 12" />
      <AnimatedG animatedProps={animatedProps}>
        {hasRing && (
          <Ellipse 
            rx={planetSize * 2.5} 
            ry={planetSize * 0.9} 
            fill="none" 
            stroke="url(#ringGrad)" 
            strokeWidth="1.5" 
            transform={[{ rotate: '30deg' }]} 
          />
        )}
        <Circle r={planetSize} fill={color} />
        <Circle r={planetSize * 1.8} fill={color} opacity={0.15} />
      </AnimatedG>
    </G>
  );
};

const AchievementParticle: React.FC<{ index: number, total: number }> = ({ index, total }) => {
  const rot = useSharedValue((index / total) * 360);
  const orbitX = width * 0.28 + (index % 3) * 15;
  const orbitY = height * 0.15 + (index % 3) * 10;
  
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(rot.value + 360, { 
        duration: 20000 + index * 800, 
        easing: Easing.linear 
      }), 
      -1, 
      false
    );
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
      <Circle r={2} fill="#FCD34D" />
      <Circle r={4} fill="#FCD34D" opacity={0.4} />
    </AnimatedG>
  );
};

const PlanetClouds: React.FC<{ size: number, rotation: Animated.SharedValue<number> }> = ({ size, rotation }) => {
  const animatedProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Ellipse cx={-size * 0.3} cy={-size * 0.4} rx={size * 0.5} ry={size * 0.2} fill="white" opacity={0.2} />
      <Ellipse cx={size * 0.4} cy={size * 0.1} rx={size * 0.6} ry={size * 0.25} fill="white" opacity={0.15} />
      <Ellipse cx={-size * 0.2} cy={size * 0.5} rx={size * 0.4} ry={size * 0.18} fill="white" opacity={0.2} />
    </AnimatedG>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02040A',
  },
});
