import React, { useEffect, useState, useRef } from 'react'

import path from 'path'

import 'antd/dist/antd.css'

import { 
  Card, 
  Divider, 
  Layout, 
  Row, 
  Col, 
  Button,
  Input, 
  message,
  Upload,
  Switch
} from 'antd'
import SideMenu from './components/SideMenu'
import Text from 'antd/lib/typography/Text'
import Checkbox from 'antd/lib/checkbox/Checkbox'

const { ipcRenderer } = window.require('electron')

const { Header, Content, Footer } = Layout

function App() {
  const [ images, setImages ] = useState([])
  const [ rootDir, setRootDir ] = useState(null)
  const [ source, setSource ] = useState(null)
  const [ dist, setDist ] = useState(null)
  const [ loading, setLoading ] = useState(false)
  const [ resizeConfig, setResizeConfig ] = useState({
    width : 1000,
    height: 1000,
    pad : 10,
    preserveAspectRatio : true
  })

  const srcSelector = useRef()
  const distSelector = useRef()

  const handleResize = async () =>{
    setLoading(true)

    const payload = images.map(img => img.replace(/\\/g, '/') )

    console.log(payload, source)

    ipcRenderer.send('image-handler', { type : 'resize', images : payload, source, dist, config : { ...resizeConfig } })
  }

  const handleSourceDirChange = (e) =>{
    const sampleFile = e.target.files[0]
    
    if(sampleFile){
      const targetPath = sampleFile.path.replace(sampleFile.name, '')
      
      ipcRenderer.send('explorer', { type : 'read-image', dir : targetPath })
      setSource(targetPath.replace(/\\/g, '/'))
    }
  }

  // const handleTargetDirChange = (e) =>{
  //   const sampleFile = e.target.files[0]
    
  //   if(sampleFile){
  //     const targetPath = sampleFile.path.replace(sampleFile.name, '')

  //     setDist(targetPath)
  //   }
  // }

  const handleWidthChange = (e) =>{
    const { value } = e.target

    if( isNaN(value) ){
      return
    }

    setResizeConfig({ ...resizeConfig, width : Number(value) })
  }

  const handleHeightChange = (e) =>{
    const { value } = e.target

    if( isNaN(value) ){
      return
    }

    setResizeConfig({ ...resizeConfig, height : Number(value) })    
  }

  const handlePadChanage = (e) =>{
    const { value } = e.target

    if( isNaN(value) ){
      return
    }

    const valueNum = Number(value)

    if(valueNum < 0){
      return setResizeConfig({ ...resizeConfig, pad : 0 }) 
    }
    else if(valueNum > 100){
      return setResizeConfig({ ...resizeConfig, pad : 100 }) 
    }
    else{
      setResizeConfig({ ...resizeConfig, pad : valueNum })
    }
  }

  const togglePreserveAspectRatio = (e) =>{
    setResizeConfig({ ...resizeConfig, preserveAspectRatio : !resizeConfig.preserveAspectRatio })
  }

  useEffect(() =>{
    ipcRenderer.on('set-image', (event, payload) =>{
      setImages(payload)
    })

    ipcRenderer.on('resize-complete', (event, payload) =>{
      message.success(`${ payload.count }?????? ????????? ??????????????? ??????????????????`)
      setLoading(false)
    })
  }, [])

  return (
      <Layout style={{ width : 1260, height : 660 }}>
        <SideMenu
        ipcRenderer={ipcRenderer} 
        rootDir={rootDir}
        setRootDir={setRootDir}
        />
        <Content style={{ margin: '24px 16px 0' }}>

          {
            <>
              <Card>
                <Row>
                  {
                    source && (
                      <Col>
                        <Text>?????? ???????????????</Text>
                        <Text type="success" style={{ padding : '0 5px', fontWeight : '700' }}>{ source }</Text>
                        <Text>?????????.</Text>
                      </Col>
                    )
                  }
                  
                  <Col style={{ marginLeft : 'auto'}}>
                    <input 
                      type="file"
                      style={{ display : 'none' }}
                      webkitdirectory={rootDir}
                      directory={rootDir}
                      onChange={handleSourceDirChange}
                      ref={srcSelector}
                    />
                    <Button
                    type="primary"
                    onClick={() => srcSelector.current.click()}
                    >
                      ????????????
                    </Button>
                  </Col>
                </Row>
              </Card>
              <span style={{ padding : 5 }} />
            </>
          }
          

          <Card>
            <Row gutter={[4, 4]}>
              <Col>
                <Text type="danger">*</Text>
                <span style={{ padding : 5 }} />
                <Text>????????? : 1000 x 1000 (??????: 10%)</Text>
              </Col>
              <Col style={{ marginLeft : 'auto' }}>
                <Button
                type="primary"
                disabled={ loading || images.length === 0 }
                onClick={handleResize}
                >
                  {
                    loading
                    ? '?????????'
                    : '????????????'
                  }
                </Button>
              </Col>
            </Row>
                
            <span style={{ padding : 10 }} />

            <Row>
                <Row>
                  <Col>
                    <Input addonBefore="??????" value={resizeConfig.width} onChange={handleWidthChange}/>
                  </Col>

                  <span style={{ padding : 10 }} />

                  <Col>
                    <Input addonBefore="??????" value={resizeConfig.height} onChange={handleHeightChange}/>
                  </Col>

                  <span style={{ padding : 10 }} />

                  <Col>
                    <Input addonBefore="??????(%)" value={resizeConfig.pad} onChange={handlePadChanage}/>
                  </Col>
                </Row>

                <span style={{ padding : 10 }} />
              {/* <Col style={{ marginLeft : 'auto' }}>
                  <input 
                    type="file"
                    style={{ display : 'none' }}
                    webkitdirectory={rootDir}
                    directory={rootDir}
                    onChange={handleTargetDirChange}
                    ref={distSelector}
                  />
                  <Button onClick={() => distSelector.current.click()}>?????? ?????? ??????</Button>
              </Col> */}

                
            </Row>

            <span style={{ padding : 10 }} />

            <Row>
              <Col style={{ display : 'flex', flexDirection : 'column' }}>
                <Text style={{ fontSize : '11px', color : '#999' }}>??????????????????</Text>
                <Checkbox 
                  checked={resizeConfig.preserveAspectRatio} 
                  onClick={togglePreserveAspectRatio}
                />
              </Col>
            </Row>

            {/* <Row>
                <Text type="danger">*</Text>
                <span style={{ padding : 5 }} />
                <Text>?????? ???????????? ?????? ????????? ????????? ??????????????? ????????? ?????????. ???????????? ????????? ????????? ???????????? ????????? ??????????????? ???????????????.</Text>
            </Row> */}
          </Card>

          <span style={{ padding : 5 }} />

          <Card>
            <Row gutter={[4, 4]}>
                <Text>
                { 
                  images.length > 0
                  ? (
                    <> 
                      <Text>??? </Text>
                      <Text type="danger">{ images.length.toLocaleString() }</Text>
                      <Text> ?????? ???????????? ?????????????????????. ???????????? ????????? ?????? "????????????" ????????? ???????????????.</Text>
                    </>
                  )
                  : (
                    `???????????? ????????????.`
                  )
                }
              </Text>
            </Row>

            <Divider />

            {
              images.length > 0 &&
              images.map(img =>
                <div>
                  { img }
                </div>
              )
            }

          </Card>
        </Content>
    </Layout>
  )
}

export default App
