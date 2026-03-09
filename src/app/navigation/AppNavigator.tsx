import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { LoadingView } from '@/components/feedback/StateViews';
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { LoginScreen, RegisterScreen } from '@/features/auth';
import { HomeScreen } from '@/features/home';
import { ClassesScreen, ClassDetailsScreen } from '@/features/classes';
import { MyBookingsScreen } from '@/features/bookings';
import { ProfileScreen } from '@/features/profile';
import { SplashScreen } from '@/features/core';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#020617', borderTopColor: '#1E293B' },
        tabBarActiveTintColor: '#22D3EE',
        tabBarInactiveTintColor: '#94A3B8'
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Classes" component={ClassesScreen} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, initializing } = useAuthState();

  if (initializing) {
    return <LoadingView label="Checking session..." />;
  }

  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#020617' } }}>
      <Stack.Navigator>
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} options={{ title: 'Class Details' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
