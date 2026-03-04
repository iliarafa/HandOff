import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.handoff.app',
  appName: 'HandOff',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'none',
      scroll: false
    }
  }
};

export default config;
