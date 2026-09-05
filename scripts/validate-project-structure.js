const fs = require('fs')
const path = require('path')

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

for (const file of walk('.').filter((target) => target.endsWith('.wxml'))) {
  const source = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const stack = []
  for (const match of source.matchAll(/<\/?([a-zA-Z][\w-]*)(?:\s[^<>]*?)?\s*\/?>/g)) {
    const [tagSource, tag] = match
    if (tagSource.startsWith('</')) {
      if (stack.pop() !== tag) throw new Error(`WXML tag mismatch: ${file} ${tag}`)
    } else if (!/\/\s*>$/.test(tagSource)) {
      stack.push(tag)
    }
  }
  if (stack.length) throw new Error(`WXML unclosed tag: ${file} ${stack.join(',')}`)
}

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
for (const route of app.pages) {
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    if (!fs.existsSync(route + extension)) throw new Error(`Missing route file: ${route}${extension}`)
  }
}

for (const file of walk('pages').filter((target) => target.endsWith('.json'))) {
  const pageConfig = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const componentPath of Object.values(pageConfig.usingComponents || {})) {
    const normalized = componentPath.replace(/^\//, '')
    if (!fs.existsSync(normalized + '.json')) throw new Error(`Missing component: ${file} -> ${componentPath}`)
  }
}

const cloudDirectory = 'cloudfunctions/userPortrait'
for (const file of walk(cloudDirectory).filter((target) => target.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
    const dependency = path.resolve(path.dirname(file), match[1])
    if (![dependency, dependency + '.js', path.join(dependency, 'index.js')].some(fs.existsSync)) {
      throw new Error(`Missing cloud dependency: ${file} -> ${match[1]}`)
    }
  }
}

console.log('WXML, routes, components and cloud dependencies passed.')
