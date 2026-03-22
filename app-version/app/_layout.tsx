import { useEffect, useCallback, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  useEffect(() => {
    async function prepare() {
      // Simula carregamento de recursos (fontes, etc.)
      await new Promise(resolve => setTimeout(resolve, 500));
      setAppReady(true);
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();

      // Animação de entrada do logo
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Espera e depois faz fade-out da splash
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setSplashDone(true));
      }, 1800);
    }
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      {!splashDone && (
        <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim }]}>
          <Animated.Image
            source={require('../assets/splash.png')}
            style={[styles.splashImage, { transform: [{ scale: scaleAnim }] }]}
            resizeMode="contain"
          />
          <Animated.Text style={styles.splashTitle}>
            Socialize<Animated.Text style={styles.splashHighlight}>Now</Animated.Text>
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  splashImage: {
    width: 180,
    height: 180,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 20,
  },
  splashHighlight: {
    color: '#BFDBFE',
  },
});
