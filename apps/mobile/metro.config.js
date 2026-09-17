const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

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
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
