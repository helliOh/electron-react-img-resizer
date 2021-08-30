import React, { useEffect, useState } from 'react'
import { Empty, Layout, Menu, Input } from 'antd'
import { Typography } from 'antd'

const { Text } = Typography

const { Sider } = Layout

const SideMenu = ({
    readImage,
    changeSrcDir,
    ipcRenderer,
    rootDir,
    setRootDir,
}) =>{
    const [ fileTree, setFileTree ] = useState([])
    const [ selected, setSelected ] = useState(null)
    
    const handleRefresh = () =>{
        ipcRenderer.send('explorer', { type : 'init' })
    }

    const handleNew = () =>{
        ipcRenderer.send('explorer', { type : 'mkdir' })
    }

    const handleFocus = (index) =>{
        setSelected( fileTree[index] )
        readImage( fileTree[index] )
        changeSrcDir( fileTree[index] )
    }

    const handleChange = (e, index) =>{
        const newFileTree = [ ...fileTree ]
        newFileTree[index] = e.target.value
        setFileTree(
            newFileTree
        )
    }

    const handleBlur = (index) =>{
        if(selected !== fileTree[index]){
            ipcRenderer.send('explorer', { type : 'rename', from : selected, to : fileTree[index] })
        }
        setSelected(null)
    }

    const handleEnter = (e) =>{
        if(e.key === 'Enter'){
            e.target.blur()
        }
    }

    const handleMenuClick = (e) =>{
        const menuItemOrInputNode = e.domEvent.target

        if(menuItemOrInputNode.children.length){
            const [ childNode ] = menuItemOrInputNode.children

            if(childNode.children.length ){
                const [ inputNode ] = childNode.children

                inputNode.focus()
            }
        }
        else{
            menuItemOrInputNode.focus()
        }
    }

    useEffect(() =>{
        ipcRenderer.on('init-file-tree', (event, payload) =>{
            if(!rootDir){
                setRootDir(payload.root)
            }
            setFileTree(payload.tree)
        })

        ipcRenderer.send('explorer', { type : 'init' })
    }, [])

    return (
        <Sider
        breakpoint="lg"
        collapsedWidth="0"
        onCollapse={(collapsed, type) => { console.log(collapsed, type); }}
      >
        <div className="logo" />
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
            <Menu.Item style={{ borderBottom : '1px solid #a3a3a3' }}>
                <Text 
                style={{
                    background: 'transparent',
                    color: '#f3f3f3',
                    fontWeight : '700',
                    border : 'none',
                    cursor : 'default',
                    fontSize : '18px',
                    
                }}>리사이저 0.1 Beta</Text>
            </Menu.Item>
            <Menu.Item onClick={handleRefresh}> ↻ 새로고침 </Menu.Item>
            {
                fileTree.length === 0 
                ? (
                    <Empty />
                )
                : (
                    fileTree.map((name, index) =>(
                        <Menu.Item key={index} onClick={handleMenuClick}>
                            <Input 
                            type="text"
                            style={{
                                background: 'transparent',
                                color: '#f3f3f3',
                                fontWeight : '700',
                                border : 'none',
                                cursor : 'pointer'
                            }}
                            value={fileTree[index]}
                            onFocus={() => handleFocus(index)}
                            onChange={e => handleChange(e, index)}
                            onBlur={() => handleBlur(index)}
                            onKeyPress={handleEnter}
                            />
                        </Menu.Item>
                    ))
                )
            }
            <Menu.Item onClick={handleNew}>+ 새 폴더</Menu.Item>
        </Menu>
      </Sider>
    )
}

export default SideMenu