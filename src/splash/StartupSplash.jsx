import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const splashLogo = require('../../assets/logo.png');

export default function StartupSplash({ isReady, onAnimationEnd }) {

  const bgOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([

      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(footerOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(footerTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [logoScale, logoOpacity, footerOpacity, footerTranslateY]);

  useEffect(() => {
    if (!isReady) return;

    Animated.parallel([

      Animated.timing(logoScale, {
        toValue: 1.28,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      Animated.timing(footerOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),

      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onAnimationEnd) {
        onAnimationEnd();
      }
    });
  }, [isReady, logoScale, logoOpacity, footerOpacity, bgOpacity, onAnimationEnd]);

  return (
    <Animated.View style={[styles.screen, { opacity: bgOpacity }]}>

      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.centerWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image source={splashLogo} resizeMode="contain" style={styles.logo} />
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: footerOpacity,
            transform: [{ translateY: footerTranslateY }],
          },
        ]}
      >
        <Text style={styles.fromText}>from</Text>
        <Text style={styles.brandText}>iClora Cloud</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  centerWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 124,
    height: 124,
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fromText: {
    color: '#1c1c1e',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  brandText: {
    color: '#0f71f2',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
