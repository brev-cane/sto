import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { FIREBASE_AUTH } from './FirebaseConfig';

// Screens
import Home from './app/(tabs)/home';
import Login from './app/(tabs)/Login';
import Settings from './app/(tabs)/Settings';
import Video from './app/(tabs)/Video';

// UI
import { Ionicons } from '@expo/vector-icons';
import { Image, TouchableOpacity } from 'react-native';

import COLORS from './app/components/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const LogoTitle = () => (
  <Image
    source={require('./assets/images/light-logo.png')} 
    style={{ width: 120, height: 35, resizeMode: 'contain' }}
  />
);

function InsideLayout({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: COLORS.primary, 
        },
        headerTitle: () => <LogoTitle />,
        headerTintColor: COLORS.text, 
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Video') {
            iconName = focused ? 'videocam' : 'videocam-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.accent, 
        tabBarInactiveTintColor: 'white',
        tabBarStyle: {
          backgroundColor: COLORS.primary, 
          height: 65,
          borderTopWidth: 0,
          borderTopColor: 'black',
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Video" component={Video} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (authUser) => {
      setUser(authUser);
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Inside" component={InsideLayout} />
            <Stack.Screen name="Settings" component={Settings} />
          </>
        ) : (
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
