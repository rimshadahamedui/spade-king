import React from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppBootstrap } from './src/hooks/useAppBootstrap';

function BootstrapFallback() {
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }
  return null;
}

export default function App() {
  const ready = useAppBootstrap();

  if (!ready) {
    return (
      <>
        <StatusBar style="light" backgroundColor="#000000" />
        <BootstrapFallback />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />
      <AppNavigator />
    </>
  );
}
