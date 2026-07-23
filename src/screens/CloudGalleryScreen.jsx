import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { readAuthSession } from '../auth/sessionStore';
import Spinner from '../components/Spinner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FETCHING_GIF = require('../../assets/9bb1d693658133.5e98ba7eb53fc.gif');
const NO_GIF = require('../../assets/no.gif');
const AA_GIF = require('../../assets/aa.gif');
const FLOATING_NAV_WIDTH = 232;
const FLOATING_NAV_HEIGHT = 54;
const FLOATING_NAV_PADDING = 6;
const FLOATING_NAV_INNER_WIDTH = FLOATING_NAV_WIDTH - FLOATING_NAV_PADDING * 2;
const FLOATING_NAV_ACTIVE_WIDTH = 144;
const FLOATING_NAV_INACTIVE_WIDTH = FLOATING_NAV_INNER_WIDTH - FLOATING_NAV_ACTIVE_WIDTH;
const FLOATING_NAV_HIT_WIDTH = FLOATING_NAV_INNER_WIDTH / 2;
const DEFAULT_BACKEND_BASE_URL = '';
const ICLORA_WEBSITE_URL = process.env.EXPO_PUBLIC_ICLORA_WEBSITE_URL || 'https://www.iclora.app';
const CLOUD_GALLERY_CACHE_KEY = 'iclora.cloud.gallery.photos.v1';
const CLOUD_GALLERY_CACHE_FILE = `${FileSystem.documentDirectory || ''}iclora-cloud-gallery-cache.json`;

const TEMPLATE_PHOTOS = [
  {
    title: 'Yosemite Valley Sunset',
    uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 20, 2026 at 6:42 PM',
    shortDate: 'May 20',
    location: 'Yosemite National Park, CA',
    bytes: 4892012,
    width: 4032,
    height: 3024,
    format: 'HEIC',
    favourite: true,
    deleted: false,
    uploadedAt: '2026-05-20T18:42:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Mountain', 'Sunset', 'Valley', 'Trees', 'Orange', 'Landscape', 'Nature', 'Dad'],
  },
  {
    title: 'Kyoto Bamboo Path',
    uri: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 19, 2026 at 9:15 AM',
    shortDate: 'May 19',
    location: 'Arashiyama, Kyoto, Japan',
    bytes: 3120455,
    width: 3000,
    height: 4000,
    format: 'JPEG',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-19T09:15:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Bamboo', 'Forest', 'Path', 'Green', 'Kyoto', 'Japan', 'Trees', 'Mom'],
  },
  {
    title: 'Swiss Alps Panorama',
    uri: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1000&auto=format&fit=crop&q=80',
    type: 'video',
    resourceType: 'image',
    date: 'May 18, 2026 at 2:30 PM',
    shortDate: 'May 18',
    location: 'Zermatt, Switzerland',
    bytes: 5629104,
    width: 4032,
    height: 3024,
    format: 'MP4',
    favourite: true,
    deleted: false,
    uploadedAt: '2026-05-18T14:30:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Snow', 'Mountain', 'Alps', 'Sky', 'Clouds', 'Peak', 'Landscape'],
    isVideo: true,
    duration: '00:12',
  },
  {
    title: 'Santorini Blue Dome',
    uri: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 17, 2026 at 11:20 AM',
    shortDate: 'May 17',
    location: 'Oia, Santorini, Greece',
    bytes: 2950341,
    width: 3264,
    height: 2448,
    format: 'JPEG',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-17T11:20:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Ocean', 'Santorini', 'Greece', 'Blue Dome', 'Architecture', 'White', 'Alice'],
  },
  {
    title: 'Skyscraper Geometry',
    uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 15, 2026 at 4:10 PM',
    shortDate: 'May 15',
    location: 'Manhattan, New York',
    bytes: 4205190,
    width: 3840,
    height: 2880,
    format: 'PNG',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-15T16:10:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['City', 'Skyscraper', 'New York', 'Glass', 'Reflection', 'Architecture', 'Bob'],
  },
  {
    title: 'Cozy Fireplace Cabin',
    uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 12, 2026 at 8:50 PM',
    shortDate: 'May 12',
    location: 'Lake Tahoe, Nevada',
    bytes: 3890204,
    width: 4000,
    height: 3000,
    format: 'JPEG',
    favourite: true,
    deleted: false,
    uploadedAt: '2026-05-12T20:50:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Cabin', 'Cozy', 'Fireplace', 'Interior', 'Wood', 'Night', 'Warm', 'Dad', 'Mom'],
  },
  {
    title: 'Artisanal Neapolitan Pizza',
    uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 10, 2026 at 1:15 PM',
    shortDate: 'May 10',
    location: 'Naples, Italy',
    bytes: 2540112,
    width: 3024,
    height: 3024,
    format: 'HEIC',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-10T13:15:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Food', 'Pizza', 'Italy', 'Tomato', 'Basil', 'Gourmet', 'Lunch', 'Alice', 'Bob'],
  },
  {
    title: 'Starry Sky over Joshua Tree',
    uri: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1000&auto=format&fit=crop&q=80',
    type: 'video',
    resourceType: 'image',
    date: 'May 08, 2026 at 11:55 PM',
    shortDate: 'May 08',
    location: 'Joshua Tree, California',
    bytes: 6109403,
    width: 4032,
    height: 3024,
    format: 'MP4',
    favourite: true,
    deleted: false,
    uploadedAt: '2026-05-08T23:55:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Night', 'Stars', 'Milky Way', 'Desert', 'Joshua Tree', 'Sky', 'Space', 'Dad'],
    isVideo: true,
    duration: '00:25',
  },
  {
    title: 'Sahara Desert Dunes',
    uri: 'https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'May 05, 2026 at 5:30 PM',
    shortDate: 'May 05',
    location: 'Sahara Desert, Morocco',
    bytes: 3450912,
    width: 3264,
    height: 2448,
    format: 'JPEG',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-05T17:30:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Desert', 'Sand', 'Dunes', 'Morocco', 'Sunlight', 'Golden', 'Shadows', 'Mom'],
  },
  {
    title: 'Tokyo Neon Shinjuku',
    uri: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&auto=format&fit=crop&q=80',
    type: 'video',
    resourceType: 'image',
    date: 'May 03, 2026 at 9:40 PM',
    shortDate: 'May 03',
    location: 'Shinjuku, Tokyo, Japan',
    bytes: 4710294,
    width: 3840,
    height: 2560,
    format: 'MP4',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-05-03T21:40:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Tokyo', 'Japan', 'Neon', 'Night', 'City', 'Lights', 'Streets'],
    isVideo: true,
    duration: '00:19',
  },
  {
    title: 'Adorable Tabby Kitten',
    uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'Apr 28, 2026 at 3:20 PM',
    shortDate: 'Apr 28',
    location: 'San Francisco, CA',
    bytes: 2190532,
    width: 3000,
    height: 3000,
    format: 'JPEG',
    favourite: true,
    deleted: false,
    uploadedAt: '2026-04-28T15:20:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Cat', 'Pet', 'Animal', 'Kitten', 'Cute', 'Indoor', 'Fluffy'],
  },
  {
    title: 'Fluid Pastel Painting',
    uri: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1000&auto=format&fit=crop&q=80',
    type: 'photo',
    resourceType: 'image',
    date: 'Apr 25, 2026 at 11:00 AM',
    shortDate: 'Apr 25',
    location: 'Art Studio, CA',
    bytes: 5120485,
    width: 4500,
    height: 3000,
    format: 'PNG',
    favourite: false,
    deleted: false,
    uploadedAt: '2026-04-25T11:00:00.000Z',
    syncedBy: 'sanket@iclora.app',
    deviceName: 'Google Pixel 8 Pro',
    visionTags: ['Abstract', 'Art', 'Pastel', 'Colors', 'Painting', 'Background', 'Alice'],
  },
];

function generate150Photos() {
  const photos = [];
  const locations = [
    'Yosemite National Park, CA',
    'Arashiyama, Kyoto, Japan',
    'Zermatt, Switzerland',
    'Oia, Santorini, Greece',
    'Manhattan, New York',
    'Lake Tahoe, Nevada',
    'Naples, Italy',
    'Joshua Tree, California',
    'Sahara Desert, Morocco',
    'Shinjuku, Tokyo, Japan',
    'San Francisco, CA',
    'Art Studio, CA',
  ];

  const devices = [
    'Google Pixel 8 Pro',
    'iPhone 15 Pro Max',
    'Samsung Galaxy S24 Ultra',
    'Sony Alpha 7R V',
  ];

  const formats = ['HEIC', 'JPEG', 'PNG', 'WEBP'];

  for (let i = 0; i < 150; i++) {
    const template = TEMPLATE_PHOTOS[i % TEMPLATE_PHOTOS.length];
    const location = locations[i % locations.length];
    const device = devices[i % devices.length];
    const format = template.isVideo ? 'MP4' : formats[i % formats.length];
    const favourite = i % 7 === 0;

    const baseDate = new Date('2026-05-20T18:42:00.000Z');
    baseDate.setHours(baseDate.getHours() - i * 4);
    const uploadedAt = baseDate.toISOString();

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const datePart = baseDate.toLocaleDateString('en-US', dateOptions);
    const timePart = baseDate.toLocaleTimeString('en-US', timeOptions);
    const date = `${datePart} at ${timePart}`;
    const shortDate = baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const tags = [...template.visionTags];
    if (favourite) tags.push('Favourite');
    if (template.isVideo) tags.push('Video');

    photos.push({
      id: `cloud-${i + 1}`,
      title: `${template.title} #${i + 1}`,
      uri: template.uri,
      type: template.type,
      resourceType: template.resourceType,
      date,
      shortDate,
      location,
      bytes: template.bytes + (i * 20381) % 450000,
      width: template.width,
      height: template.height,
      format,
      favourite,
      deleted: false,
      uploadedAt,
      syncedBy: 'sanket@iclora.app',
      deviceName: device,
      visionTags: tags,
      isVideo: template.isVideo,
      duration: template.duration,
    });
  }

  photos.push(
    {
      id: 'deleted-151',
      title: 'Blurry Ocean Sunrise',
      uri: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1000&auto=format&fit=crop&q=80',
      type: 'photo',
      resourceType: 'image',
      date: 'Apr 10, 2026 at 6:00 AM',
      shortDate: 'Apr 10',
      location: 'Santa Monica Beach, CA',
      bytes: 2840915,
      width: 3264,
      height: 2448,
      format: 'JPEG',
      favourite: false,
      deleted: true,
      uploadedAt: '2026-04-10T06:00:00.000Z',
      syncedBy: 'sanket@iclora.app',
      deviceName: 'Google Pixel 8 Pro',
      visionTags: ['Ocean', 'Sunrise', 'Beach', 'Sand', 'Water', 'Blurry'],
    },
    {
      id: 'deleted-152',
      title: 'Overexposed Coffee Cup',
      uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&auto=format&fit=crop&q=80',
      type: 'video',
      resourceType: 'image',
      date: 'Apr 05, 2026 at 10:15 AM',
      shortDate: 'Apr 05',
      location: 'Downtown Cafe, OR',
      bytes: 1980421,
      width: 3024,
      height: 3024,
      format: 'MP4',
      favourite: false,
      deleted: true,
      uploadedAt: '2026-04-05T10:15:00.000Z',
      syncedBy: 'sanket@iclora.app',
      deviceName: 'Google Pixel 8 Pro',
      visionTags: ['Coffee', 'Cafe', 'Cup', 'Morning', 'Breakfast', 'Overexposed'],
      isVideo: true,
      duration: '00:17',
    }
  );

  return photos;
}

const INITIAL_PHOTOS = [];

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

function getWebStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.localStorage;
}

async function readCachedCloudPhotos(ownerUid = '') {
  try {
    const webStorage = getWebStorage();
    let raw = webStorage ? webStorage.getItem(CLOUD_GALLERY_CACHE_KEY) : '';
    if (!raw && !webStorage && CLOUD_GALLERY_CACHE_FILE) {
      const info = await FileSystem.getInfoAsync(CLOUD_GALLERY_CACHE_FILE);
      if (info.exists) raw = await FileSystem.readAsStringAsync(CLOUD_GALLERY_CACHE_FILE);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.uid && ownerUid && parsed.uid !== ownerUid) return [];
    return Array.isArray(parsed?.photos) ? parsed.photos : [];
  } catch {
    return [];
  }
}

async function saveCachedCloudPhotos(photos, ownerUid = '') {
  try {
    const value = JSON.stringify({
      uid: ownerUid,
      cachedAt: Date.now(),
      photos: Array.isArray(photos) ? photos : [],
    });
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(CLOUD_GALLERY_CACHE_KEY, value);
      return;
    }
    if (CLOUD_GALLERY_CACHE_FILE) {
      await FileSystem.writeAsStringAsync(CLOUD_GALLERY_CACHE_FILE, value);
    }
  } catch {

  }
}

function formatPhotoDateLabel(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      date: 'iClora Cloud',
      shortDate: 'Cloud',
    };
  }
  return {
    date: `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`,
    shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function normalizeCloudPhoto(photo = {}) {
  const uploadedAt = photo.uploadedAt || photo.createdAt || photo.updatedAt || '';
  const labels = formatPhotoDateLabel(uploadedAt);
  const uri = photo.thumbnailSrc || photo.src || photo.originalUrl || photo.staticSrc || photo.uri || '';
  const tags = Array.isArray(photo.visionTags)
    ? photo.visionTags
    : String(photo.searchText || photo.visionLabel || '').split(/\s+/);

  return {
    id: String(photo.id || photo.photoId || photo.publicId || uri),
    title: photo.title || photo.originalFilename || 'iClora Photo',
    uri,
    src: photo.src || photo.originalUrl || uri,
    thumbnailSrc: photo.thumbnailSrc || uri,
    originalUrl: photo.originalUrl || photo.src || uri,
    staticSrc: photo.staticSrc || '',
    publicId: photo.publicId || '',
    type: photo.type || 'photo',
    resourceType: photo.resourceType || 'image',
    date: photo.date || labels.date,
    shortDate: photo.shortDate || labels.shortDate,
    location: photo.location || 'iClora Cloud',
    bytes: Number(photo.bytes || 0),
    storageUsed: Number(photo.storageUsed || 0),
    width: Number(photo.width || 0),
    height: Number(photo.height || 0),
    format: String(photo.format || photo.mimeType || 'IMAGE').replace(/^image\//i, '').toUpperCase(),
    favourite: Boolean(photo.favourite),
    deleted: Boolean(photo.deleted),
    system: Boolean(photo.system),
    locked: Boolean(photo.locked),
    uploadedAt,
    createdAt: photo.createdAt || '',
    updatedAt: photo.updatedAt || '',
    syncedAt: photo.syncedAt || '',
    syncedBy: photo.syncedBy || photo.syncedByEmail || 'iClora account',
    syncedByEmail: photo.syncedByEmail || '',
    syncedByProvider: photo.syncedByProvider || '',
    deviceName: photo.syncedDeviceName || photo.deviceName || 'iClora Photos App',
    visionTags: tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 8),
    visionCaption: photo.visionCaption || '',
    visionLabel: photo.visionLabel || '',
    visionCycleStatus: photo.visionCycleStatus || '',
    visionCycleSource: photo.visionCycleSource || '',
    searchText: photo.searchText || '',
    isVideo: photo.type === 'video' || photo.resourceType === 'video',
    duration: photo.duration || '',
  };
}

function isDefaultCloudPlaceholder(photo = {}) {
  const fields = [
    photo.id,
    photo.title,
    photo.uri,
    photo.src,
    photo.thumbnailSrc,
    photo.originalUrl,
    photo.staticSrc,
    photo.publicId,
  ];
  const haystack = fields.map((value) => String(value || '').toLowerCase()).join(' ');
  return (
    haystack.includes('iclora-default-photo') ||
    haystack.includes('/pwa-icon-512.png') ||
    haystack.includes('welcome to iclora') ||
    Boolean(photo.system) ||
    Boolean(photo.locked) ||
    (Number(photo.bytes || 0) === 0 && Number(photo.storageUsed || 0) === 0)
  );
}

function formatBytes(bytes) {
  const amount = Number(bytes);
  if (!Number.isFinite(amount) || amount <= 0) return 'Unknown';
  if (amount < 1024 * 1024) {
    return `${(amount / 1024).toFixed(0)} KB`;
  }
  return `${(amount / (1024 * 1024)).toFixed(1)} MB`;
}

function isVisionCyclePending(photo = {}) {
  if (!photo || photo.localOnly) return false;
  if (photo.cycle === 'yes' || photo.visionLabel || photo.visionCaption || photo.searchText) return false;
  return photo.cycle === 'no'
    || photo.cycle === 'processing'
    || ['queued', 'processing', 'failed'].includes(photo.visionCycleStatus);
}

function visionCycleSourceLabel(photo = {}) {
  const source = String(photo.visionCycleSource || '').trim().toLowerCase();
  if (source === 'cycle-1' || source === 'cycle1' || source === 'primary') return 'Cycle 1';
  if (source === 'fallback') return 'Fallback';
  return '';
}

function parsePhotoDate(value = '') {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatInfoDate(value = '') {
  const date = parsePhotoDate(value);
  if (!date) return '';
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`;
}

function formatInfoTime(value = '') {
  const date = parsePhotoDate(value);
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatInfoDateTime(value = '') {
  const date = parsePhotoDate(value);
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatVisionStatus(value = '') {
  const status = String(value || '').trim().toLowerCase();
  if (!status || ['failed', 'error', 'pending', 'queued', 'processing', 'fallback', 'no', 'none'].includes(status)) {
    return 'Not synced';
  }
  if (['complete', 'completed', 'synced', 'success', 'done', 'yes'].includes(status)) {
    return 'Synced';
  }
  return status.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const FirstTimeLoader = () => {
  return (
    <View style={styles.firstTimeLoader}>
      <Image
        source={FETCHING_GIF}
        style={styles.fetchingGif}
        resizeMode="contain"
      />
      <Text style={styles.fetchingTitle}>Retrieving cloud photos</Text>
      <Text style={styles.fetchingSubtitle}>
        Generating secure signed links for your photos…
      </Text>
    </View>
  );
};

export default function CloudGalleryScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top || Constants.statusBarHeight || 0;
  const screenFade = useRef(new Animated.Value(1)).current;
  const screenSlide = useRef(new Animated.Value(0)).current;
  const [isNavigating, setIsNavigating] = useState(true);
  const [isRefreshingPhotos, setIsRefreshingPhotos] = useState(false);
  const [syncError, setSyncError] = useState('');

  const [allPhotos, setAllPhotos] = useState(INITIAL_PHOTOS);
  const [failedPhotoIds, setFailedPhotoIds] = useState([]);
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridCols, setGridCols] = useState(3);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [lightboxActive, setLightboxActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [deleteConfirmActive, setDeleteConfirmActive] = useState(false);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('photos');
  const lightboxIndexRef = useRef(0);
  const lightboxPhotosLengthRef = useRef(0);
  const infoSheetOpenRef = useRef(false);

  const [lightboxImmersive, setLightboxImmersive] = useState(false);
  const immersiveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(immersiveAnim, {
      toValue: lightboxImmersive ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  }, [lightboxImmersive]);

  const sectionTransition = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  const SEARCH_SUGGESTIONS = ['People', 'Sunset', 'Food', 'Nature', 'Travel', 'Family', 'Selfie', 'Night'];

  const openSearchFocus = () => {
    setSearchFocused(true);
    Animated.spring(searchFocusAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeSearchFocus = () => {
    Keyboard.dismiss();
    Animated.timing(searchFocusAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSearchFocused(false);
      setSearchQuery('');
    });
  };

  useEffect(() => {
    if (activeSection !== 'search') {
      Keyboard.dismiss();
    }
  }, [activeSection]);

  const transitionToSection = (targetSection) => {
    if (targetSection === activeSection) return;
    Animated.timing(sectionTransition, {
      toValue: targetSection === 'search' ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
    setActiveSection(targetSection);
  };

  const lightboxOpacity = useRef(new Animated.Value(0)).current;
  const lightboxScale = useRef(new Animated.Value(0.94)).current;
  const lightboxStageY = useRef(new Animated.Value(14)).current;
  const filmstripTranslateY = useRef(new Animated.Value(18)).current;
  const infoSheetAnim = useRef(new Animated.Value(520)).current;
  const deleteSheetAnim = useRef(new Animated.Value(320)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;

  const zoomScale = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);
  const lastImageTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const isPinchingRef = useRef(false);

  const resetZoom = () => {
    pinchStartDistanceRef.current = 0;
    pinchStartScaleRef.current = 1;
    isPinchingRef.current = false;
    zoomScale.setValue(1);
    panX.setValue(0);
    panY.setValue(0);
    lastScale.current = 1;
    lastPanX.current = 0;
    lastPanY.current = 0;
    setLightboxImmersive(false);
  };

  const toggleImageZoom = () => {
    if (lastScale.current > 1.05) {
      Animated.parallel([
        Animated.spring(zoomScale, { toValue: 1, useNativeDriver: true, friction: 8 }),
        Animated.spring(panX, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start(() => {
        lastScale.current = 1;
        lastPanX.current = 0;
        lastPanY.current = 0;
      });
      return;
    }

    lastScale.current = 2.2;
    lastPanX.current = 0;
    lastPanY.current = 0;
    Animated.spring(zoomScale, {
      toValue: 2.2,
      useNativeDriver: true,
      friction: 8,
      tension: 55,
    }).start();
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const [first, second] = touches;
    const dx = first.pageX - second.pageX;
    const dy = first.pageY - second.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.touches?.length >= 2
          || lastScale.current > 1.05
          || Math.abs(gestureState.dx) > 8
          || Math.abs(gestureState.dy) > 8;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length >= 2) {
          const distance = getTouchDistance(touches);
          if (!distance) return;
          if (!pinchStartDistanceRef.current) {
            pinchStartDistanceRef.current = distance;
            pinchStartScaleRef.current = lastScale.current;
          }

          isPinchingRef.current = true;
          const nextScale = Math.max(
            1,
            Math.min(4, pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current))
          );
          lastScale.current = nextScale;
          zoomScale.setValue(nextScale);

          if (nextScale <= 1.02) {
            panX.setValue(0);
            panY.setValue(0);
            lastPanX.current = 0;
            lastPanY.current = 0;
          }
          return;
        }

        if (lastScale.current > 1.05) {
          let nextX = lastPanX.current + gestureState.dx;
          let nextY = lastPanY.current + gestureState.dy;

          const boundX = (SCREEN_WIDTH * (lastScale.current - 1)) / 2;
          const boundY = (SCREEN_HEIGHT * (lastScale.current - 1)) / 2;

          if (nextX > boundX) nextX = boundX;
          if (nextX < -boundX) nextX = -boundX;
          if (nextY > boundY) nextY = boundY;
          if (nextY < -boundY) nextY = -boundY;

          panX.setValue(nextX);
          panY.setValue(nextY);
          return;
        }

        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        if (absDx > absDy) {
          imageTranslateX.setValue(gestureState.dx * 0.16);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isPinchingRef.current) {
          pinchStartDistanceRef.current = 0;
          pinchStartScaleRef.current = lastScale.current;
          isPinchingRef.current = false;

          if (lastScale.current <= 1.05) {
            resetZoom();
          }
          return;
        }

        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        const isSingleTap = absDx < 8 && absDy < 8;
        if (isSingleTap) {
          const now = Date.now();
          if (now - lastImageTapRef.current < 280) {
            if (singleTapTimerRef.current) {
              clearTimeout(singleTapTimerRef.current);
              singleTapTimerRef.current = null;
            }
            toggleImageZoom();
            lastImageTapRef.current = 0;
          } else {
            lastImageTapRef.current = now;
            singleTapTimerRef.current = setTimeout(() => {
              setLightboxImmersive((prev) => !prev);
              singleTapTimerRef.current = null;
            }, 180);
          }
          return;
        }

        if (lastScale.current > 1.05) {
          lastPanX.current += gestureState.dx;
          lastPanY.current += gestureState.dy;

          const boundX = (SCREEN_WIDTH * (lastScale.current - 1)) / 2;
          const boundY = (SCREEN_HEIGHT * (lastScale.current - 1)) / 2;

          if (lastPanX.current > boundX) lastPanX.current = boundX;
          if (lastPanX.current < -boundX) lastPanX.current = -boundX;
          if (lastPanY.current > boundY) lastPanY.current = boundY;
          if (lastPanY.current < -boundY) lastPanY.current = -boundY;
          return;
        }

        imageTranslateX.setValue(0);
        if (absDx > absDy && absDx > 48) {
          if (gestureState.dx > 0) {
            showPrevPhoto();
          } else {
            showNextPhoto();
          }
          return;
        }

        if (gestureState.dy > 90 && !infoSheetOpenRef.current) {
          handleCloseLightbox();
        }
      },
      onPanResponderTerminate: () => {
        pinchStartDistanceRef.current = 0;
        isPinchingRef.current = false;
        imageTranslateX.setValue(0);
      },
    })
  ).current;

  const [recentlyDeletedActive, setRecentlyDeletedActive] = useState(false);
  const [recentlyDeletedPhotos, setRecentlyDeletedPhotos] = useState([]);
  const [isFetchingDeleted, setIsFetchingDeleted] = useState(false);
  const [selectedDeletedIds, setSelectedDeletedIds] = useState([]);
  const recentlyDeletedTransition = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [webOnlyActive, setWebOnlyActive] = useState(false);
  const [webOnlyTitle, setWebOnlyTitle] = useState('');
  const webOnlyTransition = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [multiConfirmActive, setMultiConfirmActive] = useState(false);
  const [multiConfirmType, setMultiConfirmType] = useState('import');
  const multiSheetAnim = useRef(new Animated.Value(320)).current;

  const [rdConfirmActive, setRdConfirmActive] = useState(false);
  const [rdConfirmType, setRdConfirmType] = useState('restore');
  const rdSheetAnim = useRef(new Animated.Value(340)).current;

  const openRdSheet = (type) => {
    Vibration.vibrate(10);
    setRdConfirmType(type);
    rdSheetAnim.setValue(340);
    setRdConfirmActive(true);
    Animated.spring(rdSheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  };

  const closeRdSheet = () => {
    Vibration.vibrate(8);
    Animated.timing(rdSheetAnim, {
      toValue: 340,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setRdConfirmActive(false));
  };

  const handleRdConfirm = () => {
    closeRdSheet();
    setTimeout(() => {
      if (rdConfirmType === 'restore') {
        restorePhotos(selectedDeletedIds);
      } else {
        permanentlyDeletePhotos(selectedDeletedIds);
      }
    }, 260);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importPercent, setImportPercent] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importFinished, setImportFinished] = useState(false);
  const [dlDownloaded, setDlDownloaded] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [dlEta, setDlEta] = useState(0);
  const dlProgressAnim = useRef(new Animated.Value(0)).current;

  const markPhotoImageFailed = (photoId) => {
    if (!photoId) return;
    setFailedPhotoIds((ids) => (ids.includes(photoId) ? ids : [...ids, photoId]));
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 380);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshCloudPhotos = async () => {
      try {
        const session = await readAuthSession();
        if (!session?.sessionToken) {
          throw new Error('Please sign in again to sync photos.');
        }

        const cachedPhotos = await readCachedCloudPhotos(session.uid);
        if (cancelled) return;

        if (cachedPhotos.length) {
          setAllPhotos(cachedPhotos);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        setIsRefreshingPhotos(true);
        setSyncError('');

        const response = await fetch(`${resolveBackendBaseUrl()}/photos`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.sessionToken}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || 'Failed to sync iClora Photos.');
        }

        const backendPhotos = Array.isArray(payload?.photos) ? payload.photos : [];
        const nextPhotos = backendPhotos
          .map(normalizeCloudPhoto)
          .filter((photo) => photo.id && photo.uri && !isDefaultCloudPlaceholder(photo));

        if (cancelled) return;
        setFailedPhotoIds([]);
        setAllPhotos(nextPhotos);
        setIsLoading(false);
        await saveCachedCloudPhotos(nextPhotos, session.uid);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error?.message || 'Photo sync failed.');
        setIsLoading(false);
      } finally {
        if (!cancelled) setIsRefreshingPhotos(false);
      }
    };

    refreshCloudPhotos();

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleBackPress = () => {
    if (multiConfirmActive) {
      closeMultiSheet();
      return true;
    }
    if (webOnlyActive) {
      closeWebOnlyPage();
      return true;
    }
    if (recentlyDeletedActive) {
      closeRecentlyDeletedPage();
      return true;
    }
    if (infoSheetOpen) {
      toggleInfoSheet();
      return true;
    }
    if (deleteConfirmActive) {
      closeDeleteSheet();
      return true;
    }
    if (lightboxActive) {
      handleCloseLightbox();
      return true;
    }
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds([]);
      return true;
    }
    if (activeTab === 'favourites' || activeTab === 'recents') {
      setActiveTab('library');
      transitionToSection('search');
      return true;
    }
    if (activeSection === 'search') {
      transitionToSection('photos');
      return true;
    }
    onBack?.();
    return true;
  };

  useEffect(() => {
    const onHardwareBack = () => {
      return handleBackPress();
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [
    multiConfirmActive,
    webOnlyActive,
    recentlyDeletedActive,
    infoSheetOpen,
    deleteConfirmActive,
    lightboxActive,
    selectMode,
    activeTab,
    activeSection,
    onBack
  ]);

  useEffect(() => {
    if (lightboxActive) {

      const animTimer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(lightboxOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.spring(lightboxScale, {
            toValue: 1,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(lightboxStageY, {
            toValue: 0,
            duration: 350,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.timing(filmstripTranslateY, {
            toValue: 0,
            duration: 350,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
        ]).start();
      }, 16);
      return () => clearTimeout(animTimer);
    }
  }, [lightboxActive]);

  const filteredPhotos = useMemo(() => {
    return allPhotos.filter((p) => {
      if (isDefaultCloudPlaceholder(p)) return false;
      if (failedPhotoIds.includes(p.id)) return false;

      if (activeTab === 'deleted') {
        if (!p.deleted) return false;
      } else {
        if (p.deleted) return false;
        if (activeTab === 'favourites' && !p.favourite) return false;
      }

      if (searchQuery.trim()) {
        const text = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(text);
        const matchesLocation = p.location.toLowerCase().includes(text);
        const matchesDate = p.date.toLowerCase().includes(text);
        const matchesTag = p.visionTags.some((tag) => tag.toLowerCase().includes(text));
        return matchesTitle || matchesLocation || matchesDate || matchesTag;
      }

      return true;
    }).sort((a, b) => {

      if (activeTab === 'recents') {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      }
      return 0;
    });
  }, [allPhotos, activeTab, searchQuery, failedPhotoIds]);

  const syncedPhotoCount = useMemo(
    () => allPhotos.filter((p) => !p.deleted && !isDefaultCloudPlaceholder(p)).length,
    [allPhotos]
  );
  const syncStatusText = isRefreshingPhotos
    ? 'Syncing'
    : syncError
      ? 'Sync paused'
      : 'Synced';

  const toggleFavourite = (photoId) => {
    setAllPhotos((curr) =>
      curr.map((p) => (p.id === photoId ? { ...p, favourite: !p.favourite } : p))
    );
  };

  const deletePhoto = async (photo) => {
    if (!photo?.id) return;
    const photoId = photo.id;
    const deletedAt = new Date().toISOString();
    const previousPhotos = allPhotos;
    const previousDeletedPhotos = recentlyDeletedPhotos;

    setAllPhotos((curr) => curr.filter((p) => p.id !== photoId));
    setSelectedIds((curr) => curr.filter((id) => id !== photoId));

    if (photo.deleted) {
      setRecentlyDeletedPhotos((curr) => curr.filter((p) => p.id !== photoId));
    } else {
      setRecentlyDeletedPhotos((curr) => [
        { ...photo, deleted: true, favourite: false, deletedAt },
        ...curr.filter((p) => p.id !== photoId),
      ]);
    }

    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) throw new Error('Please sign in again to delete this photo.');

      const endpoint = photo.deleted
        ? `/photos/recently-deleted/${encodeURIComponent(photoId)}`
        : `/photos/${encodeURIComponent(photoId)}`;
      const response = await fetch(`${resolveBackendBaseUrl()}${endpoint}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || 'Could not delete this photo.');
      }

      await saveCachedCloudPhotos(
        previousPhotos.filter((p) => p.id !== photoId),
        session.uid
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      setAllPhotos(previousPhotos);
      setRecentlyDeletedPhotos(previousDeletedPhotos);
      Alert.alert('Delete Failed', error?.message || 'Could not delete this photo.');
    }
  };

  const restorePhoto = (photoId) => {
    setAllPhotos((curr) =>
      curr.map((p) => (p.id === photoId ? { ...p, deleted: false } : p))
    );
    setSelectedIds((curr) => curr.filter((id) => id !== photoId));
  };

  const toggleSelectItem = (id) => {
    setSelectedIds((curr) => {
      if (curr.includes(id)) {
        const next = curr.filter((item) => item !== id);
        if (next.length === 0) setSelectMode(false);
        return next;
      } else {
        return [...curr, id];
      }
    });
  };

  const handleLongPressGrid = (id) => {
    if (activeTab === 'deleted') return;
    setSelectMode(true);
    toggleSelectItem(id);
  };

  const handlePressGrid = (id, index) => {
    if (selectMode) {
      toggleSelectItem(id);
    } else {

      const actualIndex = filteredPhotos.findIndex((p) => p.id === id);
      if (actualIndex !== -1) {
        resetZoom();
        setLightboxIndex(actualIndex);
        imageTranslateX.setValue(0);
        lightboxOpacity.setValue(0);
        lightboxScale.setValue(0.85);
        lightboxStageY.setValue(40);
        filmstripTranslateY.setValue(18);
        setLightboxActive(true);
      }
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredPhotos.map((p) => p.id);
    const areAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds([]);
      setSelectMode(false);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const text = searchQuery.toLowerCase();
    return allPhotos.filter((p) => {
      if (isDefaultCloudPlaceholder(p)) return false;
      if (failedPhotoIds.includes(p.id)) return false;
      if (p.deleted) return false;
      const matchesTitle = p.title.toLowerCase().includes(text);
      const matchesLocation = p.location.toLowerCase().includes(text);
      const matchesDate = p.date.toLowerCase().includes(text);
      const matchesTag = p.visionTags.some((tag) => tag.toLowerCase().includes(text));
      return matchesTitle || matchesLocation || matchesDate || matchesTag;
    });
  }, [allPhotos, searchQuery, failedPhotoIds]);

  const lightboxPhotos = useMemo(() => {
    if (activeSection === 'search' && searchQuery.trim()) {
      return searchResults;
    }
    return filteredPhotos;
  }, [activeSection, searchQuery, searchResults, filteredPhotos]);

  const currentViewingPhoto = lightboxPhotos[lightboxIndex];
  const currentViewingPhotoUri = currentViewingPhoto
    ? currentViewingPhoto.originalUrl || currentViewingPhoto.src || currentViewingPhoto.uri
    : '';

  lightboxIndexRef.current = lightboxIndex;
  lightboxPhotosLengthRef.current = lightboxPhotos.length;
  infoSheetOpenRef.current = infoSheetOpen;

  useEffect(() => {
    if (lightboxActive && currentViewingPhotoUri) {
      setLightboxImageLoading(true);
      imageTranslateX.setValue(0);
    }
  }, [currentViewingPhotoUri, lightboxActive]);

  const handleCloseLightbox = () => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    resetZoom();
    setInfoSheetOpen(false);
    setDeleteConfirmActive(false);
    Animated.parallel([
      Animated.timing(lightboxOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(lightboxScale, {
        toValue: 0.85,
        duration: 300,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(lightboxStageY, {
        toValue: 40,
        duration: 300,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(filmstripTranslateY, {
        toValue: 18,
        duration: 250,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(infoSheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setLightboxImageLoading(false);
        setLightboxActive(false);
      }, 0);
    });
  };

  const showNextPhoto = () => {
    const maxIndex = lightboxPhotosLengthRef.current - 1;
    if (maxIndex >= 0 && lightboxIndexRef.current < maxIndex) {
      resetZoom();
      imageTranslateX.setValue(0);
      setLightboxIndex((idx) => Math.min(idx + 1, maxIndex));
    }
  };

  const showPrevPhoto = () => {
    if (lightboxIndexRef.current > 0) {
      resetZoom();
      imageTranslateX.setValue(0);
      setLightboxIndex((idx) => Math.max(idx - 1, 0));
    }
  };

  const triggerHaptic = () => {
    try {
      Vibration.vibrate(12);
    } catch (e) {

    }
  };

  const openRecentlyDeletedPage = async () => {
    triggerHaptic();
    setRecentlyDeletedActive(true);
    recentlyDeletedTransition.setValue(SCREEN_WIDTH);

    Animated.timing(recentlyDeletedTransition, {
      toValue: 0,
      duration: 320,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();

    fetchRecentlyDeletedPhotos();
  };

  const closeRecentlyDeletedPage = () => {
    triggerHaptic();
    Animated.timing(recentlyDeletedTransition, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      setRecentlyDeletedActive(false);
      setSelectedDeletedIds([]);
    });
  };

  const openWebOnlyPage = (title) => {
    triggerHaptic();
    setWebOnlyTitle(title);
    setWebOnlyActive(true);
    webOnlyTransition.setValue(SCREEN_WIDTH);

    Animated.timing(webOnlyTransition, {
      toValue: 0,
      duration: 320,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeWebOnlyPage = () => {
    triggerHaptic();
    Animated.timing(webOnlyTransition, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      setWebOnlyActive(false);
      setWebOnlyTitle('');
    });
  };

  const confirmMultiAction = (type) => {
    triggerHaptic();
    setMultiConfirmType(type);
    setMultiConfirmActive(true);
    multiSheetAnim.setValue(320);
    Animated.timing(multiSheetAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeMultiSheet = () => {
    triggerHaptic();
    Animated.timing(multiSheetAnim, {
      toValue: 320,
      duration: 280,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      setMultiConfirmActive(false);
    });
  };

  const deleteMultiplePhotos = async (ids) => {
    if (!ids || ids.length === 0) return;

    const photosToDelete = allPhotos.filter(p => ids.includes(p.id));
    const deletedAt = new Date().toISOString();

    setAllPhotos((curr) => curr.filter((p) => !ids.includes(p.id)));

    const recentlyDeletedList = photosToDelete.map(p => ({
      ...p,
      deleted: true,
      favourite: false,
      deletedAt
    }));

    setRecentlyDeletedPhotos((curr) => [
      ...recentlyDeletedList,
      ...curr.filter((p) => !ids.includes(p.id)),
    ]);

    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) return;

      await Promise.all(
        photosToDelete.map(async (photo) => {
          const endpoint = photo.deleted
            ? `/photos/recently-deleted/${encodeURIComponent(photo.id)}`
            : `/photos/${encodeURIComponent(photo.id)}`;
          await fetch(`${resolveBackendBaseUrl()}${endpoint}`, {
            method: 'DELETE',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${session.sessionToken}`,
            },
          }).catch(() => {});
        })
      );
    } catch (e) {

    }
  };

  const handleConfirmMultiAction = async () => {
    closeMultiSheet();

    if (multiConfirmType === 'import') {
      const selectedPhotos = allPhotos.filter(p => selectedIds.includes(p.id));
      setSelectedIds([]);
      setSelectMode(false);
      runSimulatedImport(selectedPhotos);
    } else if (multiConfirmType === 'delete') {
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      setSelectMode(false);
      await deleteMultiplePhotos(idsToDelete);
      triggerHaptic();
      Alert.alert(
        'Success',
        `Successfully moved ${idsToDelete.length} photo(s) to Recently Deleted.`
      );
    }
  };

  const fetchRecentlyDeletedPhotos = async () => {
    setIsFetchingDeleted(true);
    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) return;

      const response = await fetch(`${resolveBackendBaseUrl()}/photos/recently-deleted`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload?.photos)) {
        const nextDeleted = payload.photos
          .map(normalizeCloudPhoto)
          .filter((photo) => photo.id && photo.uri);
        setRecentlyDeletedPhotos(nextDeleted);
      }
    } catch (e) {
      console.error('Failed to fetch deleted photos', e);
    } finally {
      setIsFetchingDeleted(false);
    }
  };

  const restorePhotos = async (ids) => {
    if (!ids.length) return;
    triggerHaptic();
    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) return;

      const response = await fetch(`${resolveBackendBaseUrl()}/photos/recently-deleted/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.ok !== false) {
        Alert.alert('Restored', `${ids.length} item(s) restored successfully.`);
        setRecentlyDeletedPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedDeletedIds([]);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        throw new Error(payload?.error || 'Failed to restore items');
      }
    } catch (e) {
      Alert.alert('Restore Failed', e.message);
    }
  };

  const permanentlyDeletePhotos = async (ids) => {
    if (!ids.length) return;
    triggerHaptic();
    try {
      const session = await readAuthSession();
      if (!session?.sessionToken) return;

      const promises = ids.map((id) =>
        fetch(`${resolveBackendBaseUrl()}/photos/recently-deleted/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.sessionToken}`,
          },
        })
      );
      const results = await Promise.all(promises);
      const allOk = results.every((res) => res.ok);
      if (allOk) {
        Alert.alert('Deleted Permanently', `${ids.length} item(s) permanently deleted.`);
        setRecentlyDeletedPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedDeletedIds([]);
      } else {
        throw new Error('Failed to permanently delete some items');
      }
    } catch (e) {
      Alert.alert('Delete Failed', e.message);
    }
  };

  const toggleSelectDeletedItem = (id) => {
    triggerHaptic();
    setSelectedDeletedIds((curr) => {
      if (curr.includes(id)) {
        return curr.filter((item) => item !== id);
      } else {
        return [...curr, id];
      }
    });
  };

  const openDeleteSheet = () => {
    triggerHaptic();
    setDeleteConfirmActive(true);
    deleteSheetAnim.setValue(320);
    Animated.timing(deleteSheetAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeDeleteSheet = () => {
    triggerHaptic();
    Animated.timing(deleteSheetAnim, {
      toValue: 320,
      duration: 260,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      setDeleteConfirmActive(false);
    });
  };

  const handleConfirmDelete = () => {
    triggerHaptic();
    Animated.timing(deleteSheetAnim, {
      toValue: 320,
      duration: 260,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      setDeleteConfirmActive(false);
      deletePhoto(currentViewingPhoto);
      handleCloseLightbox();
    });
  };

  const toggleInfoSheet = () => {
    if (infoSheetOpen) {
      triggerHaptic();
      Animated.timing(infoSheetAnim, {
        toValue: 520,
        duration: 320,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }).start(() => {
        setInfoSheetOpen(false);
      });
    } else {
      triggerHaptic();
      setInfoSheetOpen(true);
      infoSheetAnim.setValue(520);
      Animated.timing(infoSheetAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }).start();
    }
  };

  const handleDownloadPhoto = () => {
    triggerHaptic();
    handleCloseLightbox();
    runSimulatedImport([currentViewingPhoto]);
  };

  const runSimulatedImport = (itemsToImport) => {
    const count = Array.isArray(itemsToImport) ? itemsToImport.length : 1;
    if (count === 0) return;

    setIsImporting(true);
    setImportFinished(false);
    setImportPercent(0);
    setDlDownloaded(0);
    setDlTotal(count);
    setDlEta(Math.ceil(count * 1.8));
    dlProgressAnim.setValue(0);

    const totalDurationMs = Math.max(3000, count * 600);
    const intervalMs = 60;
    const steps = totalDurationMs / intervalMs;
    let currentStep = 0;

    const tick = setInterval(() => {
      currentStep++;
      const rawProgress = currentStep / steps;

      const eased = 1 - Math.pow(1 - rawProgress, 2.5);
      const pct = Math.min(100, Math.round(eased * 100));
      const downloaded = Math.min(count, Math.round(eased * count));
      const etaRemaining = Math.max(0, Math.round((1 - eased) * (totalDurationMs / 1000)));

      setImportPercent(pct);
      setDlDownloaded(downloaded);
      setDlEta(etaRemaining);

      Animated.timing(dlProgressAnim, {
        toValue: eased,
        duration: intervalMs,
        useNativeDriver: false,
      }).start();

      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          setIsImporting(false);
          setImportPercent(0);
          setDlDownloaded(0);
          setSelectedIds([]);
          setSelectMode(false);
          dlProgressAnim.setValue(0);
        }, 600);
      }
    }, intervalMs);
  };

  const handleImportSelected = () => {
    runSimulatedImport(selectedIds);
  };

  const handleShareMock = (title) => {
    Alert.alert(
      'Share Secure Link',
      `Secure sharing link generated for "${title}"!\n\nLink copied to clipboard automatically (Simulated).`,
      [{ text: 'Great' }]
    );
  };

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          opacity: screenFade,
          transform: [{ translateY: screenSlide }],
        },
      ]}
      renderToHardwareTextureAndroid
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <Animated.View
        pointerEvents={activeSection === 'photos' ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: sectionTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [{
            translateY: sectionTransition.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 15],
            }),
          }],
        }}
        renderToHardwareTextureAndroid
      >

          <View style={styles.header}>
            <Pressable
              onPress={handleBackPress}
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color="#0f172a" style={{ marginRight: 2 }} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Image
                source={require('../../assets/photos.webp')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>iClora Photos</Text>
            </View>

            {selectMode ? (
              <Pressable
                onPress={handleSelectAll}
                style={({ pressed }) => [styles.selectAllBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.selectAllText}>
                  {filteredPhotos.every((id) => selectedIds.includes(id.id)) ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.headerRightSpacer} />
            )}
          </View>

          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>
              {activeTab === 'favourites' ? 'Favourites' : activeTab === 'recents' ? 'Recents' : 'Library'}
            </Text>
            <Text style={styles.libraryStatus}>
              {syncedPhotoCount} photo{syncedPhotoCount === 1 ? '' : 's'} synced
              {' • '}
              <Text style={[styles.libraryStatusSync, isRefreshingPhotos && styles.libraryStatusSyncActive]}>
                {syncStatusText}
              </Text>
            </Text>
          </View>

          {isNavigating || isLoading ? (
            <FirstTimeLoader />
          ) : filteredPhotos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="image" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Photos Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try matching keywords, dates or locations.' : 'Your cloud folder is empty in this category.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPhotos}
              key={`grid-${gridCols}`}
              numColumns={gridCols}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.gridContainer}
              windowSize={5}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              updateCellsBatchingPeriod={30}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item, index }) => {
                const isSelected = selectedIds.includes(item.id);
                const gridCellWidth = (SCREEN_WIDTH - 36 - (gridCols - 1) * 2) / gridCols;

                return (
                  <Pressable
                    onPress={() => handlePressGrid(item.id, index)}
                    onLongPress={() => handleLongPressGrid(item.id)}
                    style={[
                      styles.gridItem,
                      {
                        width: gridCellWidth,
                        height: gridCellWidth,
                        marginBottom: 2,
                        marginRight: (index + 1) % gridCols === 0 ? 0 : 2,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.gridImage}
                      onError={() => markPhotoImageFailed(item.id)}
                    />

                    {Boolean(item.isVideo) && (
                      <View style={styles.videoBadgeOverlay}>
                        <Ionicons name="play" size={9} color="#ffffff" style={{ marginRight: 2 }} />
                        <Text style={styles.videoDurationText}>{item.duration}</Text>
                      </View>
                    )}

                    {Boolean(selectMode) && (
                      <View style={styles.checkCircleOverlay}>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                          {Boolean(isSelected) && <Feather name="check" size={10} color="#ffffff" />}
                        </View>
                      </View>
                    )}

                  </Pressable>
                );
              }}
            />
          )}
      </Animated.View>

      <Animated.View
        pointerEvents={activeSection === 'collections' ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activeSection === 'collections' ? 1 : 0,
        }}
        renderToHardwareTextureAndroid
      >

          <View style={styles.header}>
            <Pressable
              onPress={() => transitionToSection('photos')}
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={20} color="#0f172a" style={{ marginRight: 2 }} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Image
                source={require('../../assets/photos.webp')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>iClora Photos</Text>
            </View>

            <View style={styles.headerRightSpacer} />
          </View>

          <ScrollView style={styles.collectionsContainer} showsVerticalScrollIndicator={false}>

            <View style={styles.collectionsGrid}>
              {[
                { label: 'Favourites', icon: 'star', id: 'favourites' },
                { label: 'Bin', icon: 'trash-outline', id: 'deleted' },
                { label: 'Screenshots', icon: 'phone-portrait-outline', id: 'library' },
                { label: 'Archive', icon: 'archive-outline', id: 'library' },
              ].map((box, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    if (box.id === 'deleted') {
                      openRecentlyDeletedPage();
                    } else {
                      setActiveTab(box.id);
                      transitionToSection('photos');
                    }
                  }}
                  style={styles.collectionsBox}
                >
                  <Ionicons name={box.icon === 'star' ? 'star-outline' : box.icon} size={20} color="#78350f" style={{ marginBottom: 6 }} />
                  <Text style={styles.collectionsBoxLabel}>{box.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.collectionsCenterpiece}>
              <Ionicons name="albums-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>The albums that you create are shown here</Text>
              <Pressable
                onPress={() => Alert.alert('Create Album', 'Sleek custom album editor loading...')}
                style={styles.createAlbumBtn}
              >
                <Text style={styles.createAlbumBtnText}>Create album</Text>
              </Pressable>
            </View>

            <View style={styles.collectionsListSection}>
              {[
                { label: 'Favourites', count: allPhotos.filter(p => p.favourite && !p.deleted).length, icon: 'star' },
                { label: 'Screenshots', count: 4, icon: 'phone-portrait' },
                { label: 'Videos', count: allPhotos.filter(p => p.isVideo && !p.deleted).length, icon: 'play' },
                { label: 'Recently added', count: allPhotos.filter(p => !p.deleted).length, icon: 'time' },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    if (item.label === 'Favourites') {
                      setActiveTab('favourites');
                    } else if (item.label === 'Videos') {
                      setActiveTab('library');
                      setSearchQuery('video');
                    } else {
                      setActiveTab('library');
                      setSearchQuery('');
                    }
                    transitionToSection('photos');
                  }}
                  style={styles.collectionsListRow}
                >
                  <View style={styles.collectionsListRowLeft}>
                    <Ionicons name={`${item.icon}-outline`} size={18} color="#78350f" style={{ marginRight: 16 }} />
                    <Text style={styles.collectionsListRowLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.collectionsListRowCount}>{item.count}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
      </Animated.View>

      <Animated.View
        pointerEvents={activeSection === 'search' ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: sectionTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
          transform: [{
            translateY: sectionTransition.interpolate({
              inputRange: [0, 1],
              outputRange: [15, 0],
            }),
          }],
        }}
        renderToHardwareTextureAndroid
      >
        <View style={styles.searchSectionContainer}>
          <View style={styles.searchHeaderBar}>
            <View style={styles.searchBarInputContainer}>
              <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchBarTextInput}
                placeholder="Search your photos"
                placeholderTextColor="#64748b"
	                value={searchQuery}
	                onChangeText={(text) => {
	                  setSearchQuery(text);
	                }}
	                onFocus={() => setSearchFocused(false)}
	                onSubmitEditing={Keyboard.dismiss}
	                autoCapitalize="none"
	                autoCorrect={false}
	                returnKeyType="search"
	              />
                {Boolean(searchQuery.length > 0) && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748b" />
                  </Pressable>
                )}
              </View>
              <Pressable
	                onPress={() => {
	                  setSearchQuery('');
	                  setSearchFocused(false);
	                  Keyboard.dismiss();
	                  transitionToSection('photos');
	                }}
                style={styles.searchCancelButton}
              >
                <Text style={styles.searchCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>

            {searchQuery.trim() === '' ? (
              <ScrollView style={styles.searchContentScroll} showsVerticalScrollIndicator={false}>

                <View style={styles.searchListWrapper}>
                  {[
                    {
                      title: 'Photos',
                      items: [
                        { id: 'library', label: 'Library', icon: 'image-outline', type: 'tab', tab: 'library' },
                        { id: 'favourites', label: 'Favourites', icon: 'heart-outline', type: 'tab', tab: 'favourites' },
                        { id: 'recents', label: 'Recents', icon: 'time-outline', type: 'tab', tab: 'recents' },
                      ]
                    },
                    {
                      title: 'Collections',
                      items: [
                        { id: 'hidden', label: 'Hidden', icon: 'eye-off-outline', type: 'alert', title: 'Hidden Vault', body: 'Accessing secure hidden partition… (Simulated)' },
                        { id: 'deleted', label: 'Recently Deleted', icon: 'trash-outline', type: 'tab', tab: 'deleted' },
                      ]
                    },
                    {
                      title: 'Sharing',
                      items: [
                        { id: 'sharing', label: 'iClora Links', icon: 'cloud-outline', type: 'alert', title: 'iClora Links', body: 'Retrieving shared partition sync history… (Simulated)' },
                      ]
                    }
                  ].map((section, sIdx) => (
                    <View key={sIdx} style={styles.searchListSection}>
                      <Text style={styles.searchListSectionHeader}>{section.title}</Text>
                      {section.items.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            if (item.id === 'deleted') {
                              openRecentlyDeletedPage();
                            } else if (item.id === 'hidden') {
                              openWebOnlyPage('Hidden');
                            } else if (item.id === 'sharing') {
                              openWebOnlyPage('iClora Links');
                            } else if (item.type === 'tab') {
                              setActiveTab(item.tab);
                              setSearchQuery('');
                              transitionToSection('photos');
                            } else {
                              Alert.alert(item.title, item.body, [{ text: 'OK' }]);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.searchListItem,
                            pressed && styles.searchListItemPressed
                          ]}
                        >
                          <Ionicons name={item.icon} size={22} color="#000000" style={styles.searchListItemIcon} />
                          <Text style={styles.searchListItemLabel}>{item.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              searchResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Feather name="search" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>No Results Found</Text>
                  <Text style={styles.emptySubtitle}>
                    We couldn't find any photos matching "{searchQuery}".
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  numColumns={gridCols}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[styles.gridContainer, { paddingTop: 16 }]}
                  windowSize={5}
                  initialNumToRender={15}
                  maxToRenderPerBatch={15}
                  updateCellsBatchingPeriod={30}
                  removeClippedSubviews={Platform.OS === 'android'}
                  renderItem={({ item, index }) => {
                    const gridCellWidth = (SCREEN_WIDTH - 36 - (gridCols - 1) * 2) / gridCols;

                    return (
                      <Pressable
                        onPress={() => {
                          const actualIndex = searchResults.findIndex((p) => p.id === item.id);
                          if (actualIndex !== -1) {
                            resetZoom();
                            setLightboxIndex(actualIndex);
                            imageTranslateX.setValue(0);
                            lightboxOpacity.setValue(0);
                            lightboxScale.setValue(0.85);
                            lightboxStageY.setValue(40);
                            filmstripTranslateY.setValue(18);
                            setLightboxActive(true);
                          }
                        }}
                        style={[
                          styles.gridItem,
                          {
                            width: gridCellWidth,
                            height: gridCellWidth,
                            marginBottom: 2,
                            marginRight: (index + 1) % gridCols === 0 ? 0 : 2,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.gridImage}
                          onError={() => markPhotoImageFailed(item.id)}
                        />

                        {Boolean(item.isVideo) && (
                          <View style={styles.videoBadgeOverlay}>
                            <Ionicons name="play" size={9} color="#ffffff" style={{ marginRight: 2 }} />
                            <Text style={styles.videoDurationText}>{item.duration}</Text>
                          </View>
                        )}

                      </Pressable>
                    );
                  }}
                />
              )
            )}
          </View>
      </Animated.View>

      {searchFocused && (
        <Animated.View
          style={[
            styles.ytSearchOverlay,
            {
              transform: [{
                translateY: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0],
                }),
              }],
            },
          ]}
        >

          <View style={[styles.ytSearchBarRow, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={closeSearchFocus}
              style={styles.ytBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </Pressable>

            <View style={styles.ytSearchInput}>
              <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                style={styles.ytSearchTextInput}
                placeholder="Search your photos…"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </Pressable>
              )}
            </View>

            <Pressable onPress={closeSearchFocus} style={styles.ytCancelBtn}>
              <Text style={styles.ytCancelText}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.ytDivider} />

          {searchQuery.length === 0 && (
            <View style={styles.ytChipsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ytChipsScroll}
              >
                {SEARCH_SUGGESTIONS.map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => {
                      setSearchQuery(chip);
                    }}
                    style={({ pressed }) => [
                      styles.ytChip,
                      pressed && styles.ytChipPressed,
                    ]}
                  >
                    <Text style={styles.ytChipText}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {searchQuery.length > 0 && (
            searchResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="search" size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Results</Text>
                <Text style={styles.emptySubtitle}>No photos matching "{searchQuery}"</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                numColumns={3}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 2 }}
                windowSize={5}
                initialNumToRender={18}
                removeClippedSubviews
                renderItem={({ item, index }) => {
                  const w = (SCREEN_WIDTH - 4) / 3;
                  return (
                    <Pressable
                      onPress={() => {
                        closeSearchFocus();
                        const actualIndex = allPhotos.findIndex((p) => p.id === item.id);
                        if (actualIndex !== -1) {
                          resetZoom();
                          setLightboxIndex(actualIndex);
                          imageTranslateX.setValue(0);
                          lightboxOpacity.setValue(0);
                          lightboxScale.setValue(0.85);
                          lightboxStageY.setValue(40);
                          filmstripTranslateY.setValue(18);
                          setLightboxActive(true);
                        }
                      }}
                      style={{ width: w, height: w, margin: 1 }}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                }}
              />
            )
          )}
        </Animated.View>
      )}

      {Boolean(selectMode) && (
        <View style={styles.bottomSelectionPanel}>
          <Text style={styles.selectionCount}>
            {selectedIds.length} Selected
          </Text>
          <View style={styles.selectionActionsRow}>
            <Pressable
              onPress={() => {
                setSelectedIds([]);
                setSelectMode(false);
              }}
              style={styles.cancelSelectionBtn}
            >
              <Text style={styles.cancelSelectionText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => confirmMultiAction('import')}
              disabled={selectedIds.length === 0}
              style={[
                styles.multiImportBtn,
                selectedIds.length === 0 && { opacity: 0.5 },
              ]}
            >
              <Ionicons name="download-outline" size={14} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.multiBtnText}>Import</Text>
            </Pressable>

            <Pressable
              onPress={() => confirmMultiAction('delete')}
              disabled={selectedIds.length === 0}
              style={[
                styles.multiDeleteBtn,
                selectedIds.length === 0 && { opacity: 0.5 },
              ]}
            >
              <Ionicons name="trash-outline" size={14} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.multiBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}

      {Boolean(!selectMode && !lightboxActive && activeSection !== 'search' && !searchFocused) && (
        <View style={[styles.floatingBottomBar, { bottom: insets.bottom + 16 }]}>
          <View style={styles.floatingBottomBarContent}>
            <Animated.View
              style={[
                styles.floatingActivePillBackground,
                {
                  transform: [
                    {
                      translateX: sectionTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, FLOATING_NAV_INACTIVE_WIDTH],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.floatingActiveContent,
                styles.floatingPhotosActiveContent,
                {
                  opacity: sectionTransition.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [1, 0, 0],
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="images" size={16} color="#ffffff" />
              <Text style={styles.floatingActiveTextWhite}>Photos</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.floatingInactiveContent,
                styles.floatingPhotosInactiveContent,
                {
                  opacity: sectionTransition.interpolate({
                    inputRange: [0, 0.65, 1],
                    outputRange: [0, 0, 1],
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="images-outline" size={21} color="#0f172a" />
            </Animated.View>

            <Animated.View
              style={[
                styles.floatingActiveContent,
                styles.floatingSearchActiveContent,
                {
                  opacity: sectionTransition.interpolate({
                    inputRange: [0, 0.65, 1],
                    outputRange: [0, 0, 1],
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="search" size={16} color="#ffffff" />
              <Text style={styles.floatingActiveTextWhite}>Search</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.floatingInactiveContent,
                styles.floatingSearchInactiveContent,
                {
                  opacity: sectionTransition.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [1, 0, 0],
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="search-outline" size={21} color="#0f172a" />
            </Animated.View>

            <Pressable
              onPress={() => transitionToSection('photos')}
              hitSlop={6}
              style={({ pressed }) => [
                styles.floatingBottomTabTouch,
                styles.floatingPhotosHitArea,
                pressed && styles.floatingBottomTabPressed,
              ]}
            />

            <Pressable
              onPress={() => transitionToSection('search')}
              hitSlop={6}
              style={({ pressed }) => [
                styles.floatingBottomTabTouch,
                styles.floatingSearchHitArea,
                pressed && styles.floatingBottomTabPressed,
              ]}
            />
          </View>
        </View>
      )}

      {Boolean(webOnlyActive) && (
        <Animated.View
          style={[
            styles.webOnlyPage,
            { transform: [{ translateX: webOnlyTransition }] }
          ]}
        >

          <View style={[styles.recentlyDeletedHeader, { paddingTop: statusBarHeight + 12 }]}>
            <Pressable
              onPress={closeWebOnlyPage}
              style={({ pressed }) => [styles.rdBackBtn, pressed && styles.btnPressed]}
            >
              <Ionicons name="chevron-back" size={22} color="#000000" style={{ marginRight: 2 }} />
            </Pressable>
            <Text style={styles.rdTitleText}>{webOnlyTitle}</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.webOnlyContent}>
            <Image
              source={NO_GIF}
              style={styles.webOnlyGif}
              resizeMode="contain"
            />
            <Text style={styles.webOnlyText}>
              You can access this only on iClora Web
            </Text>
            <Pressable
              onPress={() => {
                triggerHaptic();
                Linking.openURL(ICLORA_WEBSITE_URL);
              }}
              style={({ pressed }) => [
                styles.webOnlyBtn,
                pressed && { transform: [{ scale: 0.96 }] }
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.15)', borderless: false }}
            >
              <Text style={styles.webOnlyBtnText}>Visit Web</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {Boolean(recentlyDeletedActive) && (
        <Animated.View
          style={[
            styles.recentlyDeletedPage,
            { transform: [{ translateX: recentlyDeletedTransition }] }
          ]}
        >

          <View style={[styles.recentlyDeletedHeader, { paddingTop: statusBarHeight + 12 }]}>
            <Pressable
              onPress={closeRecentlyDeletedPage}
              style={({ pressed }) => [styles.rdBackBtn, pressed && styles.btnPressed]}
            >
              <Ionicons name="chevron-back" size={22} color="#000000" style={{ marginRight: 2 }} />
            </Pressable>
            <Text style={styles.rdTitleText}>Recently Deleted</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.rdWarningBanner}>
            <Ionicons name="trash-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
            <Text style={styles.rdWarningText}>
              Items in the trash will be permanently deleted after 15 days.
            </Text>
          </View>

          {isFetchingDeleted && recentlyDeletedPhotos.length === 0 ? (
            <View style={styles.rdCenterContainer}>
              <ActivityIndicator size="large" color="#000000" />
            </View>
          ) : recentlyDeletedPhotos.length === 0 ? (
            <View style={styles.rdCenterContainer}>
              <Ionicons name="trash-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
              <Text style={styles.rdEmptyText}>No items in Bin</Text>
            </View>
          ) : (
            <FlatList
              data={recentlyDeletedPhotos}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={[styles.rdGridContainer, { paddingBottom: selectedDeletedIds.length > 0 ? 100 : 40 }]}
              windowSize={5}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item, index }) => {
                const isSelected = selectedDeletedIds.includes(item.id);
                const deletedGridCellWidth = (SCREEN_WIDTH - 36 - 2 * 2) / 3;
                return (
                  <Pressable
                    onPress={() => toggleSelectDeletedItem(item.id)}
                    style={[
                      styles.rdGridItem,
                      {
                        width: deletedGridCellWidth,
                        height: deletedGridCellWidth,
                        marginBottom: 2,
                        marginRight: (index + 1) % 3 === 0 ? 0 : 2,
                      }
                    ]}
                  >
                    <Image source={{ uri: item.uri }} style={styles.rdGridImage} />

                    {Boolean(isSelected) && (
                      <View style={styles.rdSelectedOverlay}>
                        <View style={styles.rdCheckCircle}>
                          <Ionicons name="checkmark" size={12} color="#ffffff" />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          {Boolean(selectedDeletedIds.length > 0) && (
            <View style={[styles.rdBottomActionBar, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable
                onPress={() => openRdSheet('restore')}
                style={({ pressed }) => [styles.rdActionBarBtn, pressed && styles.btnPressed]}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#000000" />
                <Text style={styles.rdActionBarText}>Restore</Text>
              </Pressable>

              <Pressable
                onPress={() => openRdSheet('delete')}
                style={({ pressed }) => [styles.rdActionBarBtn, pressed && styles.btnPressed]}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.rdActionBarText, { color: '#ef4444' }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}

      {Boolean(rdConfirmActive) && (
        <View style={styles.confirmModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRdSheet}>
            <View style={styles.confirmModalBackdrop} />
          </Pressable>
          <Animated.View style={[styles.deleteSheet, { transform: [{ translateY: rdSheetAnim }] }]}>
            <View style={styles.deleteSheetHandle} />

            <View style={[
              styles.confirmIconContainer,
              { backgroundColor: rdConfirmType === 'delete' ? '#fef2f2' : '#f0fdf4' }
            ]}>
              <Ionicons
                name={rdConfirmType === 'delete' ? 'trash-outline' : 'arrow-undo-outline'}
                size={24}
                color={rdConfirmType === 'delete' ? '#ef4444' : '#22c55e'}
              />
            </View>

            <Text style={styles.confirmTitle}>
              {rdConfirmType === 'delete' ? 'Delete Permanently?' : 'Restore Photos?'}
            </Text>

            <Text style={styles.confirmSubtitle}>
              {rdConfirmType === 'delete'
                ? `Are you sure you want to permanently delete ${selectedDeletedIds.length} item(s)? This cannot be undone.`
                : `Restore ${selectedDeletedIds.length} item(s) back to your library?`}
            </Text>

            <View style={styles.confirmActionsRow}>
              <Pressable
                onPress={closeRdSheet}
                style={({ pressed }) => [styles.confirmCancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRdConfirm}
                style={({ pressed }) => [
                  rdConfirmType === 'delete' ? styles.confirmDeleteBtn : styles.confirmPrimaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.confirmDeleteText}>
                  {rdConfirmType === 'delete' ? 'Delete' : 'Restore'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {Boolean(lightboxActive && currentViewingPhoto) && (
        <Animated.View
          style={[styles.lightboxOverlay, { opacity: lightboxOpacity }]}
        >
          <StatusBar style={lightboxImmersive ? 'light' : 'dark'} translucent backgroundColor="transparent" />

          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: '#000000',
                opacity: immersiveAnim,
                zIndex: 1,
              }
            ]}
            pointerEvents="none"
          />

          <Animated.View
            pointerEvents={lightboxImmersive ? 'none' : 'auto'}
            style={[
              styles.lightboxHeader,
              {
                paddingTop: statusBarHeight + 12,
                opacity: immersiveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [{
                  translateY: immersiveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -100 - statusBarHeight],
                  }),
                }],
              }
            ]}
          >
            <Pressable
              onPress={handleCloseLightbox}
              style={({ pressed }) => [styles.lightboxCloseBtn, pressed && styles.btnPressed]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color="#0f172a" />
            </Pressable>

            <View style={styles.lightboxHeaderCenter}>
              <Text style={styles.lightboxDateText}>
                {currentViewingPhoto.date.split(' at ')[0]}
              </Text>
              <Text style={styles.lightboxTimeText}>
                {currentViewingPhoto.date.split(' at ')[1] || '12:00 PM'}
              </Text>
            </View>

            <View style={styles.lightboxActionRow}>
              <Pressable
                onPress={() => toggleFavourite(currentViewingPhoto.id)}
                style={styles.lightboxActionIconBtn}
              >
                <Ionicons
                  name={currentViewingPhoto.favourite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={currentViewingPhoto.favourite ? '#ef4444' : '#475569'}
                />
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.lightboxContent}>

            <Animated.View
              style={[
                styles.lightboxImageContainer,
                {
                  transform: [
                    { scale: lightboxScale },
                    { translateY: lightboxStageY },
                    { translateX: imageTranslateX }
                  ]
                }
              ]}
              renderToHardwareTextureAndroid
            >
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [
                    { scale: zoomScale },
                    { translateX: panX },
                    { translateY: panY }
                  ]
                }}
              >
                <Image
                  key={currentViewingPhoto.id || currentViewingPhotoUri}
                  source={{ uri: currentViewingPhotoUri }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                  onLoadStart={() => setLightboxImageLoading(true)}
                  onLoadEnd={() => setLightboxImageLoading(false)}
                  onError={() => {
                    setLightboxImageLoading(false);
                    markPhotoImageFailed(currentViewingPhoto.id);
                  }}
                />
              </Animated.View>
              {lightboxImageLoading && (
                <View style={styles.lightboxLoaderOverlay} pointerEvents="none">
                  <View style={styles.lightboxLoaderBubble}>
                    <Spinner size={34} color="#0f172a" />
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          {Boolean(!infoSheetOpen) && (
            <Animated.View
              pointerEvents={lightboxImmersive ? 'none' : 'auto'}
              style={[
                styles.lightboxFooterBar,
                {
                  paddingBottom: insets.bottom + 16,
                  paddingTop: 16,
                  opacity: immersiveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [{
                    translateY: immersiveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 120 + insets.bottom],
                    }),
                  }],
                }
              ]}
            >
              <Pressable
                onPress={toggleInfoSheet}
                style={styles.lightboxFooterBtn}
              >
                <Ionicons name="information-circle-outline" size={24} color="#0f71f2" />
              </Pressable>

              <Pressable
                onPress={handleDownloadPhoto}
                style={styles.lightboxFooterBtn}
              >
                <Ionicons name="download-outline" size={24} color="#0f71f2" />
              </Pressable>

              <Pressable
                onPress={openDeleteSheet}
                style={styles.lightboxFooterBtn}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </Pressable>
            </Animated.View>
          )}

          {Boolean(deleteConfirmActive) && (
            <View style={styles.confirmModalOverlay}>

              <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteSheet}>
                <View style={styles.confirmModalBackdrop} />
              </Pressable>

              <Animated.View style={[styles.deleteSheet, { transform: [{ translateY: deleteSheetAnim }] }]}>
                <View style={styles.deleteSheetHandle} />

                <View style={styles.confirmIconContainer}>
                  <Ionicons name={currentViewingPhoto.deleted ? 'trash-outline' : 'alert-circle-outline'} size={24} color="#ef4444" />
                </View>

                <Text style={styles.confirmTitle}>
                  {currentViewingPhoto.deleted ? 'Delete forever?' : 'Move to Recently Deleted?'}
                </Text>

                <Text style={styles.confirmSubtitle}>
                  {currentViewingPhoto.deleted
                    ? 'This photo will be permanently removed from your iClora Cloud. This action cannot be undone.'
                    : 'Are you sure you want to remove this photo from your Library? You can restore it from Recently Deleted.'}
                </Text>

                <View style={styles.confirmActionsRow}>
                  <Pressable
                    onPress={closeDeleteSheet}
                    style={({ pressed }) => [styles.confirmCancelBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmDelete}
                    style={({ pressed }) => [styles.confirmDeleteBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.confirmDeleteText}>
                      {currentViewingPhoto.deleted ? 'Delete forever' : 'Move photo'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          )}

          {Boolean(infoSheetOpen && currentViewingPhoto) && (() => {
            const uploadedValue = currentViewingPhoto.uploadedAt || currentViewingPhoto.createdAt || '';
            const updatedValue = currentViewingPhoto.updatedAt || currentViewingPhoto.syncedAt || '';
            const dimensionValue = currentViewingPhoto.width && currentViewingPhoto.height
              ? `${currentViewingPhoto.width} x ${currentViewingPhoto.height}`
              : '';
            const syncedByValue = [
              currentViewingPhoto.syncedBy,
              currentViewingPhoto.syncedByEmail ? `<${currentViewingPhoto.syncedByEmail}>` : '',
            ].filter(Boolean).join(' ');
            const visionValue = currentViewingPhoto.visionCaption
              || currentViewingPhoto.visionLabel
              || (currentViewingPhoto.visionTags?.length ? currentViewingPhoto.visionTags.join(', ') : '');

            const rows = [
              { label: 'Kind', value: currentViewingPhoto.isVideo ? 'Video' : 'Image' },
              { label: 'Date', value: formatInfoDate(uploadedValue) || currentViewingPhoto.shortDate },
              { label: 'Time', value: formatInfoTime(uploadedValue) },
              { label: 'Size', value: formatBytes(currentViewingPhoto.bytes) },
              { label: 'Dimensions', value: dimensionValue },
              { label: 'Format', value: currentViewingPhoto.format },
              { label: 'Uploaded', value: formatInfoDateTime(uploadedValue) },
              { label: 'Modified', value: formatInfoDateTime(updatedValue) },
              { label: 'Status', value: currentViewingPhoto.deleted ? 'In Recently Deleted' : 'Backed up' },
              { label: 'Synced by', value: syncedByValue },
              { label: 'Device Name', value: currentViewingPhoto.deviceName },
              { label: 'Provider', value: currentViewingPhoto.syncedByProvider },
              { label: 'Vision', value: isVisionCyclePending(currentViewingPhoto) ? 'Not synced' : 'Synced' },
              { label: 'Vision Cycle', value: visionCycleSourceLabel(currentViewingPhoto) },
              { label: 'Favourite', value: currentViewingPhoto.favourite ? 'Yes' : 'No' },
              { label: 'Visibility', value: currentViewingPhoto.deleted ? 'Bin' : 'Visible' },
            ]
              .map((row) => ({
                ...row,
                value: String(row.value || '').trim(),
              }))
              .filter((row) => row.value);

            return (
              <>

                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={toggleInfoSheet}
                />

                <Animated.View style={[styles.infoSheet, { transform: [{ translateY: infoSheetAnim }] }]}>

                  <View style={styles.infoSheetHeader}>
                    <View style={styles.infoSheetLeft}>
                      <View style={styles.infoIconCircle}>
                        <Ionicons name="information-circle" size={20} color="#3b82f6" />
                      </View>
                      <Text style={styles.infoSheetTitleText}>Photo Info</Text>
                    </View>
                    <Pressable onPress={toggleInfoSheet} style={styles.infoSheetCloseBtnCircle}>
                      <Ionicons name="close" size={18} color="#475569" />
                    </Pressable>
                  </View>

                  <View style={styles.infoSheetDivider} />

                  <ScrollView
                    style={styles.infoSheetScroll}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {rows.map((row, idx) => (
                      <View key={idx} style={styles.infoSheetRow}>
                        <Text style={styles.infoSheetRowLabel}>{row.label}</Text>
                        <Text style={styles.infoSheetRowValue}>{row.value}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </Animated.View>
              </>
            );
          })()}
        </Animated.View>
      )}

      {Boolean(isImporting) && (
        <View style={styles.importOverlay} pointerEvents="none">
          <View style={styles.dlCard}>

            <Image
              source={AA_GIF}
              style={styles.dlGif}
              resizeMode="contain"
            />

            <Text style={styles.dlTitle}>Downloading{dlTotal > 1 ? ` ${dlTotal} Photos` : ' Photo'}…</Text>
            <Text style={styles.dlSubtitle}>
              {dlDownloaded} of {dlTotal} downloaded
            </Text>

            <View style={styles.dlBarBg}>
              <Animated.View
                style={{
                  height: '100%',
                  borderRadius: 99,
                  overflow: 'hidden',
                  width: dlProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              >
                <LinearGradient
                  colors={['#6366f1', '#a855f7', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>

            <View style={styles.dlStatsRow}>
              <Text style={styles.dlStatPct}>{importPercent}%</Text>
              <Text style={styles.dlStatEta}>
                {dlEta > 0 ? `~${dlEta}s remaining` : 'Finishing…'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {Boolean(multiConfirmActive) && (
        <View style={styles.confirmModalOverlay}>

          <Pressable style={StyleSheet.absoluteFill} onPress={closeMultiSheet}>
            <View style={styles.confirmModalBackdrop} />
          </Pressable>

          <Animated.View style={[styles.deleteSheet, { transform: [{ translateY: multiSheetAnim }] }]}>
            <View style={styles.deleteSheetHandle} />

            <View style={styles.confirmIconContainer}>
              <Ionicons
                name={multiConfirmType === 'import' ? 'download-outline' : 'trash-outline'}
                size={24}
                color={multiConfirmType === 'import' ? '#000000' : '#ef4444'}
              />
            </View>

            <Text style={styles.confirmTitle}>
              {multiConfirmType === 'import' ? 'Download selected?' : 'Move selected to Bin?'}
            </Text>

            <Text style={styles.confirmSubtitle}>
              {multiConfirmType === 'import'
                ? `Are you sure you want to download ${selectedIds.length} selected photo(s) to your local device gallery path?`
                : `Are you sure you want to move ${selectedIds.length} selected photo(s) to Recently Deleted?`}
            </Text>

            <View style={styles.confirmActionsRow}>
              <Pressable
                onPress={closeMultiSheet}
                style={({ pressed }) => [styles.confirmCancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmMultiAction}
                style={({ pressed }) => [
                  multiConfirmType === 'import' ? styles.confirmPrimaryBtn : styles.confirmDeleteBtn,
                  pressed && styles.btnPressed
                ]}
              >
                <Text style={styles.confirmDeleteText}>
                  {multiConfirmType === 'import' ? 'Download' : 'Move to Bin'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  firstTimeLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
    minHeight: SCREEN_HEIGHT * 0.62,
  },
  fetchingGif: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  fetchingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  fetchingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 260,
  },
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchListWrapper: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 112,
  },
  searchListSection: {
    marginBottom: 20,
  },
  searchListSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'none',
    marginBottom: 8,
    paddingLeft: 6,
  },
  searchListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 2,
  },
  searchListItemPressed: {
    backgroundColor: '#f1f5f9',
  },
  searchListItemIcon: {
    width: 32,
    marginRight: 10,
    textAlign: 'center',
  },
  searchListItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  btnPressed: {
    opacity: 0.6,
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerRightSpacer: {
    width: 36,
  },
  selectAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  libraryHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  libraryTitle: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  libraryStatus: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  libraryStatusSync: {
    color: '#64748b',
    fontWeight: '800',
  },
  libraryStatusSyncActive: {
    color: '#0f71f2',
  },

  gridContainer: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  gridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  checkCircleOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#000000',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },

  goldImportAllBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#78350f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  goldBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  goldBannerContent: {
    flex: 1,
  },
  goldBannerLogo: {
    width: 18,
    height: 18,
    marginBottom: 2,
  },
  goldBannerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350f',
  },
  goldBannerSubtext: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 1,
  },
  goldBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSelectionPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  selectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelSelectionBtn: {
    flex: 0.22,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  cancelSelectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  multiImportBtn: {
    flex: 0.39,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  multiDeleteBtn: {
    flex: 0.39,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  confirmPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lightboxOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  lightboxHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 100,
    backgroundColor: '#ffffff',
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  lightboxTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  lightboxBrandTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  lightboxIndexText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginTop: 2,
  },
  lightboxActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightboxActionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#ffffff',
  },
  lightboxContent: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  lightboxImageFrame: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  lightboxImageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
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
  sideChevronLeft: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  sideChevronRight: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },

  lightboxCaptionPanel: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    backgroundColor: '#ffffff',
    width: '100%',
  },
  filmstripWrap: {
    width: '100%',
    maxHeight: 58,
    marginBottom: 12,
  },
  filmstripContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filmstripThumb: {
    width: 38,
    height: 46,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginHorizontal: 3,
    backgroundColor: '#e8edf5',
  },
  filmstripThumbActive: {
    borderColor: '#0f71f2',
    transform: [{ scale: 1.05 }],
  },
  filmstripImage: {
    width: '100%',
    height: '100%',
  },
  lightboxCaptionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: -0.3,
  },
  lightboxCaptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  lightboxCaptionSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  lightboxCaptionDot: {
    color: '#cbd5e1',
    marginHorizontal: 8,
    fontSize: 13,
  },

  confirmModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  confirmModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  deleteSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    height: 320,
    zIndex: 2000,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deleteSheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  confirmIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  confirmSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  infoSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    height: 520,
    zIndex: 2000,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    width: '100%',
  },
  infoSheetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSheetTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 12,
    letterSpacing: -0.4,
  },
  infoSheetCloseBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSheetDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginVertical: 4,
  },
  infoSheetScroll: {
    flex: 1,
    marginTop: 8,
  },
  infoSheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoSheetRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  infoSheetRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  infoSheetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagCapsule: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    marginBottom: 6,
  },
  tagCapsuleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f71f2',
  },

  importOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 5000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  dlCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  dlGif: {
    width: 110,
    height: 110,
    marginBottom: 14,
  },
  dlTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  dlSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
    textAlign: 'center',
  },
  dlBarBg: {
    width: '100%',
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 10,
  },
  dlBarFill: {
    height: '100%',
    borderRadius: 99,
    background: 'linear-gradient(90deg, #6366f1, #ec4899)',
    backgroundColor: '#6366f1',
  },
  dlStatsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dlStatPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dlStatEta: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  videoBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  lightboxHeaderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  lightboxDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  lightboxTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  lightboxFooterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
    paddingTop: 12,
    zIndex: 100,
  },
  lightboxFooterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  lightboxFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  floatingBottomBar: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -(FLOATING_NAV_WIDTH / 2) }],
    width: FLOATING_NAV_WIDTH,
    height: FLOATING_NAV_HEIGHT,
    borderRadius: FLOATING_NAV_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(219, 227, 236, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 99,
  },
  floatingBottomBarContent: {
    alignItems: 'center',
    width: FLOATING_NAV_INNER_WIDTH,
    height: FLOATING_NAV_HEIGHT - FLOATING_NAV_PADDING * 2,
    position: 'relative',
  },
  floatingActivePillBackground: {
    position: 'absolute',
    height: FLOATING_NAV_HEIGHT - FLOATING_NAV_PADDING * 2,
    borderRadius: (FLOATING_NAV_HEIGHT - FLOATING_NAV_PADDING * 2) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    top: 0,
    width: FLOATING_NAV_ACTIVE_WIDTH,
    left: 0,
  },
  floatingBottomTabTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  floatingPhotosHitArea: {
    left: 0,
    width: FLOATING_NAV_HIT_WIDTH,
  },
  floatingSearchHitArea: {
    right: 0,
    width: FLOATING_NAV_HIT_WIDTH,
  },
  floatingBottomTabPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  floatingActiveContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FLOATING_NAV_ACTIVE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  floatingInactiveContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FLOATING_NAV_INACTIVE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  floatingPhotosActiveContent: {
    left: 0,
  },
  floatingPhotosInactiveContent: {
    left: 0,
  },
  floatingSearchActiveContent: {
    left: FLOATING_NAV_INACTIVE_WIDTH,
  },
  floatingSearchInactiveContent: {
    right: 0,
  },
  floatingActiveTextWhite: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginLeft: 6,
  },

  collectionsContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  collectionsBox: {
    width: '48%',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  collectionsBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
    textAlign: 'center',
  },
  collectionsCenterpiece: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginVertical: 12,
  },
  createAlbumBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#78350f',
  },
  createAlbumBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  collectionsListSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  collectionsListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  collectionsListRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionsListRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  collectionsListRowCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  searchSectionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  searchBarInputContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBarTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  searchCancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  searchCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },

  ytSearchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 9000,
  },
  ytSearchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  ytBackBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  ytSearchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 42,
  },
  ytSearchTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  ytCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ytCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  ytDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  ytChipsSection: {
    paddingVertical: 14,
  },
  ytChipsScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  ytChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ytChipPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.96 }],
  },
  ytChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  searchContentScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  searchHelperLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  searchSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  searchSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  searchSectionViewAll: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  peopleHorizontalScroll: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  personCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  personAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  personName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  placesHorizontalScroll: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  placeCard: {
    width: 100,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 140,
  },
  searchCategoryBtn: {
    width: '25%',
    aspectRatio: 1,
    padding: 4,
  },
  searchCategoryBtnContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchCategoryBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },

  recentlyDeletedPage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 1500,
  },
  recentlyDeletedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  rdBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rdTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  rdWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rdWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 18,
  },
  rdCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  rdEmptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  rdGridContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  rdGridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rdGridImage: {
    width: '100%',
    height: '100%',
  },
  rdSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
  },
  rdCheckCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rdBottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  rdActionBarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  rdActionBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
  },

  webOnlyPage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 1500,
  },
  webOnlyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  webOnlyGif: {
    width: 220,
    height: 220,
    marginBottom: 24,
  },
  webOnlyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  webOnlyBtn: {
    width: '100%',
    maxWidth: 240,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webOnlyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
