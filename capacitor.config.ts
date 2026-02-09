import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.madani_exchange.radium",
  appName: "Madani Money Exchange",
  webDir: "dist",
  server: {
    url: "https://madani.qzz.io",
    cleartext: true,
  },
};

export default config;
