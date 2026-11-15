import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.jornadacafe.app',
  appName: 'Minha Jornada pelo Café',
  webDir: 'dist',
  backgroundColor: '#F6F2EA',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
};

export default config;
