const fs = require('fs')
const path = require('path')
const handlebars = require('handlebars')
const promisify = require('util').promisify
const conf = require('../config/defaultConfig')
const getMimeType = require('./mime')
const compress = require('./compress')
const range = require('./range')
const stat = promisify(fs.stat)
const readdir = promisify(fs.readdir)
const tplPath = path.join(__dirname, '../template/dir.tpl')
const source = fs.readFileSync(tplPath)
const template = handlebars.compile(source.toString())

module.exports = async function(req, res, filePath) {
  try {
    const stats = await stat(filePath)
    if (stats.isFile()) {
      res.setHeader('Content-Type', getMimeType(filePath))
      const { code, start, end } = range(stats.size, req, res)
      let rs
      if (code === 200) {
        rs = fs.createReadStream(filePath)
      } else {
        rs = fs.createReadStream(filePath, {start, end})
      }
      res.statusCode = code
      if (filePath.match(conf.compress)) {
        rs = compress(rs, req, res)
      }
      rs.pipe(res)
    } else if (stats.isDirectory()) {
      const files = await readdir(filePath)
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      const dir = path.relative(conf.root, filePath)
      console.info(dir)
      const data = {
        title: 'title',
        dir: `/${dir}`,
        files
      }
      res.end(template(data))
    }
  } catch(ex) {
    res.statusCode = 404
    res.setHeader('Content-type', 'text/plain')
    res.end(`${filePath} is not found`)
  }
}
