const fs = require('fs');
const path = require('path');
const { camelCase } = require('./utils');
const { COMPONENT_DIR } = require('./doc.config');

const importSentences = [];
const exportSentences = [];

fs.readdirSync(COMPONENT_DIR).forEach(filename => {
  if (filename === 'global.less') {
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

fs.writeFileSync(path.join(COMPONENT_DIR, 'index.tsx'), `${importSentences.join(';\n')}

export {
  ${exportSentences.join(',\n  ')}
}
`);
