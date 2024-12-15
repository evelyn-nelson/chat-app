import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const save = async (key, value) => {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value.toString());
    }
  } catch (error) {
    console.error("Error saving data: ", error);
  }
};

export const get = async (key) => {
  try {
    if (Platform.OS === "web") {
      const result = await AsyncStorage.getItem(key);
      if (result) {
        return result;
      } else {
        throw new Error("Value not found");
      }
    } else {
      const result = await SecureStore.getItemAsync(key);
      if (result) {
        return result;
      } else {
        throw new Error("Value not found");
      }
    }
  } catch (error) {
    console.error("Error retrieving data:", error);
  }
};
