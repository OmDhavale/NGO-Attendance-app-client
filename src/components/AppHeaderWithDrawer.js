import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, X, Sun, Moon, HelpCircle, Mail, LogOut, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { NavigationContext } from '../context/NavigationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 300);

export default function AppHeaderWithDrawer({ logoUrl, title, subtitle, fallbackInitial = 'U' }) {
  const insets = useSafeAreaInsets();
  const { navigate } = useContext(NavigationContext);
  const { logout } = useContext(AuthContext);
  const { darkMode, setTheme, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleDrawer = (toValue) => {
    if (toValue) {
      setIsOpen(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    }
  };

  const handleLogout = async () => {
    toggleDrawer(false);
    await logout();
    navigate('Home');
  };

  const handleHelpPress = () => {
    const helpUrl = 'https://ngo-website-1-d3az.onrender.com/';
    Linking.openURL(helpUrl).catch(err => console.error('Failed to open URL:', err));
  };

  const handleBugPress = () => {
    if (Platform.OS === 'web') {
      const email = 'coderzhiveai@gmail.com';
      const subject = encodeURIComponent('Bug Report');
      const body = encodeURIComponent('Please describe the bug you encountered:');
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
      window.open(gmailUrl, '_blank');
    } else {
      const bugReportEmail = 'mailto:coderzhiveai@gmail.com?subject=Bug Report&body=Please describe the bug you encountered:';
      Linking.openURL(bugReportEmail).catch(err => console.error('Failed to open email:', err));
    }
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      {/* Header View */}
      <View 
        style={[
          styles.headerCard, 
          { 
            backgroundColor: colors.cardBg, 
            borderColor: colors.border,
            paddingTop: Math.max(insets.top, 16)
          }
        ]}
      >
        <View style={styles.headerContent}>
          {/* Hamburger Menu Button */}
          <TouchableOpacity 
            onPress={() => toggleDrawer(true)}
            style={[styles.iconButton, { backgroundColor: colors.iconBg }]}
            activeOpacity={0.7}
          >
            <Menu size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Logo container */}
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: colors.iconBg,
                borderColor: colors.border,
              }
            ]}
          >
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <View style={[styles.fallbackLogo, { backgroundColor: colors.accent }]}>
                <Text style={styles.fallbackLogoText}>
                  {fallbackInitial.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Title and Subtitle */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.header }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Drawer Overlay Modal */}
      <Modal
        transparent
        visible={isOpen}
        onRequestClose={() => toggleDrawer(false)}
        animationType="none"
      >
        <View style={StyleSheet.absoluteFill}>
          {/* Backdrop wrapper */}
          <Animated.View 
            style={[
              styles.backdrop, 
              { opacity: backdropOpacity }
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => toggleDrawer(false)} />
          </Animated.View>

          {/* Sliding Drawer Body */}
          <Animated.View 
            style={[
              styles.drawerPane, 
              { 
                backgroundColor: colors.cardBg,
                transform: [{ translateX }],
                paddingTop: Math.max(insets.top, 20),
                paddingBottom: Math.max(insets.bottom, 20),
              }
            ]}
          >
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerBrand, { color: colors.header }]}>MarkIn</Text>
                <Text style={[styles.drawerSubBrand, { color: colors.textSecondary }]}>Menu Options</Text>
              </View>
              <TouchableOpacity 
                onPress={() => toggleDrawer(false)}
                style={[styles.closeButton, { backgroundColor: colors.iconBg }]}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Drawer Menu Items */}
            <View style={styles.menuList}>
              {/* Appearance Mode */}
              <TouchableOpacity 
                onPress={() => setTheme(!darkMode)}
                style={[styles.menuItem, { backgroundColor: colors.iconBg }]}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  {darkMode ? (
                    <Sun size={20} color="#facc15" strokeWidth={2.5} />
                  ) : (
                    <Moon size={20} color="#64748b" strokeWidth={2.5} />
                  )}
                  <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                    {darkMode ? 'Light Theme' : 'Dark Theme'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* User Manual / Help Center */}
              <TouchableOpacity 
                onPress={handleHelpPress}
                style={[styles.menuItem, { backgroundColor: colors.iconBg }]}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <HelpCircle size={20} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                    User Manual / Help
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Report Bug */}
              <TouchableOpacity 
                onPress={handleBugPress}
                style={[styles.menuItem, { backgroundColor: colors.iconBg }]}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Mail size={20} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                    Report Issue
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Logout Button at bottom */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity 
                onPress={handleLogout}
                style={[styles.logoutBtn, { borderColor: colors.error || '#ef4444' }]}
                activeOpacity={0.7}
              >
                <LogOut size={20} color={colors.error || '#ef4444'} style={{ marginRight: 8 }} />
                <Text style={[styles.logoutBtnText, { color: colors.error || '#ef4444' }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  fallbackLogo: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackLogoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawerPane: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  drawerBrand: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  drawerSubBrand: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    flex: 1,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  drawerFooter: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
