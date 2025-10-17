const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const defaultConfig = getSentryExpoConfig(__dirname);
defaultConfig.resolver.assetExts.push('cjs');

module.exports = defaultConfig;