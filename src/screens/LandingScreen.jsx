import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
const navLogo = require('../../assets/logo.png');
const questionMark = require('../../assets/question-mark.png');

const PulseBadge = React.memo(({ pulseAnim, icon }) => (
  <Animated.View
    style={[styles.mockSyncBadgeCircle, { transform: [{ scale: pulseAnim }] }]}
    renderToHardwareTextureAndroid
  >
    <Feather name={icon} size={10} color="#ffffff" />
  </Animated.View>
));

export default function LandingScreen({ onPressSignIn, onPressHelp }) {
  const insets = useSafeAreaInsets();

  const bodyFade  = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(55)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {

    Animated.parallel([
      Animated.timing(bodyFade, {
        toValue: 1,
        duration: 360,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(bodySlide, {
        toValue: 0,
        duration: 360,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.topNavbar}>
        <View style={styles.topNavbarLeft}>
          <Image source={navLogo} resizeMode="contain" style={styles.navbarLogo} />
          <Text style={styles.topNavbarTitle}>iClora</Text>
        </View>
        <Pressable
          onPress={onPressHelp}
          style={({ pressed }) => [styles.helpBtn, pressed && styles.helpBtnPressed]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={questionMark} resizeMode="contain" style={styles.helpIcon} />
        </Pressable>
      </View>

      <Animated.View
        style={[styles.bodyWrapper, { opacity: bodyFade, transform: [{ translateY: bodySlide }] }]}
        renderToHardwareTextureAndroid
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          removeClippedSubviews
        >
          <View style={styles.mainContainer}>

          <View style={styles.heroHeader}>
            <Image source={navLogo} resizeMode="contain" style={styles.cloudLogo} />
            <Text style={styles.title}>iClora AutoSync</Text>
            <Text style={styles.tagline}>
              Back up your gallery photos to your Private Cloud in the background (may not work on latest android versions).
            </Text>
          </View>

          <View style={styles.visualCenterpiece}>
            <View style={styles.glowCircle} />
            <View style={styles.mockCard}>
              <View style={styles.mockHeader}>
                <View style={styles.mockStatusDot} />
                <Text style={styles.mockHeaderTitle}>AutoSync Tunnel</Text>
                <Text style={styles.mockHeaderStatus}>ACTIVE</Text>
              </View>

              <View style={styles.mockGrid}>
                <View style={[styles.mockThumb, { backgroundColor: '#e0f2fe' }]}>
                  <View style={styles.mockThumbGraphicLandscape} />
                  <PulseBadge pulseAnim={pulseAnim} icon="arrow-up" />
                </View>
                <View style={[styles.mockThumb, { backgroundColor: '#fae8ff' }]}>
                  <View style={styles.mockThumbGraphicPortrait} />
                  <View style={[styles.mockSyncBadgeCircle, styles.mockSyncBadgeCompleted]}>
                    <Feather name="check" size={9} color="#ffffff" />
                  </View>
                </View>
                <View style={[styles.mockThumb, { backgroundColor: '#fef3c7' }]}>
                  <View style={styles.mockThumbGraphicSun} />
                  <PulseBadge pulseAnim={pulseAnim} icon="arrow-up" />
                </View>
              </View>

              <View style={styles.mockFooter}>
                <View style={styles.mockProgressBarContainer}>
                  <View style={styles.mockProgressBarFill} />
                </View>
                <View style={styles.mockStatusTextRow}>
                  <Text style={styles.mockStatusDetails}>Syncing 12 new items...</Text>
                  <Text style={styles.mockStatusPercentage}>78%</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [styles.signInButton, pressed && styles.buttonPressed]}
              onPress={onPressSignIn}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
            >
              <View style={styles.signInButtonContent}>
                <Text style={styles.signInText}>Sign In to iClora</Text>
                <Feather name="arrow-right" size={16} color="#ffffff" style={styles.signInIcon} />
              </View>
            </Pressable>

            <View style={styles.trustRow}>
              <Feather name="lock" size={12} color="#64748b" style={styles.trustIcon} />
              <Text style={styles.trustText}>Private Cloud Backup</Text>
              <View style={styles.bulletSeparator} />
              <Text style={styles.trustText}>Private Vaults</Text>
            </View>
          </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const IS_ANDROID = Platform.OS === 'android';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  topNavbar: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  topNavbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topNavbarTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  navbarLogo: { width: 26, height: 26 },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  helpBtnPressed: { opacity: 0.7, transform: [{ scale: 0.93 }] },
  helpIcon: { width: 20, height: 20 },
  bodyWrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 32 },
  mainContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  heroHeader: { alignItems: 'center', width: '100%' },
  cloudLogo: { width: 80, height: 60, marginBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#0f172a',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 10,
    maxWidth: 290,
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  visualCenterpiece: {
    height: 250,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#eff6ff',
    opacity: 0.9,
  },

  mockCard: {
    width: '92%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
    }),
  },
  mockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  mockStatusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#10b981', marginRight: 6,
  },
  mockHeaderTitle: { fontSize: 12, fontWeight: '700', color: '#475569', flex: 1 },
  mockHeaderStatus: { fontSize: 10, fontWeight: '800', color: '#10b981', letterSpacing: 0.5 },
  mockGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  mockThumb: {
    flex: 1, height: 68, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9',
  },
  mockThumbGraphicLandscape: {
    width: 32, height: 18, backgroundColor: '#38bdf8', opacity: 0.25,
    position: 'absolute', bottom: 0, right: 0, borderTopLeftRadius: 10,
  },
  mockThumbGraphicPortrait: {
    width: 14, height: 38, backgroundColor: '#e879f9', opacity: 0.25,
    position: 'absolute', bottom: 0, left: 8,
    borderTopRightRadius: 6, borderTopLeftRadius: 6,
  },
  mockThumbGraphicSun: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#fbbf24', opacity: 0.3,
    position: 'absolute', top: 8, right: 8,
  },
  mockSyncBadgeCircle: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#007aff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#ffffff',
  },
  mockSyncBadgeCompleted: { backgroundColor: '#10b981' },
  mockFooter: { width: '100%' },
  mockProgressBarContainer: {
    width: '100%', height: 6, backgroundColor: '#f1f5f9',
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  mockProgressBarFill: {
    width: '78%', height: '100%', backgroundColor: '#007aff', borderRadius: 3,
  },
  mockStatusTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mockStatusDetails: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  mockStatusPercentage: { fontSize: 11, fontWeight: '700', color: '#007aff' },
  actionContainer: { width: '100%', alignItems: 'center', marginTop: 12 },
  signInButton: {
    width: '100%', maxWidth: 320, height: 52,
    borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0f71f2',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f71f2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    }),
    elevation: IS_ANDROID ? 0 : undefined,
  },
  signInButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  signInText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  signInIcon: { marginLeft: 6 },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  trustRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 16, width: '100%',
  },
  trustIcon: { marginRight: 4 },
  trustText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  bulletSeparator: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#cbd5e1', marginHorizontal: 8,
  },
});
