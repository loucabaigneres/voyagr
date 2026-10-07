const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem: 16 keeps Tailwind sizes identical to the web app (NativeWind defaults to 14).
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });
