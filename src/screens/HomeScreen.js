import React, { useContext, useState, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, useColorScheme, Image, Linking, Platform, Modal, Dimensions, TouchableOpacity,
} from 'react-native';
const RNAnimated = require('react-native').Animated;
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sun,
  Moon,
  HeartHandshake,
  School,
  ShieldUser,
  UsersRound,
  ChevronRight,
  HelpCircle,
  Mail,
  BadgeCheck,
  GraduationCap,
  Shield,
  Menu,
  X,
} from 'lucide-react-native';
import { NavigationContext } from '../context/NavigationContext';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

// --- Card Component ---
const LoginCard = ({ icon: Icon, title, subtitle, color = '#64748b', onPress, darkMode, disabled }) => {
  const scale = useSharedValue(1);
  const shadow = useSharedValue(0.05);
  const glow = useSharedValue(0);

  const { lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const activeColor = color || '#64748b';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadow.value,
    borderColor: glow.value === 0 ? colors.border : `${activeColor}66`,
    borderWidth: glow.value === 0 ? 1 : 2,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
    shadow.value = withSpring(0.15);
    glow.value = withTiming(1, { duration: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    shadow.value = withSpring(0.05);
    glow.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPress={disabled ? null : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1, height: 165 }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            padding: 20,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: colors.cardBg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 4,
            opacity: disabled ? 0.4 : 1,
            height: 165,
          },
        ]}
      >
        {/* Modern Icon Container */}
        <View
          style={{ 
            width: 56, 
            height: 56, 
            borderRadius: 28, 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 12,
            backgroundColor: `${activeColor}15` 
          }}
        >
          <Icon color={activeColor} size={28} strokeWidth={2} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: colors.header }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, textAlign: 'center', fontWeight: '500', lineHeight: 16, paddingHorizontal: 8, opacity: 0.6, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 300);

// --- Main App Component ---
export default function HomeScreen() {
  const { navigate } = useContext(NavigationContext); // ✅ integrated navigation
  const { userType, isAuthenticated } = useContext(AuthContext);
  const systemDark = useColorScheme() === 'dark';
  const { darkMode, setTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const roleColors = {
    ngo: '#059669',     // Emerald 600
    college: '#0284c7', // Sky 600
    admin: '#475569',   // Slate 600 (Neutral)
    student: '#7c3aed', // Violet 600
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  const toggleDrawer = (toValue) => {
    if (toValue) {
      setIsDrawerOpen(true);
      RNAnimated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      RNAnimated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsDrawerOpen(false));
    }
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
    outputRange: [DRAWER_WIDTH, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <LinearGradient
      colors={colors.backgroundColors}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Header Row with Menu Button */}
        <View 
          style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            paddingHorizontal: 20, 
            paddingTop: 10,
            paddingBottom: 5,
            zIndex: 10
          }}
        >
          <Pressable
            onPress={() => toggleDrawer(true)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 12,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                opacity: pressed ? 0.8 : 1,
              }
            ]}
          >
            <Menu size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >


          {/* Header Section */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(100)}
            style={{ width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center', marginBottom: 32 }}
          >
            <Image
              source={require('../../assets/CODER_HIVE_logo.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.5, color: colors.header }}>MarkIn</Text>
              <BadgeCheck color={colors.accent} size={24} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 4, opacity: 0.6, color: colors.textSecondary }}>
              Seamlessly Mark • Track • Verify Attendance
            </Text>
          </Animated.View>

          {/* Role Grid Section */}
          <View style={{ width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 4, marginBottom: 40 }}>
            <Animated.Text 
              entering={FadeInDown.duration(600).delay(200)}
              style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: colors.header }}
            >
              Choose your role
            </Animated.Text>

            {/* Row 1 */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(300)}
              style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}
            >
              <LoginCard
                icon={HeartHandshake}
                title="NGO"
                subtitle="Manage events & mark attendance"
                color={roleColors.ngo}
                darkMode={darkMode}
                onPress={() => navigate('NgoLogin')}
                disabled={isAuthenticated && userType !== 'ngo'}
              />
              <LoginCard
                icon={School}
                title="College"
                subtitle="Monitor student attendance records"
                color={roleColors.college}
                darkMode={darkMode}
                onPress={() => navigate('CollegeLogin')}
                disabled={isAuthenticated && userType !== 'college'}
              />
            </Animated.View>

            {/* Row 2 */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(400)}
              style={{ flexDirection: 'row', justifyContent: 'center' }}
            >
              <View style={{ width: '48%' }}>
                <LoginCard
                  icon={GraduationCap}
                  title="Student"
                  subtitle="Browse events and register yourself"
                  color={roleColors.student}
                  darkMode={darkMode}
                  onPress={() => navigate('StudentLogin')}
                  disabled={isAuthenticated && userType !== 'student'}
                />
              </View>
            </Animated.View>
          </View>

          {/* Footer */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(500)}
            style={{ width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, opacity: 0.2, color: colors.textSecondary }}>
              Developed by
            </Text>
            <Image
              source={darkMode ? require('../../assets/coderzhive-dark.png') : require('../../assets/coderzhive-light.png')}
              style={{ height: 20, opacity: 0.3 }}
              resizeMode="contain"
            />
          </Animated.View>
        </ScrollView>

        {/* Drawer Overlay Modal */}
        <Modal
          transparent
          visible={isDrawerOpen}
          onRequestClose={() => toggleDrawer(false)}
          animationType="none"
        >
          <View style={{ flex: 1 }}>
            {/* Backdrop wrapper */}
            <RNAnimated.View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000',
                opacity: backdropOpacity,
              }}
            >
              <Pressable style={{ flex: 1 }} onPress={() => toggleDrawer(false)} />
            </RNAnimated.View>

            {/* Sliding Drawer Body */}
            <RNAnimated.View 
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: DRAWER_WIDTH,
                backgroundColor: colors.cardBg,
                transform: [{ translateX }],
                paddingTop: Platform.OS === 'ios' ? 60 : 30,
                paddingBottom: 30,
                paddingHorizontal: 20,
                shadowColor: '#000',
                shadowOffset: { width: -4, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 16,
              }}
            >
              {/* Drawer Header */}
              <View 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  marginBottom: 20,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.header }}>MarkIn</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Settings</Text>
                </View>
                <Pressable 
                  onPress={() => toggleDrawer(false)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: colors.toggleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Drawer Menu Items */}
              <View style={{ flex: 1, gap: 12 }}>
                {/* Appearance Mode */}
                <TouchableOpacity 
                  onPress={() => setTheme(!darkMode)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.toggleBg,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {darkMode ? (
                      <Sun size={20} color="#facc15" strokeWidth={2.5} />
                    ) : (
                      <Moon size={20} color="#64748b" strokeWidth={2.5} />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                      {darkMode ? 'Light Theme' : 'Dark Theme'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* User Manual / Help Center */}
                <TouchableOpacity 
                  onPress={handleHelpPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.toggleBg,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <HelpCircle size={20} color={colors.accent} strokeWidth={2.5} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                      User Manual / Help
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Report Bug */}
                <TouchableOpacity 
                  onPress={handleBugPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.toggleBg,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Mail size={20} color={colors.accent} strokeWidth={2.5} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                      Report Issue
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </RNAnimated.View>
          </View>
        </Modal>


      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Themes ---
const lightTheme = {
  backgroundColors: ['#f8fafc', '#f1f5f9'],
  cardBg: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  accent: '#10b981',
  header: '#1e293b',
  toggleBg: '#f1f5f9',
};

const darkTheme = {
  backgroundColors: ['#0f172a', '#020617'],
  cardBg: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  accent: '#10b981',
  header: '#f1f5f9',
  toggleBg: '#334155',
};
