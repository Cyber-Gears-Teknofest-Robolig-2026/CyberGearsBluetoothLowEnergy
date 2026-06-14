import { Platform } from "react-native";

// Platform-specific implementation loader. Use require so bundlers only include
// the native impl on native builds and the web impl on web builds.
declare const require: (modulePath: string) => any;
let impl: any;

if (Platform.OS === "web") {
  // from src/BTControlLib to src/web/BTControlLib -> ../web/BTControlLib
  impl = require("../web/BTControlLib");
} else {
  // from src/BTControlLib to src/android/BTControlLib -> ../android/BTControlLib
  impl = require("../android/BTControlLib");
}

// Expose a safe wrapper for the commonly used BTControlLib API. If a function
// is missing on the current platform the wrapper either returns a harmless
// default or a noop subscription object so callers don't crash.

export const isSupported = (): boolean => {
  return typeof impl.isSupported === "function" ? impl.isSupported() : Platform.OS === "web";
};

export const connect = (...args: any[]) => {
  return typeof impl.connect === "function" ? impl.connect(...args) : Promise.resolve(null);
};

export const requestPermissions = (...args: any[]) => {
  return typeof impl.requestPermissions === "function" ? impl.requestPermissions(...args) : Promise.resolve(true);
};

export const ensureEnabled = (...args: any[]) => {
  return typeof impl.ensureEnabled === "function" ? impl.ensureEnabled(...args) : Promise.resolve(true);
};

export const startScan = (...args: any[]) => {
  return typeof impl.startScan === "function" ? impl.startScan(...args) : undefined;
};

export const stopScan = (...args: any[]) => {
  return typeof impl.stopScan === "function" ? impl.stopScan(...args) : undefined;
};

export const onAdapterPoweredOff = (listener: () => void) => {
  if (typeof impl.onAdapterPoweredOff === "function") return impl.onAdapterPoweredOff(listener);
  return { remove: () => {} };
};

export const onDeviceDisconnected = (deviceId: string | undefined, listener?: () => void) => {
  if (typeof impl.onDeviceDisconnected === "function") return impl.onDeviceDisconnected(deviceId, listener);
  return { remove: () => {} };
};

// Re-export anything else dynamically (useful for tests or uncommon helpers)
export default impl;
