const path = require('path');

function camelCase(str) {
  return str.replace(/[a-zA-Z]/, (letter) => {
    return letter.toUpperCase();
  })
}

function getParentDirectory(dir) {
  return path.normalize(dir).split(path.sep).splice(-2, 1)[0];
}

module.exports = {
  camelCase,
  getParentDirectory
}