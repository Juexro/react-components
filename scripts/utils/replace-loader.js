const { getOptions } = require('loader-utils');
const os = require('os');

const YAML_REGEXP = /---[\s\S]+?---/;
const SPLIT_LINE = os.platform() === 'win32' ? /\r\n/ : /\n/;

const componentsMap = new Map();

const loader = async function(content) {
  const callback = this.async()
  const options = Object.assign({}, getOptions(this), {
    filepath: this.resourcePath
  });

  if (!componentsMap.has(this.resourcePath)) {
    const yaml = content.match(YAML_REGEXP);
    const options = {};
    if (yaml) {
      const maps = yaml[0].split(SPLIT_LINE);
      maps.pop();
      maps.shift();
      maps.forEach(item => {
        const [key, value] = item.split(':');
        const formatter = (new Function(`return {${key.trim()}: ${value.trim()}}`))();
        Object.assign(options, formatter);
      });
    }

    componentsMap.set(this.resourcePath, options);
  } else {
    // trigger generate
  }

  return callback(null, content.replace(YAML_REGEXP, ''));
}

module.exports = loader;