const { app, BrowserWindow, ipcMain, shell } = require('electron')

const fs = require('fs')
const url = require('url')
const path = require('path')
const sharp = require('sharp')
const moment = require('moment')
const sizeOf = require('buffer-image-size')                

const userDataDir = app.getPath('appData')
const rootDir = path.resolve(userDataDir, 'electron-resizer')

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

    const isImage = name => (
        [
            '.png', 
            '.jpg', 
            '.gif' 
        ]
        .some(ext => name.includes(ext))
    )
    
    const searchDirectory = () => fs.readdirSync(rootDir, { withFileTypes : true })
    .filter(file => file.isDirectory())
    .filter(file => !isSystemDir(file.name))
    .map(file => file.name)

    const searchImage = (dir) => fs.readdirSync(dir, { withFileTypes : true })
    .filter(file => !file.isDirectory())
    .filter(file => isImage(file.name.toLocaleLowerCase()))
    .map(file => path.join(dir, file.name) )

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
            case 'mkdir': {
                fs.mkdirSync( path.join(rootDir, '새 폴더') )
    
                return event.sender.send(
                    'init-file-tree', 
                    {
                        root : rootDir,
                        tree : searchDirectory(),
                    }
                )
            }
            case 'open' : {
                shell.openExternal(rootDir)
 
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
                return event.sender.send(
                    'set-image', 
                    searchImage( payload.dir )
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
            console.log(payload)

            const { config } = payload
            const { width, height } = config

            const baseW = Math.floor(width * 0.6)
            const baseH = Math.floor(height * 0.6)

            const padW = Math.floor(width * 0.2)
            const padH = Math.floor(height * 0.2)

            const files = payload.images
            .map(filename =>{
                console.log({
                    rootDir,
                    src : payload.source,
                    filename
                })
                const body  = fs.readFileSync( path.resolve(rootDir, payload.source, filename) )
                const header = sizeOf(body)

                return ({
                    header : { ...header, filename },
                    body
                })
            })

            const sessionName = `${moment().format('YYYYMMDDHHmmSS')}_${width}x${height}`
            const dist = path.resolve(rootDir, sessionName)

            if( fs.existsSync(dist) ){
                fs.rmdirSync(dist, { recursive: true })
            }

            fs.mkdirSync(dist)

            const resized = await Promise.all(
                files.map(file => new Promise(async (resolve, reject) =>{
                    try{
                        const resized = await sharp(file.body)
                        .resize(
                            baseW,
                            baseH,
                            {
                                fit: 'contain',
                                background: {
                                    r: 255, 
                                    g: 255, 
                                    b: 255, 
                                    alpha: 1
                                }
                            }
                        )
                        .extend({
                            top: padH, 
                            bottom: padH, 
                            left: padW, 
                            right: padW, 
                            background: { 
                                r: 255, 
                                g: 255, 
                                b: 255, 
                                alpha: 1
                            } 
                        })
                        .toBuffer()

                        resolve({
                            org : { ...file.header },
                            header : { 
                                width : width, 
                                height : height, 
                                type : file.header.type, 
                                filename : path.reosolve(dist, file.header.filename.split('/').reverse()[0] ),
                            },
                            body : resized
                        })
                    }
                    catch(e){
                        reject(e)
                    }
                }))
            )

            const writings = resized.map(file => fs.writeFileSync( file.header.filename, file.body ))

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