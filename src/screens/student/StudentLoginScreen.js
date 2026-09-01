import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { NavigationContext } from "../../context/NavigationContext";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import * as api from "../../../apis/api";
import { User, Lock, ChevronLeft } from "lucide-react-native";
import PrivacyPolicyCheckbox from "../../components/PrivacyPolicyCheckbox";

export default function StudentLoginScreen() {
    const { darkMode, lightTheme, darkTheme } = useTheme();
    const colors = darkMode ? darkTheme : lightTheme;
    const [prn, setPrn] = useState("");
    const [password, setPassword] = useState("");
    const [agreedToPolicy, setAgreedToPolicy] = useState(false);
    const { navigate, goBack } = useContext(NavigationContext);
    const { loginUser, switchUserType } = useContext(AuthContext);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    async function onLogin() {
        if (!prn.trim() || !password.trim()) {
            alert("Please enter both PRN and password");
            return;
        }

        if (!agreedToPolicy) {
            alert("Please agree to the Privacy Policy to proceed.");
            return;
        }

        setIsLoggingIn(true);
        const reqBody = { email: prn.trim(), password: password, userType: "student" };

        try {
            await switchUserType("student");

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
            console.log("Login response:", data); // Debug log

            const accessToken = data.data?.accessToken || data.accessToken || data.token;
            const refreshToken = data.data?.refreshToken || data.refreshToken;
            const userData = data.data?.user || data.user;

            console.log("Student data:", userData); // Debug log

            await loginUser(userData, accessToken, refreshToken, "student");

            alert("Login successful");
            navigate("StudentDashboard", { student: userData });
        } catch (err) {
            console.error("Login error:", err);
            alert("Login failed: " + err.message);
        } finally {
            setIsLoggingIn(false);
        }
    }

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
                            Student Portal
                        </Text>
                    </View>

                    {/* Main Card */}
                    <View
                        className="w-full rounded-3xl p-6 shadow-sm border"
                        style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                    >
                        <Text className="text-lg font-bold mb-6 text-center" style={{ color: colors.textPrimary }}>
                            Login to Your Account
                        </Text>

                        <View className="gap-4">
                            <View
                                className="flex-row items-center p-3.5 rounded-xl border"
                                style={{ backgroundColor: colors.iconBg, borderColor: colors.border }}
                            >
                                <User size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                                <TextInput
                                    placeholder="PRN Number"
                                    value={prn}
                                    onChangeText={setPrn}
                                    className="flex-1 text-base"
                                    style={{ color: colors.textPrimary, outlineStyle: "none" }}
                                    placeholderTextColor={colors.textSecondary}
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
                                disabled={isLoggingIn}
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

                        <View className="mt-6 p-3 rounded-lg" style={{ backgroundColor: colors.iconBg }}>
                            <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                                💡 Use your PRN number and password to login
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
