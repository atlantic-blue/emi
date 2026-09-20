const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

// The application lives in a workspace, so Metro has to watch the repository root and look for
// modules in both places. Without this a package under packages/ resolves for the type checker and
// fails in the bundle.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Hierarchical lookup stays on. A package can hold a copy of a dependency under itself rather
// than at the root, and react-native-css reaches react-native-reanimated, which reads semver from
// a copy of its own. With the lookup off the bundle stops there.
config.resolver.disableHierarchicalLookup = false;

// One rem is sixteen points, which is what the prototype renders at. Left alone, a rem is the
// phone's own text size and every measurement taken from the prototype comes out short.
module.exports = withNativewind(config, { inlineRem: 16 });
