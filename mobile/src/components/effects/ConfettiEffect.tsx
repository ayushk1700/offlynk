import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

export default function ConfettiEffect() {
  const particles = Array.from({ length: 15 });
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

function ConfettiPiece({ index }: { index: number }) {
  const y = useSharedValue(-50);
  const x = useSharedValue(Math.random() * 300);
  const rotate = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(index * 100, withTiming(800, { duration: 2500 }));
    rotate.value = withRepeat(withTiming(360, { duration: 1000 }), -1);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rotate.value}deg` }
    ],
    position: 'absolute',
    width: 6,
    height: 10,
    backgroundColor: ['#38BDF8', '#10B981', '#F59E0B', '#EF4444'][index % 4],
  }));

  return <Animated.View style={animatedStyle} />;
}
