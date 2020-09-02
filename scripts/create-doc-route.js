const fs = require('fs');
const path = require('path');
const os = require('os');

const { camelCase, getJrcConfig } = require('./utils');
const { input: { docsDir, siteDir } } = getJrcConfig();
const YAML_REGEXP = /---[\s\S]+?---/;
const SPLIT_LINE = os.platform() === 'win32' ? /\r\n/ : /\n/;

const componentRoutePath = path.resolve(siteDir, './src/routes/components.tsx');
const componentsMap = new Map();

fs.readdirSync(docsDir).forEach(filename => {
  if (/^\.(md|mdx)$/.test(path.extname(filename))) {
    const str = fs.readFileSync(path.join(docsDir, filename)).toString();
    const yaml = str.match(YAML_REGEXP);
    const options = {
      path: `/components/${path.parse(filename).name}`
    };

    let origin = [];

    if (yaml) {
      const maps = yaml[0].split(SPLIT_LINE);
      maps.pop();
      maps.shift();
      maps.forEach(item => {
        const [key, value] = item.split(':');

        origin.push(`${key.trim()}: ${value.trim()}`);
        const formatter = (new Function(`return {${key.trim()}: ${value.trim()}}`))();
        Object.assign(options, formatter);
      });
    }

    componentsMap.set(filename, {
      format: options,
      origin
    });
  }
});

const importSentences = [];
const componentsSentences = [];

for (let [filename, { format, origin }] of componentsMap) {
  const componentName = camelCase(path.parse(filename).name);

  importSentences.push(`import ${componentName} from '@/docs/${filename}';`);
  componentsSentences.push(`{ component: ${componentName}, path: '${format.path}', exact: true, meta: { ${origin.join(', ')} } }`);
}

fs.writeFileSync(componentRoutePath, `${importSentences.join('\n')}

const components = [
  ${componentsSentences.join(',\n  ')}
];

export default components;`);