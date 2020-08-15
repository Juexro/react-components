const path = require('path');

module.exports = {
  DOCS_ALIAS: 'docs',
  COMPONENT_ALIAS: 'components',
  DOCS_DIR: path.resolve(__dirname, '../docs'),
  SITE_DIR: path.resolve(__dirname, '../site'),
  COMPONENT_DIR: path.resolve(__dirname, '../components'),
  ESM_DIR: path.resolve(__dirname, '../es'),
  CJS_DIR: path.resolve(__dirname, '../lib'),
  WORKSPACE: path.resolve(__dirname, '..')
}