import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";
import * as encryptionService from "./encryptionService";
import * as customStore from "@/util/custom-store";
import sodium from "react-native-libsodium";

const DEVICE_ID_KEY = "deviceIdentifier";
const PUBLIC_KEY_KEY = "devicePublicKey";
const PRIVATE_KEY_SECURE_KEY = "devicePrivateKey_v2";

interface DeviceIdentity {
  deviceId: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export const getOrGenerateDeviceIdentifier = async (): Promise<string> => {
  let deviceId: string | undefined;
  try {
    deviceId = await customStore.get(DEVICE_ID_KEY);
  } catch (e) {
    // Ignore
  }

  if (!deviceId) {
    deviceId = uuidv4();
    await customStore.save(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getOrGenerateDeviceKeyPair = async (): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> => {
  let storedPublicKeyBase64: string | undefined;
  try {
    storedPublicKeyBase64 = await customStore.get(PUBLIC_KEY_KEY);
  } catch (e) {
  }
  const storedPrivateKeyBase64 = await SecureStore.getItemAsync(
    PRIVATE_KEY_SECURE_KEY
  );

  if (storedPublicKeyBase64 && storedPrivateKeyBase64) {
    try {
      const publicKey = encryptionService.base64ToUint8Array(
        storedPublicKeyBase64
      );
      const privateKey = encryptionService.base64ToUint8Array(
        storedPrivateKeyBase64
      );

      if (
        publicKey.length === sodium.crypto_box_PUBLICKEYBYTES &&
        privateKey.length === sodium.crypto_box_SECRETKEYBYTES
      ) {
        return { publicKey, privateKey };
      } else {
        console.warn(
          "Stored device keys seem invalid (length mismatch). Regenerating."
        );
      }
    } catch (e) {
      console.error("Error decoding stored device keys, regenerating:", e);
    }
  }

  // If keys are not found or invalid, generate new ones
  await sodium.ready;
  const { publicKey, privateKey } =
    await encryptionService.generateLongTermKeyPair();

  await customStore.save(
    PUBLIC_KEY_KEY,
    encryptionService.uint8ArrayToBase64(publicKey)
  );
  await SecureStore.setItemAsync(
    PRIVATE_KEY_SECURE_KEY,
    encryptionService.uint8ArrayToBase64(privateKey)
  );

  return { publicKey, privateKey };
};

export const ensureDeviceIdentity = async (): Promise<DeviceIdentity> => {
  const deviceId = await getOrGenerateDeviceIdentifier();
  const { publicKey, privateKey } = await getOrGenerateDeviceKeyPair();
  return { deviceId, publicKey, privateKey };
};

export const clearDeviceIdentity = async (): Promise<void> => {
  try {
    await customStore.clear(DEVICE_ID_KEY);
  } catch (e) {
    // Ignore
  }
  try {
    await customStore.clear(PUBLIC_KEY_KEY);
  } catch (e) {
    // Ignore
  }
  await SecureStore.deleteItemAsync(PRIVATE_KEY_SECURE_KEY);
  console.log("Device identity cleared.");
};
