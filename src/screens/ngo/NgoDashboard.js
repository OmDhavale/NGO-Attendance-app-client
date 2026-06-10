import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContext } from "../../context/NavigationContext";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Calendar, Briefcase, Plus, CalendarPlus, UserPlus, X, Building } from "lucide-react-native";
import NgoEventsScreen from "./NgoEventsScreen";
import NgoInternshipsScreen from "./internship/NgoInternshipsScreen";
import ManageBranchesScreen from "./ManageBranchesScreen";
import AppHeaderWithDrawer from "../../components/AppHeaderWithDrawer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function NgoDashboard({ ngo }) {
  const { navigate } = useContext(NavigationContext);
  const { userType } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  // Super Admin: only Branches tab. Branch Admin / regular NGO: Events + Internships.
  const isSuperAdmin = userType === "ngo" && ngo?.is_hierarchical;
  const isBranchAdmin = userType === "branch_admin";

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "Branches" : "Events");
  const [showSheet, setShowSheet] = useState(false);

  // Animation values
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setShowSheet(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSheet(false));
  };

  const handleOptionPress = (route, params) => {
    closeSheet();
    navigate(route, params);
  };

  const renderContent = () => {
    if (activeTab === "Branches") {
      return <ManageBranchesScreen isTab={true} ngo={ngo} />;
    }
    if (activeTab === "Internships") {
      return <NgoInternshipsScreen ngo={ngo} hideHeaderBack={true} />;
    }
    return <NgoEventsScreen ngo={ngo} hideHeaderBack={true} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColors?.[0] || "#fff" }]}>
      <AppHeaderWithDrawer 
        logoUrl={ngo?.profileImage || ngo?.ngoLogo}
        title={ngo?.ngoName || ngo?.name}
        subtitle={isBranchAdmin ? ngo?.name : "SUPER ADMIN"}
        fallbackInitial={ngo?.name?.[0] || 'N'}
      />
      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { 
            backgroundColor: colors.accent, 
            shadowColor: colors.accent,
            bottom: 65 + Math.max(insets.bottom, 10),
          },
        ]}
        onPress={openSheet}
        activeOpacity={0.8}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Super Admin: Branches + Internships tabs */}
        {isSuperAdmin && (
          <>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab("Branches")}
            >
              <Building
                size={24}
                color={activeTab === "Branches" ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: activeTab === "Branches" ? colors.accent : colors.textSecondary },
                ]}
              >
                Branches
              </Text>
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
            </TouchableOpacity>
          </>
        )}

        {/* Branch Admin / regular NGO: Events + Internships */}
        {!isSuperAdmin && (
          <>
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
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom Sheet Overlay */}
      {showSheet && (
        <Pressable style={styles.overlay} onPress={closeSheet}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayAnim },
            ]}
          />
        </Pressable>
      )}

      {/* Bottom Sheet */}
      {showSheet && (
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.cardBg,
              transform: [{ translateY: sheetAnim }],
              paddingBottom: Math.max(insets.bottom + 15, 40),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: colors.header }]}>Quick Actions</Text>
            
            {/* Super Admin: Branches → Add Branch | Internships → Add Internship */}
            {isSuperAdmin ? (
              activeTab === "Branches" ? (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress("CreateBranch")}
                >
                  <View style={[styles.optionIcon, { backgroundColor: "#8b5cf615" }]}>
                    <Building size={20} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Add New Branch</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress("CreateInternship")}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.accent + "15" }]}>
                    <Briefcase size={20} color={colors.accent} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Add New Internship</Text>
                </TouchableOpacity>
              )
            ) : activeTab === "Events" ? (
              <>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress("AddEvent")}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.accent + "15" }]}>
                    <CalendarPlus size={20} color={colors.accent} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Add New Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress("AddStudent", { isNgoVolunteer: true, ngo })}
                >
                  <View style={[styles.optionIcon, { backgroundColor: "#f59e0b15" }]}>
                    <UserPlus size={20} color="#f59e0b" />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Add NGO Volunteer</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Internships tab — only Super Admin can create, branch admins just manage */
              !isBranchAdmin ? (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress("CreateInternship")}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.accent + "15" }]}>
                    <Briefcase size={20} color={colors.accent} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Add New Internship</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[{ color: colors.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 12 }]}>
                  Internship creation is managed by the NGO Super Admin.
                </Text>
              )
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: Platform.OS === 'ios' ? 90 : 75,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    zIndex: 30,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sheetHeader: {
    alignItems: "center",
    paddingVertical: 15,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 15,
    padding: 5,
  },
  sheetContent: {
    paddingHorizontal: 25,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
