const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El backend (Node/Express) vive en ./backend y no debe ser indexado por Metro
const backend = /[\\/]backend[\\/].*/;
const existing = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), backend];

module.exports = config;
