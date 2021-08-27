const fs = require('fs')
const path = require('path')

class Config {
    constructor(rootDir){
        const configPath = path.resolve(rootDir, '.app.conf')

        this.rootDir = rootDir

        if( fs.existsSync(configPath) ){
            this.options = fs.readFileSync(configPath).toString().split('\n')
            .map(line => line.split('='))
            .reduce((acc, cur) =>({ ...acc, [ cur[0] ] : cur[1] }), {})

            console.log('config found')
            console.log('config loaded')
            console.log(this.options)
            console.log()
        }
        else{
            const defaultConfig = {
                width : 1000,
                height : 1000
            }

            const configStr = stringifyConfig(defaultConfig)

            fs.writeFileSync(configPath, configStr)

            this.options = defaultConfig
            console.log('config not found')
            console.log('default config:')
            console.log(this.options)
            console.log()
        }
    }

    set(key, value){
        this.options = { ...this.options, [ key ] : value }
    }

    save(){
        const configPath = path.resolve(this.rootDir, '.app.conf')
        const configStr = stringifyConfig(this.options)
        fs.writeFileSync(configPath, configStr)
    }
}

function stringifyConfig(obj){
    return Object.entries( obj )
    .map(pair => pair.join('='))
    .reduce((acc, cur) => [ acc, cur ].join('\n') )
}

module.exports = Config