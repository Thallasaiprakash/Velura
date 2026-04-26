import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Ellipse,
  LinearGradient,
  Path,
  Filter,
  GaussianBlur
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
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface OrbitalBackgroundProps {
  achievementCount?: Animated.SharedValue<number> | number;
  variant?: 'home' | 'planner' | 'settings';
}

/**
 * OrbitalBackground - Award Winning "Interstellar" Edition
 * Features a high-fidelity Gargantua black hole with Gravitational Lensing.
 */
export const OrbitalBackground: React.FC<OrbitalBackgroundProps> = ({ 
  achievementCount = 0,
  variant = 'home'
}) => {
  const nebulaPulse = useSharedValue(0.3);
  const diskScale = useSharedValue(1);
  const diskRotation = useSharedValue(0);
  const lensingOpacity = useSharedValue(0.4);

  // Convert achievementCount to a SharedValue for internal consistency
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

    diskScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    diskRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );

    lensingOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 3000, easing: Easing.inOut(Easing.sin) })
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
      opacity: Math.random() * 0.6 + 0.2,
      color: i % 10 === 0 ? '#93C5FD' : i % 15 === 0 ? '#FDBA74' : '#FFFFFF',
      twinkleDelay: Math.random() * 5000,
    }));
  }, []);

  const orbits = [
    { rx: width * 0.45, ry: height * 0.18, planetSize: 4, color: '#E2E8F0', duration: 45000, delay: 0 },
    { rx: width * 0.75, ry: height * 0.3, planetSize: 6, color: '#FDA4AF', duration: 75000, delay: 3000, hasRing: true },
    { rx: width * 1.1, ry: height * 0.5, planetSize: 9, color: '#93C5FD', duration: 110000, delay: 1500 },
  ];

  return (
    <View style={styles.container}>
      {/* Background Layer - High Fidelity Galaxy Generated Image */}
      <Image 
        source={require('../assets/images/cosmic_bg.png')} 
        style={styles.bgImage}
        resizeMode="cover"
      />
      
      <View style={styles.shade} />

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        <Defs>
          <Filter id="glow">
            <GaussianBlur stdDeviation="3" result="coloredBlur" />
          </Filter>

          <RadialGradient id="nebulaBlue" cx="20%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#1E40AF" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="gargantuaSingularity" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000" stopOpacity="1" />
            <Stop offset="90%" stopColor="#000" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFF" stopOpacity="0.8" />
          </RadialGradient>

          <RadialGradient id="accretionGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
            <Stop offset="40%" stopColor="#D97706" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#78350F" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="eventHorizon" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF" stopOpacity="0" />
            <Stop offset="85%" stopColor="#60A5FA" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
          </RadialGradient>
        </Defs>

        {/* Dynamic Nebulae */}
        <AnimatedCircle cx={width * 0.2} cy={height * 0.2} r={width * 0.8} fill="url(#nebulaBlue)" 
          animatedProps={useAnimatedProps(() => ({ opacity: nebulaPulse.value }))} />

        {/* Stars Layer */}
        {stars.map(star => (
          <TwinklingStar key={star.id} {...star} />
        ))}

        {/* Background Orbits */}
        <G x={width / 2} y={height / 2}>
          {orbits.map((orb, i) => (
            <CelestialOrbital key={i} {...orb} />
          ))}
          <AchievementField achievementCount={achievementSV} />
          <CosmicDust />
        </G>

        {/* THE GARGANTUA SYSTEM (Central Focus) */}
        <G x={width / 2} y={height * 0.52}>
          
          {/* 1. Background Lensing (Light warped behind the black hole) */}
          <AnimatedPath 
            d={`M ${-width * 0.4} 0 A ${width * 0.4} ${width * 0.15} 0 1 1 ${width * 0.4} 0`}
            fill="none"
            stroke="url(#accretionGlow)"
            strokeWidth="4"
            animatedProps={useAnimatedProps(() => ({ opacity: lensingOpacity.value * 0.4 }))}
          />

          {/* 2. Main Accretion Disk */}
          <AnimatedAccretionDisk scale={diskScale} rotation={diskRotation} />
          
          {/* 3. Foreground Lensing (Light warped in front of the black hole) */}
          <AnimatedPath 
            d={`M ${-width * 0.4} 0 A ${width * 0.4} ${width * 0.12} 0 1 0 ${width * 0.4} 0`}
            fill="none"
            stroke="url(#accretionGlow)"
            strokeWidth="3"
            animatedProps={useAnimatedProps(() => ({ opacity: lensingOpacity.value }))}
          />

          {/* 4. Event Horizon Distortion */}
          <Circle r={width * 0.17} fill="url(#eventHorizon)" />
          
          {/* 5. The Singularity (Absolute Black) */}
          <Circle r={width * 0.14} fill="url(#gargantuaSingularity)" />
          
          {/* 6. Photon Sphere (Intense white edge) */}
          <Circle r={width * 0.142} fill="none" stroke="#FFF" strokeOpacity="0.2" strokeWidth="1" />
        </G>
      </Svg>
    </View>
  );
};

const AnimatedAccretionDisk: React.FC<{ scale: Animated.SharedValue<number>, rotation: Animated.SharedValue<number> }> = ({ scale, rotation }) => {
  const animatedProps = useAnimatedProps(() => {
    const sVal = scale.value || 1;
    const rVal = rotation.value || 0;
    const s = (isNaN(sVal) ? 1 : sVal).toFixed(3);
    const r = (isNaN(rVal) ? 0 : rVal).toFixed(1);
    return {
      transform: `scale(${s}) rotate(${r})`,
      opacity: 0.8
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
       {/* Accretion Disk Layers */}
       <Ellipse rx={width * 0.48} ry={width * 0.08} fill="url(#accretionGlow)" opacity={0.6} />
       <Ellipse rx={width * 0.44} ry={width * 0.05} fill="#FFF" opacity={0.15} />
       <Ellipse rx={width * 0.3} ry={width * 0.04} fill="#FCD34D" opacity={0.3} />
    </AnimatedG>
  );
};

const TwinklingStar: React.FC<{ x: number, y: number, size: number, opacity: number, color: string, twinkleDelay: number }> = ({ x, y, size, opacity, color, twinkleDelay }) => {
  const opac = useSharedValue(opacity);
  useEffect(() => {
    opac.value = withDelay(
      twinkleDelay,
      withRepeat(withTiming(opacity * 0.1, { duration: 4000 + Math.random() * 2000 }), -1, true)
    );
  }, []);
  const animatedProps = useAnimatedProps(() => {
    const oVal = opac.value || 0;
    return { opacity: isNaN(oVal) ? 0 : oVal.toFixed(2) };
  });
  return <AnimatedCircle cx={x} cy={y} r={size} fill={color} animatedProps={animatedProps} />;
};

const CelestialOrbital: React.FC<{ rx: number, ry: number, planetSize: number, color: string, duration: number, delay: number, hasRing?: boolean }> = ({ 
  rx, ry, planetSize, color, duration, delay, hasRing 
}) => {
  const rot = useSharedValue(Math.random() * 360);
  useEffect(() => {
    rot.value = withDelay(delay, withRepeat(withTiming(rot.value + 360, { duration, easing: Easing.linear }), -1, false));
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = ((rot.value || 0) * Math.PI) / 180;
    const tx = (Math.cos(rad) * rx).toFixed(2);
    const ty = (Math.sin(rad) * ry).toFixed(2);
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
            ry={planetSize * 0.6} 
            fill="none" 
            stroke="rgba(253, 164, 175, 0.4)" 
            strokeWidth="0.8" 
            transform="rotate(25)" 
          />
        )}
        <Circle r={planetSize} fill={color} />
        {/* Planet Glow */}
        <Circle r={planetSize + 2} fill={color} opacity={0.2} />
      </AnimatedG>
    </G>
  );
};

const AchievementField: React.FC<{ achievementCount: Animated.SharedValue<number> }> = ({ achievementCount }) => {
  return (
    <G>
      {Array.from({ length: 24 }).map((_, i) => (
        <AchievementParticle key={i} index={i} total={24} achievementCount={achievementCount} />
      ))}
    </G>
  );
};

const AchievementParticle: React.FC<{ index: number, total: number, achievementCount: Animated.SharedValue<number> }> = ({ index, total, achievementCount }) => {
  const rot = useSharedValue((index / total) * 360);
  const orbitX = width * 0.25;
  const orbitY = height * 0.12;
  
  useEffect(() => {
    rot.value = withRepeat(withTiming(rot.value + 360, { duration: 25000 + index * 800, easing: Easing.linear }), -1, false);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const rad = ((rot.value || 0) * Math.PI) / 180;
    const tx = (Math.cos(rad) * orbitX).toFixed(2);
    const ty = (Math.sin(rad) * orbitY).toFixed(2);
    const isVisible = (achievementCount.value || 0) > index;
    return {
      transform: `translate(${tx}, ${ty})`,
      opacity: isVisible ? 0.9 : 0,
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle r={1.2} fill="#FDE68A" />
      <Circle r={4} fill="#FDE68A" opacity={0.25} />
    </AnimatedG>
  );
};

const CosmicDust: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      size: Math.random() * 2 + 0.5,
      duration: 20000 + Math.random() * 20000,
    }));
  }, []);

  return (
    <G>
      {particles.map(p => (
        <DustParticle key={p.id} {...p} />
      ))}
    </G>
  );
};

const DustParticle: React.FC<{ x: number, y: number, size: number, duration: number }> = ({ x, y, size, duration }) => {
  const moveX = useSharedValue(x);
  const moveY = useSharedValue(y);

  useEffect(() => {
    moveX.value = withRepeat(withTiming(x + (Math.random() - 0.5) * 100, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    moveY.value = withRepeat(withTiming(y + (Math.random() - 0.5) * 100, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const tx = (moveX.value || 0).toFixed(2);
    const ty = (moveY.value || 0).toFixed(2);
    return {
      transform: `translate(${tx}, ${ty})`,
      opacity: 0.15
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
       <Circle r={size} fill="#FFF" />
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
