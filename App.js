import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import AccountPreviewScreen from './src/screens/AccountPreviewScreen';
import RemoteLogoutScreen from './src/screens/RemoteLogoutScreen';
import PhotoSelectorScreen from './src/screens/PhotoSelectorScreen';
import AboutScreen from './src/screens/AboutScreen';
import CloudGalleryScreen from './src/screens/CloudGalleryScreen';
import StartupSplash from './src/splash/StartupSplash';
import { readAuthSession, readPermissionsAccepted, clearAuthSession } from './src/auth/sessionStore';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [prevScreen, setPrevScreen] = useState(null);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [preloadedPhotos, setPreloadedPhotos] = useState([]);
  const [isBackupFlow, setIsBackupFlow] = useState(false);
  const [aboutBackScreen, setAboutBackScreen] = useState('landing');

  const landingAnim = useRef(new Animated.Value(1)).current;
  const loginAnim = useRef(new Animated.Value(0)).current;
  const permissionsAnim = useRef(new Animated.Value(0)).current;
  const accountPreviewAnim = useRef(new Animated.Value(0)).current;
  const remoteLogoutAnim = useRef(new Animated.Value(0)).current;
  const photoSelectorAnim = useRef(new Animated.Value(0)).current;
  const aboutAnim = useRef(new Animated.Value(0)).current;
  const cloudGalleryAnim = useRef(new Animated.Value(0)).current;

  const screenAnims = {
    landing: landingAnim,
    login: loginAnim,
    permissions: permissionsAnim,
    accountPreview: accountPreviewAnim,
    remoteLogout: remoteLogoutAnim,
    photoSelector: photoSelectorAnim,
    about: aboutAnim,
    cloudGallery: cloudGalleryAnim,
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const nodes = [
      document.documentElement,
      document.body,
      document.getElementById('root'),
      document.getElementById('root')?.firstElementChild,
    ].filter(Boolean);

    nodes.forEach((node) => {
      node.style.backgroundColor = '#ffffff';
      node.style.overscrollBehavior = 'none';
    });
    document.body.style.margin = '0';
    document.body.style.overflowX = 'hidden';
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const minimumSplashTime = new Promise((resolve) => setTimeout(resolve, 2000));
      const session = await readAuthSession();
      if (active) {
        if (session) {
          const permissionsAccepted = await readPermissionsAccepted();
          if (active) {
            const nextScr = permissionsAccepted ? 'accountPreview' : 'permissions';
            setScreen(nextScr);

            screenAnims[nextScr].setValue(1);
            landingAnim.setValue(0);
          }
        } else {

          await clearAuthSession();
        }
      }

      await minimumSplashTime;
      if (!active) return;

      setIsAppReady(true);
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const isForwardRef = useRef(true);

  const changeScreen = (nextScreen) => {
    if (nextScreen === screen) return;

    const prev = screen;
    const SCREEN_ORDER = {
      landing: 0,
      login: 1,
      permissions: 2,
      accountPreview: 3,
      photoSelector: 4,
      remoteLogout: 5,
      about: 6,
      cloudGallery: 7,
    };
    isForwardRef.current = (SCREEN_ORDER[nextScreen] ?? 0) >= (SCREEN_ORDER[prev] ?? 0);

    setPrevScreen(prev);
    setScreen(nextScreen);

    screenAnims[prev].stopAnimation();
    screenAnims[nextScreen].stopAnimation();

    Animated.parallel([
      Animated.timing(screenAnims[prev], {
        toValue: 0,
        duration: 320,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }),
      Animated.timing(screenAnims[nextScreen], {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setPrevScreen(null);
      }
    });
  };

  const getScreenStyle = (screenKey, animValue) => {
    const isCloudGalleryActive = screen === 'cloudGallery' || prevScreen === 'cloudGallery';

    if (screenKey === 'cloudGallery') {
      return {
        transform: [
          {
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [SCREEN_WIDTH, 0],
            }),
          },
        ],
        zIndex: 100,
      };
    }

    if (screenKey === 'accountPreview' && isCloudGalleryActive) {
      return {
        transform: [
          {
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-SCREEN_WIDTH * 0.22, 0],
            }),
          },
        ],
        zIndex: 10,
      };
    }

    return {
      opacity: animValue,
    };
  };

  const showLanding = screen === 'landing' || prevScreen === 'landing';
  const showLogin = screen === 'login' || prevScreen === 'login';
  const showPermissions = screen === 'permissions' || prevScreen === 'permissions';
  const showAccountPreview = screen === 'accountPreview' || prevScreen === 'accountPreview';
  const showRemoteLogout = screen === 'remoteLogout' || prevScreen === 'remoteLogout';
  const showPhotoSelector = screen === 'photoSelector' || prevScreen === 'photoSelector';
  const showAbout = screen === 'about' || prevScreen === 'about';
  const showCloudGallery = screen === 'cloudGallery' || prevScreen === 'cloudGallery';

  const openAboutScreen = (fromScreen) => {
    setAboutBackScreen(fromScreen);
    changeScreen('about');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.app}>

        <StatusBar style="dark" translucent={true} backgroundColor="transparent" />

        {showLanding && (
          <Animated.View pointerEvents={screen === 'landing' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('landing', landingAnim)]} renderToHardwareTextureAndroid>
            <LandingScreen onPressSignIn={() => changeScreen('login')} onPressHelp={() => openAboutScreen('landing')} />
          </Animated.View>
        )}

        {showLogin && (
          <Animated.View pointerEvents={screen === 'login' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('login', loginAnim)]} renderToHardwareTextureAndroid>
            <LoginScreen onLoggedIn={() => changeScreen('permissions')} onPressHelp={() => openAboutScreen('login')} />
          </Animated.View>
        )}

        {showPermissions && (
          <Animated.View pointerEvents={screen === 'permissions' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('permissions', permissionsAnim)]} renderToHardwareTextureAndroid>
            <PermissionsScreen
              fromBackup={isBackupFlow}
              onPressHelp={() => openAboutScreen('permissions')}
              onAccepted={async () => {
                if (isBackupFlow) {
                  try {
                    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permission?.granted) {
                      alert('Media library permission is required to select photos.');
                      return;
                    }
                    const mediaTypes = ImagePicker.MediaTypeOptions?.Images || 'images';
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes,
                      allowsMultipleSelection: true,
                      selectionLimit: 50,
                      quality: 1,
                      exif: true,
                      orderedSelection: true,
                    });

                    if (result?.canceled || !result?.assets || result.assets.length === 0) {
                      return;
                    }

                    const mapped = result.assets.map((asset, idx) => {
                      const cleanUri = asset.uri.split('?')[0];
                      const parts = cleanUri.split('/');
                      const uriName = parts[parts.length - 1] || null;
                      return {
                        id: asset.assetId || `asset-${Date.now()}-${idx}`,
                        uri: asset.uri || '',
                        width: asset.width || 0,
                        height: asset.height || 0,
                        fileSize: asset.fileSize || null,
                        fileName: asset.fileName || uriName || `IMG_${Date.now()}_${idx + 1}.JPG`,
                        mimeType: asset.mimeType || null,
                        exif: asset.exif ? {
                          Make: asset.exif.Make,
                          Model: asset.exif.Model,
                          LensModel: asset.exif.LensModel,
                          FocalLength: asset.exif.FocalLength,
                          FocalLenIn35mmFilm: asset.exif.FocalLenIn35mmFilm,
                          FNumber: asset.exif.FNumber,
                          ApertureValue: asset.exif.ApertureValue,
                          ISOSpeedRatings: asset.exif.ISOSpeedRatings,
                          ISO: asset.exif.ISO,
                          PhotographicSensitivity: asset.exif.PhotographicSensitivity,
                          ExposureBiasValue: asset.exif.ExposureBiasValue,
                          DateTimeOriginal: asset.exif.DateTimeOriginal,
                          DateTimeDigitized: asset.exif.DateTimeDigitized,
                          DateTime: asset.exif.DateTime,
                        } : null,
                        pickedAt: Date.now(),
                      };
                    });

                    setPreloadedPhotos(mapped);
                    setIsBackupFlow(false);
                    changeScreen('photoSelector');
                  } catch (err) {
                    console.warn('Failed to pick photos:', err);
                    alert('Could not open gallery. Please try again.');
                  }
                } else {
                  changeScreen('accountPreview');
                }
              }}
            />
          </Animated.View>
        )}

        {showAccountPreview && (
          <Animated.View pointerEvents={screen === 'accountPreview' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('accountPreview', accountPreviewAnim)]} renderToHardwareTextureAndroid>
            <AccountPreviewScreen
              isActive={screen === 'accountPreview'}
              onLoggedOut={() => changeScreen('landing')}
              onSessionRevoked={() => changeScreen('remoteLogout')}
              onPressHelp={() => openAboutScreen('accountPreview')}
              onBackupTriggered={() => {
                setPreloadedPhotos([]);
                setIsBackupFlow(false);
                changeScreen('photoSelector');
              }}
              onWatchCloudPhotos={() => changeScreen('cloudGallery')}
            />
          </Animated.View>
        )}

        {showRemoteLogout && (
          <Animated.View pointerEvents={screen === 'remoteLogout' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('remoteLogout', remoteLogoutAnim)]} renderToHardwareTextureAndroid>
            <RemoteLogoutScreen onRelogin={() => changeScreen('login')} />
          </Animated.View>
        )}

        {showPhotoSelector && (
          <Animated.View pointerEvents={screen === 'photoSelector' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('photoSelector', photoSelectorAnim)]} renderToHardwareTextureAndroid>
            <PhotoSelectorScreen
              preloadedPhotos={preloadedPhotos}
              onBack={() => {
                setIsBackupFlow(false);
                changeScreen('accountPreview');
              }}
              onUploadFinished={() => {
                setIsBackupFlow(false);
                changeScreen('accountPreview');
              }}
            />
          </Animated.View>
        )}

        {showAbout && (
          <Animated.View pointerEvents={screen === 'about' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('about', aboutAnim)]} renderToHardwareTextureAndroid>
            <AboutScreen onBack={() => changeScreen(aboutBackScreen)} />
          </Animated.View>
        )}

        {showCloudGallery && (
          <Animated.View pointerEvents={screen === 'cloudGallery' ? 'auto' : 'none'} style={[styles.layer, getScreenStyle('cloudGallery', cloudGalleryAnim)]} renderToHardwareTextureAndroid>
            <CloudGalleryScreen onBack={() => changeScreen('accountPreview')} />
          </Animated.View>
        )}

        {showStartupSplash && (
          <StartupSplash
            isReady={isAppReady}
            onAnimationEnd={() => setShowStartupSplash(false)}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#ffffff' },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
