import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.jornadacafe.app',
  appName: 'Minha Jornada pelo Café',
  webDir: 'dist',
  backgroundColor: '#00000000',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DEFAULT',
    },
  },
};

export default config;
