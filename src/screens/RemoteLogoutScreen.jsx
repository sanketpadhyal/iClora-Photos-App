import React, { useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

const cloudLogo  = require('../../assets/logo.png');
const logoutIcon = require('../../assets/52397893658133.5e98ba7f6ff6f.gif');
const IS_ANDROID = Platform.OS === 'android';

const REASONS = [
  {
    id: 'remote',
    icon: 'monitor',
    color: '#0f71f2',
    bg: '#eff6ff',
    title: 'Signed out remotely',
    desc: 'Your session was terminated from the iClora web dashboard or another signed-in device.',
  },
  {
    id: 'security',
    icon: 'shield',
    color: '#7c3aed',
    bg: '#faf5ff',
    title: 'Security protocol',
    desc: 'iClora automatically ends device sessions when a remote sign-out is triggered to protect your Private Cloud data.',
  },
  {
    id: 'data',
    icon: 'cloud',
    color: '#059669',
    bg: '#ecfdf5',
    title: 'Your data is safe',
    desc: 'All your backed-up photos remain securely stored. Nothing was deleted. Sign in again to resume syncing.',
  },
];

export default function RemoteLogoutScreen({ onRelogin }) {
  const insets = useSafeAreaInsets();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, easing: Easing.bezier(0.215, 0.61, 0.355, 1), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 360, easing: Easing.bezier(0.215, 0.61, 0.355, 1), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.navbar}>
        <View style={styles.navbarLeft}>
          <Image source={cloudLogo} resizeMode="contain" style={styles.navLogo} />
          <Text style={styles.navTitle}>iClora</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.scroll}
      >
        <Animated.View
          style={[styles.inner, { opacity: fade, transform: [{ translateY: slide }] }]}
          renderToHardwareTextureAndroid
        >

          <View style={styles.heroHeader}>
            <Image source={logoutIcon} style={styles.iconImg} resizeMode="contain" />
            <Text style={styles.title}>You've been{'\n'}signed out</Text>
            <Text style={styles.subtitle}>
              Your device session was ended remotely from the iClora web platform.
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>WHAT HAPPENED</Text>

          {REASONS.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: r.bg }]}>
                <Feather name={r.icon} size={18} color={r.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.nextBanner}>
            <View style={styles.nextBannerRow}>
              <Feather name="info" size={14} color="#0f71f2" />
              <Text style={styles.nextBannerTitle}>What to do next</Text>
            </View>
            <Text style={styles.nextBannerBody}>
              Tap <Text style={styles.nextBannerBold}>Sign in again</Text> to re-authenticate and restore your Private Cloud connection. Your sync settings will be preserved.
            </Text>
          </View>

          <Pressable
            onPress={onRelogin}
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>Sign in again</Text>
            <View style={styles.btnArrow}>
              <Feather name="arrow-right" size={14} color="#000000" />
            </View>
          </Pressable>

          <Text style={styles.footerNote}>
            Your backed-up photos are safe and untouched in your Private Cloud.
          </Text>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },

  navbar: {
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  navbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogo:  { width: 26, height: 26 },
  navTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48 },

  inner: { width: '100%' },

  heroHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconImg: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },

  title: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 44,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 290,
  },

  divider: { width: '100%', height: 1, backgroundColor: '#f1f5f9', marginVertical: 26 },

  sectionLabel: {
    alignSelf: 'flex-start',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody:  { flex: 1 },
  cardTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginBottom: 3, letterSpacing: -0.2 },
  cardDesc:  { color: '#64748b', fontSize: 13, lineHeight: 19, fontWeight: '500' },

  nextBanner: {
    width: '100%',
    marginTop: 4,
    marginBottom: 24,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  nextBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  nextBannerTitle: { color: '#1e40af', fontSize: 13, fontWeight: '800' },
  nextBannerBody:  { color: '#3b82f6', fontSize: 13, lineHeight: 20, fontWeight: '500' },
  nextBannerBold:  { fontWeight: '800', color: '#1e40af' },

  btn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...(IS_ANDROID ? {} : {
      shadowColor: '#000000',
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
    }),
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  btnArrow: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerNote: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    alignSelf: 'center',
  },
});
