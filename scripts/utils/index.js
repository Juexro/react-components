function camelCase(str) {
  return str.replace(/[a-zA-Z]/, (letter) => {
    return letter.toUpperCase();
  })
}

module.exports = {
  camelCase
}