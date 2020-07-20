const { getOptions } = require('loader-utils');
const YAML_REGEXP = /---[\s\S]+?---/;

const loader = async function(content) {
  const callback = this.async()
  const options = Object.assign({}, getOptions(this), {
    filepath: this.resourcePath
  });

  return callback(null, content.replace(YAML_REGEXP, ''));
}

module.exports = loader;