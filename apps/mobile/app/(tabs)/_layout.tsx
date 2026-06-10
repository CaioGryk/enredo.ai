import React from 'react';
import { Tabs } from 'expo-router';
import { Book, Bookmark, Clapperboard, Sparkles, User } from 'lucide-react-native';

const ACCENT = '#CEBDFF';
const PANEL = '#131313';
const MUTED = '#cac4d4';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: 'rgba(10, 10, 12, 0.96)',
          borderTopColor: 'rgba(206, 189, 255, 0.1)',
          height: 84,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'serif',
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
      }}>
      <Tabs.Screen
        name="library"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color }) => <Book color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Lendo',
          tabBarIcon: ({ color }) => <Bookmark color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="scenes"
        options={{
          title: 'Cenas',
          tabBarIcon: ({ color }) => <Clapperboard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="upgrade"
        options={{
          title: 'Premium',
          tabBarIcon: ({ color }) => <Sparkles color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
