const path = require('path');
const dotenv = require('dotenv');
const cosmiconfig = require('cosmiconfig');

function camelCase(str) {
  return str.split(/[-_]/).map(item => {
    return item.replace(/[a-zA-Z]/, (letter) => {
      return letter.toUpperCase();
    })
  }).join('')
}

function getParentDirectory(dir) {
  return path.normalize(dir).split(path.sep).splice(-2, 1)[0];
}

function resolve(...paths) {
  return path.join(process.cwd(), ...paths);
}

function getEnvConfig() {
  return dotenv.config().parsed;
}

function getJrcConfig() {
  const result =  cosmiconfig.cosmiconfigSync('jrc').search();
  const resolveDirs = ['docsDir', 'siteDir', 'componentDir', 'esmDir', 'cjsDir'];
  const defaultConfig = {
    port: 9000,
    docsDir: './docs',
    siteDir: './site',
    componentDir: './components',
    esmDir: './es',
    cjsDir: './lib',
    rewriteWebpackConfig(config) {
      return config;
    }
  };
  Object.assign(defaultConfig, (result && result.config) || {});
  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (resolveDirs.includes(key)) {
      defaultConfig[key] = resolve(value);
    }
  });
  return defaultConfig;
}


module.exports = {
  camelCase,
  getParentDirectory,
  resolve,
  getEnvConfig,
  getJrcConfig
}