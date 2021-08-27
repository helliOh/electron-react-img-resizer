const { app, BrowserWindow, ipcMain } = require('electron')

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const sizeOf = require('buffer-image-size')                

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
        pathname: path.join(__dirname, '../../build/index.html'),
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
    console.log('Window ready')
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
        ['.git', 'node_modules', 'src', 'public', 'dist']
        .some(name => name === dir)
    )

    const isImage = name => (
        ['.png', '.jpg', '.gif' ]
        .some(ext => name.includes(ext))
    )

    const searchDirectory = () => fs.readdirSync('.', { withFileTypes : true })
    .filter(file => file.isDirectory())
    .filter(file => !isSystemDir(file.name))
    .map(file => file.name)

    const searchImage = (dir) => fs.readdirSync(`./${dir}`, { withFileTypes : true })
    .filter(file => !file.isDirectory())
    .filter(file => isImage(file.name.toLocaleLowerCase()))
    .map(file => file.name)

    switch(type){
        case 'init': {
            return event.sender.send('init-file-tree', searchDirectory())
        }
        case 'mkdir': {
            fs.mkdirSync('새 폴더')

            return event.sender.send('init-file-tree', searchDirectory())
        }
        case 'rename': {
            fs.renameSync(payload.from, payload.to)

            return event.sender.send('init-file-tree', searchDirectory())
        }
        case 'read-image': {
            return event.sender.send('set-image', searchImage(payload.dir))
        }
        default:{
            return
        }
    }
})

ipcMain.on('image-handler', async (event, payload) => {
    const { type } = payload

    switch(type){
        case 'resize': {
            const files = payload.images
            .map(filename =>{
                const body  = fs.readFileSync(filename)
                const header = sizeOf(body)
                
                return ({
                    header : { ...header, filename },
                    body
                })
            })

            const resized = await Promise.all(
                files.map(file => new Promise(async (resolve, reject) =>{
                    try{
                        const resized = await sharp(file.body)
                        .resize(
                            600,
                            600,
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
                            top: 200, 
                            bottom: 200, 
                            left: 200, 
                            right: 200, 
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
                                width : 1000, 
                                height : 1000, 
                                type : file.header.type, 
                                filename : [ 
                                    './dist', 
                                    file.header.filename.split('/').reverse()[0] 
                                ].join('/') 
                            },
                            body : resized
                        })
                    }
                    catch(e){
                        reject(e)
                    }
                }))
            )

            if( !fs.existsSync('./dist') ) fs.mkdirSync('./dist')

            const writings = resized.map(file => fs.writeFileSync( file.header.filename, file.body ))

            return event.sender.send('resize-complete')
        }
        default:{
            return
        }
    }
})