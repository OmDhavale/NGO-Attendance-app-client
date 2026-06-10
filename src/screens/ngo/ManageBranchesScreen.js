import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { ChevronLeft, Plus, MapPin, CalendarDays, Users, Activity } from 'lucide-react-native';
import { NavigationContext } from '../../context/NavigationContext';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllBranchesAPI } from '../../../apis/api';
import Toast from 'react-native-toast-message';

export default function ManageBranchesScreen({ isTab = false, ngo }) {
  const { navigate, goBack } = useContext(NavigationContext);
  const { user, accessToken, logout, userType: loggedInUserType } = useContext(AuthContext);
  const isBranchAdmin = loggedInUserType === "branch_admin";
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loggedNgo = ngo || user;

  const handleLogout = async () => {
    await logout();
    navigate("Home");
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${getAllBranchesAPI}?ngo_id=${user._id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBranches(data.data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch branches. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBranches();
  };

  return (
    <View className="flex-1 px-5 pt-8" style={{ backgroundColor: colors.backgroundColors[0] }}>

      {/* Header */}
      {!isTab && (
        <View className="flex-row items-center justify-between p-4 pt-10 border-b" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={goBack} className="p-2 mr-2">
              <ChevronLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text className="text-xl font-bold" style={{ color: colors.header }}>Manage Branches</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigate('CreateBranch')}
            className="flex-row items-center px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.accent }}
          >
            <Plus size={18} color="white" style={{ marginRight: 4 }} />
            <Text className="text-white font-medium">Add Branch</Text>
          </TouchableOpacity>
        </View>
      )}

      {isTab && (
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-extrabold" style={{ color: colors.header }}>
            Branches
          </Text>
        </View>
      )}

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: isTab ? 100 : 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
          }
        >
          {branches.length === 0 ? (
            <View className="items-center justify-center mt-20">
              <View className="p-4 rounded-full mb-4" style={{ backgroundColor: colors.iconBg }}>
                <Activity size={32} color={colors.textSecondary} />
              </View>
              <Text className="text-lg font-bold mb-2" style={{ color: colors.header }}>No Branches Found</Text>
              <Text className="text-center" style={{ color: colors.textSecondary }}>
                You haven't added any branches yet. Click 'Add Branch' to create one.
              </Text>
            </View>
          ) : (
            branches.map((branch) => (
              <TouchableOpacity
                key={branch.branch_id}
                onPress={() => navigate('BranchDetail', { branchId: branch.branch_id })}
                className="p-4 rounded-xl mb-4 border shadow-sm"
                style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-lg font-bold flex-1" style={{ color: colors.textPrimary }}>
                    {branch.name}
                  </Text>
                </View>
                
                <View className="flex-row items-center mb-4">
                  <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.textSecondary }}>{branch.location}</Text>
                </View>

                <View className="flex-row justify-between pt-3 border-t" style={{ borderColor: colors.border }}>
                  <View className="flex-row items-center">
                    <CalendarDays size={14} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text className="text-sm" style={{ color: colors.textPrimary }}>
                      <Text className="font-bold">{branch.total_events}</Text> Events
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Users size={14} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text className="text-sm" style={{ color: colors.textPrimary }}>
                      <Text className="font-bold">{branch.total_students}</Text> Students Reached
                    </Text>
                  </View>
                </View>
                <View className="mt-3 flex-row justify-between items-center">
                    <Text className="text-xs" style={{ color: colors.textSecondary }}>Last Active: {branch.last_active || 'N/A'}</Text>
                    <Text className="text-xs font-bold" style={{ color: colors.accent }}>View Details →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
