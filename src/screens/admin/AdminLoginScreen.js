import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { NavigationContext } from "../../context/NavigationContext";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import * as api from "../../../apis/api";
import PrivacyPolicyCheckbox from "../../components/PrivacyPolicyCheckbox";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const { navigate, goBack } = useContext(NavigationContext);
  const { loginUser, switchUserType } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const colors = darkMode ? darkTheme : lightTheme;

  async function onLogin() {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    if (!agreedToPolicy) {
      alert("Please agree to the Privacy Policy to proceed.");
      return;
    }

    setIsLoggingIn(true);
    const reqBody = { email: email, password: password, userType: "admin" };
    console.log(reqBody);

    try {
      // Switch user type (logs out if different user was logged in)
      await switchUserType("admin");

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
      console.log("Login response:", data);

      // Backend wraps response in ApiResponse class, so token is in data.data
      const responseData = data.data || data;
      const accessToken = responseData.accessToken || responseData.token;
      const refreshToken = responseData.refreshToken;
      const userData = responseData.user || { email: email };

      // Store in AuthContext
      await loginUser(userData, accessToken, refreshToken, "admin");

      alert("Login successful");
      navigate("AdminPanel");
    } catch (err) {
      console.log("Error in sending login API", err);
      alert("Login failed: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <View
      className="flex-1 items-center justify-center px-5 py-8"
      style={{
        backgroundColor:
          (colors.backgroundColors && colors.backgroundColors[0]) || "#f0fdf4",
      }}
    >
      <View
        className="w-full max-w-md rounded-2xl p-6 shadow-lg border"
        style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
      >
        <Text className="text-2xl font-black text-center mb-3" style={{ color: colors.header }}>
          Admin Login
        </Text>
        <Text className="text-sm text-center mb-5" style={{ color: colors.textPrimary }}>
          Enter admin credentials
        </Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          className="p-4 rounded-2xl mb-4 border text-base"
          style={{
            backgroundColor: colors.iconBg,
            borderColor: colors.border,
            color: colors.textPrimary,
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.textSecondary}
          editable={!isLoggingIn}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          className="p-4 rounded-2xl mb-3 border text-base"
          style={{
            backgroundColor: colors.iconBg,
            borderColor: colors.border,
            color: colors.textPrimary,
          }}
          secureTextEntry
          placeholderTextColor={colors.textSecondary}
          editable={!isLoggingIn}
        />

        <PrivacyPolicyCheckbox
          checked={agreedToPolicy}
          onChange={setAgreedToPolicy}
          colors={colors}
          containerStyle={{ marginBottom: 16 }}
        />

        <TouchableOpacity
          className="p-4 rounded-2xl items-center"
          style={{
            backgroundColor: colors.accent,
            opacity: isLoggingIn || !agreedToPolicy ? 0.6 : 1,
          }}
          onPress={onLogin}
          disabled={isLoggingIn || !agreedToPolicy}
        >
          {isLoggingIn ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Login</Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={goBack}
        className="mt-6"
        disabled={isLoggingIn}
      >
        <Text className="font-semibold" style={{ color: colors.textPrimary }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}