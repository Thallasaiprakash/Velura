import React, { useEffect } from 'react';
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
} from 'react-native-reanimated';
import { TapGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Task } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const ORBIT_CENTER = width / 2;

const RADII = {
  urgent: 80,
  normal: 130,
  low: 180,
};

const SPEEDS = {
  urgent: 15000,
  normal: 25000,
  low: 35000,
};

interface TaskOrbitProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onEnterTunnel: (task: Task) => void;
}

const OrbitPlanet = ({ task, index, total, onComplete, onEnterTunnel }: any) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  useEffect(() => {
    scale.value = withSpring(1);
    const speed = SPEEDS[task.priority as keyof typeof SPEEDS] || SPEEDS.normal;
    // Offset each planet so they don't stack
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
  }, [total, index]);

  const radius = RADII[task.priority as keyof typeof RADII] || RADII.normal;
  const dotColor = task.priority === 'urgent' ? Colors.danger : task.priority === 'normal' ? Colors.primary : Colors.textMuted;

  const animatedStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: 1.1 } // Grow slightly while dragging
        ],
        position: 'absolute',
        zIndex: 100, // bring to front
      };
    }

    const rad = (rotation.value * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    
    // Smoothly spring back to orbit if released
    translateX.value = withSpring(x, { damping: 12, stiffness: 90 });
    translateY.value = withSpring(y, { damping: 12, stiffness: 90 });

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      position: 'absolute',
      zIndex: 1,
    };
  });

  const handleDragSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(task.id);
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
      if (distFromCenter < 50) {
        // Dragged to 'NOW' core
        runOnJS(handleDragSubmit)();
      }
    },
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
            <Animated.View style={[styles.planetNode, { borderColor: dotColor }]}>
               <Text style={styles.planetText} numberOfLines={1}>{task.text}</Text>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};


export function TaskOrbit({ tasks, onCompleteTask, onEnterTunnel }: TaskOrbitProps) {
  const pendingTasks = tasks.filter(t => !t.completed);
  
  const urgent = pendingTasks.filter(t => t.priority === 'urgent');
  const normal = pendingTasks.filter(t => t.priority === 'normal');
  const low = pendingTasks.filter(t => t.priority === 'low');

  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%" style={styles.svgBackground}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <Stop offset="50%" stopColor="#fff" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Draw Orbit Rings */}
        <Circle cx="50%" cy="50%" r={RADII.urgent} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
        <Circle cx="50%" cy="50%" r={RADII.normal} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
        <Circle cx="50%" cy="50%" r={RADII.low} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
        
        {/* Central Black Hole (NOW) */}
        <Circle cx="50%" cy="50%" r={40} fill="url(#glow)" />
      </Svg>

      <View style={styles.orbitCenter}>
         <View style={styles.nowCore}>
            <Text style={styles.nowText}>NOW</Text>
         </View>
         
         {/* Render Planets */}
         {urgent.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={urgent.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} />)}
         {normal.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={normal.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} />)}
         {low.map((t, i) => <OrbitPlanet key={t.id} task={t} index={i} total={low.length} onComplete={() => onCompleteTask(t.id)} onEnterTunnel={() => onEnterTunnel(t)} />)}
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  nowText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  planetNode: {
    width: 80,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,25,0.9)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  planetText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  }
});
