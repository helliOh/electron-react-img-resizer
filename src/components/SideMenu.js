import React, { useEffect, useState } from 'react'
import { Empty, Layout, Menu, Input } from 'antd'
import { Typography } from 'antd'

const { Text } = Typography

const { Sider } = Layout

const SideMenu = ({
    ipcRenderer,
    rootDir,
    setRootDir,
}) =>{
    const [ fileTree, setFileTree ] = useState([])
    
    const handleRefresh = () =>{
        ipcRenderer.send('explorer', { type : 'init' })
    }

    const handleNew = () =>{
        ipcRenderer.send('explorer', { type : 'mkdir' })
    }

    const handleMenuClick = (dir) =>{
        ipcRenderer.send('explorer', { type : 'open', dir })
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
                    color: '#f3f3f3',
                    fontWeight : '700',
                    cursor : 'default',
                    fontSize : '18px',
                }}>리사이저(Beta) ver 0.2.0 </Text>
            </Menu.Item>
            <Menu.Item onClick={handleRefresh}> ↻ 새로고침 </Menu.Item>
            {
                fileTree.length === 0 
                ? (
                    <Empty />
                )
                : (
                    fileTree.map((name, index) =>(
                        <Menu.Item 
                        key={index} 
                        onClick={() => handleMenuClick(fileTree[index]) }
                        >
                            <Text
                            style={{
                                color: '#f3f3f3',
                                fontWeight : '500',
                                cursor : 'default',
                                fontSize : '12px',
                            }}>
                                { fileTree[index] }
                            </Text>
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