import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { loginWithGoogleIdToken, loginWithGooglePopup } from '../auth/firebase';
import { saveAuthSession, clearAuthSession } from '../auth/sessionStore';
import Spinner from '../components/Spinner';

const navLogo = require('../../assets/logo.png');
const questionMark = require('../../assets/question-mark.png');
const googleIcon = require('../../assets/Google_Favicon_2025.svg.webp');
const DEFAULT_BACKEND_BASE_URL = '';

function resolveBackendBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) return process.env.EXPO_PUBLIC_API_BASE_URL;
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
  if (host) return `http://${host}:8080`;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8080`;
  }
  return DEFAULT_BACKEND_BASE_URL;
}

function getNativeGoogleIdToken(signInResult, tokenResult) {
  return (
    signInResult?.data?.idToken ||
    signInResult?.idToken ||
    signInResult?.user?.idToken ||
    tokenResult?.idToken ||
    ''
  );
}

async function loginWithNativeGoogle(webClientId) {
  const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
  try {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
      profileImageSize: 160,
    });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();
    let idToken = getNativeGoogleIdToken(signInResult);
    if (!idToken) {
      const tokenResult = await GoogleSignin.getTokens();
      idToken = getNativeGoogleIdToken(signInResult, tokenResult);
    }
    if (!idToken) throw new Error('Google token missing');
    return loginWithGoogleIdToken(idToken);
  } catch (error) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) return null;
    if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is not available on this device');
    }
    throw error;
  }
}

const IS_ANDROID = Platform.OS === 'android';

export default function LoginScreen({ onLoggedIn, onPressHelp }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const disabled = useMemo(() => loading, [loading]);

  const entryFade = useRef(new Animated.Value(0)).current;
  const entrySlide = useRef(new Animated.Value(55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryFade, {
        toValue: 1,
        duration: 380,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(entrySlide, {
        toValue: 0,
        duration: 380,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage('');
      setLoading(true);
      let firebaseToken = '';
      if (Platform.OS === 'web') {
        const popupResult = await loginWithGooglePopup();
        firebaseToken = popupResult.firebaseToken;
      } else {
        if (!webClientId) throw new Error('Missing Google login config: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
        const nativeResult = await loginWithNativeGoogle(webClientId);
        if (!nativeResult) { setLoading(false); return; }
        firebaseToken = nativeResult.firebaseToken;
      }
      const session = await exchangeSession(firebaseToken);
      if (session?.isNewUser) throw new Error('this acc doesnt exist');

      await clearAuthSession();
      await saveAuthSession(session);
      onLoggedIn?.(session);
    } catch (error) {
      const message = String(error?.message || '').toLowerCase().includes('doesnt exist')
        ? 'this acc doesnt exist'
        : String(error?.message || '').toLowerCase().includes('client id missing')
          ? error.message
          : String(error?.message || 'Sign in failed');
      setErrorMessage(message);
      Alert.alert('Login failed', message);
      setLoading(false);
    }
  };

  async function exchangeSession(idToken) {
    const response = await fetch(`${resolveBackendBaseUrl()}/auth/session`, {
      method: 'POST',
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(Platform.OS !== 'web' ? {
          'x-iclora-client': 'application',
          'x-iclora-platform': Platform.OS,
        } : {}),
      },
      body: JSON.stringify({
        idToken,
        loginOnly: true,
        ...(Platform.OS !== 'web' ? { clientType: 'application', platform: Platform.OS } : {}),
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error || 'Sign in failed');
    return json;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.navbar}>
        <View style={styles.navbarLeft}>
          <Image source={navLogo} resizeMode="contain" style={styles.navbarLogo} />
          <Text style={styles.navbarTitle}>iClora</Text>
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
        style={[
          styles.content,
          { opacity: entryFade, transform: [{ translateY: entrySlide }] }
        ]}
        renderToHardwareTextureAndroid
      >
        <Image source={navLogo} resizeMode="contain" style={styles.logo} />
        <Text style={styles.title}>Sign in to iClora</Text>
        <Text style={styles.subtitle}>
          Welcome back. Sign in to connect your device to your Private Cloud.
        </Text>

        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#0f71f2" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Authentication notice: Registration for new users is disabled on device apps.
          </Text>
        </View>

        <Pressable
          onPress={handleGoogleLogin}
          disabled={disabled}
          android_ripple={{ color: 'rgba(15,113,242,0.08)', borderless: false }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <Spinner size={26} color="#0f71f2" />
          ) : (
            <View style={styles.buttonContent}>
              <Image source={googleIcon} style={styles.googleIcon} resizeMode="contain" />
              <Text style={styles.buttonText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Image source={require('../../assets/alert-sign.png')} style={styles.errorIcon} resizeMode="contain" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  navbar: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  navbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navbarTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
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
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, backgroundColor: '#ffffff',
  },
  logo: { width: 96, height: 72, marginBottom: 20 },
  title: {
    color: '#0f172a', fontSize: 32, fontWeight: '800',
    textAlign: 'center', letterSpacing: -0.8,
  },
  subtitle: {
    color: '#64748b', fontSize: 15, lineHeight: 22,
    marginTop: 8, marginBottom: 20,
    textAlign: 'center', maxWidth: 290, fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, backgroundColor: '#f0f7ff',
    borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 14, marginBottom: 26, maxWidth: 320,
  },
  infoIcon: { marginRight: 10 },
  infoText: { flex: 1, color: '#1e40af', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  button: {
    minWidth: 260, height: 52, borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 22,

    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
    }),
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  buttonText: { color: '#334155', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.6 },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 18, paddingHorizontal: 16,
  },
  errorIcon: { width: 16, height: 16, marginRight: 6 },
  errorText: { color: '#ef4444', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});
