const fs = require('fs');
const path = require('path');
const { COMPONENT_DIR, ES_DIR } = require('./doc.config');

function copyLess(dir) {
  fs.readdirSync(dir).forEach(filename => {
    const filepath = path.join(dir, filename);
    const stat = fs.lstatSync(filepath);
    if (stat.isDirectory()) {
      copyLess(filepath);
    } else if (stat.isFile() && path.extname(filepath) === '.less') {
      const espath = path.join(ES_DIR, path.relative(COMPONENT_DIR, filepath));
      fs.copyFileSync(filepath, espath);
    }
  });
}

copyLess(COMPONENT_DIR);
