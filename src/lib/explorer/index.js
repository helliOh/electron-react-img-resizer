const fs = require('fs')
const path = require('path')

class Explorer {
    constructor(rootDir){
        const basePath = path.resolve(rootDir)
        
        this.basePath = basePath
        this.src = path.resolve(basePath, './src')
        this.dist = path.resolve(basePath, './dist')
    }

    showDirectories(dir){
        const _path = path.resolve(dir)

        const appPaths = [ 'lib', 'node_modules', 'views' ]
        const exclude = (key, ...arg) => !arg.includes(key)

        const directories = fs.readdirSync(_path, { withFileTypes : true })
        .filter(file => file.isDirectory())
        .map(file => file.name)
        .filter(name => exclude(name, ...appPaths) )

        return directories
    }

    setSource(srcPath){
        this.src = path.resolve(basePath, srcPath)
    }

    setDist(distPath){
        this.dist = path.resolve(basePath, distPath)
    }
}

module.exports = Explorer