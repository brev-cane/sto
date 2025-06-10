import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Ionicons } from '@expo/vector-icons';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import COLORS from './components/colors';
import { AdminProvider, useAdmin } from './context/adminContext'; // <-- new

function LayoutContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { showAdmin } = useAdmin();

  const navItems = [
    { name: 'Home', icon: 'home', path: '/' },
    { name: 'Video', icon: 'videocam', path: '/video' },
    { name: 'Settings', icon: 'settings', path: '/settings' },
    ...(showAdmin ? [{ name: 'Admin', icon: 'person', path: '/admin' }] : []),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Pressable
              key={item.path}
              style={styles.navItem}
              onPress={() => router.push(item.path)}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={isActive ? COLORS.primary : 'gray'}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? COLORS.primary : 'gray' },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
  },
  navItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <AdminProvider>
        <LayoutContent />
      </AdminProvider>
    </ClerkProvider>
  );
}
