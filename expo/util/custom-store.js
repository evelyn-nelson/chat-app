import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const save = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value.toString());
  } catch (error) {
    console.error("Error saving data: ", error);
  }
};

export const get = async (key) => {
  try {
    const result = await SecureStore.getItemAsync(key);
    if (result) {
      return result;
    } else {
      throw new Error("Value not found");
    }
  } catch (error) {
    if (error.message != "Value not found") {
      console.error("Error retrieving data:", error);
    }
  }
};

export const clear = async (key) => {
  try {
    const value = await get(key);
    if (value) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    if (error.message != "Value not found") {
      console.error("Error deleting data:", error);
    }
  }
};
