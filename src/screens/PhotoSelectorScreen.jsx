import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  PanResponder,
  TextInput,
  Modal,
  BackHandler,
  PermissionsAndroid,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const BUTTERY_LAYOUT_ANIM = {
  duration: 350,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.8,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BackgroundService from 'react-native-background-actions';
import Constants from 'expo-constants';
import * as MediaLibrary from 'expo-media-library';

let ImagePicker;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  ImagePicker = null;
}

import {
  readCachedProfile,
  saveCachedProfile,
  readPendingSelections,
  savePendingSelections,
  clearPendingSelections,
  readAuthSession,
  saveOngoingUpload,
  readOngoingUpload,
  clearOngoingUpload,
  readProtocolAccepted,
  saveProtocolAccepted,
} from '../auth/sessionStore';
import Spinner from '../components/Spinner';

const IS_ANDROID = Platform.OS === 'android';
const { width, height } = Dimensions.get('window');

let _Notif = null;
let _notifReady = false;
try {
  _Notif = require('expo-notifications');
  _Notif.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    _Notif.setNotificationChannelAsync('iclora-sync-channel', {
      name: 'iClora Sync Channel',
      importance: _Notif.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0f71f2',
    });
  }
  _notifReady = true;
} catch (_) {
  _Notif = null;
  _notifReady = false;
}

async function requestNotifPermission() {
  if (!_notifReady || !_Notif) return false;
  try {
    const { status } = await _Notif.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function sendLocalNotif({ title, body, identifier = 'iclora-sync', playSound = true }) {
  if (!_notifReady || !_Notif) return;
  try {
    const granted = await requestNotifPermission();
    if (!granted) return;
    await _Notif.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: playSound,
        priority: _Notif.AndroidNotificationPriority.HIGH,
        channelId: 'iclora-sync-channel',
      },
      trigger: null,
    });
  } catch (_) {

  }
}

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

const GRID_SPACING = 10;
const HORIZONTAL_PADDING = 20;
const THUMB_SIZE = Math.floor((width - HORIZONTAL_PADDING * 2 - GRID_SPACING * 2) / 3) - 3;

const MAX_PHOTOS = 50;
const KB = 1024;
const MB = 1024 * 1024;

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / KB))} KB`;
}

function formatStorage(value) {
  const mb = Number(value || 0);
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

function formatDurationFromSeconds(seconds) {
  const value = Math.max(0, Math.ceil(Number(seconds || 0)));
  if (!value) return 'Checking';
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatMegapixels(width, height) {
  if (!width || !height) return 'Unknown MP';
  const mp = (width * height) / 1000000;
  return `${mp.toFixed(1).replace(/\.0$/, '')} MP`;
}

function getUriFilename(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const cleanUri = uri.split('?')[0];
  const parts = cleanUri.split('/');
  const last = parts[parts.length - 1];
  return last || null;
}

function getFormatFromPhoto(photo) {
  const mime = (photo?.mimeType || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('heic')) return 'HEIC';
  if (mime.includes('heif')) return 'HEIF';
  if (mime.includes('webp')) return 'WEBP';

  const nameLike = `${photo?.fileName || ''} ${photo?.uri || ''}`.toLowerCase();
  if (nameLike.includes('.jpeg') || nameLike.includes('.jpg')) return 'JPEG';
  if (nameLike.includes('.png')) return 'PNG';
  if (nameLike.includes('.heic')) return 'HEIC';
  if (nameLike.includes('.heif')) return 'HEIF';
  if (nameLike.includes('.webp')) return 'WEBP';
  return 'IMAGE';
}

function normalizeFocalLength(value) {
  if (Array.isArray(value) && value.length >= 2 && value[1]) {
    return value[0] / value[1];
  }
  if (typeof value === 'number') return value;
  return null;
}

function normalizeAperture(value) {
  if (Array.isArray(value) && value.length >= 2 && value[1]) {
    return value[0] / value[1];
  }
  if (typeof value === 'number') return value;
  return null;
}

function getIsoFromExif(exif) {
  if (!exif || typeof exif !== 'object') return null;
  return (
    exif.ISOSpeedRatings ||
    exif.ISO ||
    exif.PhotographicSensitivity ||
    null
  );
}

function parseExifDate(exifValue) {
  if (!exifValue) return null;
  if (exifValue instanceof Date && !Number.isNaN(exifValue.getTime())) return exifValue;
  if (typeof exifValue === 'number') {
    const fromNumber = new Date(exifValue);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof exifValue !== 'string') return null;

  const normalized = exifValue.includes(':')
    ? exifValue.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    : exifValue;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractExifLite(exif) {
  if (!exif || typeof exif !== 'object') return null;
  return {
    Make: exif.Make,
    Model: exif.Model,
    LensModel: exif.LensModel,
    FocalLength: exif.FocalLength,
    FocalLenIn35mmFilm: exif.FocalLenIn35mmFilm,
    FNumber: exif.FNumber,
    ApertureValue: exif.ApertureValue,
    ISOSpeedRatings: exif.ISOSpeedRatings,
    ISO: exif.ISO,
    PhotographicSensitivity: exif.PhotographicSensitivity,
    ExposureBiasValue: exif.ExposureBiasValue,
    DateTimeOriginal: exif.DateTimeOriginal,
    DateTimeDigitized: exif.DateTimeDigitized,
    DateTime: exif.DateTime,
  };
}

function buildPhotoFromAsset(asset, idx) {
  const uriName = getUriFilename(asset?.uri);
  return {
    id: asset?.assetId || `asset-${Date.now()}-${idx}`,
    uri: asset?.uri || '',
    width: asset?.width || 0,
    height: asset?.height || 0,
    fileSize: asset?.fileSize || null,
    fileName: asset?.fileName || uriName || `IMG_${Date.now()}_${idx + 1}.JPG`,
    mimeType: asset?.mimeType || null,
    exif: extractExifLite(asset?.exif),
    pickedAt: Date.now(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function sanitizeUploadId(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80);
}

function createUploadPhotoId(photo, index) {
  const base = sanitizeUploadId(photo?.id || photo?.fileName || `mobile-${index + 1}`);
  return `photo-mobile-${Date.now()}-${index + 1}-${base || 'image'}`;
}

function getUploadMimeType(photo) {
  const mime = (photo?.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return mime;
  const format = getFormatFromPhoto(photo).toLowerCase();
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  if (format === 'gif') return 'image/gif';
  if (format === 'heic') return 'image/heic';
  if (format === 'heif') return 'image/heif';
  return 'image/jpeg';
}

function getUploadStatusView(status) {
  switch (status) {
    case 'preparing':
      return { label: 'Preparing', color: '#0f71f2', bg: '#eff6ff', icon: 'loader' };
    case 'waiting':
      return { label: 'Waiting', color: '#f59e0b', bg: '#fffbeb', icon: 'clock' };
    case 'uploading':
      return { label: 'Uploading', color: '#0f71f2', bg: '#eff6ff', icon: 'upload-cloud' };
    case 'saving':
      return { label: 'Saving', color: '#7c3aed', bg: '#f5f3ff', icon: 'database' };
    case 'done':
      return { label: 'Uploaded', color: '#10b981', bg: '#ecfdf5', icon: 'check' };
    case 'failed':
      return { label: 'Failed', color: '#ef4444', bg: '#fef2f2', icon: 'alert-circle' };
    default:
      return { label: 'Queued', color: '#94a3b8', bg: '#f8fafc', icon: 'circle' };
  }
}

const GridPhotoItem = React.memo(({ photo, index, thumbSize, onPress }) => {
  return (
    <View style={{ width: thumbSize, height: thumbSize, position: 'relative' }}>
      <Pressable
        onPress={() => onPress(photo)}
        style={({ pressed }) => [
          styles.gridCell,
          { width: '100%', height: '100%' },
          pressed && { scale: 0.98, opacity: 0.95 },
        ]}
      >
        <Image source={{ uri: photo.uri }} style={styles.gridImage} />
      </Pressable>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.uri === nextProps.photo.uri &&
    prevProps.index === nextProps.index &&
    prevProps.thumbSize === nextProps.thumbSize
  );
});

const ReviewPhotoItem = React.memo(({ photo }) => {
  return (
    <View style={styles.reviewPhotoCard}>
      <Image source={{ uri: photo.uri }} style={styles.reviewPhotoImage} />
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.photo.id === nextProps.photo.id && prevProps.photo.uri === nextProps.photo.uri;
});

const FilmstripPhotoItem = React.memo(({ photo, isActive, onPress }) => {
  return (
    <Pressable
      onPress={() => onPress(photo)}
      style={[
        styles.filmstripCell,
        isActive && styles.filmstripCellActive
      ]}
    >
      <Image source={{ uri: photo.uri }} style={styles.filmstripImage} />
    </Pressable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.uri === nextProps.photo.uri
  );
});

export default function PhotoSelectorScreen({ preloadedPhotos = [], onBack, onUploadFinished }) {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState('checking');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(6);
  const [progressPct, setProgressPct] = useState(0);
  const [statusLog, setStatusLog] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isPreparingReview, setIsPreparingReview] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [uploadHealth, setUploadHealth] = useState(null);
  const [isLoadingUploadHealth, setIsLoadingUploadHealth] = useState(false);
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const uploadStartRef = useRef(null);
  const lastCompletedCountRef = useRef(0);

  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState(null);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [captions, setCaptions] = useState({});
  const [favorites, setFavorites] = useState({});
  const [infoVisible, setInfoVisible] = useState(false);
  const infoTranslateY = useRef(new Animated.Value(450)).current;

  const isZoomedRef = useRef(false);
  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  const localPhotoRef = useRef(null);
  useEffect(() => {
    localPhotoRef.current = localPhoto;
  }, [localPhoto]);

  const selectedPhotosRef = useRef([]);
  const reviewScrollRef = useRef(null);
  const queueScrollRef = useRef(null);
  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    if (visiblePhotosCount > selectedPhotos.length) {
      setVisiblePhotosCount(Math.max(6, selectedPhotos.length));
      return;
    }
    if (selectedPhotos.length > visiblePhotosCount) {
      const id = setTimeout(() => {
        setVisiblePhotosCount((prev) => {
          const next = prev + 12;
          return next > selectedPhotos.length ? selectedPhotos.length : next;
        });
      }, 80);
      return () => clearTimeout(id);
    }
  }, [selectedPhotos.length, visiblePhotosCount]);

  useEffect(() => {
    const handleHardwareBackPress = () => {
      if (lightboxVisible) {
        closeLightboxAnimated();
        return true;
      }
      if (deleteModalRendered) {
        closeDeleteModal();
        return true;
      }
      if (confirmModalRendered) {
        closeConfirmModal();
        return true;
      }
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBackPress
    );

    return () => backHandler.remove();
  }, [onBack, lightboxVisible, deleteModalRendered, confirmModalRendered]);

  const lightboxOpacity = useRef(new Animated.Value(0)).current;
  const lightboxScale = useRef(new Animated.Value(0.85)).current;
  const lightboxTranslateX = useRef(new Animated.Value(0)).current;
  const lightboxTranslateY = useRef(new Animated.Value(0)).current;

  const switchOpacity = useRef(new Animated.Value(1)).current;
  const switchTranslateX = useRef(new Animated.Value(0)).current;
  const switchDirectionRef = useRef(1);

  const panX = useRef(0);
  const panY = useRef(0);
  const lastTapRef = useRef(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const radarRotate = useRef(new Animated.Value(0)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;

  const successScale = useRef(new Animated.Value(0)).current;

  const transitionTo = useCallback((newPhase) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 8,
        duration: 130,
        easing: Easing.bezier(0.215, 0.61, 0.355, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase(newPhase);

      if (newPhase === 'review') {
        setTimeout(() => {
          reviewScrollRef.current?.scrollTo({ y: 0, animated: false });
        }, 0);
      }
      slideAnim.setValue(-8);

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 190,
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 190,
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
            useNativeDriver: true,
          }),
        ]).start();
      }, 8);
    });
  }, [fadeAnim, slideAnim, setPhase]);

  const [deleteModalRendered, setDeleteModalRendered] = useState(false);
  const deleteDialogProgress = useRef(new Animated.Value(0)).current;

  const deleteBackdropOpacity = deleteDialogProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });
  const deleteSheetTranslateY = deleteDialogProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const openDeleteModal = () => {
    setDeleteModalRendered(true);
    Animated.timing(deleteDialogProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeDeleteModal = () => {
    Animated.timing(deleteDialogProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDeleteModalRendered(false);
    });
  };

  const confirmDeletePhoto = () => {
    Animated.timing(deleteDialogProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        requestAnimationFrame(() => {
          setDeleteModalRendered(false);
          removePhoto(localPhoto.id);
          const remaining = selectedPhotosRef.current.filter(p => p.id !== localPhoto.id);
          if (remaining.length > 0) {
            setActiveLightboxPhoto(remaining[0]);
          } else {
            closeLightboxAnimated();
          }
        });
      }
    });
  };

  const [confirmModalRendered, setConfirmModalRendered] = useState(false);
  const confirmDialogProgress = useRef(new Animated.Value(0)).current;

  const confirmBackdropOpacity = confirmDialogProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });
  const confirmSheetTranslateY = confirmDialogProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const openConfirmModal = () => {
    setConfirmModalRendered(true);
    Animated.timing(confirmDialogProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeConfirmModal = () => {
    Animated.timing(confirmDialogProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setConfirmModalRendered(false);
    });
  };

  const confirmBackupUpload = () => {
    Animated.timing(confirmDialogProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        requestAnimationFrame(() => {
          setConfirmModalRendered(false);
          startUploadPipeline();
        });
      }
    });
  };

  const logsList = [
    'Establishing encrypted backup tunnel...',
    'Scanning local gallery metadata...',
    'Compressing selected photo streams...',
    'Applying military-grade AES-256 encryption...',
    'Allocating secure cloud blocks on iClora...',
    'Syncing photo hashes to private ledger...',
    'Transferring secure data payloads...',
    'Indexing items with Vision AI services...',
    'Double-checking transmission parity...',
    'iClora Cloud backup fully verified!',
  ];

  useEffect(() => {
    let active = true;
    let timer = null;

    async function loadDataAndPhotos() {
      try {

        const ongoing = await readOngoingUpload();
        if (
          active &&
          ongoing &&
          Array.isArray(ongoing.uploadItems) &&
          ongoing.uploadItems.length > 0 &&
          ongoing.phase === 'uploading'
        ) {
          const hasIncomplete = ongoing.uploadItems.some(
            (item) => item.status !== 'done' && item.status !== 'failed'
          );
          if (hasIncomplete) {
            const restoredPhotos = Array.isArray(ongoing.selectedPhotos)
              ? ongoing.selectedPhotos
              : [];

            selectedPhotosRef.current = restoredPhotos;
            setSelectedPhotos(restoredPhotos);
            setUploadItems(ongoing.uploadItems);
            setCurrentUploadIndex(ongoing.currentUploadIndex || 0);
            setProgressPct(ongoing.progressPct || 0);
            progressAnim.setValue(ongoing.progressPct || 0);
            setStatusLog(ongoing.statusLog || 'Resuming backup...');
            setUploadError('');

            if (active) transitionTo('uploading');

            pulseAnim1.setValue(1);
            pulseAnim2.setValue(1);
            radarRotate.setValue(0);
            Animated.loop(
              Animated.parallel([
                Animated.timing(pulseAnim1, {
                  toValue: 2.2,
                  duration: 1600,
                  easing: Easing.linear,
                  useNativeDriver: true,
                }),
                Animated.timing(pulseAnim2, {
                  toValue: 1.6,
                  duration: 2200,
                  easing: Easing.linear,
                  useNativeDriver: true,
                }),
                Animated.timing(radarRotate, {
                  toValue: 1,
                  duration: 4000,
                  easing: Easing.linear,
                  useNativeDriver: true,
                }),
              ])
            ).start();

            resumeUploadPipeline(ongoing);
            return;
          }
        }

        if (preloadedPhotos && preloadedPhotos.length > 0) {
          setSelectedPhotos(preloadedPhotos);
          if (active) transitionTo('preview');
          await saveProtocolAccepted();
          return;
        }

        const draft = await readPendingSelections();
        if (active && draft && draft.length > 0) {
          setSelectedPhotos(draft);
          if (active) transitionTo('preview');
          return;
        }

        const isAccepted = await readProtocolAccepted();
        if (active && isAccepted) {
          setSelectedPhotos([]);
          if (active) transitionTo('preview');
          return;
        }

        if (active) {
          setSelectedPhotos([]);
          if (active) transitionTo('idle');
        }
      } catch (err) {
        console.warn('Failed to load photos/drafts:', err);
      } finally {
        if (active) {
          setIsLoadingGallery(false);
        }
      }
    }

    timer = setTimeout(() => {
      if (active) {
        loadDataAndPhotos();
      }
    }, 300);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {

        const cached = await readCachedProfile();
        if (active && cached) {
          setProfile(cached);
        }

        const session = await readAuthSession();
        if (session?.sessionToken) {
          const response = await fetch(`${resolveBackendBaseUrl()}/auth/me`, {
            credentials: Platform.OS === 'web' ? 'include' : 'omit',
            headers: { Authorization: `Bearer ${session.sessionToken}` },
          });
          if (response.ok) {
            const json = await response.json();
            if (active && json && json.ok !== false) {
              setProfile(json);
              await saveCachedProfile(json);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load profile or fetch fresh details:', err);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase === 'preview' || selectedPhotos.length > 0) {
      savePendingSelections(selectedPhotos).catch((err) => {
        console.warn('Failed to save pending selections cache:', err);
      });
    }
  }, [selectedPhotos, phase]);

  useEffect(() => {
    if (phase !== 'uploading') {
      setEtaSeconds(null);
      return;
    }
    const interval = setInterval(() => {
      const total = uploadItems.length;
      if (!total || !uploadStartRef.current) return;
      const done = uploadItems.filter((i) => i.status === 'done').length;
      const remaining = total - done;
      if (remaining <= 0) {
        setEtaSeconds(0);
        return;
      }
      const elapsedMs = Date.now() - uploadStartRef.current;
      if (done > 0) {
        const msPerPhoto = elapsedMs / done;
        const estimatedMs = msPerPhoto * remaining;
        setEtaSeconds(Math.max(0, Math.round(estimatedMs / 1000)));
      } else {

        setEtaSeconds(remaining * 8);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, uploadItems]);

  useEffect(() => {
    if (phase === 'uploading' && queueScrollRef.current) {
      LayoutAnimation.configureNext(BUTTERY_LAYOUT_ANIM);
      queueScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentUploadIndex, phase]);

  useEffect(() => {
    const uris = selectedPhotos
      .slice(0, 12)
      .map((photo) => photo?.uri)
      .filter((uri) => typeof uri === 'string' && uri.length > 0);
    uris.forEach((uri) => {
      Image.prefetch(uri).catch(() => {});
    });
  }, [selectedPhotos]);

  const handlePrepareReview = async () => {
    if (selectedPhotos.length === 0 || isPreparingReview) return;
    setIsPreparingReview(true);

    try {
      const session = await readAuthSession();
      if (session?.sessionToken) {

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${resolveBackendBaseUrl()}/auth/me`, {
          credentials: Platform.OS === 'web' ? 'include' : 'omit',
          headers: { Authorization: `Bearer ${session.sessionToken}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          if (json && json.ok !== false) {
            setProfile(json);
            await saveCachedProfile(json);
          }
        }
      }
    } catch (err) {
      console.warn('Failed pre-loading fresh profile details for review:', err);
    } finally {
      setIsPreparingReview(false);
      transitionTo('review');
    }
  };

  useEffect(() => {
    if (phase !== 'review' || selectedPhotos.length === 0) return;

    let active = true;
    async function loadUploadHealth() {
      setIsLoadingUploadHealth(true);
      try {
        const session = await readAuthSession();
        if (!session?.sessionToken) return;

        const firstPhotoBytes = selectedPhotos[0]?.fileSize || 0;
        const query = `platform=android&client=iclora-android&bytes=${encodeURIComponent(String(firstPhotoBytes || 0))}`;
        const response = await fetch(`${resolveBackendBaseUrl()}/photos/upload-health?${query}`, {
          credentials: Platform.OS === 'web' ? 'include' : 'omit',
          headers: {
            Authorization: `Bearer ${session.sessionToken}`,
            'x-iclora-platform': 'android',
            'x-iclora-client': 'iclora-android',
          },
        });
        const json = await response.json().catch(() => null);
        if (active && response.ok && json?.ok !== false) {
          setUploadHealth(json);
        }
      } catch (err) {
        console.warn('Failed to load upload server health:', err);
      } finally {
        if (active) setIsLoadingUploadHealth(false);
      }
    }

    loadUploadHealth();
    return () => {
      active = false;
    };
  }, [phase, selectedPhotos]);

  const triggerImagePicker = async () => {
    if (!ImagePicker?.launchImageLibraryAsync) {
      alert('Native photo selector is not supported on this platform/device.');
      return;
    }

    try {
      setIsLoadingGallery(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        alert('Media library permission is required to select photos.');
        setIsLoadingGallery(false);
        return;
      }

      const mediaTypes = ImagePicker.MediaTypeOptions?.Images || 'images';
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS,
        quality: 1,
        exif: true,
        orderedSelection: true,
      });

      if (result?.canceled || !result?.assets || result.assets.length === 0) {
        setIsLoadingGallery(false);
        return;
      }

      const incoming = result.assets.map((asset, idx) => buildPhotoFromAsset(asset, idx));
      if (incoming.length === 0) {
        setIsLoadingGallery(false);
        return;
      }

      await saveProtocolAccepted();

      const existingByUri = new Map(selectedPhotos.map((p) => [p.uri, p]));
      incoming.forEach((photo) => existingByUri.set(photo.uri, photo));

      const merged = Array.from(existingByUri.values()).slice(0, MAX_PHOTOS);
      setSelectedPhotos(merged);
      transitionTo('preview');
    } catch (err) {
      console.warn('Native picker failed:', err);
      alert('Could not open device photo gallery. Please try again.');
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleGridPhotoPress = useCallback((photo) => {
    setActiveLightboxPhoto(photo);
  }, []);

  const removePhoto = useCallback((id) => {
    const updated = selectedPhotosRef.current.filter((p) => p.id !== id);
    setSelectedPhotos(updated);
    if (updated.length === 0) {
      clearPendingSelections().catch(console.warn);
      readProtocolAccepted()
        .then((accepted) => {
          if (!accepted) {
            transitionTo('idle');
          }
        })
        .catch(() => {
          transitionTo('idle');
        });
    }
  }, [setSelectedPhotos, transitionTo]);

  const updateUploadItem = useCallback((itemId, patch) => {
    LayoutAnimation.configureNext(BUTTERY_LAYOUT_ANIM);
    setUploadItems((items) => items.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
  }, []);

  const setProgressSmooth = useCallback((value) => {
    const nextValue = Math.max(0, Math.min(100, Math.round(value)));
    setProgressPct(nextValue);
    Animated.timing(progressAnim, {
      toValue: nextValue,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const requestUploadSignature = async ({ photo, uploadPhotoId, session, itemId, index, total }) => {
    const body = {
      filename: photo.fileName || `iClora_Photo_${index + 1}.jpg`,
      mimeType: getUploadMimeType(photo),
      bytes: photo.fileSize || 0,
      photoId: uploadPhotoId,
      platform: 'android',
      client: 'iclora-android',
    };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await fetch(`${resolveBackendBaseUrl()}/photos/upload-signature`, {
        method: 'POST',
        credentials: Platform.OS === 'web' ? 'include' : 'omit',
        headers: {
          Authorization: `Bearer ${session.sessionToken}`,
          'Content-Type': 'application/json',
          'x-iclora-platform': 'android',
          'x-iclora-client': 'iclora-android',
        },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);

      if (response.status === 429 && json?.retryAfterMs) {
        const waitMs = Math.min(Number(json.retryAfterMs) + 350, 45_000);
        updateUploadItem(itemId, {
          status: 'waiting',
          note: `Server pacing ${formatDurationFromSeconds(Math.ceil(waitMs / 1000))}`,
        });
        setStatusLog(`Waiting for upload slot ${index + 1}/${total}...`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok || json?.ok === false) {
        throw new Error(json?.error || 'Could not prepare upload');
      }

      return json;
    }

    throw new Error('Upload server is busy. Please try again in a moment.');
  };

  const uploadToCloudinary = async ({ photo, signature }) => {
    const formData = new FormData();
    Object.entries(signature.params || {}).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const fileName = photo.fileName || `${signature.photoId}.jpg`;
    const mimeType = getUploadMimeType(photo);
    if (/^https?:\/\//i.test(photo.uri || '')) {
      formData.append('file', photo.uri);
    } else {
      formData.append('file', {
        uri: photo.uri,
        name: fileName,
        type: mimeType,
      });
    }

    const response = await fetch(signature.uploadUrl, {
      method: 'POST',
      body: formData,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.error) {
      throw new Error(json?.error?.message || 'Cloud upload failed');
    }
    return json;
  };

  const saveUploadedPhoto = async ({ photo, signature, cloudinaryResult, session }) => {
    const fallbackFormat = getFormatFromPhoto(photo).toLowerCase();
    const body = {
      photoId: signature.photoId,
      publicId: cloudinaryResult.public_id,
      assetId: cloudinaryResult.asset_id,
      resourceType: 'image',
      format: cloudinaryResult.format || (fallbackFormat === 'image' ? '' : fallbackFormat),
      mimeType: getUploadMimeType(photo),
      bytes: cloudinaryResult.bytes || photo.fileSize || 0,
      width: cloudinaryResult.width || photo.width || 0,
      height: cloudinaryResult.height || photo.height || 0,
      originalFilename: photo.fileName || `${signature.photoId}.jpg`,
      secureUrl: cloudinaryResult.secure_url,
      createdAt: cloudinaryResult.created_at || new Date().toISOString(),
      platform: 'android',
      client: 'iclora-android',
    };

    const response = await fetch(`${resolveBackendBaseUrl()}/photos`, {
      method: 'POST',
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      headers: {
        Authorization: `Bearer ${session.sessionToken}`,
        'Content-Type': 'application/json',
        'x-iclora-platform': 'android',
        'x-iclora-client': 'iclora-android',
      },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.ok === false) {
      throw new Error(json?.error || 'Could not save uploaded photo');
    }
    return json;
  };

  const startUploadPipeline = async () => {
    const photosToUpload = [...selectedPhotosRef.current];
    if (!photosToUpload.length) return;
    transitionTo('uploading');

    const queue = photosToUpload.map((photo, index) => ({
      ...photo,
      id: photo.id || `photo-${index}`,
      uploadPhotoId: createUploadPhotoId(photo, index),
      status: 'queued',
      note: 'Ready',
    }));
    setUploadItems(queue);
    setUploadError('');
    setCurrentUploadIndex(0);
    setProgressPct(0);
    setStatusLog('Preparing secure upload queue...');

    uploadStartRef.current = Date.now();
    lastCompletedCountRef.current = 0;
    setEtaSeconds(null);

    sendLocalNotif({
      title: '📤 iClora Backup Started',
      body: `Uploading ${photosToUpload.length} photo${photosToUpload.length !== 1 ? 's' : ''} to your iClora Cloud…`,
    }).catch(() => {});

    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    radarRotate.setValue(0);
    progressAnim.setValue(0);

    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim1, {
          toValue: 2.2,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1.6,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(radarRotate, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    let activeIndex = 0;
    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) throw new Error('Please sign in again before backup.');

      const uploaded = [];
      for (let index = 0; index < queue.length; index += 1) {
        activeIndex = index;
        const item = queue[index];
        setCurrentUploadIndex(index);

        const currentPct = Math.floor((index / queue.length) * 100);
        sendLocalNotif({
          title: `📤 Syncing Photos (${index + 1}/${queue.length}) · ${currentPct}%`,
          body: `Uploading: ${item.fileName || `Photo ${index + 1}`}`,
          playSound: false,
        }).catch(() => {});

        await saveOngoingUpload({
          selectedPhotos: selectedPhotosRef.current,
          uploadItems: queue,
          currentUploadIndex: index,
          progressPct: currentPct,
          statusLog: `Preparing photo ${index + 1}/${queue.length}...`,
          phase: 'uploading',
        });

        updateUploadItem(item.id, { status: 'preparing', note: 'Requesting slot' });
        setStatusLog(`Preparing photo ${index + 1}/${queue.length}...`);

        const signature = await requestUploadSignature({
          photo: item,
          uploadPhotoId: item.uploadPhotoId,
          session,
          itemId: item.id,
          index,
          total: queue.length,
        });

        updateUploadItem(item.id, { status: 'uploading', note: 'Uploading to iClora Cloud' });
        setStatusLog(`Uploading photo ${index + 1}/${queue.length} one by one...`);
        const cloudinaryResult = await uploadToCloudinary({ photo: item, signature });

        updateUploadItem(item.id, { status: 'saving', note: 'Saving cloud metadata' });
        setStatusLog(`Saving photo ${index + 1}/${queue.length}...`);
        const saved = await saveUploadedPhoto({ photo: item, signature, cloudinaryResult, session });

        uploaded.push({
          item,
          saved,
          bytes: cloudinaryResult.bytes || item.fileSize || 0,
        });
        updateUploadItem(item.id, { status: 'done', note: 'Synced' });

        const nextProgress = ((index + 1) / queue.length) * 100;
        setProgressSmooth(nextProgress);

        queue[index].status = 'done';
        queue[index].note = 'Synced';
        await saveOngoingUpload({
          selectedPhotos: selectedPhotosRef.current,
          uploadItems: queue,
          currentUploadIndex: index + 1,
          progressPct: Math.floor(nextProgress),
          statusLog: `Photo ${index + 1} synced successfully`,
          phase: 'uploading',
        });
      }

      setStatusLog('iClora Cloud backup fully verified.');
      await clearOngoingUpload();
      await completeBackupSuccess(uploaded);
    } catch (err) {
      console.warn('Photo backup failed:', err);
      const message = err?.message || 'Backup failed. Please try again.';
      setUploadError(message);
      setStatusLog(message);
      const failedItem = queue[activeIndex];
      if (failedItem) {
        updateUploadItem(failedItem.id, { status: 'failed', note: message });
        queue[activeIndex].status = 'failed';
        queue[activeIndex].note = message;
      }

      sendLocalNotif({
        title: '⚠️ iClora Backup Paused',
        body: message,
        playSound: true,
      }).catch(() => {});

      await saveOngoingUpload({
        selectedPhotos: selectedPhotosRef.current,
        uploadItems: queue,
        currentUploadIndex: activeIndex,
        progressPct: Math.floor((activeIndex / queue.length) * 100),
        statusLog: message,
        phase: 'uploading',
      });
    }
  };

  const resumeUploadPipeline = async (ongoing) => {
    const queue = [...ongoing.uploadItems];
    let startIndex = ongoing.currentUploadIndex || 0;
    setUploadError('');

    uploadStartRef.current = Date.now();
    lastCompletedCountRef.current = 0;
    setEtaSeconds(null);

    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    radarRotate.setValue(0);
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim1, {
          toValue: 2.2,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1.6,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(radarRotate, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const remainingPhotos = queue.length - startIndex;
    sendLocalNotif({
      title: '📤 iClora Backup Resumed',
      body: `Syncing ${remainingPhotos} remaining photo${remainingPhotos !== 1 ? 's' : ''}…`,
    }).catch(() => {});

    let activeIndex = startIndex;
    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) throw new Error('Please sign in again before backup.');

      const uploaded = [];

      for (let i = 0; i < startIndex; i++) {
        const item = queue[i];
        if (item.status === 'done') {
          uploaded.push({
            item,
            saved: true,
            bytes: item.fileSize || 0,
          });
        }
      }

      for (let index = startIndex; index < queue.length; index += 1) {
        activeIndex = index;
        const item = queue[index];
        setCurrentUploadIndex(index);

        const currentPct = Math.floor((index / queue.length) * 100);
        sendLocalNotif({
          title: `📤 Syncing Photos (${index + 1}/${queue.length}) · ${currentPct}%`,
          body: `Uploading: ${item.fileName || `Photo ${index + 1}`}`,
          playSound: false,
        }).catch(() => {});

        await saveOngoingUpload({
          selectedPhotos: selectedPhotosRef.current,
          uploadItems: queue,
          currentUploadIndex: index,
          progressPct: currentPct,
          statusLog: `Preparing photo ${index + 1}/${queue.length}...`,
          phase: 'uploading',
        });

        updateUploadItem(item.id, { status: 'preparing', note: 'Requesting slot' });
        setStatusLog(`Preparing photo ${index + 1}/${queue.length}...`);

        const signature = await requestUploadSignature({
          photo: item,
          uploadPhotoId: item.uploadPhotoId,
          session,
          itemId: item.id,
          index,
          total: queue.length,
        });

        updateUploadItem(item.id, { status: 'uploading', note: 'Uploading to iClora Cloud' });
        setStatusLog(`Uploading photo ${index + 1}/${queue.length} one by one...`);
        const cloudinaryResult = await uploadToCloudinary({ photo: item, signature });

        updateUploadItem(item.id, { status: 'saving', note: 'Saving cloud metadata' });
        setStatusLog(`Saving photo ${index + 1}/${queue.length}...`);
        const saved = await saveUploadedPhoto({ photo: item, signature, cloudinaryResult, session });

        uploaded.push({
          item,
          saved,
          bytes: cloudinaryResult.bytes || item.fileSize || 0,
        });
        updateUploadItem(item.id, { status: 'done', note: 'Synced' });

        const nextProgress = ((index + 1) / queue.length) * 100;
        setProgressSmooth(nextProgress);

        queue[index].status = 'done';
        queue[index].note = 'Synced';
        await saveOngoingUpload({
          selectedPhotos: selectedPhotosRef.current,
          uploadItems: queue,
          currentUploadIndex: index + 1,
          progressPct: Math.floor(nextProgress),
          statusLog: `Photo ${index + 1} synced successfully`,
          phase: 'uploading',
        });
      }

      setStatusLog('iClora Cloud backup fully verified.');
      await clearOngoingUpload();
      await completeBackupSuccess(uploaded);
    } catch (err) {
      console.warn('Photo backup resume failed:', err);
      const message = err?.message || 'Backup failed. Please try again.';
      setUploadError(message);
      setStatusLog(message);
      const failedItem = queue[activeIndex];
      if (failedItem) {
        updateUploadItem(failedItem.id, { status: 'failed', note: message });
        queue[activeIndex].status = 'failed';
        queue[activeIndex].note = message;
      }

      sendLocalNotif({
        title: '⚠️ iClora Backup Paused',
        body: message,
        playSound: true,
      }).catch(() => {});

      await saveOngoingUpload({
        selectedPhotos: selectedPhotosRef.current,
        uploadItems: queue,
        currentUploadIndex: activeIndex,
        progressPct: Math.floor((activeIndex / queue.length) * 100),
        statusLog: message,
        phase: 'uploading',
      });
    }
  };

  const completeBackupSuccess = async (uploadedItems = []) => {
    try {
      await clearPendingSelections();
      const cached = await readCachedProfile();
      if (cached) {
        const addedPhotos = uploadedItems.length || selectedPhotos.length;
        const currentPhotos = Number(cached.photosCount || 0);
        const currentUsed = Number(cached.storageused || 0);
        const addedBytes = uploadedItems.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
        const addedStorage = addedBytes > 0 ? addedBytes / MB : addedPhotos * 0.42;

        const updatedProfile = {
          ...cached,
          photosCount: currentPhotos + addedPhotos,
          storageused: Math.min(Number(cached.storage || 1024), currentUsed + addedStorage),
        };
        await saveCachedProfile(updatedProfile);
      }
    } catch (err) {
      console.warn('Error saving uploaded counts to cache:', err);
    }

    sendLocalNotif({
      title: '✅ iClora Backup Complete',
      body: `${uploadedItems.length || 'Your'} photo${uploadedItems.length !== 1 ? 's have' : ' has'} been safely backed up to iClora Cloud.`,
    }).catch(() => {});

    transitionTo('success');
    successScale.setValue(0);
    Animated.spring(successScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleDone = () => {
    setSelectedPhotos([]);
    clearPendingSelections().catch(console.warn);
    setProgressPct(0);
    setUploadItems([]);
    setUploadError('');
    setCurrentUploadIndex(0);
    readProtocolAccepted()
      .then((accepted) => {
        if (accepted) {
          setPhase('preview');
        } else {
          setPhase('idle');
        }
      })
      .catch(() => {
        setPhase('idle');
      });
    onUploadFinished?.();
  };

  const handleNavbarBack = () => {
    if (phase === 'review') {
      transitionTo('preview');
    } else {
      onBack();
    }
  };

  const idleFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'idle') return;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleFloatAnim, {
          toValue: -10,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idleFloatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [phase]);

  const renderIdle = () => {
    return (
      <View style={styles.idleContainer}>
        <ScrollView
          style={styles.idleScroll}
          contentContainerStyle={styles.idleScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >

          <Animated.View
            style={[styles.duckHeroWrap, { transform: [{ translateY: idleFloatAnim }] }]}
            renderToHardwareTextureAndroid
          >
            <View style={styles.duckGlowRing} />
            <Image
              source={require('../../assets/utya-utya-duck.gif')}
              style={styles.duckGif}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.titleText}>Backup your Gallery</Text>
          <Text style={styles.subtitleText}>
            Securely sync up to 50 photos to your Private Cloud with AES-256 encryption — only you have access.
          </Text>

          <View style={styles.featurePillRow}>
            <View style={styles.featurePill}>
              <Feather name="lock" size={11} color="#0f71f2" />
              <Text style={styles.featurePillText}>AES-256</Text>
            </View>
            <View style={styles.featurePill}>
              <Feather name="layers" size={11} color="#0f71f2" />
              <Text style={styles.featurePillText}>Max 50 photos</Text>
            </View>
            <View style={styles.featurePill}>
              <Feather name="smartphone" size={11} color="#0f71f2" />
              <Text style={styles.featurePillText}>Device-locked</Text>
            </View>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.policyCardHeader}>
              <View style={styles.policyCardIconWrap}>
                <Image
                  source={require('../../assets/security-camera.png')}
                  style={{ width: 14, height: 14, tintColor: '#ef4444' }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.policyCardTitle}>iClora® Security Protocol</Text>
            </View>
            <Text style={styles.policyCardBody}>
              This backup vault is hardware-locked to <Text style={styles.policyCardBold}>this device only</Text>.
              Using your credentials on unauthorized phones triggers a permanent security lockout.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.idleBottomSticky}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkboxBox, termsAccepted && styles.checkboxBoxActive]}>
              {termsAccepted && <Feather name="check" size={13} color="#ffffff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm this is my primary device and agree to iClora Cloud security directives.
            </Text>
          </Pressable>

          <Pressable
            disabled={!termsAccepted}
            onPress={triggerImagePicker}
            style={({ pressed }) => [
              styles.gradientCtaBtnWrapper,
              !termsAccepted && styles.gradientCtaBtnDisabled,
              pressed && termsAccepted && styles.gradientCtaBtnPressed,
            ]}
          >
            <LinearGradient
              colors={termsAccepted ? ['#0f71f2', '#1d9bf0', '#0284c7'] : ['#e2e8f0', '#cbd5e1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientCtaBtn}
            >
              <Text style={[styles.gradientCtaBtnText, !termsAccepted && styles.gradientCtaBtnTextDisabled]}>
                Add Photos
              </Text>
              <View style={[styles.whiteCtaArrow, !termsAccepted && styles.whiteCtaArrowDisabled]}>
                <Feather name="arrow-right" size={14} color={termsAccepted ? "#0f71f2" : "#94a3b8"} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  };

  const getSelectedStorageSize = () => {
    const totalBytes = selectedPhotos.reduce((sum, photo) => {
      if (typeof photo.fileSize === 'number' && Number.isFinite(photo.fileSize) && photo.fileSize > 0) {
        return sum + photo.fileSize;
      }
      return sum;
    }, 0);

    if (totalBytes > 0) {
      return (totalBytes / MB).toFixed(1);
    }

    let estimatedMb = 0;
    selectedPhotos.forEach((photo) => {
      const format = getFormatFromPhoto(photo);
      estimatedMb += format === 'PNG' ? 0.42 : 2.4;
    });
    return estimatedMb.toFixed(1);
  };

  const renderPreview = () => {
    return (
      <View style={styles.contentWrap}>

        <View style={styles.previewDuckBanner}>
          <View style={styles.previewDuckBannerLeft}>
            <Text style={styles.previewHeading}>Upload Gallery</Text>
            <Text style={styles.previewBannerSub}>
              {selectedPhotos.length === 0
                ? 'Tap + Add to pick photos'
                : `${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''} ready · ${getSelectedStorageSize()} MB`}
            </Text>
          </View>
          <View style={styles.previewDuckMini}>
            <Image
              source={require('../../assets/utya-utya-duck.gif')}
              style={styles.previewDuckGif}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.previewBadgeRow}>
          <View style={styles.previewStorageBadge}>
            <Feather name="hard-drive" size={10} color="#0f71f2" />
            <Text style={styles.previewStorageText}>{getSelectedStorageSize()} MB</Text>
          </View>
          <View style={styles.previewCounterBadge}>
            <Text style={styles.previewCounterText}>{selectedPhotos.length}/{MAX_PHOTOS} photos</Text>
          </View>
          {visiblePhotosCount < selectedPhotos.length && (
            <View style={styles.preparingPill}>
              <Spinner size={10} color="#7c3aed" />
              <Text style={styles.preparingPillText}>{visiblePhotosCount}/{selectedPhotos.length} ready</Text>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {isLoadingGallery ? (
            <View style={styles.waitingContainer}>
              <Image
                source={require('../../assets/aa.gif')}
                style={styles.waitingAaGif}
                resizeMode="contain"
              />
              <Text style={styles.waitingTitle}>Opening Gallery...</Text>
              <Text style={styles.waitingText}>Select your photos to back up</Text>
            </View>
          ) : (
            <>
              {selectedPhotos.slice(0, visiblePhotosCount).map((photo, index) => (
                <GridPhotoItem
                  key={photo.id}
                  photo={photo}
                  index={index}
                  thumbSize={THUMB_SIZE}
                  onPress={handleGridPhotoPress}
                />
              ))}
              {selectedPhotos.slice(visiblePhotosCount).map((photo, index) => (
                <View
                  key={`skeleton-placeholder-${photo.id || index}`}
                  style={styles.gridCellSkeleton}
                >
                  <Spinner size={14} color="#0f71f2" />
                </View>
              ))}
            </>
          )}

          {!isLoadingGallery && selectedPhotos.length < MAX_PHOTOS && (
            <Pressable
              onPress={triggerImagePicker}
              style={({ pressed }) => [
                styles.gridCellAdd,
                pressed && { backgroundColor: '#f1f5f9' },
              ]}
            >
              <Feather name="plus" size={24} color="#0f71f2" />
              <Text style={styles.addMoreText}>Add</Text>
            </Pressable>
          )}
        </ScrollView>

        <Pressable
          disabled={selectedPhotos.length === 0 || isPreparingReview || isLoadingGallery}
          onPress={handlePrepareReview}
          style={({ pressed }) => [
            styles.gradientCtaBtnWrapper,
            (selectedPhotos.length === 0 || isPreparingReview || isLoadingGallery) && styles.gradientCtaBtnDisabled,
            pressed && selectedPhotos.length > 0 && !isPreparingReview && !isLoadingGallery && styles.gradientCtaBtnPressed,
          ]}
        >
          <LinearGradient
            colors={(selectedPhotos.length > 0 && !isLoadingGallery) ? ['#0f71f2', '#1d9bf0', '#0284c7'] : ['#e2e8f0', '#cbd5e1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCtaBtn}
          >
            {isLoadingGallery ? (
              <>
                <Text style={[styles.gradientCtaBtnText, styles.gradientCtaBtnTextDisabled]}>
                  Scanning Photos...
                </Text>
                <View style={[styles.whiteCtaArrow, styles.whiteCtaArrowDisabled]}>
                  <Spinner size={14} color="#94a3b8" />
                </View>
              </>
            ) : isPreparingReview ? (
              <>
                <Text style={styles.gradientCtaBtnText}>Verifying Cloud Storage...</Text>
                <View style={styles.whiteCtaArrow}>
                  <Spinner size={14} color="#0f71f2" />
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.gradientCtaBtnText, selectedPhotos.length === 0 && styles.gradientCtaBtnTextDisabled]}>
                  Back up {selectedPhotos.length} Photo{selectedPhotos.length > 1 ? 's' : ''}
                </Text>
                <View style={[styles.whiteCtaArrow, selectedPhotos.length === 0 && styles.whiteCtaArrowDisabled]}>
                  <Feather name="arrow-up" size={14} color={selectedPhotos.length > 0 ? "#0f71f2" : "#94a3b8"} />
                </View>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderReview = () => {

    const backupSizeMB = parseFloat(getSelectedStorageSize());

    const storageLimit = profile ? Number(profile.storage || 1024) : 1024;
    const storageUsed = profile ? Number(profile.storageused || 0) : 120.5;
    const storageAfter = Math.min(storageLimit, storageUsed + backupSizeMB);

    const currentPercent = (storageUsed / storageLimit) * 100;
    const afterPercent = (storageAfter / storageLimit) * 100;
    const backupDeltaPercent = ((storageAfter - storageUsed) / storageLimit) * 100;
    const serverStatus = uploadHealth?.status === 'ready' ? 'Ready' : uploadHealth?.status === 'busy' ? 'Busy' : 'Checking';
    const statusColor = uploadHealth?.status === 'ready' ? '#10b981' : uploadHealth?.status === 'busy' ? '#f59e0b' : '#64748b';
    const statusBg = uploadHealth?.status === 'ready' ? '#ecfdf5' : uploadHealth?.status === 'busy' ? '#fffbeb' : '#f8fafc';
    const firstPhotoSeconds = uploadHealth?.estimatedSecondsPerPhoto || 0;
    const totalUploadSeconds = firstPhotoSeconds ? firstPhotoSeconds * Math.max(1, selectedPhotos.length) : 0;
    const retrySeconds = uploadHealth?.retryAfterSeconds || 0;

    return (
      <View style={styles.contentWrap}>
        <View style={styles.reviewHeaderRow}>
          <Text style={styles.reviewHeading}>Review Backup</Text>
          <View style={styles.reviewCounterBadge}>
            <Text style={styles.reviewCounterText}>{selectedPhotos.length} Items</Text>
          </View>
        </View>

        <Text style={styles.reviewSubtitle}>
          Verify the photos and cloud storage usage before initiating secure synchronization.
        </Text>

        <ScrollView
          ref={reviewScrollRef}
          style={styles.reviewScroll}
          contentContainerStyle={styles.reviewScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >

          <View style={styles.reviewPhotosWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewPhotosContent}
              bounces={true}
            >
              {selectedPhotos.map((photo) => (
                <ReviewPhotoItem key={photo.id} photo={photo} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.analyticsWidget}>
            <Text style={styles.analyticsTitle}>Storage Impact Analysis</Text>
            <View style={styles.analyticsDivider} />

            <View style={styles.analyticsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="plus-circle" size={14} color="#0f71f2" />
                <Text style={styles.analyticsLabel}>Selected Backup Size</Text>
              </View>
              <Text style={styles.analyticsValueHighlight}>+{backupSizeMB.toFixed(1)} MB</Text>
            </View>

            <View style={styles.analyticsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="database" size={14} color="#64748b" />
                <Text style={styles.analyticsLabel}>Current Cloud Storage</Text>
              </View>
              <Text style={styles.analyticsValue}>{formatStorage(storageUsed)}</Text>
            </View>

            <View style={styles.analyticsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="cloud" size={14} color="#10b981" />
                <Text style={styles.analyticsLabel}>Storage After Backup</Text>
              </View>
              <Text style={styles.analyticsValueAfter}>{formatStorage(storageAfter)}</Text>
            </View>

            <View style={styles.analyticsVisualContainer}>
              <View style={styles.analyticsVisualLabelRow}>
                <Text style={styles.visualTrackLabel}>0%</Text>
                <Text style={styles.visualTrackLabel}>Total Capacity: {formatStorage(storageLimit)}</Text>
                <Text style={styles.visualTrackLabel}>100%</Text>
              </View>
              <View style={styles.analyticsTrack}>

                <View style={[styles.analyticsFillUsed, { width: `${currentPercent}%` }]} />

                <View style={[styles.analyticsFillBackup, { width: `${backupDeltaPercent}%` }]} />
              </View>
              <View style={styles.analyticsLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                  <Text style={styles.legendText}>Current ({currentPercent.toFixed(1)}%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0f71f2' }]} />
                  <Text style={styles.legendText}>Backup (+{backupDeltaPercent.toFixed(1)}%)</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.visionSyncPanel}>
            <View style={styles.visionLogoContainer}>
              <Image
                source={require('../../assets/photos.webp')}
                style={styles.visionLogoIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.visionSyncTextWrap}>
              <View style={styles.visionSyncTitleRow}>
                <Text style={styles.visionSyncTitle}>Vision AI Sync</Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.visionSyncDesc}>
                Free Vision Sync will be done automatically in the background.
              </Text>
            </View>
          </View>

          <View style={styles.uploadStatusPanel}>
            <View style={styles.uploadStatusIconWrap}>
              {isLoadingUploadHealth ? (
                <Spinner size={18} color="#0f71f2" />
              ) : (
                <Feather name="activity" size={20} color="#0f71f2" />
              )}
            </View>
            <View style={styles.uploadStatusBody}>
              <View style={styles.uploadStatusTitleRow}>
                <Text style={styles.uploadStatusTitle}>Upload Server</Text>
                <View style={[styles.serverStatusBadge, { borderColor: statusColor, backgroundColor: statusBg }]}>
                  <View style={[styles.serverStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.serverStatusText, { color: statusColor }]}>{serverStatus}</Text>
                </View>
              </View>

              <View style={styles.uploadStatusMetrics}>
                <View style={styles.uploadStatusMetric}>
                  <Text style={styles.uploadStatusMetricLabel}>Start wait</Text>
                  <Text style={styles.uploadStatusMetricValue}>
                    {retrySeconds ? formatDurationFromSeconds(retrySeconds) : 'Now'}
                  </Text>
                </View>
                <View style={styles.uploadStatusMetricDivider} />
                <View style={styles.uploadStatusMetric}>
                  <Text style={styles.uploadStatusMetricLabel}>1 photo</Text>
                  <Text style={styles.uploadStatusMetricValue}>{formatDurationFromSeconds(firstPhotoSeconds)}</Text>
                </View>
                <View style={styles.uploadStatusMetricDivider} />
                <View style={styles.uploadStatusMetric}>
                  <Text style={styles.uploadStatusMetricLabel}>This backup</Text>
                  <Text style={styles.uploadStatusMetricValue}>{formatDurationFromSeconds(totalUploadSeconds)}</Text>
                </View>
              </View>

              <Text style={styles.uploadStatusDesc}>
                If you begin now, photos will upload one by one based on current server load.
              </Text>
            </View>
          </View>

          <View style={styles.disclaimerPanel}>
            <Feather name="info" size={16} color="#0f71f2" style={{ marginTop: 2 }} />
            <Text style={styles.disclaimerText}>
              Note: These photos will be uploaded to your iClora Cloud and will be auto-synced in the background (may not work on latest android versions).
            </Text>
          </View>
        </ScrollView>

        <Pressable
          onPress={openConfirmModal}
          style={({ pressed }) => [
            styles.gradientCtaBtnWrapper,
            pressed && styles.gradientCtaBtnPressed,
            { marginTop: 12 },
          ]}
        >
          <LinearGradient
            colors={['#0f71f2', '#1d9bf0', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCtaBtn}
          >
            <Text style={styles.gradientCtaBtnText}>Confirm Backup</Text>
            <View style={styles.whiteCtaArrow}>
              <Feather name="arrow-up" size={14} color="#0f71f2" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderUploading = () => {
    const completedItems = uploadItems.filter((item) => item.status === 'done').length;
    const activeItem = uploadItems[currentUploadIndex] || uploadItems.find((item) => item.status !== 'done');
    const radarSpin = radarRotate.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const scaleAnim1 = pulseAnim1;
    const opacityAnim1 = pulseAnim1.interpolate({
      inputRange: [1, 2.2],
      outputRange: [0.7, 0],
    });

    const scaleAnim2 = pulseAnim2;
    const opacityAnim2 = pulseAnim2.interpolate({
      inputRange: [1, 1.6],
      outputRange: [0.5, 0],
    });

    const fillWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.contentWrap}>

        <Image
          source={require('../../assets/upload.gif')}
          style={styles.uploadGif}
          resizeMode="contain"
        />

        <Text style={styles.uploadingHeading}>Uploading to iClora <Text style={styles.uploadingHeadingPink}>Photos</Text></Text>
        <Text style={styles.uploadingCounter}>
          {progressPct}% Completed • {completedItems}/{uploadItems.length || selectedPhotos.length} Uploaded
        </Text>

        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: fillWidth }]}>
            <LinearGradient
              colors={['#0f71f2', '#38bdf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <View style={styles.logCard}>
          <Feather name="terminal" size={14} color="#64748b" style={{ marginTop: 2 }} />
          <Text style={styles.logText} numberOfLines={1}>{statusLog}</Text>
        </View>

        {etaSeconds !== null && !uploadError && (
          <View style={styles.etaCard}>
            <Feather name="clock" size={13} color="#0f71f2" />
            <View style={{ flex: 1 }}>
              <Text style={styles.etaLabel}>Estimated time remaining</Text>
              <Text style={styles.etaValue}>
                {etaSeconds <= 0
                  ? 'Almost done...'
                  : etaSeconds < 60
                  ? `${etaSeconds}s`
                  : etaSeconds < 3600
                  ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`
                  : `${Math.floor(etaSeconds / 3600)}h ${Math.floor((etaSeconds % 3600) / 60)}m`}
              </Text>
            </View>
            <View style={styles.etaFinishWrap}>
              <Text style={styles.etaFinishLabel}>Finishes at</Text>
              <Text style={styles.etaFinishTime}>
                {etaSeconds <= 0
                  ? 'Now'
                  : (() => {
                      const d = new Date(Date.now() + etaSeconds * 1000);
                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.liveUploadCard}>
          <View style={styles.liveUploadHeader}>
            <View>
              <Text style={styles.liveUploadTitle}>Live Backup Queue</Text>
              <Text style={styles.liveUploadSubtitle}>
                One photo uploads at a time based on server pacing.
              </Text>
            </View>
            <View style={styles.liveUploadBadge}>
              <Text style={styles.liveUploadBadgeText}>
                {activeItem ? `${currentUploadIndex + 1}/${uploadItems.length}` : 'Ready'}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={queueScrollRef}
            style={styles.liveUploadList}
            contentContainerStyle={styles.liveUploadListContent}
            showsVerticalScrollIndicator={false}
          >
            {uploadItems.slice(currentUploadIndex, currentUploadIndex + 2).map((item, localIndex) => {
              const absoluteIndex = currentUploadIndex + localIndex;
              const statusView = getUploadStatusView(item.status);
              const isActive = item.status !== 'queued' && item.status !== 'done' && item.status !== 'failed';
              return (
                <View key={item.id} style={[styles.liveUploadRow, isActive && styles.liveUploadRowActive]}>
                  <Image source={{ uri: item.uri }} style={styles.liveUploadThumb} />
                  <View style={styles.liveUploadInfo}>
                    <Text style={styles.liveUploadName} numberOfLines={1}>
                      {item.fileName || `Photo ${absoluteIndex + 1}`}
                    </Text>
                    <Text style={styles.liveUploadNote} numberOfLines={1}>
                      {item.note || formatBytes(item.fileSize) || 'Queued'}
                    </Text>
                  </View>
                  <View style={[styles.liveUploadStatusPill, { backgroundColor: statusView.bg }]}>
                    {isActive ? (
                      <Spinner size={12} color={statusView.color} />
                    ) : (
                      <Feather name={statusView.icon} size={12} color={statusView.color} />
                    )}
                    <Text style={[styles.liveUploadStatusText, { color: statusView.color }]}>
                      {statusView.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {uploadError ? (
          <View style={styles.uploadErrorCard}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.uploadErrorText}>{uploadError}</Text>
            <Pressable
              onPress={() => {

                const firstIncompleteIndex = uploadItems.findIndex(
                  (item) => item.status !== 'done'
                );
                const retryQueue = uploadItems.map((item) =>
                  item.status !== 'done' ? { ...item, status: 'queued', note: 'Ready' } : item
                );
                setUploadItems(retryQueue);
                resumeUploadPipeline({
                  uploadItems: retryQueue,
                  currentUploadIndex: Math.max(0, firstIncompleteIndex),
                  selectedPhotos: selectedPhotosRef.current,
                  progressPct: progressPct,
                  statusLog: 'Retrying backup...',
                  phase: 'uploading',
                });
              }}
              style={styles.uploadRetryButton}
            >
              <Text style={styles.uploadRetryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
      </View>
    );
  };

  const renderSuccess = () => {
    return (
      <View style={styles.contentWrap}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.successIllustration}>
            <Image
              source={require('../../assets/done.gif')}
              style={styles.successGif}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.successHeading}>Backup Completed!</Text>
          <Text style={styles.successSubtitle}>
            Your assets have been successfully synced. Your cloud storage cache has been updated in real-time.
          </Text>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Media Synced</Text>
              <Text style={styles.summaryValue}>{selectedPhotos.length} Items</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Storage Synced</Text>
              <Text style={styles.summaryValue}>{getSelectedStorageSize()} MB</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sync Status</Text>
              <Text style={styles.summaryValueSec}>Verified Safe</Text>
            </View>
          </View>

          <View style={styles.visionSuccessCard}>
            <View style={styles.visionSuccessIconWrap}>
              <Image
                source={require('../../assets/photos.webp')}
                style={styles.visionSuccessIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.visionSuccessTitle}>Vision AI Sync</Text>
                <View style={styles.visionSuccessBadge}>
                  <Text style={styles.visionSuccessBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.visionSuccessDesc}>
                Vision will be started automatically in the background as per server load.
              </Text>
            </View>
          </View>
        </ScrollView>

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.gradientCtaBtnWrapper,
            pressed && styles.gradientCtaBtnPressed,
            { marginTop: 12 },
          ]}
        >
          <LinearGradient
            colors={['#10b981', '#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCtaBtn}
          >
            <Text style={styles.gradientCtaBtnText}>Done</Text>
            <View style={styles.whiteCtaArrow}>
              <Feather name="check" size={14} color="#10b981" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderChecking = () => {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <Spinner size={36} color="#0f71f2" />
      </View>
    );
  };

  const getScreenContent = () => {
    switch (phase) {
      case 'checking':
        return renderChecking();
      case 'idle':
        return renderIdle();
      case 'preview':
        return renderPreview();
      case 'review':
        return renderReview();
      case 'uploading':
        return renderUploading();
      case 'success':
        return renderSuccess();
      default:
        return renderChecking();
    }
  };

  useEffect(() => {
    if (activeLightboxPhoto) {
      if (lightboxVisible && localPhoto && activeLightboxPhoto.id !== localPhoto.id) {
        setLightboxImageLoading(true);
        setLocalPhoto(activeLightboxPhoto);

        lightboxTranslateX.setValue(0);
        lightboxTranslateY.setValue(0);
        panX.current = 0;
        panY.current = 0;
        setIsZoomed(false);

        switchTranslateX.setValue(0);
        switchOpacity.setValue(1);
      } else {

        setLightboxImageLoading(true);
        setLocalPhoto(activeLightboxPhoto);
        setLightboxVisible(true);
        switchOpacity.setValue(1);
        switchTranslateX.setValue(0);

        lightboxOpacity.setValue(0);
        lightboxScale.setValue(0.85);
        lightboxTranslateX.setValue(0);
        lightboxTranslateY.setValue(0);
        infoTranslateY.setValue(450);
        setInfoVisible(false);
        panX.current = 0;
        panY.current = 0;
        setIsZoomed(false);

        Animated.parallel([
          Animated.timing(lightboxOpacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(lightboxScale, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
            easing: Easing.bezier(0.18, 0.9, 0.22, 1.08),
          }),
        ]).start();
      }
    }
  }, [activeLightboxPhoto]);

  const closeLightboxAnimated = () => {

    if (infoVisible) {
      Animated.timing(infoTranslateY, {
        toValue: 450,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }).start();
    }

    Animated.parallel([
      Animated.timing(lightboxOpacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
      Animated.timing(lightboxScale, {
        toValue: 0.85,
        duration: 360,
        useNativeDriver: true,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
    ]).start(() => {
      requestAnimationFrame(() => {
        setLightboxVisible(false);
        setLocalPhoto(null);
        setActiveLightboxPhoto(null);
        setInfoVisible(false);
        infoTranslateY.setValue(450);
        setLightboxImageLoading(false);
      });
    });
  };

  const toggleFavorite = (photoId) => {
    setFavorites(prev => ({
      ...prev,
      [photoId]: !prev[photoId]
    }));
  };

  const toggleInfoPanel = () => {
    if (infoVisible) {
      Animated.timing(infoTranslateY, {
        toValue: 450,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }).start(() => {
        setInfoVisible(false);
      });
    } else {
      setInfoVisible(true);
      infoTranslateY.setValue(450);
      Animated.timing(infoTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.18, 0.9, 0.22, 1.08),
      }).start();
    }
  };

  const zoomIn = () => {
    setIsZoomed(true);
    Animated.parallel([
      Animated.spring(lightboxScale, {
        toValue: 2.2,
        useNativeDriver: true,
        friction: 8,
        tension: 30,
      }),
      Animated.spring(lightboxTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(lightboxTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const zoomOut = () => {
    setIsZoomed(false);
    panX.current = 0;
    panY.current = 0;
    Animated.parallel([
      Animated.spring(lightboxScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 30,
      }),
      Animated.spring(lightboxTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(lightboxTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (isZoomedRef.current) {
        zoomOut();
      } else {
        zoomIn();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const getPhotoIndexById = useCallback((photoId) => selectedPhotosRef.current.findIndex((p) => p.id === photoId), []);

  const jumpToPhoto = useCallback((photo, directionHint = 1) => {
    const currentLocalPhoto = localPhotoRef.current;
    if (!photo || !currentLocalPhoto || photo.id === currentLocalPhoto.id) return;
    switchDirectionRef.current = directionHint >= 0 ? 1 : -1;
    setActiveLightboxPhoto(photo);
  }, [setActiveLightboxPhoto]);

  const handleFilmstripPress = useCallback((photo) => {
    const currentIdx = localPhotoRef.current ? getPhotoIndexById(localPhotoRef.current.id) : -1;
    const nextIdx = getPhotoIndexById(photo.id);
    const directionHint = nextIdx > currentIdx ? 1 : -1;
    jumpToPhoto(photo, directionHint);
  }, [getPhotoIndexById, jumpToPhoto]);

  const navigateBySwipe = useCallback((step) => {
    const currentLocalPhoto = localPhotoRef.current;
    const currentSelectedPhotos = selectedPhotosRef.current;
    if (!currentLocalPhoto || currentSelectedPhotos.length < 2) return false;
    const currentIdx = getPhotoIndexById(currentLocalPhoto.id);
    if (currentIdx < 0) return false;
    const nextIdx = currentIdx + step;
    if (nextIdx < 0 || nextIdx >= currentSelectedPhotos.length) return false;
    switchDirectionRef.current = step > 0 ? 1 : -1;
    setActiveLightboxPhoto(currentSelectedPhotos[nextIdx]);
    return true;
  }, [getPhotoIndexById, setActiveLightboxPhoto]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (e, gestureState) => {
        if (isZoomedRef.current) {
          lightboxTranslateX.setValue(panX.current + gestureState.dx);
          lightboxTranslateY.setValue(panY.current + gestureState.dy);
        } else {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          const isHorizontalIntent = absDx > absDy;

          if (isHorizontalIntent) {
            lightboxTranslateX.setValue(gestureState.dx * 0.16);
          } else {
            lightboxTranslateY.setValue(gestureState.dy);
          }

          if (!isHorizontalIntent && gestureState.dy > 0) {
            const dragProgress = Math.min(gestureState.dy / 300, 1);
            lightboxScale.setValue(1 - dragProgress * 0.15);
            lightboxOpacity.setValue(1 - dragProgress * 0.5);
          }
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          handleImageTap();
          return;
        }

        if (isZoomedRef.current) {
          panX.current += gestureState.dx;
          panY.current += gestureState.dy;

          const limitX = width * 0.6;
          const limitY = height * 0.48;
          let targetX = panX.current;
          let targetY = panY.current;
          let needsSpring = false;

          if (targetX > limitX) {
            targetX = limitX;
            needsSpring = true;
          } else if (targetX < -limitX) {
            targetX = -limitX;
            needsSpring = true;
          }

          if (targetY > limitY) {
            targetY = limitY;
            needsSpring = true;
          } else if (targetY < -limitY) {
            targetY = -limitY;
            needsSpring = true;
          }

          if (needsSpring) {
            panX.current = targetX;
            panY.current = targetY;
            Animated.parallel([
              Animated.spring(lightboxTranslateX, {
                toValue: targetX,
                useNativeDriver: true,
                friction: 7,
              }),
              Animated.spring(lightboxTranslateY, {
                toValue: targetY,
                useNativeDriver: true,
                friction: 7,
              }),
            ]).start();
          }
        } else {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          const isHorizontalSwipe = absDx > absDy && absDx > 42;

          if (isHorizontalSwipe) {
            const step = gestureState.dx < 0 ? 1 : -1;
            const currentLocalPhoto = localPhotoRef.current;
            const currentSelectedPhotos = selectedPhotosRef.current;
            const currentIdx = getPhotoIndexById(currentLocalPhoto?.id);
            const canMove = currentLocalPhoto && currentIdx >= 0 && currentIdx + step >= 0 && currentIdx + step < currentSelectedPhotos.length;

            if (canMove) {
              lightboxTranslateX.setValue(0);
              navigateBySwipe(step);
            } else {
              Animated.spring(lightboxTranslateX, {
                toValue: 0,
                useNativeDriver: true,
                friction: 6,
              }).start();
            }
            return;
          }

          if (gestureState.dy > 120) {
            closeLightboxAnimated();
          } else {
            Animated.parallel([
              Animated.spring(lightboxTranslateY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 6,
              }),
              Animated.spring(lightboxScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
              }),
              Animated.spring(lightboxOpacity, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
              }),
            ]).start();
          }
        }
      },
    })
  ).current;

  const getPhotoDetails = (photo) => {
    if (!photo) return {};
    const exif = photo.exif || {};
    const widthVal = Number(photo.width) || 0;
    const heightVal = Number(photo.height) || 0;
    const megapixels = formatMegapixels(widthVal, heightVal);
    const sizeVal = formatBytes(photo.fileSize) || 'Unknown';
    const format = getFormatFromPhoto(photo);
    const filename = photo.fileName || getUriFilename(photo.uri) || 'Unknown file';

    const make = typeof exif.Make === 'string' ? exif.Make.trim() : '';
    const model = typeof exif.Model === 'string' ? exif.Model.trim() : '';
    const cameraName = [make, model].filter(Boolean).join(' ');

    const focalRaw = exif.FocalLength ?? exif.FocalLenIn35mmFilm;
    const focalLength = normalizeFocalLength(focalRaw);
    const focalLabel = focalLength ? `${Math.round(focalLength)}mm` : '-';

    const fNumber = normalizeAperture(exif.FNumber ?? exif.ApertureValue);
    const apertureLabel = fNumber ? `f/${fNumber.toFixed(2).replace(/\.00$/, '')}` : '-';

    const iso = getIsoFromExif(exif);
    const isoLabel = iso ? `ISO ${iso}` : '-';

    const exposureComp = exif.ExposureBiasValue;
    const exposureCompLabel = typeof exposureComp === 'number'
      ? `${exposureComp > 0 ? '+' : ''}${Number(exposureComp.toFixed(1))} ev`
      : '-';

    const lensModel = typeof exif.LensModel === 'string' ? exif.LensModel.trim() : '';
    const lensInfoPieces = [cameraName, lensModel, focalLength ? `${Math.round(focalLength)}mm` : null, apertureLabel !== '-' ? apertureLabel : null]
      .filter(Boolean);
    const lensInfo = lensInfoPieces.length > 0 ? lensInfoPieces.join(' • ') : 'No camera metadata available';

    const typeLabel = cameraName ? 'Camera' : format === 'PNG' ? 'Screenshot' : 'Photo';
    const gridValues = [isoLabel, focalLabel, exposureCompLabel, apertureLabel, sizeVal];

    const dateSource = parseExifDate(exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime || photo.pickedAt);
    const dateObj = dateSource || new Date();
    const day = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
    const time = dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const datePart = dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      filename,
      width: widthVal,
      height: heightVal,
      megapixels,
      size: sizeVal,
      format,
      typeLabel,
      lensInfo,
      gridValues,
      day,
      time,
      dateString: `${day} • ${datePart} • ${time}`,
    };
  };

  const lightboxDetails = useMemo(() => {
    if (!localPhoto) return null;
    return getPhotoDetails(localPhoto);
  }, [localPhoto]);

  const renderLightboxModal = () => {
    if (!lightboxVisible || !localPhoto) return null;

    const details = lightboxDetails || getPhotoDetails(localPhoto);
    const isFav = !!favorites[localPhoto.id];

    const imageTranslateY = infoTranslateY.interpolate({
      inputRange: [0, 450],
      outputRange: [-90, 0],
    });

    const imageScaleOffset = infoTranslateY.interpolate({
      inputRange: [0, 450],
      outputRange: [0.82, 1],
    });

    const combinedScale = Animated.multiply(lightboxScale, imageScaleOffset);
    const combinedTranslateY = Animated.add(lightboxTranslateY, imageTranslateY);
    const combinedTranslateX = Animated.add(lightboxTranslateX, switchTranslateX);

    return (
      <Animated.View
        style={[styles.lightboxContainer, { opacity: lightboxOpacity }]}
        renderToHardwareTextureAndroid
      >

        <Pressable style={styles.lightboxBackdrop} onPress={closeLightboxAnimated} />

        <Animated.View
          style={[
            styles.lightboxImageContainer,
            {
              opacity: switchOpacity,
              transform: [
                { scale: combinedScale },
                { translateX: combinedTranslateX },
                { translateY: combinedTranslateY },
              ],
            },
          ]}
          {...panResponder.panHandlers}
          renderToHardwareTextureAndroid
        >
          <Image
            key={localPhoto.id || localPhoto.uri}
            source={{ uri: localPhoto.uri }}
            style={styles.lightboxFullImage}
            resizeMode="contain"
            resizeMethod={IS_ANDROID ? 'resize' : 'auto'}
            fadeDuration={0}
            progressiveRenderingEnabled={IS_ANDROID}
            onLoadStart={() => setLightboxImageLoading(true)}
            onLoadEnd={() => setLightboxImageLoading(false)}
            onError={() => setLightboxImageLoading(false)}
          />

          {lightboxImageLoading && (
            <View style={styles.lightboxLoaderOverlay} pointerEvents="none">
              <View style={styles.lightboxLoaderBubble}>
                <Spinner size={34} color="#0f172a" />
              </View>
            </View>
          )}
        </Animated.View>

        <View style={[styles.lightboxHeader, { paddingTop: insets.top }]}>
          <View style={styles.lightboxTopRow}>

            <Pressable
              onPress={closeLightboxAnimated}
              style={({ pressed }) => [
                styles.lightboxCircleBtn,
                pressed && styles.lightboxCircleBtnPressed,
              ]}
            >
              <Feather name="chevron-left" size={22} color="#0f172a" />
            </Pressable>

            <View style={styles.lightboxDateCapsule}>
              <Text style={styles.lightboxDateTitle}>{details.day}</Text>
              <Text style={styles.lightboxDateSub}>{details.time}</Text>
            </View>

            <View style={{ width: 38 }} />
          </View>
        </View>

        {infoVisible && (
          <Animated.View
            style={[
              styles.infoPanel,
              { transform: [{ translateY: infoTranslateY }] }
            ]}
          >

            <View style={[styles.infoDateRow, { marginTop: 16 }]}>
              <Text style={styles.infoDateText}>{details.dateString}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.filenameRow}>
              <Feather name="cloud" size={16} color="#475569" style={{ marginRight: 8 }} />
              <Text style={styles.filenameText}>{details.filename}</Text>
            </View>

            <View style={styles.techBox}>
              <View style={styles.techBoxHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.techBoxTitle}>{details.typeLabel}</Text>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>{details.format}</Text>
                  </View>
                </View>
                <Feather name="crop" size={14} color="#475569" />
              </View>

              <Text style={styles.lensInfoText}>{details.lensInfo}</Text>
              <Text style={styles.techDetailsText}>
                {details.megapixels} • {details.width} × {details.height}
              </Text>

              <View style={styles.techDashesGrid}>
                {details.gridValues.map((val, idx) => (
                  <View key={idx} style={styles.techDashCol}>
                    <Text style={styles.techDashText}>{val}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.photoSizeRow}>
              <Text style={styles.photoSizeLabel}>Photo size</Text>
              <Text style={styles.photoSizeValue}>{details.size}</Text>
            </View>
          </Animated.View>
        )}

        {!infoVisible && selectedPhotos.length > 1 && (
          <View style={styles.filmstripWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filmstripContent}
              keyboardShouldPersistTaps="always"
            >
              {selectedPhotos.map((photo) => {
                const isActive = photo.id === localPhoto?.id;
                return (
                  <FilmstripPhotoItem
                    key={photo.id}
                    photo={photo}
                    isActive={isActive}
                    onPress={handleFilmstripPress}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.lightboxBottomBar, { paddingBottom: insets.bottom }]}>
          <View style={styles.lightboxBottomRow}>

            <Pressable
              onPress={toggleInfoPanel}
              style={({ pressed }) => [
                styles.lightboxCircleBtnWhite,
                infoVisible && styles.lightboxCircleBtnWhiteActive,
                pressed && styles.lightboxCircleBtnPressed,
              ]}
            >
              <Feather
                name="info"
                size={20}
                color="#0f71f2"
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.lightboxCircleBtnDelete,
                pressed && styles.lightboxCircleBtnPressed,
              ]}
              onPress={openDeleteModal}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      <View style={styles.navbar}>
        <Pressable
          onPress={phase === 'uploading' ? null : handleNavbarBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
            phase === 'uploading' && { opacity: 0.3 },
          ]}
          disabled={phase === 'uploading'}
        >
          <Feather name="chevron-left" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.navTitle}>Upload Gallery</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.View
        style={[
          styles.mainBody,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {getScreenContent()}
      </Animated.View>

      {renderLightboxModal()}

      <Modal
        visible={deleteModalRendered}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalRoot}>

          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal}>
            <Animated.View style={[styles.deleteBackdrop, { opacity: deleteBackdropOpacity }]} />
          </Pressable>

          <Animated.View
            style={[styles.deleteSheet, { transform: [{ translateY: deleteSheetTranslateY }] }]}
          >
            <View style={styles.deleteSheetHandle} />

            <View style={styles.deleteSheetIcon}>
              <Feather name="trash-2" size={26} color="#ef4444" />
            </View>

            <Text style={styles.deleteSheetTitle}>Remove Photo?</Text>
            <Text style={styles.deleteSheetBody}>
              Are you sure you want to deselect this photo? It will not be uploaded to iClora.
            </Text>

            <View style={styles.deleteSheetActions}>
              <Pressable
                onPress={closeDeleteModal}
                style={({ pressed }) => [styles.deleteCancelBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.deleteCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={confirmDeletePhoto}
                style={({ pressed }) => [styles.deleteConfirmBtn, pressed && { opacity: 0.7 }]}
              >
                <Feather name="trash-2" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.deleteConfirmBtnText}>Remove</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={confirmModalRendered}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.deleteModalRoot}>

          <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirmModal}>
            <Animated.View style={[styles.deleteBackdrop, { opacity: confirmBackdropOpacity }]} />
          </Pressable>

          <Animated.View
            style={[styles.deleteSheet, { transform: [{ translateY: confirmSheetTranslateY }] }]}
          >
            <View style={styles.deleteSheetHandle} />

            <View style={[styles.deleteSheetIcon, { backgroundColor: '#eff6ff' }]}>
              <Feather name="cloud-lightning" size={26} color="#0f71f2" />
            </View>

            <Text style={styles.deleteSheetTitle}>Are you sure?</Text>
            <Text style={styles.deleteSheetBody}>
              Are you sure you want to back up these {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} to your iClora Cloud secure vault?
            </Text>

            <View style={styles.deleteSheetActions}>
              <Pressable
                onPress={closeConfirmModal}
                style={({ pressed }) => [styles.deleteCancelBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.deleteCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={confirmBackupUpload}
                style={({ pressed }) => [
                  styles.deleteConfirmBtn,
                  { backgroundColor: '#0f71f2' },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Text style={styles.deleteConfirmBtnText}>Start Backup</Text>
                <View style={[styles.whiteCtaArrow, { marginLeft: 8 }]}>
                  <Feather name="arrow-up" size={14} color="#0f71f2" />
                </View>
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  backBtnPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  navTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  mainBody: { flex: 1 },
  contentWrap: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 24,
    paddingBottom: IS_ANDROID ? 24 : 38,
    alignItems: 'center',
  },

  idleContainer: {
    flex: 1,
    width: '100%',
  },
  idleScroll: {
    flex: 1,
  },
  idleScrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },

  duckHeroWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  duckGlowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#eff6ff',
    opacity: 0.85,
  },
  duckGif: {
    width: 170,
    height: 170,
  },

  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 290,
  },

  featurePillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    letterSpacing: 0.1,
  },

  policyCard: {
    width: '100%',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    marginBottom: 8,
  },
  policyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  policyCardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  policyCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: -0.1,
  },
  policyCardBody: {
    fontSize: 12,
    color: '#78350f',
    fontWeight: '500',
    lineHeight: 17,
  },
  policyCardBold: {
    fontWeight: '800',
    color: '#92400e',
  },

  idleBottomSticky: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: IS_ANDROID ? 20 : 34,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxActive: {
    borderColor: '#0f71f2',
    backgroundColor: '#0f71f2',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 16,
  },
  gradientCtaBtnDisabled: {
    opacity: 0.55,
  },
  gradientCtaBtnTextDisabled: {
    color: '#94a3b8',
  },
  whiteCtaArrowDisabled: {
    backgroundColor: '#e2e8f0',
  },

  previewDuckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  previewDuckBannerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  previewHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  previewBannerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 3,
  },
  previewDuckMini: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewDuckGif: {
    width: 62,
    height: 62,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  previewStorageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewStorageText: {
    color: '#0f71f2',
    fontSize: 12,
    fontWeight: '800',
  },
  previewCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewCounterText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  preparingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  preparingPillText: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '700',
  },

  gridScroll: {
    flex: 1,
    width: '100%',
    marginBottom: 16,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
    paddingBottom: 24,
  },
  gridCell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridImage: { width: '100%', height: '100%' },
  gridCellAdd: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0f71f2',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  addMoreText: {
    color: '#0f71f2',
    fontSize: 11,
    fontWeight: '800',
  },
  gridCellSkeleton: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingContainer: {
    width: '100%',
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 6,
    paddingVertical: 32,
  },
  waitingAaGif: {
    width: 200,
    height: 200,
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  waitingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: -0.1,
  },
  preparingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  preparingBannerText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },

  uploadingCenterpiece: {
    height: 142,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  uploadGif: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginBottom: 4,
  },
  uploadingHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  uploadingHeadingPink: {
    color: '#ff2d55',
  },
  uploadingCounter: {
    color: '#0f71f2',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 18,
  },
  logText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    flex: 1,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  etaLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  etaValue: {
    color: '#0f71f2',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  etaFinishWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  etaFinishLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  etaFinishTime: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  liveUploadCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 14,
    marginTop: 14,
  },
  liveUploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  liveUploadTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  liveUploadSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 2,
    maxWidth: width - 150,
  },
  liveUploadBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveUploadBadgeText: {
    color: '#0f71f2',
    fontSize: 11,
    fontWeight: '900',
  },
  liveUploadList: {
    maxHeight: 135,
    width: '100%',
  },
  liveUploadListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  liveUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 8,
  },
  liveUploadRowActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  liveUploadThumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  liveUploadInfo: {
    flex: 1,
    minWidth: 0,
  },
  liveUploadName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  liveUploadNote: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  liveUploadStatusPill: {
    minWidth: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveUploadStatusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  uploadErrorCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  uploadErrorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  uploadRetryButton: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  uploadRetryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },

  successIllustration: {
    height: 160,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successGif: {
    width: 140,
    height: 140,
    alignSelf: 'center',
  },
  successHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 290,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    marginTop: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: { height: 1, backgroundColor: '#e2e8f0' },
  summaryLabel: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  summaryValue: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  summaryValueSec: { color: '#10b981', fontSize: 13, fontWeight: '800' },

  visionSuccessCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visionSuccessIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visionSuccessIcon: {
    width: 24,
    height: 24,
  },
  visionSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  visionSuccessBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#ffe4e6',
  },
  visionSuccessBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f43f5e',
  },
  visionSuccessDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },

  gradientCtaBtnWrapper: {
    width: '100%',
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

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 100,
  },
  mockPickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.78,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: HORIZONTAL_PADDING,
    zIndex: 101,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  sheetCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  sheetCounterText: {
    color: '#0f71f2',
    fontSize: 12,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  sheetGridScroll: {
    flex: 1,
    width: '100%',
    marginBottom: 10,
  },
  sheetGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
    paddingBottom: 24,
  },
  sheetGridCell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  sheetGridCellActive: {
    borderColor: '#0f71f2',
  },
  sheetGridImage: {
    width: '100%',
    height: '100%',
  },
  selectBadgeCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBadgeCircleActive: {
    borderColor: '#ffffff',
    backgroundColor: '#0f71f2',
  },
  sheetFooter: {
    paddingTop: 12,
    paddingBottom: IS_ANDROID ? 20 : 34,
    borderTopWidth: 1.5,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },

  lightboxContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  lightboxImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxFullImage: {
    width: width,
    height: height * 0.85,
  },
  lightboxLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    zIndex: 20,
  },
  lightboxLoaderBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  lightboxHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 201,
  },
  lightboxTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: IS_ANDROID ? 16 : 10,
    height: 60,
  },
  lightboxCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCircleBtnWhite: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCircleBtnWhiteActive: {
    backgroundColor: 'transparent',
  },
  lightboxCircleBtnDelete: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCircleBtnPressed: {
    opacity: 0.7,
  },
  lightboxDateCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxDateTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  lightboxDateSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: IS_ANDROID ? 80 : 100,
    zIndex: 202,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...(IS_ANDROID ? {} : {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
    }),
  },
  captionInput: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
    marginBottom: 14,
  },
  infoDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoDateText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  adjustBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
  },
  adjustBtnText: {
    color: '#3478f6',
    fontSize: 13,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  filenameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filenameText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  techBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  techBoxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  techBoxTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  formatBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  formatBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
  },
  lensInfoText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  techDetailsText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
  },
  techDashesGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  techDashCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techDashText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  photoSizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  photoSizeLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  photoSizeValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  filmstripWrapper: {
    position: 'absolute',
    bottom: IS_ANDROID ? 80 : 100,
    left: 0,
    right: 0,
    height: 52,
    zIndex: 201,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
  },
  filmstripContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filmstripCell: {
    width: 32,
    height: 44,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filmstripCellActive: {
    borderColor: '#0f71f2',
  },
  filmstripImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  lightboxBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 203,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  lightboxBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    height: 60,
  },
  lightboxBarIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCentralCapsule: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 16,
  },
  capsuleIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleIconBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  deleteModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  deleteSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  deleteSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 24,
  },
  deleteSheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  deleteSheetBody: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  deleteSheetActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteConfirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  reviewHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  reviewCounterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  reviewCounterText: {
    color: '#0f71f2',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewSubtitle: {
    width: '100%',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 20,
  },
  reviewPhotosWrapper: {
    width: '100%',
    height: 96,
    marginBottom: 24,
  },
  reviewPhotosContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  reviewPhotoCard: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  reviewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  analyticsWidget: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  analyticsDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  analyticsLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  analyticsValueHighlight: {
    color: '#0f71f2',
    fontSize: 14,
    fontWeight: '800',
  },
  analyticsValue: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  analyticsValueAfter: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
  },
  analyticsVisualContainer: {
    marginTop: 14,
    width: '100%',
  },
  analyticsVisualLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  visualTrackLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  analyticsTrack: {
    height: 8,
    width: '100%',
    backgroundColor: '#cbd5e1',
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  analyticsFillUsed: {
    height: '100%',
    backgroundColor: '#94a3b8',
  },
  analyticsFillBackup: {
    height: '100%',
    backgroundColor: '#0f71f2',
  },
  analyticsLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  disclaimerPanel: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
    lineHeight: 17,
  },
  reviewScroll: {
    flex: 1,
    width: '100%',
  },
  reviewScrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  visionSyncPanel: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visionLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visionLogoIcon: {
    width: 32,
    height: 32,
  },
  visionSyncTextWrap: {
    flex: 1,
  },
  visionSyncTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  visionSyncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  freeBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  freeBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
  },
  visionSyncDesc: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 15,
  },
  uploadStatusPanel: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  uploadStatusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  uploadStatusBody: {
    flex: 1,
    minWidth: 0,
  },
  uploadStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  uploadStatusTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  serverStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serverStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serverStatusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  uploadStatusMetrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  uploadStatusMetric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  uploadStatusMetricDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  uploadStatusMetricLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  uploadStatusMetricValue: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
  },
  uploadStatusDesc: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  loadingGalleryWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  loadingGalleryText: {
    marginTop: 16,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
