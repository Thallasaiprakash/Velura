import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform, Image } from 'react-native';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Ellipse,
  Rect,
  LinearGradient
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

interface OrbitalBackgroundProps {
  achievementCount?: number;
  variant?: 'home' | 'planner' | 'settings';
}

/**
 * OrbitalBackground - Cosmic Edition
 * A high-fidelity, realistic cinematic background inspired by Interstellar.
 */
export const OrbitalBackground: React.FC<OrbitalBackgroundProps> = ({ 
  achievementCount = 0,
  variant = 'home'
}) => {
  const nebulaPulse = useSharedValue(0.3);
  const planetRotation = useSharedValue(0);
  const atmosphereRadius = useSharedValue(width * 0.16);

  useEffect(() => {
    nebulaPulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 10000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    planetRotation.value = withRepeat(
      withTiming(360, { duration: 240000, easing: Easing.linear }),
      -1,
      false
    );

    atmosphereRadius.value = withRepeat(
      withSequence(
        withTiming(width * 0.17, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(width * 0.16, { duration: 6000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.2,
      opacity: Math.random() * 0.6 + 0.1,
      twinkleDelay: Math.random() * 5000,
    }));
  }, []);

  const orbits = [
    { rx: width * 0.45, ry: height * 0.2, planetSize: 5, color: '#E2E8F0', duration: 50000, delay: 0 },
    { rx: width * 0.7, ry: height * 0.35, planetSize: 8, color: '#FDA4AF', duration: 80000, delay: 5000, hasRing: true },
    { rx: width * 1.0, ry: height * 0.6, planetSize: 12, color: '#93C5FD', duration: 120000, delay: 2000 },
  ];

  const animatedNebulaProps = useAnimatedProps(() => ({
    opacity: nebulaPulse.value
  }));

  const animatedAtmosphereProps = useAnimatedProps(() => ({
    r: atmosphereRadius.value
  }));

  return (
    <View style={styles.container}>
      {/* Cinematic Base Layer */}
      <Image 
        source={require('../assets/images/cosmic_bg.png')} 
        style={styles.bgImage}
        resizeMode="cover"
      />
      
      <View style={styles.overlay} />

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.svgOverlay}>
        <Defs>
          <RadialGradient id="nebulaBlue" cx="20%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaMagenta" cx="80%" cy="70%" r="80%">
            <Stop offset="0%" stopColor="#701A75" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#701A75" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="planetBody" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#BFDBFE" />
            <Stop offset="30%" stopColor="#3B82F6" />
            <Stop offset="70%" stopColor="#1E3A8A" />
            <Stop offset="100%" stopColor="#0F172A" />
          </RadialGradient>
          <RadialGradient id="atmosGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="75%" stopColor="#60A5FA" stopOpacity="0" />
            <Stop offset="90%" stopColor="#60A5FA" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FDA4AF" stopOpacity="0" />
            <Stop offset="50%" stopColor="#FDA4AF" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="gargantuaCore" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000" stopOpacity="1" />
            <Stop offset="90%" stopColor="#000" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFF" stopOpacity="0.8" />
          </RadialGradient>
          <RadialGradient id="accretionDisk" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <Stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Dynamic Light Layers */}
        <AnimatedCircle cx={width * 0.2} cy={height * 0.3} r={width} fill="url(#nebulaBlue)" animatedProps={animatedNebulaProps} />
        <AnimatedCircle cx={width * 0.8} cy={height * 0.7} r={width} fill="url(#nebulaMagenta)" animatedProps={animatedNebulaProps} />

        {/* Floating Stars */}
        {stars.map(star => (
          <TwinklingStar key={star.id} {...star} />
        ))}

        {/* Distant Orbits */}
        <G x={width / 2} y={height / 2}>
          {orbits.map((orb, i) => (
            <CelestialOrbital key={i} {...orb} />
          ))}
          {Array.from({ length: Math.min(achievementCount, 20) }).map((_, i) => (
            <AchievementParticle key={i} index={i} total={Math.min(achievementCount, 20)} />
          ))}
        </G>

        {/* CENTRAL FOCUS (Gargantua-inspired Black Hole) */}
        <G x={width / 2} y={height * 0.55}>
          {/* Accretion Disk / Gravitational Lens */}
          <AnimatedG animatedProps={useAnimatedProps(() => ({
            opacity: 0.6,
            transform: `scale(${withRepeat(withTiming(1.1, { duration: 4000 }), -1, true)}) rotate(-5)`
          }))}>
             <Ellipse rx={width * 0.4} ry={width * 0.08} fill="url(#accretionDisk)" />
          </AnimatedG>
          
          <Circle r={width * 0.15} fill="url(#atmosGlow)" />
          <Circle r={width * 0.11} fill="url(#gargantuaCore)" />
          <PlanetClouds size={width * 0.11} rotation={planetRotation} />
          
          {/* Subtle distorted secondary disk */}
          <G transform="rotate(170)">
            <Ellipse rx={width * 0.35} ry={width * 0.04} fill="url(#accretionDisk)" opacity={0.3} />
          </G>
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
      withRepeat(withTiming(opacity * 0.3, { duration: 3000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }), -1, true)
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
    const tx = Math.cos(rad) * rx;
    const ty = Math.sin(rad) * ry;
    return {
      transform: `translate(${tx}, ${ty})`,
    };
  });

  return (
    <G>
      <Ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="4 8" />
      <AnimatedG animatedProps={animatedProps}>
        {hasRing && (
          <Ellipse 
            rx={planetSize * 2.2} 
            ry={planetSize * 0.8} 
            fill="none" 
            stroke="url(#ringGrad)" 
            strokeWidth="1.2" 
            transform="rotate(25)" 
          />
        )}
        <Circle r={planetSize} fill={color} />
      </AnimatedG>
    </G>
  );
};

const AchievementParticle: React.FC<{ index: number, total: number }> = ({ index, total }) => {
  const rot = useSharedValue((index / total) * 360);
  const orbitX = width * 0.25;
  const orbitY = height * 0.12;
  
  useEffect(() => {
    rot.value = withRepeat(withTiming(rot.value + 360, { duration: 25000 + index * 500, easing: Easing.linear }), -1, false);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rot.value * Math.PI) / 180;
    const tx = Math.cos(rad) * orbitX;
    const ty = Math.sin(rad) * orbitY;
    return {
      transform: `translate(${tx}, ${ty})`,
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle r={1.5} fill="#FCD34D" />
      <Circle r={3} fill="#FCD34D" opacity={0.3} />
    </AnimatedG>
  );
};

const PlanetClouds: React.FC<{ size: number, rotation: Animated.SharedValue<number> }> = ({ size, rotation }) => {
  const animatedProps = useAnimatedProps(() => ({
    transform: `rotate(${rotation.value})`,
  }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Ellipse cx={-size * 0.3} cy={-size * 0.4} rx={size * 0.5} ry={size * 0.2} fill="white" opacity={0.15} />
      <Ellipse cx={size * 0.4} cy={size * 0.1} rx={size * 0.6} ry={size * 0.25} fill="white" opacity={0.1} />
      <Ellipse cx={-size * 0.2} cy={size * 0.5} rx={size * 0.4} ry={size * 0.18} fill="white" opacity={0.15} />
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
    opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  svgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

