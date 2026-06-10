import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { NavigationContext } from '../../context/NavigationContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllCollegeAPI } from '../../../apis/api';
import AnimatedSearch from '../../components/AnimatedSearch';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClassStudentsScreen({ college, className }) {
  const { navigate, goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { accessToken } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const {user} = useContext(AuthContext);

  // State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridLayout, setIsGridLayout] = useState(false);

  // Fetch fresh students from API on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${getAllCollegeAPI}/${user._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch college data');
        const data = await response.json();
        const colleges = data?.data?.colleges || [];
        const fresh = colleges.find(c => c._id?.toString() === college._id?.toString());
        if (fresh) {
          const cls = fresh.classes?.find(c => c.className === className);
          setStudents(cls?.students || []);
        }
      } catch (err) {
        console.warn('Could not refresh student data:', err);
        // Fallback to prop data
        const cls = college?.classes?.find(c => c.className === className);
        setStudents(cls?.students || []);
      } finally {
        setLoading(false);
      }
    };
    if (accessToken && college?._id) fetchStudents();
  }, [college._id, className, accessToken]);

  // Filter logic
  const filteredStudents = students.filter((student) =>
    (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.prn || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER COMPONENT: GRID CARD (Option 1) ---
  const renderGridItem = ({ item }) => (
    <View
      className="mb-3 p-4 rounded-2xl border items-center"
      style={{
        width: "48%", // Forces 2 items per row
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
      }}
    >
      {/* Avatar */}
      <View
        className="w-14 h-14 rounded-full justify-center items-center mb-3"
        style={{ backgroundColor: colors.backgroundColors?.[1] || "#F3F4F6" }}
      >
        <Text className="font-bold text-xl" style={{ color: colors.accent }}>
          {item.name?.[0]?.toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View className="items-center mb-3 w-full">
        <Text
          className="font-bold text-base text-center mb-1"
          numberOfLines={1}
          style={{ color: colors.textPrimary }}
        >
          {item.name}
        </Text>
        <Text className="text-xs text-center font-medium text-gray-400">
          {item.prn}
        </Text>
        <Text
          className="text-xs text-center"
          numberOfLines={1}
          style={{ color: colors.textSecondary }}
        >
          {item.department}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        className="w-full py-2 rounded-lg border items-center"
        style={{ borderColor: colors.accent }}
        onPress={() =>
          navigate("StudentEvents", { college, studentId: item._id.toString() })
        }
      >
        <Text
          className="text-xs font-bold uppercase"
          style={{ color: colors.accent }}
        >
          View Events
        </Text>
      </TouchableOpacity>
    </View>
  );

  // --- RENDER COMPONENT: LIST ROW (Option 2) ---
  const renderListItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigate("StudentEvents", { college, studentId: item._id.toString() })
      }
      className="flex-row items-center px-5 py-3 border-b"
      style={{
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
      }}
    >
      <View
        className="w-10 h-10 rounded-full justify-center items-center mr-3"
        style={{ backgroundColor: colors.iconBg }}
      >
        <Text className="font-bold text-sm" style={{ color: colors.accent }}>
          {item.name?.[0]?.toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="font-bold text-base"
            style={{ color: colors.textPrimary }}
          >
            {item.name}
          </Text>
          <Text className="text-xs font-mono" style={{ color: colors.textSecondary }}>
            {item.prn}
          </Text>
        </View>
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {item.department}
        </Text>
      </View>

      <View className="ml-2">
        <Text style={{ fontSize: 22, color: colors.textSecondary }}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: colors.backgroundColors
          ? colors.backgroundColors[0]
          : "#F8F9FA",
      }}
    >
      {/* --- 1. HEADER --- */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 16,
          borderBottomWidth: 1,
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
        }}
      >
        {/* Single row: back + title + search icon + toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => goBack()}
            style={{
              marginRight: 12,
              padding: 6,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.backgroundColors?.[1] || "#F3F4F6",
            }}
          >
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.header }}>{className}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {loading ? 'Loading...' : `${filteredStudents.length} / ${students.length} Students`}
            </Text>
          </View>

          {/* Animated Search */}
          <AnimatedSearch
            placeholder="Search by name or PRN"
            value={searchQuery}
            onChangeText={setSearchQuery}
            colors={colors}
            containerStyle={{ marginBottom: 0, marginRight: 8 }}
          />

          {/* Grid/List Toggle */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              borderWidth: 1,
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            }}
            onPress={() => setIsGridLayout(!isGridLayout)}
          >
            <Text style={{ fontSize: 20, color: colors.textPrimary }}>
              {isGridLayout ? "☰" : "⊞"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 3. DYNAMIC STUDENT LIST --- */}
      {loading ? (
        // Skeleton loader
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 + insets.bottom }}
          renderItem={() => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.cardBg,
              }}
            >
              {/* Avatar skeleton */}
              <View
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: colors.border,
                  marginRight: 12,
                }}
              />
              {/* Text skeletons */}
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ height: 13, width: '55%', borderRadius: 6, backgroundColor: colors.border }} />
                <View style={{ height: 11, width: '35%', borderRadius: 6, backgroundColor: colors.border, opacity: 0.6 }} />
              </View>
              {/* Arrow skeleton */}
              <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
            </View>
          )}
        />
      ) : (
        <FlatList
          key={isGridLayout ? "grid-layout" : "list-layout"}
          data={filteredStudents}
          numColumns={isGridLayout ? 2 : 1}
          columnWrapperStyle={isGridLayout ? { justifyContent: "space-between" } : undefined}
          renderItem={isGridLayout ? renderGridItem : renderListItem}
          contentContainerStyle={{
            paddingHorizontal: isGridLayout ? 20 : 0,
            paddingTop: 20,
            paddingBottom: 120 + insets.bottom
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-gray-400 text-sm italic">
                {searchQuery ? "No matching students." : "No students in this class."}
              </Text>
            </View>
          }
        />
      )}

      {/* --- 4. FLOATING ADD BUTTON --- */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <TouchableOpacity
          className="w-full py-4 rounded-xl items-center justify-center shadow-sm"
          style={{ backgroundColor: colors.accent }}
          onPress={() => navigate("AddStudent", { college, className })}
        >
          <Text className="text-white font-bold text-sm uppercase tracking-wider">
            + Add New Student
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}