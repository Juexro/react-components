const fs = require('fs');
const path = require('path');
const { camelCase, getJrcConfig } = require('./utils');

const { input: { componentDir } } = getJrcConfig();

const importSentences = [];
const exportSentences = [];

fs.readdirSync(componentDir).forEach(filename => {
  if (['theme', 'index.tsx'].includes(filename)) {
    return;
  }
  if (filename === 'utils') {
    importSentences.push(`import * as utils from './${filename}';`);
    exportSentences.push('utils');
  } else {
    const name = camelCase(filename);
    importSentences.push(`import ${name} from './${filename}'`);
    exportSentences.push(name);
  }
});

fs.writeFileSync(path.join(componentDir, 'index.tsx'), `${importSentences.join(';\n')}

export {
  ${exportSentences.join(',\n  ')}
}
`);
