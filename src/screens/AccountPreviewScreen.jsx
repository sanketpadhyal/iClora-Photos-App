import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as MediaLibrary from 'expo-media-library';
import { logoutFirebaseUser } from '../auth/firebase';
import {
  clearAuthSession,
  readAuthSession,
  saveAccountConfirmed,
  readAccountConfirmed,
  saveCachedProfile,
  readCachedProfile,
  readOngoingUpload,
} from '../auth/sessionStore';
import Spinner from '../components/Spinner';

const navLogo = require('../../assets/logo.png');
const questionMark = require('../../assets/question-mark.png');

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

function initialsFromProfile(profile) {
  const source = profile?.name || profile?.email || 'iClora';
  return (
    source
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'IC'
  );
}

function formatStorage(value) {
  const mb = Number(value || 0);
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

function formatPlanName(plan) {
  if (!plan) return 'Free Trial';
  return plan
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const MOCK_GALLERY = [
  { id: 'mock-1', uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop' },
  { id: 'mock-2', uri: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop' },
  { id: 'mock-3', uri: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop' },
  { id: 'mock-4', uri: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop' },
  { id: 'mock-5', uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop' },
  { id: 'mock-6', uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop' },
];

function getUriFilename(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const cleanUri = uri.split('?')[0];
  const parts = cleanUri.split('/');
  const last = parts[parts.length - 1];
  return last || null;
}

export default function AccountPreviewScreen({ isActive = false, onLoggedOut, onSessionRevoked, onBackupTriggered, onPressHelp, onWatchCloudPhotos }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [modalRendered, setModalRendered] = useState(false);
  const [isScanningPhotos, setIsScanningPhotos] = useState(false);
  const [pausedUpload, setPausedUpload] = useState(null);

  const dialogProgress = useRef(new Animated.Value(0)).current;

  const pageFade = useRef(new Animated.Value(0)).current;
  const pageSlide = useRef(new Animated.Value(55)).current;

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 360,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(pageSlide, {
        toValue: 0,
        duration: 360,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start();

    readOngoingUpload().then((ongoing) => {
      if (
        ongoing &&
        Array.isArray(ongoing.uploadItems) &&
        ongoing.uploadItems.length > 0 &&
        ongoing.phase === 'uploading'
      ) {
        const hasIncomplete = ongoing.uploadItems.some(
          (item) => item.status !== 'done' && item.status !== 'failed'
        );
        if (hasIncomplete) {
          setPausedUpload(ongoing);
        } else {
          setPausedUpload(null);
        }
      } else {
        setPausedUpload(null);
      }
    }).catch(() => setPausedUpload(null));
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    let active = true;

    async function fetchProfile({ silent = false } = {}) {
      let hasCached = false;
      try {
        if (!silent) setErrorMessage('');

        const [cached, isConfirmed] = await Promise.all([
          readCachedProfile(),
          readAccountConfirmed(),
        ]);

        if (active) {
          setConfirmed(isConfirmed);
          if (cached) {
            setProfile(cached);
            setLoading(false);
            hasCached = true;
          } else if (!silent) {
            setLoading(true);
          }
        }

        const session = await readAuthSession();
        if (!session?.sessionToken) {

          await clearAuthSession();
          if (active) {
            setProfile(null);
            setConfirmed(false);
            onSessionRevoked?.();
          }
          return;
        }

        const response = await fetch(`${resolveBackendBaseUrl()}/auth/me`, {
          credentials: Platform.OS === 'web' ? 'include' : 'omit',
          headers: { Authorization: `Bearer ${session.sessionToken}` },
        });
        const json = await response.json().catch(() => ({}));

        if (response.status === 401) {

          await clearAuthSession();
          if (active) {
            setProfile(null);
            setConfirmed(false);
            onSessionRevoked?.();
          }
          return;
        }

        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Profile fetch failed');

        if (active) {
          setProfile(json);
          setErrorMessage('');
        }
        await saveCachedProfile(json);

      } catch (err) {

        if (active && !hasCached) {
          setErrorMessage('Could not load this account. Please login again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProfile();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') fetchProfile({ silent: true });
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [isActive]);

  const photoCount = Number(profile?.photosCount || 0);
  const storageLimit = Number(profile?.storage || 1024);
  const storageUsed = Number(profile?.storageused || 0);
  const storageAvailable = Math.max(0, storageLimit - storageUsed);
  const storagePercent = Math.max(
    0,
    Math.min(100, storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0)
  );

  const openLogoutModal = () => {
    setModalRendered(true);
    Animated.timing(dialogProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeLogoutModal = () => {
    Animated.timing(dialogProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setModalRendered(false);
    });
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const session = await readAuthSession();
      if (session?.sessionToken) {
        await fetch(`${resolveBackendBaseUrl()}/auth/logout`, {
          method: 'POST',
          credentials: Platform.OS === 'web' ? 'include' : 'omit',
          headers: { Authorization: `Bearer ${session.sessionToken}` },
        }).catch(() => {});
      }
      await logoutFirebaseUser();
      await clearAuthSession();
      Animated.timing(dialogProgress, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setModalRendered(false);
        setProfile(null);
        setConfirmed(false);
        setLoggingOut(false);
        onLoggedOut?.();
      });
    } catch {
      setLoggingOut(false);
    }
  };

  const backdropOpacity = dialogProgress;
  const sheetTranslateY = dialogProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const handleConfirm = () => {
    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(pageSlide, {
        toValue: 20,
        duration: 200,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start(async () => {

      scrollRef.current?.scrollTo({ y: 0, animated: false });

      setConfirmed(true);
      await saveAccountConfirmed();
      pageSlide.setValue(40);
      Animated.parallel([
        Animated.timing(pageFade, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.215, 0.61, 0.355, 1),
          useNativeDriver: true,
        }),
        Animated.timing(pageSlide, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.215, 0.61, 0.355, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBackupPhotos = () => {
    onBackupTriggered?.([]);
  };

  const handleWatchCloudPhotos = () => {
    onWatchCloudPhotos?.();
  };

  const renderConfirmAccount = () => {
    return (
      <>
        <Text style={styles.title}>Confirm account</Text>
        <Text style={styles.subtitle}>
          Make sure this is the right account before we connect your device.
        </Text>

        <View style={styles.profileCard}>
          {profile?.profilePhotoUrl ? (
            <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initialsFromProfile(profile)}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.name || 'iClora User'}
              </Text>
            </View>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile?.email || 'Signed in account'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statTop}>
              <Text style={styles.statValue}>{photoCount}</Text>
              <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                <Image
                  source={require('../../assets/photos.webp')}
                  style={styles.statPhotoIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.statLabel}>Photos backed up</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={styles.statTop}>
              <Text style={styles.statValue}>{formatStorage(profile?.storageused)}</Text>
              <View style={[styles.statIcon, { backgroundColor: '#ffffff' }]}>
                <Feather name="hard-drive" size={14} color="#0f71f2" />
              </View>
            </View>
            <Text style={styles.statLabel}>Storage used</Text>
          </View>
        </View>

        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planEyebrow}>Current plan</Text>
              <Text style={styles.planName}>{formatPlanName(profile?.plan)}</Text>
            </View>
            <View style={styles.planIcon}>
              <Image
                source={navLogo}
                style={styles.planLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.planStorageRow}>
            <View>
              <Text style={styles.planMetricValue}>{formatStorage(storageLimit)}</Text>
              <Text style={styles.planMetricLabel}>Total storage</Text>
            </View>
            <View style={styles.planMetricRight}>
              <Text style={styles.planMetricValue}>{formatStorage(storageAvailable)}</Text>
              <Text style={styles.planMetricLabel}>Available</Text>
            </View>
          </View>

          <View style={styles.storageTrack}>
            <View style={[styles.storageFill, { width: `${storagePercent}%` }]} />
          </View>
          <Text style={styles.storageCaption}>
            {formatStorage(storageUsed)} used of {formatStorage(storageLimit)}
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Feather name="cloud" size={18} color="#0f71f2" />
          </View>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>How photo backup works</Text>
            <Text style={styles.infoBannerBody}>
              You choose which photos to back up — iClora only syncs what you select to your Private Cloud. Storage depends on your plan.
            </Text>
          </View>
        </View>

        <View style={styles.privacyPanel}>
          <View style={styles.privacyPanelIcon}>
            <Feather name="eye-off" size={18} color="#7c3aed" />
          </View>
          <View style={styles.privacyPanelText}>
            <Text style={styles.privacyPanelTitle}>Your data is private</Text>
            <Text style={styles.privacyPanelBody}>
              iClora cannot view your photos or files. Your Private Cloud data is signed with your personal keys — only you have access.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && styles.ctaBtnPressed,
          ]}
        >
          <Text style={styles.ctaBtnText}>Yes, Connect this account</Text>
          <View style={styles.ctaArrow}>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </Pressable>

        <Text style={styles.helperText}>
          {photoCount} photos in your cloud partition.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Image source={require('../../assets/alert-sign.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </>
    );
  };

  const renderDashboard = () => {
    return (
      <View style={styles.dashContainer}>

        <View style={styles.dashHero}>
          <View style={styles.dashLogoOuter}>
            <Image
              source={require('../../assets/photos.webp')}
              style={styles.dashLogoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.dashTitle}>iClora <Text style={styles.dashTitlePink}>Photos</Text></Text>
          <Text style={styles.dashSubtitle}>
            Your entire library, backed up in full resolution
          </Text>
        </View>

        <View style={styles.dashProfileCard}>
          {profile?.profilePhotoUrl ? (
            <Image source={{ uri: profile.profilePhotoUrl }} style={styles.dashAvatar} />
          ) : (
            <View style={styles.dashAvatarFallback}>
              <Text style={styles.dashAvatarText}>{initialsFromProfile(profile)}</Text>
            </View>
          )}
          <View style={styles.dashProfileInfo}>
            <View style={styles.dashProfileRow}>
              <Text style={styles.dashProfileName} numberOfLines={1}>
                {profile?.name || 'iClora User'}
              </Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>CONNECTED</Text>
              </View>
            </View>
            <Text style={styles.dashProfileEmail} numberOfLines={1}>
              {profile?.email || 'Signed in account'}
            </Text>
          </View>
        </View>

        <View style={styles.dashStatsContainer}>
          <View style={styles.dashStatCard}>
            <View style={[styles.dashStatIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Feather name="image" size={18} color="#007aff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dashStatLabel}>Photo Gallery</Text>
              <Text style={styles.dashStatValue}>{photoCount} photos backed up</Text>
            </View>
          </View>

          <View style={styles.dashStatCard}>
            <View style={[styles.dashStatIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Feather name="hard-drive" size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={styles.dashStatLabel}>Cloud Storage</Text>
                <Text style={styles.dashStorageRatio}>
                  {formatStorage(storageUsed)} / {formatStorage(storageLimit)}
                </Text>
              </View>
              <View style={styles.dashStorageTrack}>
                <View style={[styles.dashStorageFill, { width: `${storagePercent}%` }]} />
              </View>
              <Text style={styles.dashStorageSub}>
                {storagePercent.toFixed(1)}% of your secure cloud space used
              </Text>
            </View>
          </View>

          <View style={styles.dashStatCard}>
            <View style={[styles.dashStatIconWrap, { backgroundColor: '#f5f3ff' }]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.dashStatLogoIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dashStatLabel}>Plan</Text>
              <Text style={styles.dashStatValue}>Free Trial</Text>
            </View>
          </View>

          <View style={styles.dashStatCard}>
            <View style={[styles.dashStatIconWrap, { backgroundColor: '#fff1f2' }]}>
              <Image
                source={require('../../assets/photos.webp')}
                style={styles.dashStatLogoIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.dashStatLabel}>Vision AI</Text>
                <View style={styles.dashFreeBadge}>
                  <Text style={styles.dashFreeBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.dashStatValue}>
                Caption your photos
              </Text>
            </View>
          </View>
        </View>

        {pausedUpload && (() => {
          const total = pausedUpload.uploadItems?.length || 0;
          const done = pausedUpload.uploadItems?.filter((i) => i.status === 'done').length || 0;
          const remaining = total - done;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <View style={styles.pausedBanner}>
              <View style={styles.pausedBannerLeft}>
                <View style={styles.pausedIconWrap}>
                  <Feather name="pause-circle" size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.pausedBannerTopRow}>
                    <Text style={styles.pausedBannerTitle}>Backup Paused</Text>
                    <View style={styles.pausedBadge}>
                      <Text style={styles.pausedBadgeText}>{pct}%</Text>
                    </View>
                  </View>
                  <Text style={styles.pausedBannerSub}>
                    {done} of {total} photos synced · {remaining} remaining
                  </Text>

                  <View style={styles.pausedProgressTrack}>
                    <View style={[styles.pausedProgressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              </View>
              <Pressable
                onPress={handleBackupPhotos}
                style={({ pressed }) => [
                  styles.pausedResumeBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Feather name="play" size={11} color="#ffffff" />
                <Text style={styles.pausedResumeBtnText}>Resume</Text>
              </Pressable>
            </View>
          );
        })()}

        <Pressable
          onPress={handleWatchCloudPhotos}
          style={({ pressed }) => [
            styles.goldCtaBtnWrapper,
            pressed && styles.goldCtaBtnPressed,
          ]}
        >
          <LinearGradient
            colors={['#fffdf5', '#fef3c7', '#fde68a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.goldCtaBtn}
          >
            <Image
              source={require('../../assets/photos.webp')}
              style={styles.goldCtaLogo}
              resizeMode="contain"
            />
            <Text style={styles.goldCtaBtnText}>Visit your cloud gallery</Text>
            <View style={styles.goldCtaArrow}>
              <Feather name="arrow-right" size={14} color="#78350f" />
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleBackupPhotos}
          style={({ pressed }) => [
            styles.gradientCtaBtnWrapper,
            pressed && styles.gradientCtaBtnPressed,
          ]}
        >
          <LinearGradient
            colors={['#0f71f2', '#1d9bf0', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCtaBtn}
          >
            <>
              <Text style={styles.gradientCtaBtnText}>Backup your photos</Text>
              <View style={styles.whiteCtaArrow}>
                <Feather name="arrow-right" size={14} color="#0f71f2" />
              </View>
            </>
          </LinearGradient>
        </Pressable>

        <Text style={styles.dashFooterNote}>
          Your backup is secured with iClora Cloud encryption.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          <Image
            source={navLogo}
            style={styles.navLogo}
            resizeMode="contain"
          />
          <Text style={styles.navTitle}>iClora</Text>
        </View>

        <View style={styles.navRight}>
          <Pressable
            onPress={onPressHelp}
            style={({ pressed }) => [styles.helpBtn, pressed && styles.helpBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={questionMark} resizeMode="contain" style={styles.helpIcon} />
          </Pressable>

          <Pressable
            onPress={openLogoutModal}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          >
            <Image
              source={require('../../assets/logout (1).png')}
              style={styles.logoutIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {loading ? (
          <View style={styles.loaderWrap}>
            <Spinner size={36} color="#000000" />
            <Text style={styles.loaderTitle}>Loading account</Text>
            <Text style={styles.loaderText}>Fetching your cloud profile…</Text>
          </View>
        ) : (
          <Animated.View
            style={{ opacity: pageFade, transform: [{ translateY: pageSlide }] }}
            renderToHardwareTextureAndroid
          >
            {confirmed ? renderDashboard() : renderConfirmAccount()}
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={modalRendered}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeLogoutModal}
      >
        <View style={styles.modalRoot}>

          <Pressable style={StyleSheet.absoluteFill} onPress={closeLogoutModal}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          </Pressable>

          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetIcon}>
              <Image
                source={require('../../assets/logout (1).png')}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.sheetTitle}>Log out?</Text>
            <Text style={styles.sheetBody}>
              You'll be signed out on this device. Your backed-up photos stay safe in the cloud.
            </Text>

            <View style={styles.sheetActions}>
              <Pressable
                disabled={loggingOut}
                onPress={closeLogoutModal}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={loggingOut}
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  pressed && styles.btnPressed,
                  loggingOut && styles.btnDisabled,
                ]}
              >
                {loggingOut ? (
                  <Spinner size={22} color="#ffffff" />
                ) : (
                  <>
                    <Feather name="log-out" size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmBtnText}>Log out</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },

  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogo: { width: 26, height: 26 },
  navTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logoutBtnPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  logoutIcon: { width: 22, height: 22 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  helpBtnPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  helpIcon: { width: 20, height: 20 },

  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },

  loaderWrap: {
    flex: 1,
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  loaderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',

  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e2e8f0' },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0f71f2', fontSize: 20, fontWeight: '900' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileName: { color: '#0f172a', fontSize: 17, fontWeight: '800', flex: 1 },
  readyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  readyPillText: { color: '#047857', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  profileEmail: { marginTop: 4, color: '#64748b', fontSize: 13, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  statBox: { flex: 1, padding: 16 },
  statDivider: { width: 1, backgroundColor: '#e2e8f0' },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statValue: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPhotoIcon: { width: 18, height: 18 },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },

  planCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planEyebrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  planName: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planLogo: {
    width: 28,
    height: 28,
  },
  planStorageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  planMetricRight: {
    alignItems: 'flex-end',
  },
  planMetricValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  planMetricLabel: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  storageTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  storageFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0f71f2',
  },
  storageCaption: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },

  privacyPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  privacyPanelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyPanelText: { flex: 1 },
  privacyPanelTitle: { color: '#5b21b6', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  privacyPanelBody: { color: '#7c3aed', fontSize: 13, lineHeight: 19, fontWeight: '500' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: { flex: 1 },
  infoBannerTitle: { color: '#1e40af', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  infoBannerBody: { color: '#3b82f6', fontSize: 13, lineHeight: 19, fontWeight: '500' },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: '#0f71f2',
    paddingHorizontal: 20,
    gap: 10,
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f71f2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    }),
  },
  ctaBtnConfirmed: { backgroundColor: '#10b981', shadowColor: '#10b981' },
  ctaBtnPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  ctaBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, color: '#ef4444', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: IS_ANDROID ? 28 : 44,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',

    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    }),
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sheetTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  sheetBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    marginBottom: 24,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  btnDisabled: { opacity: 0.65 },

  dashContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dashHero: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  dashLogoOuter: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    }),
  },
  dashLogoImg: {
    width: 60,
    height: 60,
  },
  dashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.6,
  },
  dashTitlePink: {
    color: '#ff2d55',
  },
  dashSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260,
  },
  dashProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  dashAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
  },
  dashAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashAvatarText: {
    color: '#0f71f2',
    fontSize: 18,
    fontWeight: '800',
  },
  dashProfileInfo: {
    flex: 1,
    minWidth: 0,
  },
  dashProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dashProfileName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activeText: {
    color: '#047857',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dashProfileEmail: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  dashStatsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  dashStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dashStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashStatLogoIcon: {
    width: 22,
    height: 22,
  },
  dashAiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dashAiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff2d55',
  },
  dashAiBadgeText: {
    color: '#ff2d55',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dashFreeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashFreeBadgeText: {
    color: '#10b981',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dashStatLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  dashStatValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  dashStorageRatio: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  dashStorageTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 6,
    width: '100%',
    overflow: 'hidden',
  },
  dashStorageFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  dashStorageSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  gradientCtaBtnWrapper: {
    width: '100%',
    marginTop: 10,
    borderRadius: 27,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f71f2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
    }),
  },
  gradientCtaBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  gradientCtaBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  gradientCtaBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  whiteCtaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    }),
  },
  goldCtaBtnWrapper: {
    width: '100%',
    marginTop: 10,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#d97706',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    }),
  },
  goldCtaBtn: {
    width: '100%',
    height: 52,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  goldCtaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  goldCtaLogo: {
    width: 22,
    height: 22,
    marginRight: 2,
  },
  goldCtaBtnText: {
    color: '#78350f',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  goldCtaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    }),
  },
  dashFooterNote: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  pausedBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...(IS_ANDROID ? {} : {
      shadowColor: '#d97706',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    }),
  },
  pausedBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pausedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pausedBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  pausedBannerTitle: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  pausedBadge: {
    backgroundColor: '#d97706',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pausedBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  pausedBannerSub: {
    color: '#a16207',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 6,
  },
  pausedProgressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#fde68a',
    borderRadius: 99,
    overflow: 'hidden',
  },
  pausedProgressFill: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: 99,
  },
  pausedResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d97706',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  pausedResumeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
