const path = require('path');

module.exports = {
  DOCS_ALIAS: 'docs',
  COMPONENT_ALIAS: 'components',
  DOCS_DIR: path.resolve(__dirname, '../docs'),
  SITE_DIR: path.resolve(__dirname, '../site'),
  COMPONENT_DIR: path.resolve(__dirname, '../components'),
  COMPONENT_PREFIX: 'jrc',
  ES_DIR: path.resolve(__dirname, '../es')
}