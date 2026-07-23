import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
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

let Clipboard;
try {
  Clipboard = require('expo-clipboard');
} catch (err) {
  console.warn('expo-clipboard is not linked in this build', err);
}

const navLogo = require('../../assets/logo.png');
const WEBSITE_URL = process.env.EXPO_PUBLIC_ICLORA_WEBSITE_URL || 'https://www.iclora.app';
const FRONTEND_REPO_URL = process.env.EXPO_PUBLIC_ICLORA_FRONTEND_REPO_URL || 'https://github.com/sanketpadhyal/iClora.git';
const APP_REPO_URL = process.env.EXPO_PUBLIC_ICLORA_APP_REPO_URL || 'https://github.com/sanketpadhyal/iClora-Photos-App.git';
const APP_DOWNLOAD_URL = process.env.EXPO_PUBLIC_ICLORA_APP_DOWNLOAD_URL || APP_REPO_URL;

export default function AboutScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const bodyFade = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(55)).current;
  const [copied, setCopied] = useState(false);

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
  }, []);

  const handleOpenURL = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn(`Don't know how to open URI: ${url}`);
      }
    } catch (err) {
      console.warn(`An error occurred opening URL: ${url}`, err);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(APP_DOWNLOAD_URL);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        Alert.alert(
          'Copy Download Link',
          'To copy this link, please long-press on the URL text block directly to select it, or rebuild the app with "npm run android" to activate this copy button.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.warn('Failed to copy text: ', err);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </Pressable>
        
        <View style={styles.headerTitleWrap}>
          <Image source={navLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>iClora App</Text>
        </View>
        
        <View style={styles.headerRightSpacer} />
      </View>

      <Animated.View
        style={[styles.bodyWrapper, { opacity: bodyFade, transform: [{ translateY: bodySlide }] }]}
        renderToHardwareTextureAndroid
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          indicatorStyle="default"
          bounces={true}
        >
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <View style={styles.glowCircle} />
            <Image source={navLogo} style={styles.heroLogo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>iClora App</Text>
          <Text style={styles.appSubtitle}>Private Cloud Companion</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>
            iClora App is the Android companion for the iClora web cloud platform at{' '}
            <Text style={styles.linkText} onPress={() => handleOpenURL(WEBSITE_URL)}>
              www.iclora.app
            </Text>
            . It is built for fast, secure photo backup from an Android phone to the user's own iClora Cloud.
          </Text>
          <Text style={styles.description}>
            The web platform is where users create and manage their iClora account, view backed-up photos, and access the full iClora Cloud experience. The Android app focuses on one job: selecting phone photos and backing them up smoothly to the same cloud account.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Official Platforms</Text>
        <View style={styles.webButtonsRow}>
          <Pressable
            onPress={() => handleOpenURL(WEBSITE_URL)}
            style={({ pressed }) => [styles.webButton, pressed && styles.btnPressed]}
          >
            <Feather name="globe" size={16} color="#ffffff" style={styles.btnIcon} />
            <Text style={styles.webButtonText}>iclora.app</Text>
          </Pressable>

          <Pressable
            onPress={() => handleOpenURL(FRONTEND_REPO_URL)}
            style={({ pressed }) => [styles.webButtonAlternative, pressed && styles.btnPressed]}
          >
            <Feather name="external-link" size={16} color="#0f71f2" style={styles.btnIcon} />
            <Text style={styles.webButtonAltText}>Web Source</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>What The App Does</Text>
        <View style={styles.card}>
          {[
            "Signs in with the user's existing iClora Google account.",
            "Lets users select photos from their Android phone.",
            "Backs up selected photos to iClora Photos.",
            "Uploads photos in a controlled, mobile-friendly flow.",
            "Shows live backup progress.",
            "Shows storage usage before backup.",
            "Keeps backed-up photos available on the iClora website.",
            "Uses secure signed links for protected photo upload and access."
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <View style={styles.bulletPoint} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Feather name="alert-circle" size={18} color="#b45309" style={styles.noteIcon} />
            <Text style={styles.noteTitle}>Important Note</Text>
          </View>
          <Text style={styles.noteText}>
            Users cannot create a new account inside the Android app. Account creation and full cloud access happen on the iClora website.
          </Text>
          <Text style={[styles.noteText, { marginTop: 8 }]}>
            After backup, photos can be viewed and managed in the user's own iClora Cloud through the web app.
          </Text>
          <Text style={[styles.noteText, { marginTop: 8 }]}>
            Backed-up photos are handled through secure signed links, helping keep private media access controlled instead of exposing direct public file paths.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Download & Build Details</Text>
        <View style={styles.card}>
          <Text style={styles.description}>
            Download the Android APK from the link below, then install it on an Android phone.
          </Text>
          
          <Text style={styles.pathLabel}>Live App Download URL:</Text>
          <View style={styles.pathBox}>
            <Text style={styles.pathText} selectable>
              {APP_DOWNLOAD_URL}
            </Text>
            <Pressable 
              onPress={copyToClipboard} 
              style={({ pressed }) => [
                styles.copyButton,
                pressed && { opacity: 0.7 }
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather 
                name={copied ? "check" : "copy"} 
                size={16} 
                color={copied ? "#10b981" : "#64748b"} 
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Repositories</Text>
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Feather name="git-branch" size={16} color="#0f71f2" style={{ marginRight: 8, marginTop: 2, alignSelf: 'flex-start' }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.repoLabel}>Web Cloud & Backend Platform</Text>
              <Pressable onPress={() => handleOpenURL(FRONTEND_REPO_URL)}>
                <Text style={styles.linkLabel}>github.com/sanketpadhyal/iClora</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.metaRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
            <Feather name="git-branch" size={16} color="#0f71f2" style={{ marginRight: 8, marginTop: 2, alignSelf: 'flex-start' }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.repoLabel}>Android Backup Client App</Text>
              <Pressable onPress={() => handleOpenURL(APP_REPO_URL)}>
                <Text style={styles.linkLabel}>github.com/sanketpadhyal/iClora-Photos-App</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Developed By</Text>
        <View style={styles.developerCard}>
          <Text style={styles.devName}>Sanket Padhyal</Text>
          
          <View style={styles.devLinks}>
            <Pressable
              onPress={() => handleOpenURL('https://www.sanketpadhyal.world')}
              style={({ pressed }) => [styles.devLinkBtn, pressed && styles.btnPressed]}
            >
              <Feather name="globe" size={13} color="#475569" style={styles.devIcon} />
              <Text style={styles.devLinkText}>Portfolio</Text>
            </Pressable>
            
            <Pressable
              onPress={() => handleOpenURL('https://github.com/sanketpadhyal')}
              style={({ pressed }) => [styles.devLinkBtn, pressed && styles.btnPressed]}
            >
              <Feather name="github" size={13} color="#475569" style={styles.devIcon} />
              <Text style={styles.devLinkText}>GitHub</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoFooterBlock}>
          <Text style={styles.infoFooterTitle}>Open Source Project</Text>
          <Text style={styles.infoFooterText}>
            iClora App is open sourced as the Android companion for the iClora ecosystem. Bring your own Firebase and backend configuration before building or publishing.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bodyWrapper: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRightSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(15, 113, 242, 0.08)',
  },
  heroLogo: {
    width: 72,
    height: 72,
  },
  appName: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    color: '#0f71f2',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 16,
  },
  description: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 12,
  },
  linkText: {
    color: '#0f71f2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    color: '#0f71f2',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 10,
    paddingLeft: 4,
  },
  webButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  webButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f71f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  webButtonAlternative: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0f71f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webButtonAltText: {
    color: '#0f71f2',
    fontSize: 14,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0f71f2',
    marginTop: 8,
    marginRight: 10,
  },
  featureText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 18,
    marginBottom: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIcon: {
    marginRight: 8,
  },
  noteTitle: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '800',
  },
  noteText: {
    color: '#78350f',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  pathLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
  },
  pathBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pathText: {
    color: '#475569',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  linkLabel: {
    color: '#0f71f2',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  developerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 16,
  },
  devName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  devLinks: {
    flexDirection: 'row',
    gap: 10,
  },
  devLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  devIcon: {
    marginRight: 6,
  },
  devLinkText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  infoFooterBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  infoFooterTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoFooterText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
