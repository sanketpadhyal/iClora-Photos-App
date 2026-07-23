import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
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
import * as MediaLibrary from 'expo-media-library';
import { savePermissionsAccepted } from '../auth/sessionStore';
import Spinner from '../components/Spinner';

const IS_ANDROID = Platform.OS === 'android';

const { width } = Dimensions.get('window');
const navLogo = require('../../assets/logo.png');
const questionMark = require('../../assets/question-mark.png');

const PERMISSIONS = [
  {
    id: 'photos',
    title: 'Photo Library',
    body: 'Discover and back up your pictures automatically to your private cloud.',
    icon: 'image',
    accent: '#0f71f2',
    bg: '#eff6ff',
  },
  {
    id: 'sync',
    title: 'Background Sync (may not work on latest android versions)',
    body: 'Your gallery stays backed up even when the app is closed (may not work on latest android versions).',
    icon: 'refresh-cw',
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    id: 'session',
    title: 'Secure Session',
    body: 'Keeps your identity verified and your cloud link intact at all times.',
    icon: 'lock',
    accent: '#059669',
    bg: '#ecfdf5',
  },
  {
    id: 'notifications',
    title: 'Instant Notifications',
    body: 'Receive real-time alerts when backup completes or if storage limits are reached.',
    icon: 'bell',
    accent: '#ea580c',
    bg: '#fff7ed',
  },
];

export default function PermissionsScreen({ onAccepted, fromBackup = false, onPressHelp }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bodyFade  = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(55)).current;
  const btnScale  = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    let active = true;

    async function checkPreflight() {
      let alreadyGranted = false;
      if (Platform.OS !== 'web') {
        try {
          const current = await MediaLibrary.getPermissionsAsync().catch(() => null);
          if (current?.granted) {
            await savePermissionsAccepted().catch(() => null);
            if (active) {
              if (fromBackup) {
                setAccepted(true);
                alreadyGranted = true;
              } else {
                onAccepted?.();
                return;
              }
            }
          }
        } catch (_) {}
      }

      if (active) {
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
          Animated.spring(btnScale, {
            toValue: 1,
            tension: 90,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }

    checkPreflight();

    return () => {
      active = false;
    };
  }, []);

  const handleAccept = async () => {
    if (accepted) {
      onAccepted?.();
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');

      if (Platform.OS !== 'web') {

        const current = await MediaLibrary.getPermissionsAsync().catch(() => ({ granted: false }));
        if (!current.granted) {
          const permissionReq = MediaLibrary.requestPermissionsAsync(false);
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 7000)
          );
          const result = await Promise.race([permissionReq, timeout]);
          if (!result?.granted) {
            setErrorMsg('Enable gallery access in Settings to continue.');
            return;
          }
        }

        let systemGranted = false;
        try {
          const Notif = require('expo-notifications');
          const { status } = await Notif.requestPermissionsAsync();
          systemGranted = status === 'granted';
        } catch (_) {
          const requestNotification = () => {
            return new Promise((resolve) => {
              Alert.alert(
                '"iClora" Would Like to Send You Notifications',
                'Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.',
                [
                  {
                    text: "Don't Allow",
                    style: 'cancel',
                    onPress: () => resolve(false),
                  },
                  {
                    text: 'Allow',
                    style: 'default',
                    onPress: () => resolve(true),
                  },
                ],
                { cancelable: false }
              );
            });
          };
          systemGranted = await requestNotification();
        }

        if (!systemGranted) {
          setErrorMsg('Notification permission is compulsory to ensure active sync monitoring.');
          return;
        }
      } else {

        const allowed = window.confirm(
          '"iClora" Would Like to Send You Notifications\n\nNotifications may include alerts, sounds, and icon badges. This permission is compulsory to continue.'
        );
        if (!allowed) {
          setErrorMsg('Notification permission is compulsory to ensure active sync monitoring.');
          return;
        }
      }

      await savePermissionsAccepted();
      setAccepted(true);
    } catch (err) {
      const msg = String(err?.message || '');
      setErrorMsg(
        msg.includes('timeout')
          ? 'Timed out. Please allow photo access in device Settings.'
          : 'Could not request permissions. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.topNav}>
        <View style={styles.topNavBrandWrap}>
          <Image source={navLogo} resizeMode="contain" style={styles.topNavLogo} />
          <Text style={styles.topNavBrand}>iClora</Text>
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

        <View style={styles.hero}>
          <Image
            source={navLogo}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Almost there!</Text>
          <Text style={styles.heroSub}>
            iClora needs a few permissions to keep your photos safe and always backed up.
          </Text>
        </View>

        <View style={styles.cardsWrap}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {PERMISSIONS.map((item, index) => (
              <View key={item.id} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon} size={22} color={item.accent} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody}>{item.body}</Text>
                </View>
              </View>
            ))}

            <View style={styles.noteRow}>
              <Feather name="lock" size={13} color="#94a3b8" style={{ marginTop: 1 }} />
              <Text style={styles.noteText}>
                Private Cloud storage · Zero-knowledge access · Never shared
              </Text>
            </View>
          </ScrollView>
        </View>

        <Animated.View
          style={[styles.footer, { transform: [{ scale: btnScale }] }]}
          renderToHardwareTextureAndroid
        >
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Image source={require('../../assets/alert-sign.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              accepted && styles.ctaSuccess,
              pressed && styles.ctaPressed,
              loading && styles.ctaDisabled,
            ]}
          >
            {loading ? (
              <Spinner size={26} color="#ffffff" />
            ) : (
              <View style={styles.ctaInner}>
                <Text style={styles.ctaText}>
                  {accepted ? (fromBackup ? 'Choose Photos to Backup' : 'Go to Dashboard') : 'Allow & Continue'}
                </Text>
                <View style={styles.ctaArrow}>
                  <Feather
                    name={accepted ? (fromBackup ? 'image' : 'arrow-right') : 'chevron-right'}
                    size={18}
                    color="#fff"
                  />
                </View>
              </View>
            )}
          </Pressable>

          <Text style={styles.footerMeta}>
            You can change permissions anytime in Settings
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({

  topNav: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  topNavBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavBrand: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  topNavLogo: {
    width: 26,
    height: 26,
  },
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
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  skipBtnPressed: { opacity: 0.65 },
  skipBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  modalBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    marginBottom: 28,
  },
  modalBtnSkip: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalBtnSkipText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnCancel: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0f71f2',
    alignItems: 'center',
    justifyContent: 'center',
    ...(!IS_ANDROID && {
      shadowColor: '#0f71f2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    }),
  },
  modalBtnCancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnPressed: { opacity: 0.8 },

  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bodyWrapper: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
  },
  heroLogo: {
    width: 72,
    height: 72,
    marginBottom: 18,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  heroSub: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },

  cardsWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardBody: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  noteText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0f71f2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f71f2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaSuccess: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  ctaPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMeta: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
