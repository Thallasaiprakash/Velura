import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
  useAnimatedGestureHandler,
  runOnJS,
  interpolate,
  Extrapolate,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { TapGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { Task, Chronotype } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { isTimeInBioDip } from '../services/auraService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const ORBIT_CENTER = width / 2;

const RADII = {
  urgent: 80,
  normal: 130,
  low: 180,
};

const SPEEDS = {
  urgent: 12000,
  normal: 20000,
  low: 30000,
};

const StarShower = ({ color }: { color: string }) => {
  const particles = Array.from({ length: 15 }).map((_, i) => {
    const angle = (i / 15) * Math.PI * 2 + (Math.random() * 0.5);
    const distance = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    useEffect(() => {
      distance.value = withDelay(i * 10, withTiming(80 + Math.random() * 60, { 
        duration: 1000, 
        easing: Easing.out(Easing.back(1.5)) 
      }));
      opacity.value = withDelay(500, withTiming(0, { duration: 500 }));
      scale.value = withTiming(1.5, { duration: 200 }, () => {
        scale.value = withTiming(0, { duration: 800 });
      });
    }, []);

    const style = useAnimatedStyle(() => ({
      position: 'absolute',
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 4,
      transform: [
        { translateX: Math.cos(angle) * distance.value },
        { translateY: Math.sin(angle) * distance.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    }));

    return <Animated.View key={i} style={style} />;
  });

  return <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{particles}</View>;
};

const OrbitalDust = ({ radius, count, color }: { radius: number; count: number; color?: string }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.5,
      initialOpacity: Math.random() * 0.5 + 0.1,
      initialScale: Math.random() * 0.5 + 0.5,
      duration: 2000 + Math.random() * 3000,
    }));
  }, [count, radius]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <DustParticle key={p.id} {...p} radius={radius} color={color} />
      ))}
    </View>
  );
};

const DustParticle = ({ radius, angle, initialOpacity, initialScale, duration, color }: any) => {
  const opacity = useSharedValue(initialOpacity);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(initialOpacity * 2, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(initialOpacity, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: color || '#fff',
    opacity: opacity.value,
    transform: [
      { translateX: Math.cos(angle) * (radius + 2) },
      { translateY: Math.sin(angle) * (radius + 2) },
      { scale: initialScale }
    ],
  }));

  return <Animated.View style={style} />;
};


const PLANET_COLORS = {
  urgent: ['#fde047', '#f59e0b'], // The North Star (Golden/Sun)
  normal: ['#00d2ff', '#3a7bd5'], // Earth/Neptune
  low: ['#f8fafc', '#64748b'],    // Moon/Asteroid
};

// Unique planet styles
const PLANET_STYLE = {
  urgent: { r: 16, texture: '🌋' },
  normal: { r: 18, texture: '🌊' },
  low: { r: 12, texture: '🌑' },
};

interface TaskOrbitProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onEnterTunnel: (task: Task) => void;
  chronotype?: Chronotype;
  achievementStars?: number;
}

const OrbitPlanet = ({ task, index, total, onComplete, onEnterTunnel, chronotype }: any) => {
  const isBioDip = chronotype && task.timeTag ? isTimeInBioDip(task.timeTag, chronotype) : false;
  
  const rotation = useSharedValue(0);
  const selfRotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const priorityScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isCompleting = useSharedValue(false);

  useEffect(() => {
    scale.value = withSpring(1);
    const baseSpeed = SPEEDS[task.priority as keyof typeof SPEEDS] || SPEEDS.normal;
    // Slow down in bio-dip zones
    const speed = isBioDip ? baseSpeed * 1.8 : baseSpeed;
    
    const initialRot = (360 / total) * index;
    rotation.value = initialRot;
    
    rotation.value = withRepeat(
      withTiming(initialRot + 360, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Self rotation for "alive" feel
    selfRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [total, index, isBioDip]);

  useEffect(() => {
    // Urgent pulsation for high priority tasks
    if (task.priority === 'urgent') {
      priorityScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [task.priority]);

  const radius = RADII[task.priority as keyof typeof RADII] || RADII.normal;
  const colors = PLANET_COLORS[task.priority as keyof typeof PLANET_COLORS] || PLANET_COLORS.normal;

  const animatedStyle = useAnimatedStyle(() => {
    if (isCompleting.value) {
       return {
         transform: [
           { translateX: translateX.value },
           { translateY: translateY.value },
           { scale: interpolate(scale.value, [1, 0], [1, 2], Extrapolate.CLAMP) }
         ],
         opacity: scale.value,
       };
    }

    if (isDragging.value) {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: 1.2 }
        ],
        position: 'absolute',
        zIndex: 100,
      };
    }

    const rad = (rotation.value * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    
    translateX.value = withSpring(x, { damping: 15, stiffness: 100 });
    translateY.value = withSpring(y, { damping: 15, stiffness: 100 });

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value * priorityScale.value }
      ],
      position: 'absolute',
      zIndex: 1,
    };
  });

  const [showBurst, setShowBurst] = useState(false);

  const handleDragSubmit = () => {
    isCompleting.value = true;
    setShowBurst(true);
    scale.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)(task.id);
      }
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };


  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      isDragging.value = true;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      const distFromCenter = Math.sqrt(translateX.value ** 2 + translateY.value ** 2);
      isDragging.value = false;
      if (distFromCenter < 60) {
        runOnJS(handleDragSubmit)();
      }
    },
  });

  return (
    <Animated.View style={animatedStyle}>
      {showBurst && <StarShower color={colors[0]} />}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View>
          <TapGestureHandler 
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.ACTIVE) {
                onEnterTunnel(task);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}>
            <Animated.View style={styles.planetContainer}>
               <Svg height={100} width={100} style={styles.planetSvg}>
                  <Defs>
                    <RadialGradient id={`grad-${task.id}`} cx="30%" cy="30%" r="50%">
                      <Stop offset="0%" stopColor={isBioDip ? '#fbbf24' : colors[0]} stopOpacity="1" />
                      <Stop offset="100%" stopColor={isBioDip ? '#b45309' : colors[1]} stopOpacity="1" />
                    </RadialGradient>
                  </Defs>
                  
                  {/* Bio-Dip Warning Glow */}
                  {isBioDip && (
                    <Circle cx="50" cy="50" r={PLANET_STYLE[task.priority as keyof typeof PLANET_STYLE].r + 4} fill="rgba(251, 191, 36, 0.15)" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="0.5" />
                  )}

                  <G rotation={selfRotation.value} origin="50, 50">
                    <Circle cx="50" cy="50" r={PLANET_STYLE[task.priority as keyof typeof PLANET_STYLE].r} fill={`url(#grad-${task.id})`} />
                    {/* Planet texture/features */}
                    <Circle cx="42" cy="42" r="3" fill="rgba(255,255,255,0.1)" />
                    <Circle cx="58" cy="58" r="4" fill="rgba(0,0,0,0.1)" />
                  </G>
                  
                  {/* Subtle ring for low priority or bio-dip indicator */}
                  {(task.priority === 'low' || isBioDip) && (
                    <G rotation="15" origin="50, 50">
                        <Circle cx="50" cy="50" r={isBioDip ? 22 : 18} fill="none" stroke={isBioDip ? "rgba(251, 191, 36, 0.4)" : "rgba(255,255,255,0.2)"} strokeWidth={isBioDip ? 1.5 : 1} />
                    </G>
                  )}
               </Svg>
               <View style={[styles.textWrapper, isBioDip && { borderColor: '#fbbf24', borderWidth: 0.5 }]}>
                  <Text style={[styles.planetText, isBioDip && { color: '#fbbf24' }]} numberOfLines={1}>
                    {isBioDip ? '⚠️ ' : ''}{task.text}
                  </Text>
               </View>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};


export function TaskOrbit({ tasks, onCompleteTask, onEnterTunnel, chronotype, achievementStars = 0 }: TaskOrbitProps) {
  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulsing core animation
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    coreOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed);
  
  const urgent = pendingTasks.filter(t => t.priority === 'urgent');
  const normal = pendingTasks.filter(t => t.priority === 'normal');
  const low = pendingTasks.filter(t => t.priority === 'low');

  return (
    <View style={styles.container}>
      {/* Dynamic Background Dust */}
      <OrbitalDust radius={RADII.urgent} count={12} color={Colors.urgent} />
      <OrbitalDust radius={RADII.normal} count={16} color={Colors.primary} />
      <OrbitalDust radius={RADII.low} count={20} color={Colors.low} />

      <View style={styles.orbitCenter}>
         {/* Pulsing Core Aura */}
         <Animated.View style={[
           styles.coreAura,
           useAnimatedStyle(() => ({
             transform: [{ scale: coreScale.value * (1 + achievementStars * 0.05) }],
             opacity: coreOpacity.value,
           }))
         ]} />

         <View style={styles.nowCore}>
            <Text style={styles.nowText}>NOW</Text>
         </View>
         
         {/* Render Planets */}
         {urgent.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={urgent.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} chronotype={chronotype} />)}
         {normal.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={normal.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} chronotype={chronotype} />)}
         {low.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={low.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} chronotype={chronotype} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: width * 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 20,
  },
  svgBackground: {
    position: 'absolute',
  },
  orbitCenter: {
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  nowText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  coreAura: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(167, 139, 250, 0.4)',
    borderColor: 'rgba(167, 139, 250, 0.6)',
    borderWidth: 1,
  },
  planetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetSvg: {
    position: 'absolute',
  },
  textWrapper: {
    marginTop: 45, // Position text below the sphere
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  planetText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    maxWidth: 70,
  }
});

