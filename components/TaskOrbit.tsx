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
  useDerivedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import { TapGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, RadialGradient, Stop, G, Ellipse, LinearGradient } from 'react-native-svg';
import { Task, Chronotype } from '../services/taskService';
import { Colors } from '../constants/colors';
import { isTimeInBioDip } from '../services/auraService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

const PLANET_COLORS = {
  urgent: ['#fde047', '#f59e0b'], // The North Star (Golden/Sun)
  normal: ['#00d2ff', '#3a7bd5'], // Earth/Neptune
  low: ['#f8fafc', '#64748b'],    // Moon/Asteroid
};

const PLANET_STYLE = {
  urgent: { r: 16, texture: '🌋' },
  normal: { r: 18, texture: '🌊' },
  low: { r: 12, texture: '🌑' },
};

const ORBIT_CENTER = 0; // Relative to the orbitCenter View

interface TaskOrbitProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onEnterTunnel: (task: Task) => void;
  chronotype?: Chronotype;
  achievementStars?: Animated.SharedValue<number>;
}

const OrbitPlanet = ({ task, index, total, onComplete, onEnterTunnel, chronotype }: any) => {
  if (!task) return null;

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
    const speed = isBioDip ? baseSpeed * 1.8 : baseSpeed;
    
    const initialRot = (360 / Math.max(1, total)) * index;
    rotation.value = initialRot;
    
    rotation.value = withRepeat(
      withTiming(initialRot + 360, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    selfRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [total, index, isBioDip]);

  useEffect(() => {
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

  const derivedX = useDerivedValue(() => {
    const rotVal = rotation.value || 0;
    const rad = (rotVal * Math.PI) / 180;
    return Math.cos(rad) * radius;
  });

  const derivedY = useDerivedValue(() => {
    const rotVal = rotation.value || 0;
    const rad = (rotVal * Math.PI) / 180;
    return Math.sin(rad) * radius;
  });

  const springX = useDerivedValue(() => withSpring(derivedX.value, { damping: 15, stiffness: 100 }));
  const springY = useDerivedValue(() => withSpring(derivedY.value, { damping: 15, stiffness: 100 }));

  const animatedStyle = useAnimatedStyle(() => {
    const s = scale.value || 0;
    const ps = priorityScale.value || 1;
    const tx = translateX.value || 0;
    const ty = translateY.value || 0;
    const sx = springX.value || 0;
    const sy = springY.value || 0;

    if (isCompleting.value) {
       return {
         transform: [
           { translateX: tx },
           { translateY: ty },
           { scale: interpolate(s, [1, 0], [1, 2], Extrapolate.CLAMP) }
         ],
         opacity: s,
       };
    }

    if (isDragging.value) {
      return {
        transform: [
          { translateX: tx },
          { translateY: ty },
          { scale: 1.2 }
        ],
        position: 'absolute',
        zIndex: 100,
      };
    }

    // Keep values in sync for drag start
    translateX.value = sx;
    translateY.value = sy;

    return {
      transform: [
        { translateX: sx },
        { translateY: sy },
        { scale: s * ps }
      ],
      position: 'absolute',
      zIndex: 1,
    };
  });

  const handleDragSubmit = () => {
    isCompleting.value = true;
    scale.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)(task.id);
      }
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value || 0;
      ctx.startY = translateY.value || 0;
      isDragging.value = true;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      const tx = translateX.value || 0;
      const ty = translateY.value || 0;
      const distFromCenter = Math.sqrt(tx ** 2 + ty ** 2);
      isDragging.value = false;
      if (distFromCenter < 60) {
        runOnJS(handleDragSubmit)();
      }
    },
  });

  const pStyle = PLANET_STYLE[task.priority as keyof typeof PLANET_STYLE] || PLANET_STYLE.normal;

  const planetAnimatedProps = useAnimatedProps(() => {
    const rotVal = selfRotation.value || 0;
    const rot = isNaN(rotVal) ? "0" : rotVal.toFixed(1);
    return {
      transform: `rotate(${rot} 50 50)`
    };
  });

  return (
    <Animated.View style={animatedStyle}>
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
                    <RadialGradient id={`glow-${task.id}`} cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor={colors[0]} stopOpacity="0.4" />
                      <Stop offset="100%" stopColor={colors[0]} stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  
                  {/* Atmospheric Glow */}
                  <Circle cx="50" cy="50" r={pStyle.r + 6} fill={`url(#glow-${task.id})`} />

                  <AnimatedG animatedProps={planetAnimatedProps}>
                    <Circle cx="50" cy="50" r={pStyle.r} fill={`url(#grad-${task.id})`} />
                    {/* Planet texture/features */}
                    <Circle cx="42" cy="42" r="3" fill="rgba(255,255,255,0.15)" />
                    <Circle cx="58" cy="58" r="4" fill="rgba(0,0,0,0.1)" />
                  </AnimatedG>
                  
                  {/* Cinematic Rings */}
                  {(task.priority === 'normal' || isBioDip) && (
                    <G transform="rotate(20 50 50)">
                        <Ellipse cx="50" cy="50" rx={pStyle.r + 8} ry={pStyle.r / 3} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
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

export function TaskOrbit({ tasks = [], onCompleteTask, onEnterTunnel, chronotype, achievementStars }: TaskOrbitProps) {
  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.6);

  useEffect(() => {
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

  const pendingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => t && !t.completed);
  }, [tasks]);
  
  const urgent = pendingTasks.filter(t => t.priority === 'urgent');
  const normal = pendingTasks.filter(t => t.priority === 'normal');
  const low = pendingTasks.filter(t => t.priority === 'low');

  const auraStyle = useAnimatedStyle(() => {
    const cs = coreScale.value || 1;
    const co = coreOpacity.value || 0.6;
    const achievementBoost = 1 + (achievementStars?.value || 0) * 0.05;
    return {
      transform: [{ scale: cs * achievementBoost }],
      opacity: co,
    };
  });

  return (
    <View style={styles.container}>
      {/* Background Orbit Lines */}
      <Svg style={StyleSheet.absoluteFill}>
        <Circle cx={width / 2} cy={(width * 1.2) / 2} r={RADII.urgent} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
        <Circle cx={width / 2} cy={(width * 1.2) / 2} r={RADII.normal} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
        <Circle cx={width / 2} cy={(width * 1.2) / 2} r={RADII.low} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="6 12" />
      </Svg>

      <View style={styles.orbitCenter}>
         <Animated.View style={[styles.coreAura, auraStyle]} />

         <View style={styles.nowCore}>
            <Text style={styles.nowText}>NOW</Text>
         </View>
         
         {urgent.map((t, i) => (
           <OrbitPlanet key={t.id} task={t} index={i} total={urgent.length} onComplete={onCompleteTask} onEnterTunnel={onEnterTunnel} chronotype={chronotype} />
         ))}
         {normal.map((t, i) => (
           <OrbitPlanet key={t.id} task={t} index={i} total={normal.length} onComplete={onCompleteTask} onEnterTunnel={onEnterTunnel} chronotype={chronotype} />
         ))}
         {low.map((t, i) => (
           <OrbitPlanet key={t.id} task={t} index={i} total={low.length} onComplete={onCompleteTask} onEnterTunnel={onEnterTunnel} chronotype={chronotype} />
         ))}
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
  orbitCenter: {
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  nowText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  coreAura: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    borderColor: 'rgba(167, 139, 250, 0.5)',
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
    marginTop: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planetText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    maxWidth: 90,
    textAlign: 'center',
  }
});
