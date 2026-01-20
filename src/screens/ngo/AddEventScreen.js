import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { NavigationContext } from "../../context/NavigationContext";
import { useTheme } from "../../context/ThemeContext";
const api = require("../../../apis/api");

export default function AddEventScreen() {
  const { goBack } = useContext(NavigationContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  const [location, setLocation] = useState("");
  const [aim, setAim] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState("");
  // date & time fields
  const [eventDate, setEventDate] = useState(new Date());

  const onDateChange = (date) => {
    setEventDate(new Date(date));
  };

  const handleSubmit = async () => {
    try {
      const reqBody = {
        location,
        aim,
        description,
        images,
        eventDate: eventDate.toISOString(),
      };

      const response = await fetch(api.eventAllAPI, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Event added successfully:", data);
      goBack();
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to add event: " + error.message);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundColors
            ? colors.backgroundColors[0]
            : "#fff",
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={[styles.title, { color: colors.header }]}>
          Add New Event
        </Text>
        <TextInput
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
          style={[
            styles.input,
            {
              backgroundColor: colors.iconBg,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          placeholder="Aim"
          value={aim}
          onChangeText={setAim}
          style={[
            styles.input,
            {
              backgroundColor: colors.iconBg,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={[
            styles.input,
            styles.multilineInput,
            {
              backgroundColor: colors.iconBg,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          placeholder="Images (URLs separated by commas)"
          value={images}
          onChangeText={setImages}
          style={[
            styles.input,
            {
              backgroundColor: colors.iconBg,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.dateInputContainer}>
          <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
            Select Date:
          </Text>
          <input
            type="date"
            value={eventDate.toISOString().split("T")[0]}
            onChange={(e) => onDateChange(e.target.value)}
            style={{
              backgroundColor: colors.iconBg,
              borderColor: colors.border,
              color: colors.textPrimary,
              padding: 12,
              borderWidth: 1,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 16,
              width: "100%",
            }}
          />
        </View>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Add Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    marginBottom: 8,
    fontSize: 16,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#f59e0b",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
// hello