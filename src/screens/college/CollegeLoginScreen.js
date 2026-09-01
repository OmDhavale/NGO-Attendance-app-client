import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NavigationContext } from "../../context/NavigationContext";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import * as api from "../../../apis/api";
import { Search, Mail, Lock, School, Check, ChevronLeft } from "lucide-react-native";
import PrivacyPolicyCheckbox from "../../components/PrivacyPolicyCheckbox";

export default function CollegeLoginScreen() {
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const { navigate, goBack } = useContext(NavigationContext);
  const { loginUser, switchUserType } = useContext(AuthContext);
  const [collegesList, setCollegesList] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await fetch(api.getAllCollegeAPI, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const collegesArray = data?.data?.colleges || [];
      setCollegesList(Array.isArray(collegesArray) ? collegesArray : []);
      setLoadingColleges(false);
    } catch (err) {
      console.error("Error fetching Colleges: ", err);
      setLoadingColleges(false);
    }
  };

  async function onLogin() {
    if (!selectedCollege) return;
    if (!agreedToPolicy) {
      alert("Please agree to the Privacy Policy to proceed.");
      return;
    }

    setIsLoggingIn(true);
    const reqBody = { email: email, password: password, userType: "college" };

    try {
      await switchUserType("college");

      const response = await fetch(api.loginAPI, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        let errMsg = `HTTP error! status: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.message) errMsg = errData.message;
        } catch { }
        throw new Error(errMsg);
      }

      const data = await response.json();

      // Backend wraps response in ApiResponse class, so token is in data.data
      const responseData = data.data || data;
      const accessToken = responseData.accessToken || responseData.token;
      const refreshToken = responseData.refreshToken;
      const userData = responseData.user || selectedCollege;

      await loginUser(userData, accessToken, refreshToken, "college");

      alert("Login successful");
      navigate("CollegeClasses", { college: selectedCollege });
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  const filteredColleges = collegesList.filter((college) => {
    const name = college.name || college.collegeName || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.backgroundColors[0] }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View className="flex-row items-center mb-6 mt-4">
            <TouchableOpacity
              onPress={goBack}
              className="p-2 rounded-full mr-4 border"
              style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
            >
              <ChevronLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text className="text-2xl font-black" style={{ color: colors.header }}>
              College Portal
            </Text>
          </View>

          {/* Main Card */}
          <View
            className="w-full rounded-3xl p-6 shadow-sm border"
            style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
          >
            {/* College Selection Section */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <School size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                  Select Your College
                </Text>
              </View>

              {/* Search Bar */}
              <View
                className="flex-row items-center p-3 rounded-xl mb-4 border"
                style={{ backgroundColor: colors.iconBg, borderColor: colors.border }}
              >
                <Search size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Search college..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 text-base"
                  style={{ color: colors.textPrimary, outlineStyle: "none" }}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* College List */}
              <View
                className="rounded-xl border overflow-hidden"
                style={{ height: 200, borderColor: colors.border }}
              >
                {loadingColleges ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : (
                  <ScrollView nestedScrollEnabled={true}>
                    {filteredColleges.length === 0 ? (
                      <View className="p-4 items-center">
                        <Text style={{ color: colors.textSecondary }}>No colleges found</Text>
                      </View>
                    ) : (
                      filteredColleges.map((item, index) => {
                        const isSelected = selectedCollege._id === item._id;
                        return (
                          <Pressable
                            key={item._id || index}
                            onPress={() => {
                              setSelectedCollege(item);
                              setEmail(item.email || "");
                            }}
                            className={`flex-row items-center justify-between p-3 border-b`}
                            style={{
                              backgroundColor: isSelected ? (darkMode ? "rgba(45, 212, 191, 0.15)" : "#f0fdfa") : "transparent",
                              borderBottomColor: colors.border,
                              borderBottomWidth: index === filteredColleges.length - 1 ? 0 : 1
                            }}
                          >
                            <Text
                              className={`flex-1 text-sm ${isSelected ? "font-bold" : "font-medium"}`}
                              style={{ color: isSelected ? colors.accent : colors.textPrimary }}
                            >
                              {item.name || item.collegeName}
                            </Text>
                            {isSelected && <Check size={16} color={colors.accent} />}
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Login Form Section */}
            {selectedCollege && (
              <View className="pt-4 border-t" style={{ borderColor: colors.border }}>
                <Text className="text-sm font-medium mb-4 text-center" style={{ color: colors.textSecondary }}>
                  Logging in as <Text style={{ color: colors.header, fontWeight: 'bold' }}>{selectedCollege.name}</Text>
                </Text>

                <View className="gap-4">
                  <View
                    className="flex-row items-center p-3.5 rounded-xl border"
                    style={{ backgroundColor: colors.iconBg, borderColor: colors.border }}
                  >
                    <Mail size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      className="flex-1 text-base"
                      style={{ color: colors.textPrimary, outlineStyle: "none" }}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoggingIn}
                    />
                  </View>

                  <View
                    className="flex-row items-center p-3.5 rounded-xl border"
                    style={{ backgroundColor: colors.iconBg, borderColor: colors.border }}
                  >
                    <Lock size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      className="flex-1 text-base"
                      style={{ color: colors.textPrimary, outlineStyle: "none" }}
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      editable={!isLoggingIn}
                    />
                  </View>

                  <PrivacyPolicyCheckbox
                    checked={agreedToPolicy}
                    onChange={setAgreedToPolicy}
                    colors={colors}
                  />

                  <TouchableOpacity
                    onPress={onLogin}
                    disabled={isLoggingIn || !agreedToPolicy}
                    className="py-4 rounded-xl items-center mt-2 shadow-sm"
                    style={{
                      backgroundColor: colors.accent,
                      opacity: isLoggingIn || !agreedToPolicy ? 0.6 : 1
                    }}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-white font-bold text-base tracking-wide">
                        Secure Login
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!selectedCollege && (
              <View className="items-center py-4 opacity-50">
                <Text style={{ color: colors.textSecondary }}>Select a college to continue</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}