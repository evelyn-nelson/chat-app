import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { get } from "./custom-store";

const http = axios.create();

http.interceptors.request.use(async (config) => {
  const controller = new AbortController();
  const token = await get("jwt");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  } else {
    controller.abort();
  }
  return {
    ...config,
    signal: controller.signal,
  };
});

export default http;
