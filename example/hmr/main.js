function render () {
  document.body.textContent = require('./msg.js')
}
render()

if (module.hot) {
  module.hot.accept()
}
