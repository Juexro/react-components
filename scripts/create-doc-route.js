const fs = require('fs');
const path = require('path');
const os = require('os');

const { DOCS_DIR, SITE_DIR, DOCS_ALIAS, COMPONENT_ALIAS } = require('./doc.config');
const { camelCase } = require('./utils');
const YAML_REGEXP = /---[\s\S]+?---/;
const SPLIT_LINE = os.platform() === 'win32' ? /\r\n/ : /\n/;

const componentRoutePath = path.resolve(SITE_DIR, './src/routes/components.tsx');
const componentsMap = new Map();

fs.readdirSync(DOCS_DIR).forEach(filename => {
  if (/^\.(md|mdx)$/.test(path.extname(filename))) {
    const str = fs.readFileSync(path.resolve(DOCS_DIR, filename)).toString();
    const yaml = str.match(YAML_REGEXP);
    const options = {
      path: `/${COMPONENT_ALIAS}/${path.parse(filename).name}`
    };

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
    componentsMap.set(filename, options);
  }
});

let importTpl = '';
let componentsTpl = '';

for (let [filename, options] of componentsMap) {
  const componentName = camelCase(path.parse(filename).name);
  importTpl += `import ${componentName} from '${DOCS_ALIAS}/${filename}';\n`;
  componentsTpl += `  { component: ${componentName }, path: '${options.path}', exact: true },`
}

componentsTpl = `
const components = [
${componentsTpl}
];

export default components;`;

fs.writeFileSync(componentRoutePath, `${importTpl}${componentsTpl}`);