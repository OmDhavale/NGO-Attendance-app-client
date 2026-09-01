import React, { useState, useContext, useEffect, useRef } from "react";
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
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { NavigationContext } from "../../context/NavigationContext";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Search, Mail, Lock, HeartHandshake, Check,
  ChevronLeft, ChevronRight, X, Building2, ShieldCheck,
  RotateCcw
} from "lucide-react-native";
import * as api from "../../../apis/api";
import PrivacyPolicyCheckbox from "../../components/PrivacyPolicyCheckbox";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Selection Modal Component (Still useful for Branches) ────────────────────────
function SelectionModal({ visible, onClose, title, data, onSelect, loading, searchQuery, setSearchQuery, placeholder, colors }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View 
          style={{ 
            height: SCREEN_HEIGHT * 0.7, 
            backgroundColor: colors.backgroundColors?.[0] || '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.header }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg, marginBottom: 16 }}>
            <Search size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              placeholder={placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, color: colors.textPrimary, fontSize: 16 }}
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {data.map((item, index) => (
                <TouchableOpacity
                  key={item._id || index}
                  onPress={() => onSelect(item)}
                  style={{
                    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '500' }}>{item.name}</Text>
                  <ChevronRight size={18} color={colors.border} />
                </TouchableOpacity>
              ))}
              {data.length === 0 && (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>No results found</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function NgoLoginScreen() {
  const { navigate, goBack } = useContext(NavigationContext);
  const { loginUser, switchUserType } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ngoList, setNgoList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loginUserType, setLoginUserType] = useState("ngo");
  const [loadingNgos, setLoadingNgos] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  // NGO Section Search
  const [ngoSearch, setNgoSearch] = useState("");
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  // Animation States
  const fadeRole = useRef(new Animated.Value(0)).current;
  const fadeBranch = useRef(new Animated.Value(0)).current;
  const fadeAuth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchNgos();
  }, []);

  useEffect(() => {
    if (selectedNgo) {
      Animated.timing(fadeRole, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      fadeRole.setValue(0);
      fadeBranch.setValue(0);
      fadeAuth.setValue(0);
    }
  }, [selectedNgo]);

  useEffect(() => {
    if (loginUserType === "ngo" && selectedNgo) {
      Animated.timing(fadeAuth, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      fadeBranch.setValue(0);
    } else if (loginUserType === "branch_admin" && selectedNgo) {
      Animated.timing(fadeBranch, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loginUserType, selectedNgo]);

  useEffect(() => {
    if (selectedBranch) {
      Animated.timing(fadeAuth, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [selectedBranch]);

  const fetchNgos = async () => {
    setLoadingNgos(true);
    try {
      const response = await fetch(api.getAllNgoAPI, {
        method: "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      else if (data.ngos && Array.isArray(data.ngos)) list = data.ngos;
      else if (Array.isArray(data.statusCode)) list = data.statusCode;
      setNgoList(list);
    } catch (err) {
      console.error("Error fetching NGOs:", err);
    } finally {
      setLoadingNgos(false);
    }
  };

  const fetchBranches = async (ngoId) => {
    setLoadingBranches(true);
    try {
      const response = await fetch(api.getNgoBranchesPublicAPI(ngoId));
      const data = await response.json();
      setBranches(data.data || []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleNgoSelect = (ngo) => {
    setSelectedNgo(ngo);
    setNgoSearch("");
    setSelectedBranch(null);
    setLoginUserType("ngo");
    setEmail(ngo.email);
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setBranchModalVisible(false);
    setBranchSearch("");
    setEmail(branch.email);
  };

  async function onLogin() {
    if (!selectedNgo) return;
    if (!agreedToPolicy) {
      alert("Please agree to the Privacy Policy to proceed.");
      return;
    }
    setIsLoggingIn(true);
    try {
      await switchUserType(loginUserType);
      const response = await fetch(api.loginAPI, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, userType: loginUserType }),
      });
      if (!response.ok) throw new Error((await response.json()).message || "Login failed");
      const data = await response.json();
      const responseData = data.data || data;
      let userData = responseData.user || selectedNgo;
      if (loginUserType === "branch_admin" && responseData.user) {
        userData = { ...responseData.user, ngoName: selectedNgo.name, ngoLogo: selectedNgo.profileImage };
      }
      await loginUser(userData, responseData.accessToken || responseData.token, responseData.refreshToken, loginUserType);
      navigate("NgoEvents", { ngo: userData });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  const filteredNgos = ngoList.filter(n => (n.name || "").toLowerCase().includes(ngoSearch.toLowerCase()));
  const filteredBranches = branches.filter(b => (b.name || "").toLowerCase().includes(branchSearch.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundColors[0] }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
            <TouchableOpacity onPress={goBack} style={{ padding: 8, marginRight: 8 }}>
              <ChevronLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.header }}>NGO Portal</Text>
          </View>

          <View style={{ backgroundColor: colors.cardBg, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            
            {/* NGO Selection Section - INLINE */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Building2 size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Organization</Text>
                </View>
                {selectedNgo && (
                  <TouchableOpacity onPress={() => setSelectedNgo(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RotateCcw size={14} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!selectedNgo ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg, marginBottom: 12 }}>
                    <Search size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search NGO..."
                      value={ngoSearch}
                      onChangeText={setNgoSearch}
                      style={{ flex: 1, color: colors.textPrimary, fontSize: 16 }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={{ 
                    borderRadius: 18, 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    backgroundColor: colors.iconBg + '20',
                    overflow: 'hidden',
                    flex: 1,
                  }}>
                    {loadingNgos ? (
                      <View style={{ flex: 1, padding: 60, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.accent} />
                      </View>
                    ) : (
                      <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                        {filteredNgos.length === 0 ? (
                          <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No organizations found</Text>
                          </View>
                        ) : (
                          filteredNgos.map((ngo, idx) => (
                            <TouchableOpacity 
                              key={ngo._id || idx} 
                              onPress={() => handleNgoSelect(ngo)} 
                              style={{ 
                                paddingHorizontal: 16, 
                                paddingVertical: 14, 
                                borderBottomWidth: idx === filteredNgos.length - 1 ? 0 : 1, 
                                borderBottomColor: colors.border,
                                backgroundColor: colors.cardBg,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginRight: 10, opacity: 0.6 }} />
                                <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '600', flex: 1 }}>{ngo.name}</Text>
                              </View>
                              <ChevronRight size={14} color={colors.border} />
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '40', backgroundColor: colors.accent + '08', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <HeartHandshake size={20} color={colors.accent} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.header, flex: 1 }}>{selectedNgo.name}</Text>
                  <Check size={20} color={colors.accent} />
                </View>
              )}
            </View>

            {/* Role Toggle - REFINED DESIGN */}
            {selectedNgo?.is_hierarchical && (
              <Animated.View style={{ opacity: fadeRole, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <ShieldCheck size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Login Context</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: colors.iconBg, padding: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
                  <TouchableOpacity
                    onPress={() => { setLoginUserType("ngo"); setSelectedBranch(null); setEmail(selectedNgo.email); }}
                    style={{
                      flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
                      backgroundColor: loginUserType === "ngo" ? colors.cardBg : 'transparent',
                      borderWidth: loginUserType === "ngo" ? 1 : 0, borderColor: colors.border,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: loginUserType === "ngo" ? 0.1 : 0, shadowRadius: 4, elevation: loginUserType === "ngo" ? 2 : 0
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: loginUserType === "ngo" ? '800' : '600', color: loginUserType === "ngo" ? colors.accent : colors.textSecondary }}>Super Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setLoginUserType("branch_admin"); setSelectedBranch(null); setEmail(""); fetchBranches(selectedNgo._id); }}
                    style={{
                      flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
                      backgroundColor: loginUserType === "branch_admin" ? colors.cardBg : 'transparent',
                      borderWidth: loginUserType === "branch_admin" ? 1 : 0, borderColor: colors.border,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: loginUserType === "branch_admin" ? 0.1 : 0, shadowRadius: 4, elevation: loginUserType === "branch_admin" ? 2 : 0
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: loginUserType === "branch_admin" ? '800' : '600', color: loginUserType === "branch_admin" ? colors.accent : colors.textSecondary }}>Branch Admin</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Branch Selection */}
            {loginUserType === "branch_admin" && selectedNgo?.is_hierarchical && (
              <Animated.View style={{ opacity: fadeBranch, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Building2 size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Select Branch</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBranchModalVisible(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg }}
                >
                  <Text style={{ fontSize: 16, color: selectedBranch ? colors.textPrimary : colors.textSecondary, fontWeight: selectedBranch ? '700' : '500' }}>
                    {selectedBranch ? selectedBranch.name : "Select Branch"}
                  </Text>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Auth Fields */}
            {(selectedNgo && (loginUserType === 'ngo' || selectedBranch)) && (
              <Animated.View style={{ opacity: fadeAuth }}>
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg + '50' }}>
                    <Mail size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput value={email} editable={false} style={{ flex: 1, color: colors.textSecondary, fontSize: 16, fontWeight: '600' }} />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg }}>
                    <Lock size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput placeholder="Enter Password" value={password} onChangeText={setPassword} secureTextEntry style={{ flex: 1, color: colors.textPrimary, fontSize: 16 }} placeholderTextColor={colors.textSecondary} />
                  </View>
                </View>

                <PrivacyPolicyCheckbox
                  checked={agreedToPolicy}
                  onChange={setAgreedToPolicy}
                  colors={colors}
                  containerStyle={{ marginBottom: 20 }}
                />

                <TouchableOpacity
                  onPress={onLogin}
                  disabled={isLoggingIn || !password || !agreedToPolicy}
                  style={{ backgroundColor: colors.accent, padding: 20, borderRadius: 16, alignItems: 'center', opacity: (isLoggingIn || !password || !agreedToPolicy) ? 0.6 : 1, shadowColor: colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}
                >
                  {isLoggingIn ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 }}>Secure Login</Text>}
                </TouchableOpacity>
              </Animated.View>
            )}

          </View>

          <SelectionModal
            visible={branchModalVisible}
            onClose={() => setBranchModalVisible(false)}
            title="Select Branch"
            placeholder="Search branches..."
            data={filteredBranches}
            onSelect={handleBranchSelect}
            loading={loadingBranches}
            searchQuery={branchSearch}
            setSearchQuery={setBranchSearch}
            colors={colors}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}