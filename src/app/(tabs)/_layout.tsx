import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22D3EE',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#0E0E0E',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
