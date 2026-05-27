import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { LandingScreen } from '@/features/core';
import { LoginScreen, RegisterScreen } from '@/features/auth';
import { ClassesScreen, ClassDetailsScreen } from '@/features/classes';
import { BookClassScreen } from '@/features/bookings';
import { HomeScreen } from '@/features/home';
import { ProfileScreen } from '@/features/profile';
import type { RootStackParamList, MainTabParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#0A0A0A' },
};

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '700' : '400',
          color: focused ? '#22D3EE' : '#555',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#0E0E0E',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#22D3EE',
        tabBarInactiveTintColor: '#444',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Classes"
        component={ClassesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Classes" focused={focused} /> }}
      />
      <Tab.Screen
        name="Book"
        component={BookClassScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Book" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, initializing } = useAuthState();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ClassDetails"
              component={ClassDetailsScreen}
              options={{
                headerShown: true,
                title: 'Class Details',
                headerStyle: { backgroundColor: '#0E0E0E' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: '700' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="BookClass"
              component={BookClassScreen}
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Auth" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
