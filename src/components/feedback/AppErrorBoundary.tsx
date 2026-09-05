import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

import { Text } from "@/components/ui/Text";
interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unknown runtime error'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App failed to render</Text>
          <Text style={styles.message}>{this.state.errorMessage}</Text>
          <Text style={styles.hint}>Check Metro bundler logs for the full stack trace.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.danger
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.muted
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12
  }
});
