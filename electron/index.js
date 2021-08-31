const { app, BrowserWindow, ipcMain, shell } = require('electron')

const fs = require('fs')
const url = require('url')
const path = require('path')
const moment = require('moment')
const sizeOf = require('buffer-image-size')

const sharp = require('sharp')

const userDataDir = app.getPath('appData')
const rootDir = path.resolve(userDataDir, 'electron-resizer')

const isSystemDir = dir => (
    [ 
        '.git', 
        'node_modules', 
        'src', 
        'public', 
        'dist', 
        'build', 
        'electron',
        'temp_rsz'
    ]
    .some(name => name === dir)
)

const isImage = file => (
    [
        '.png', 
        '.jpg', 
        '.gif' 
    ]
    .some(ext => file.name.includes(ext))
)

const searchDirectory = () => fs.readdirSync(rootDir, { withFileTypes : true })
.filter(file => file.isDirectory())
.filter(file => !isSystemDir(file.name))
.map(file => file.name)

const searchImage = (dir) => fs.readdirSync(dir, { withFileTypes : true })
.filter(file => !file.isDirectory())
.filter(file => isImage(file.name.toLocaleLowerCase()))
.map(file => path.join(dir, file.name) )

const readdirSyncRecursive = (current, options={ filterBy : () => true }) =>{
    const { filterBy } = options

    const files = fs.readdirSync(current, { withFileTypes : true })

    const dirs = files
    .filter(file => file.isDirectory())
    .map(file => file.name)

    const normalFiles = files
    .filter(file => !file.isDirectory())
    .filter(file => filterBy(file) )
    .map(file => file.name)

    return {
        root : current === '.',
        path : current,
        isDir : true,
        children : [ 
            ...dirs.map(dir => readdirSyncRecursive( path.resolve(current, dir), options ) ), 
            ...normalFiles.map(normalFile => ({
                root : false,
                path : path.resolve(current, normalFile),
                isDir : false,
                children : undefined
            })) 
        ]
    }
}

const findImageAll = (current) =>{
    const fileTree = readdirSyncRecursive(current, { filterBy : isImage }).children

    let buffer = [ ...fileTree ]

    while( buffer.some(e => e.isDir) ){
        const head = buffer.shift()

        if( head.isDir ){
            buffer = [ ...buffer, ...head.children ] 
        }
        else{
            buffer.push({ ...head })
        }

    }

    return buffer.map(elem => elem.path)
}

if( !fs.existsSync(rootDir) ) fs.mkdirSync(rootDir)

console.log(`root directory: ${rootDir}`)

function createWindow(){
    const window = new BrowserWindow({
        width : 1280,
        height : 720,
        webPreferences: {
            nodeIntegration : true,
            contextIsolation: false,
            preload: path.resolve(__dirname, './preload.js')
        },
    })

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '../build/index.html'),
        protocol: 'file:',
        slashes: true
    })

    /*
    * startUrl에 배정되는 url을 맨 위에서 생성한 BrowserWindow에서 실행시킵니다.
    * */

    window.loadURL(startUrl)

    return window
}

app.whenReady().then(() =>{
    console.log('window ready...')
    app.win = createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0){
            createWindow()
        }
    })
}) 

app.on('window-all-closed', () =>{
    if(process.platform !== 'darwin'){
        app.quit()
    }
})

ipcMain.on('explorer', (event, payload) => {
    const { type } = payload

    try{
        switch(type){
            case 'init': {
                return event.sender.send(
                    'init-file-tree', 
                    {
                        root : rootDir,
                        tree : searchDirectory(),
                    }
                )
            }
            case 'clear': {
                fs.rmdirSync( rootDir, { recursive : true })
                fs.mkdirSync( rootDir )
    
                return event.sender.send(
                    'init-file-tree', 
                    {
                        root : rootDir,
                        tree : searchDirectory(),
                    }
                )
            }
            case 'open' : {
                shell.openExternal( path.resolve(rootDir, payload.dir) )
 
                return
            }
            case 'rename': {
                fs.renameSync(
                    path.join(rootDir, payload.from), 
                    path.join(rootDir, payload.to)
                )
    
                return event.sender.send(
                    'init-file-tree', 
                    {
                        root : rootDir,
                        tree : searchDirectory(),
                    }
                )
            }
            case 'read-image': {
                const fileTree = findImageAll(payload.dir)

                return event.sender.send(
                    'set-image', 
                    fileTree
                )
            }
            default:{
                return
            }
        }
    }
    catch(e){
        console.error(e)
    }
})

ipcMain.on('image-handler', async (event, payload) => {
    const { type } = payload

    switch(type){
        case 'resize': {
            event.sender.send('resize-start')
            const { config } = payload
            const { width, height } = config

            const pad = Number(config.pad / 100)

            const base = 1 - 2 * pad

            const baseW = Math.floor(width * base)
            const baseH = Math.floor(height * base)

            const padW = Math.floor(width * pad)
            const padH = Math.floor(height * pad)

            event.sender.send('resize-read')

            const files = payload.images
            .map(filename =>{
                const body  = fs.readFileSync( filename )
                const header = sizeOf(body)

                const [ originName, ...rest ] = filename.replace(payload.source, '').split('/').reverse()

                return ({
                    header : { ...header, filename, originName, subPath : rest },
                    body
                })
            })

            event.sender.send('resize-session')

            const sessionName = `${ moment().format('YYYYMMDDHHmmSS') }_${ width }x${ height }`
            const dist = path.resolve(rootDir, sessionName)

            if( fs.existsSync(dist) ){
                fs.rmdirSync(dist, { recursive: true })
            }

            fs.mkdirSync(dist)

            event.sender.send('resize-process')

            const resized = await Promise.all(
                files.map(file => new Promise(async (resolve, reject) =>{
                    try{
                        const samplePx = await sharp(file.body)
                        .extract({ left : 0, top : 0, width : 1, height : 1 })
                        .raw()
                        .toBuffer()

                        const [ r, g, b, alpha ] = Array.from(samplePx)

                        console.log(Array.from(samplePx))

                        console.log(`${ file.header.originName } (${[ r, g, b , alpha].join(', ')})`)

                        const background = { 
                            r, 
                            g, 
                            b, 
                            alpha : typeof(alpha) !== 'undefined' 
                            ? alpha 
                            : 1 
                        }

                        const resized = await sharp(file.body)
                        .ensureAlpha()
                        .trim()
                        .resize(//focus on image
                            baseW,
                            baseH,
                            {
                                fit: config.preserveAspectRatio ? 'contain' : 'fill',
                                background
                            }
                        )
                        .extend(//then expand background
                            {
                                top : padH,
                                right : padW,
                                bottom : padH,
                                left : padW,
                                background
                            }
                        )
                        .toBuffer()

                        resolve({
                            org : { ...file.header },
                            header : { 
                                width : width, 
                                height : height, 
                                type : file.header.type,
                                subPath : file.header.subPath,
                                originName : file.header.originName,
                                filename : path.resolve( dist,  ...file.header.subPath, file.header.originName ),
                            },
                            body : resized
                        })
                    }
                    catch(e){
                        reject(e)
                    }
                }))
            )

            const writings = resized.map(file =>{
                if( !fs.existsSync( path.resolve(dist, ...file.header.subPath) ) ){
                    fs.mkdirSync( path.resolve(dist, ...file.header.subPath), { recursive: true } )
                }

                fs.writeFileSync( file.header.filename, file.body )
            })

            event.sender.send('resize-complete', { count : writings.length })
            return event.sender.send('init-file-tree', {
                root : rootDir,
                tree : searchDirectory(),
            })
        }
        default:{
            return
        }
    }
})

