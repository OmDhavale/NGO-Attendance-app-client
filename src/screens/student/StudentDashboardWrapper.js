import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeIn,
  FadeOut,
  Layout
} from "react-native-reanimated";
import { Calendar, Briefcase, LayoutGrid, ClipboardList, LogOut } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import { NavigationContext } from "../../context/NavigationContext";
import StudentDashboardScreen from "./StudentDashboardScreen";
import StudentMyEventsScreen from "./StudentMyEventsScreen";
import StudentInternshipsScreen from "./internship/StudentInternshipsScreen";
import StudentMyInternshipsScreen from "./internship/StudentMyInternshipsScreen";
import AppHeaderWithDrawer from "../../components/AppHeaderWithDrawer";

const { width } = Dimensions.get("window");

export default function StudentDashboardWrapper({ student }) {
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { navigate } = useContext(NavigationContext);

  const [activeTab, setActiveTab] = useState("Events"); // "Events" | "Internships"
  const [eventToggle, setEventToggle] = useState("Explore"); // "Explore" | "My Events"
  const [internshipToggle, setInternshipToggle] = useState("Browse"); // "Browse" | "My Internships"

  // Animation Values
  const eventPos = useSharedValue(0);
  const internshipPos = useSharedValue(0);

  const handleEventToggle = (val) => {
    setEventToggle(val);
    eventPos.value = withSpring(val === "Explore" ? 0 : 1, { damping: 30, stiffness: 150 });
  };

  const handleInternshipToggle = (val) => {
    setInternshipToggle(val);
    internshipPos.value = withSpring(val === "Browse" ? 0 : 1, { damping: 30, stiffness: 150 });
  };

  const eventToggleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: eventPos.value * ((width - 48) / 2) }],
  }));

  const internshipToggleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: internshipPos.value * ((width - 48) / 2) }],
  }));

  const handleLogout = async () => {
    await logout();
    navigate("Home");
  };



  const renderEventsTab = () => {
    return (
      <View style={styles.tabContainer}>
        {/* Segmented Toggle */}
        <View style={[styles.toggleWrapper, { backgroundColor: colors.iconBg }]}>
          <Animated.View 
            style={[
              styles.toggleIndicator, 
              { backgroundColor: colors.cardBg, width: '50%' },
              eventToggleStyle
            ]} 
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleEventToggle("Explore")}
          >
            <LayoutGrid size={16} color={eventToggle === "Explore" ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.toggleText,
                { color: eventToggle === "Explore" ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              Explore
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleEventToggle("My Events")}
          >
            <Calendar size={16} color={eventToggle === "My Events" ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.toggleText,
                { color: eventToggle === "My Events" ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              My Events
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content with Animation */}
        <Animated.View 
          key={`event-${eventToggle}`}
          entering={FadeIn.duration(300)} 
          style={{ flex: 1 }}
        >
          {eventToggle === "Explore" ? (
            <StudentDashboardScreen student={student} isTab={true} />
          ) : (
            <StudentMyEventsScreen student={student} isTab={true} />
          )}
        </Animated.View>
      </View>
    );
  };

  const renderInternshipsTab = () => {
    return (
      <View style={styles.tabContainer}>
        {/* Segmented Toggle */}
        <View style={[styles.toggleWrapper, { backgroundColor: colors.iconBg }]}>
          <Animated.View 
            style={[
              styles.toggleIndicator, 
              { backgroundColor: colors.cardBg, width: '50%' },
              internshipToggleStyle
            ]} 
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleInternshipToggle("Browse")}
          >
            <Briefcase size={16} color={internshipToggle === "Browse" ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.toggleText,
                { color: internshipToggle === "Browse" ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleInternshipToggle("My Internships")}
          >
            <ClipboardList size={16} color={internshipToggle === "My Internships" ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.toggleText,
                { color: internshipToggle === "My Internships" ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              My Internships
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content with Animation */}
        <Animated.View 
          key={`internship-${internshipToggle}`}
          entering={FadeIn.duration(300)} 
          style={{ flex: 1 }}
        >
          {internshipToggle === "Browse" ? (
            <StudentInternshipsScreen student={student} isTab={true} />
          ) : (
            <StudentMyInternshipsScreen student={student} isTab={true} />
          )}
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : "#f8fafc" }]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <AppHeaderWithDrawer
        logoUrl={null}
        title={`Welcome, ${student?.name || "Student"}`}
        subtitle={`PRN: ${student?.prn || "N/A"}`}
        fallbackInitial={student?.name?.[0] || 'S'}
      />
      <Animated.View 
        key={activeTab}
        entering={FadeIn.duration(400)}
        style={styles.content}
      >
        {activeTab === "Events" ? renderEventsTab() : renderInternshipsTab()}
      </Animated.View>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            height: 60 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 10,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("Events")}
        >
          <Calendar
            size={24}
            color={activeTab === "Events" ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "Events" ? colors.accent : colors.textSecondary },
            ]}
          >
            Events
          </Text>
          {activeTab === "Events" && <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("Internships")}
        >
          <Briefcase
            size={24}
            color={activeTab === "Internships" ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "Internships" ? colors.accent : colors.textSecondary },
            ]}
          >
            Internships
          </Text>
          {activeTab === "Internships" && <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />}
        </TouchableOpacity>
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
  tabContainer: {
    flex: 1,
  },
  toggleWrapper: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 5,
    padding: 4,
    borderRadius: 12,
    height: 48,
  },
  headerCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "between",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  prnText: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 10,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    zIndex: 1,
  },
  toggleIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: -10,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
