import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 12;
const DURATION = 1000;

export default function Spinner({ size = 36, color = '#000000' }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: BAR_COUNT,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const getOpacity = (i) => {
    const inputRange = Array.from({ length: BAR_COUNT + 1 }, (_, j) => j);
    const outputRange = inputRange.map((j) => {
      const distance = ((j - i) % BAR_COUNT + BAR_COUNT) % BAR_COUNT;
      if (distance === 0) return 1;
      return Math.max(0.15, 1 - (distance / BAR_COUNT) * 0.85);
    });
    return anim.interpolate({ inputRange, outputRange });
  };

  const barW = Math.max(2, size * 0.08);
  const barH = Math.max(4, size * 0.24);
  const radius = size * 0.33;

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <Animated.View
          key={i}
          renderToHardwareTextureAndroid
          style={{
            position: 'absolute',
            width: barW,
            height: barH,
            borderRadius: barW / 2,
            backgroundColor: color,

            top: size / 2 - barH / 2,
            left: size / 2 - barW / 2,
            opacity: getOpacity(i),
            transform: [
              { rotate: `${i * 30}deg` },
              { translateY: -radius },
            ],
          }}
        />
      ))}
    </View>
  );
}
