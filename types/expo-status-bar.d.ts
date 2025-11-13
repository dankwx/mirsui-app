import type * as React from 'react';
import type { StatusBarProps } from 'react-native';

declare module 'expo-status-bar' {
  export interface ExpoStatusBarProps extends StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
  }

  export const StatusBar: React.FC<ExpoStatusBarProps>;
}
