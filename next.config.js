const path = require('path');

const LOCAL_BACKEND_URL = 'http://localhost:3001';
const PRODUCTION_BACKEND_URL = 'https://medsage-1.onrender.com';

function trimTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

function getBackendBase() {
  const configuredUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  if (configuredUrl) return configuredUrl;

  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_BACKEND_URL
    : LOCAL_BACKEND_URL;
}

function localPackage(packageName) {
  return path.join(__dirname, 'node_modules', ...packageName.split('/'));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx'],
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@emotion/cache$': localPackage('@emotion/cache'),
      '@emotion/react$': localPackage('@emotion/react'),
      '@emotion/styled$': localPackage('@emotion/styled'),
      '@mui/private-theming$': localPackage('@mui/private-theming'),
      '@mui/styled-engine$': path.join(__dirname, 'src', 'shims', 'muiStyledEngine.js'),
      '@mui/system$': localPackage('@mui/system'),
      '@mui/types$': localPackage('@mui/types'),
      '@mui/utils/deepmerge$': path.join(__dirname, 'src', 'shims', 'muiDeepmerge.js'),
      '@mui/utils$': localPackage('@mui/utils'),
    };

    return config;
  },
  async rewrites() {
    const backendBase = getBackendBase();

    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/healthz',
        destination: `${backendBase}/healthz`,
      },
    ];
  },
};

module.exports = nextConfig;
