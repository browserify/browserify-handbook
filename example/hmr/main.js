var ud = require('ud')
function render () {
  document.body.textContent = require('./msg.js')
}
render()
ud.defn(module, render)
