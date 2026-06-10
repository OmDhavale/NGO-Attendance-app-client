import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../context/AuthContext";
import AnimatedSearch from "../../components/AnimatedSearch";
import CollapsibleFilter from "../../components/CollapsibleFilter";

import { AttendanceContext } from "../../context/AttendanceContext";
import { NavigationContext } from "../../context/NavigationContext";
import { useTheme } from "../../context/ThemeContext";
import * as api from "../../../apis/api";

export default function NgoEventsScreen({ ngo: loggedNgo }) {
  const { navigate, goBack } = useContext(NavigationContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" or "oldest"
  const { logout, accessToken, userType: loggedInUserType } = useContext(AuthContext);
  const isBranchAdmin = loggedInUserType === "branch_admin";

  useEffect(() => {
    fetchEvents();
  }, []);

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate("Home");
  };

  const fetchEvents = async () => {
    try {
      console.log("Fetching events with token:", accessToken ? "Token present" : "No token");
      const response = await fetch(api.eventAllAPI, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched events:", data);
      setEvents(data.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching events:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Filter events based on search query and date range
  const filteredEvents = events.filter((event) => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const eventDateRange = `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`;
      const matchesSearch = (
        event.aim?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.spocName?.toLowerCase().includes(query) ||
        eventDateRange.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Date range filter: Show events that OVERLAP with the selected filter range
    if (startDate || endDate) {
      const eventStart = event.startDate ? new Date(event.startDate) : new Date(event.eventDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;

      // Reset time for comparison
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);

      const filterStart = startDate ? new Date(startDate) : null;
      if (filterStart) filterStart.setHours(0, 0, 0, 0);

      const filterEnd = endDate ? new Date(endDate) : null;
      if (filterEnd) filterEnd.setHours(0, 0, 0, 0);

      // Overlap logic: (EventStart <= FilterEnd) && (EventEnd >= FilterStart)
      if (filterStart && eventEnd < filterStart) return false;
      if (filterEnd && eventStart > filterEnd) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate || a.eventDate);
    const dateB = new Date(b.startDate || b.eventDate);
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const formatDate = (date) => {
    if (!date) return "Select Date";
    return new Date(date).toLocaleDateString();
  };

  return (
    <View
      className="flex-1 px-5 pt-8" // Increased top padding for safety
      style={{
        backgroundColor:
          (colors.backgroundColors && colors.backgroundColors[0]) || "#eef2ff",
      }}
    >


      {/* --- TITLE ROW --- */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-2xl font-extrabold"
          style={{ color: colors.header }}
        >
          Events
        </Text>

        {/* Search icon — compact, doesn't push anything */}
        <AnimatedSearch
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          colors={colors}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>









      {/* --- FILTERS --- */}
      <CollapsibleFilter colors={colors} title="Filter by Date">
        <View className="flex-row gap-2 mt-2">
          {/* Start Date */}
          {Platform.OS === 'web' ? (
            <View className="flex-1">
              <input
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDate(new Date(e.target.value));
                  } else {
                    setStartDate(null);
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.cardBg,
                  color: colors.textPrimary,
                  fontSize: '14px',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
            </View>
          ) : (
            <TouchableOpacity
              className="flex-1 px-3 py-2.5 rounded-xl border flex-row items-center justify-between"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
              }}
              onPress={() => setShowStartPicker(true)}
            >
              <Text className="text-sm" style={{ color: startDate ? colors.textPrimary : colors.textSecondary }}>
                {formatDate(startDate)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>📅</Text>
            </TouchableOpacity>
          )}

          {/* End Date */}
          {Platform.OS === 'web' ? (
            <View className="flex-1">
              <input
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setEndDate(new Date(e.target.value));
                  } else {
                    setEndDate(null);
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.cardBg,
                  color: colors.textPrimary,
                  fontSize: '14px',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
            </View>
          ) : (
            <TouchableOpacity
              className="flex-1 px-3 py-2.5 rounded-xl border flex-row items-center justify-between"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
              }}
              onPress={() => setShowEndPicker(true)}
            >
              <Text className="text-sm" style={{ color: endDate ? colors.textPrimary : colors.textSecondary }}>
                {formatDate(endDate)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>📅</Text>
            </TouchableOpacity>
          )}

          {/* Clear Button */}
          {(startDate || endDate) && (
            <TouchableOpacity
              className="px-3 py-2.5 rounded-xl border"
              style={{
                backgroundColor: colors.error || "#ef4444",
                borderColor: colors.error || "#ef4444",
              }}
              onPress={clearDateRange}
            >
              <Text className="text-white font-bold text-sm">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- Sort Options --- */}
        <View className="mt-4 pt-3 border-t" style={{ borderTopColor: colors.border }}>
          <Text className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: colors.textSecondary }}>Sort By Date</Text>
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

      {/* Date Pickers - Only for Mobile */}
      {Platform.OS !== 'web' && showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowStartPicker(Platform.OS === "ios");
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {Platform.OS !== 'web' && showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowEndPicker(Platform.OS === "ios");
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}


      {/* Event List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : events.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-60">
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            No events found.
          </Text>
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            Click the + button to create your first event!
          </Text>

        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-base text-center" style={{ color: colors.textSecondary }}>
                No events found matching "{searchQuery}"
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="p-4 rounded-2xl mb-4 border shadow-sm"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                elevation: 2,
              }}
              onPress={() => {
                navigate("EventInfo", { event: item });
              }}
              activeOpacity={0.8}
            >
              {/* Event Title */}
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-3">
                <Text
                  className="text-lg font-bold mb-1"
                  style={{ color: colors.textPrimary }}
                >
                  {item.aim}
                </Text>

                {/* Location */}
                <View className="flex-row items-center mb-1 opacity-90">
                  <Text style={{ fontSize: 13, marginRight: 4 }}>📍</Text>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: colors.textSecondary }}
                  >
                    {item.location}
                  </Text>
                </View>

                {/* SPOC Info (Left Column) */}
                {item.spocName && (
                  <View className="mt-1">
                    <View className="flex-row items-center mb-0.5">
                      <Text className="text-[11px] font-bold mr-1" style={{ color: colors.accent }}>Manager:</Text>
                      <Text className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>{item.spocName}</Text>
                    </View>
                    {item.spocContact && (
                      <View className="flex-row items-center">
                        <Text className="text-[11px] font-bold mr-1" style={{ color: colors.accent }}>Contact:</Text>
                        <Text className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>{item.spocContact}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Date & Time Badge (Right Column) */}
              <View
                className="items-end px-2.5 py-2 rounded-xl"
                style={{ backgroundColor: colors.iconBg, minWidth: 100 }}
              >
                <Text
                  className="text-[10px] font-bold mb-1 text-right"
                  style={{ color: colors.textPrimary }}
                >
                  📅 {new Date(item.startDate || item.eventDate).toLocaleDateString()}{item.endDate && item.endDate !== item.startDate ? ` - ${new Date(item.endDate).toLocaleDateString()}` : ''}
                </Text>
                <Text
                  className="text-[10px] font-semibold opacity-80 text-right"
                  style={{ color: colors.textPrimary }}
                >
                  ⏰ Daily: {item.startTime || "N/A"} - {item.endTime || "N/A"}
                </Text>
              </View>
            </View>

              {/* Description Snippet */}
              <Text
                className="text-sm leading-5"
                numberOfLines={2}
                style={{ color: colors.textSecondary }}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}


    </View>
  );
}