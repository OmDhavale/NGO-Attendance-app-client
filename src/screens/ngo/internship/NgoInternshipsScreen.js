import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { NavigationContext } from "../../../context/NavigationContext";
import { AuthContext } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import * as api from "../../../../apis/api";
import { ChevronLeft, Briefcase, Users, Plus, Search, Clock, LayoutGrid } from "lucide-react-native";
import AnimatedSearch from "../../../components/AnimatedSearch";
import CollapsibleFilter from "../../../components/CollapsibleFilter";

export default function NgoInternshipsScreen({ ngo, hideHeaderBack }) {
  const { navigate, goBack } = useContext(NavigationContext);
  const { logout, accessToken, userType: loggedInUserType } = useContext(AuthContext);
  const isBranchAdmin = loggedInUserType === "branch_admin";
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  const handleLogout = async () => {
    await logout();
    navigate("Home");
  };

  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      const response = await fetch(api.ngoInternshipsAPI, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setInternships(data.data || []);
      } else {
        Alert.alert("Error", data.message || "Failed to fetch internships");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchInternships();
  };

  const toggleLateSubmissions = async (internshipId, currentValue) => {
    try {
      const response = await fetch(api.ngoUpdateInternshipSettingsAPI(internshipId), {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ allowLateSubmissions: !currentValue }),
      });
      if (response.ok) {
        setInternships((prev) =>
          prev.map((it) =>
            it._id === internshipId ? { ...it, allowLateSubmissions: !currentValue } : it
          )
        );
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to update setting");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
  };

  const getStatusColor = (internship) => {
    const now = new Date();
    if (new Date(internship.endDate) < now) return "#94a3b8";
    return colors.accent;
  };

  const getStatusLabel = (internship) => {
    const now = new Date();
    if (new Date(internship.endDate) < now) return "Ended";
    if (new Date(internship.startDate) > now) return "Upcoming";
    return "Active";
  };

  const filteredInternships = internships.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.domain?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return (
    <View
      className="flex-1 px-5 pt-8"
      style={{
        backgroundColor:
          (colors.backgroundColors && colors.backgroundColors[0]) || "#eef2ff",
      }}
    >


      {/* --- TITLE ROW --- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {!hideHeaderBack && (
          <TouchableOpacity
            onPress={goBack}
            style={{
              padding: 8,
              borderRadius: 20,
              marginRight: 10,
              borderWidth: 1,
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            }}
          >
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.header }}>Internships</Text>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>{internships.length} programs total</Text>
        </View>

        <AnimatedSearch
          placeholder="Search internships..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          colors={colors}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {/* --- SORTING --- */}
      <CollapsibleFilter colors={colors} title="Sort Options">
        <View className="pt-2">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSortOrder("newest")}
              className="flex-1 py-2.5 rounded-xl border items-center justify-center"
              style={{
                backgroundColor: sortOrder === "newest" ? colors.accent : colors.cardBg,
                borderColor: sortOrder === "newest" ? colors.accent : colors.border,
              }}
            >
              <Text className="text-xs font-bold" style={{ color: sortOrder === "newest" ? "#fff" : colors.textPrimary }}>Newest First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortOrder("oldest")}
              className="flex-1 py-2.5 rounded-xl border items-center justify-center"
              style={{
                backgroundColor: sortOrder === "oldest" ? colors.accent : colors.cardBg,
                borderColor: sortOrder === "oldest" ? colors.accent : colors.border,
              }}
            >
              <Text className="text-xs font-bold" style={{ color: sortOrder === "oldest" ? "#fff" : colors.textPrimary }}>Oldest First</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CollapsibleFilter>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredInternships.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-60">
          <Briefcase size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text className="text-base font-semibold" style={{ color: colors.textSecondary }}>
            {searchQuery ? "No matching programs" : "No internships yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInternships}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item);
            const statusLabel = getStatusLabel(item);
            return (
              <TouchableOpacity
                className="p-4 rounded-2xl mb-4 border"
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  elevation: 2,
                }}
                onPress={() =>
                  navigate("InternshipApplicants", { internship: item })
                }
                activeOpacity={0.8}
              >
                {/* Title + Status */}
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-base font-bold mb-0.5"
                      style={{ color: colors.textPrimary }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View
                      className="flex-row items-center px-2 py-0.5 rounded-full self-start"
                      style={{ backgroundColor: `${statusColor}20` }}
                    >
                      <Text
                        className="text-[11px] font-bold"
                        style={{ color: statusColor }}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                    {item.branchId?.name && (
                      <View
                        className="flex-row items-center px-2 py-0.5 rounded-full self-start mt-1"
                        style={{ backgroundColor: "#8b5cf615" }}
                      >
                        <Text
                          className="text-[10px] font-bold"
                          style={{ color: "#8b5cf6" }}
                        >
                          🏛 {item.branchId.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Slots badge */}
                  <View
                    className="px-2.5 py-1.5 rounded-xl items-center"
                    style={{ backgroundColor: colors.iconBg }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: colors.accent }}
                    >
                      {item.acceptedCount}/{item.totalSlots}
                    </Text>
                    <Text
                      className="text-[9px]"
                      style={{ color: colors.textSecondary }}
                    >
                      slots
                    </Text>
                  </View>
                </View>

                {/* Domain + Location */}
                <Text
                  className="text-xs font-semibold mb-1"
                  style={{ color: colors.accent }}
                >
                  🎯 {item.domain}
                </Text>
                <Text
                  className="text-xs mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  📍 {item.location}
                </Text>

                {/* Dates */}
                <Text
                  className="text-xs mb-3"
                  style={{ color: colors.textSecondary }}
                >
                  📅 {new Date(item.startDate).toLocaleDateString()} →{" "}
                  {new Date(item.endDate).toLocaleDateString()}
                </Text>

                {/* Applicant count pills */}
                <View className="flex-row gap-2">
                  <View
                    className="px-3 py-1 rounded-full flex-row items-center"
                    style={{ backgroundColor: "#f59e0b20" }}
                  >
                    <Users size={11} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>
                      {item.pendingCount} pending
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full flex-row items-center"
                    style={{ backgroundColor: "#10b98120" }}
                  >
                    <Text className="text-[11px] font-bold" style={{ color: "#10b981" }}>
                      ✓ {item.acceptedCount} accepted
                    </Text>
                  </View>
                  {item.rejectedCount > 0 && (
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: "#ef444420" }}
                    >
                      <Text className="text-[11px] font-bold" style={{ color: "#ef4444" }}>
                        ✕ {item.rejectedCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Late Submissions Toggle */}
                <View
                  className="mt-3 pt-3 border-t flex-row items-center justify-between"
                  style={{ borderTopColor: colors.border }}
                >
                  <View className="flex-row items-center">
                    <Clock size={12} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text className="text-[10px]" style={{ color: colors.textSecondary }}>Late final Submissions</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleLateSubmissions(item._id, item.allowLateSubmissions)}
                    className="flex-row items-center"
                  >
                    <Text
                      className="text-[10px] font-bold mr-2"
                      style={{ color: item.allowLateSubmissions ? "#10b981" : colors.textSecondary }}
                    >
                      {item.allowLateSubmissions ? "ENABLED" : "DISABLED"}
                    </Text>
                    <View
                      className="w-8 h-4 rounded-full px-0.5 justify-center"
                      style={{
                        backgroundColor: item.allowLateSubmissions ? "#10b981" : colors.border,
                      }}
                    >
                      <View
                        className="w-3 h-3 rounded-full bg-white"
                        style={{
                          alignSelf: item.allowLateSubmissions ? "flex-end" : "flex-start",
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
