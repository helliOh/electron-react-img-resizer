import React, { useEffect, useState, useRef } from 'react'

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
  Upload
} from 'antd'
import SideMenu from './components/SideMenu'
import Text from 'antd/lib/typography/Text'

const { ipcRenderer } = window.require("electron")

const { Header, Content, Footer } = Layout

function App() {
  const [ images, setImages ] = useState([])
  const [ rootDir, setRootDir ] = useState(null)
  const [ source, setSource ] = useState(null)
  const [ dist, setDist ] = useState(null)
  const [ loading, setLoading ] = useState(false)
  const [ resizeConfig, setResizeConfig ] = useState({
    width : 1000,
    height: 1000
  })

  const dirSelector = useRef()

  const readImage = dir =>{
    ipcRenderer.send('explorer', { type : 'read-image', dir })
  }

  const changeSrcDir = async (name) =>{
    setSource(name)
  }


  const handleResize = async () =>{
    setLoading(true)

    const payload = images.map(img => img.replace(/\\/, '/').split('/')[1] )

    ipcRenderer.send('image-handler', { type : 'resize', images : payload, source, dist, config : { ...resizeConfig } })
  }

  const handleOpen = (target) =>{
    ipcRenderer.send('explorer', { type : 'open', target : source })
  }

  const handleTargetDirChange = (e) =>{
    const sampleFile = e.target.files[0]
    
    if(sampleFile){
      const targetPath = sampleFile.path.replace(sampleFile.name, '')

      setDist(targetPath)
    }
  }

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

  useEffect(() =>{
    ipcRenderer.on('set-image', (event, payload) =>{
      setImages(payload)
    })

    ipcRenderer.on('resize-complete', (event, payload) =>{
      message.success(`${payload.count}개의 상품이 리사이징이 완료되었어요`)
      setLoading(false)
    })
  }, [])

  return (
      <Layout style={{ width : 1260, height : 660 }}>
        <SideMenu 
        readImage={readImage} 
        ipcRenderer={ipcRenderer} 
        changeSrcDir={changeSrcDir} 
        rootDir={rootDir}
        setRootDir={setRootDir}
        />
        <Content style={{ margin: '24px 16px 0' }}>

          {
            source &&
            <>
              <Card>
                <Row>
                  <Col>
                    <Text>현재 디렉토리는</Text>
                    <Text type="success" style={{ padding : '0 5px', fontWeight : '700' }}>{ source }</Text>
                    <Text>입니다.</Text>
                  </Col>
                  <Col style={{ marginLeft : 'auto'}}>
                    <Button
                    type="primary"
                    onClick={handleOpen}
                    >
                      폴더열기
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
                <Text>기본값 : 1000 x 1000</Text>
              </Col>
              <Col style={{ marginLeft : 'auto' }}>
                <Button
                type="primary"
                disabled={ loading || images.length === 0 }
                onClick={handleResize}
                >
                  {
                    loading
                    ? '작업중'
                    : '리사이징'
                  }
                </Button>
              </Col>
            </Row>
                
            <span style={{ padding : 10 }} />

            <Row gutter={[4, 4]}>
              <Col>
                <Row>
                  <Col>
                    <Input addonBefore="너비" value={resizeConfig.width} onChange={handleWidthChange}/>
                  </Col>

                  <span style={{ padding : 10 }} />

                  <Col>
                    <Input addonBefore="높이" value={resizeConfig.height} onChange={handleHeightChange}/>
                  </Col>
                </Row>
              </Col>
              <Col style={{ marginLeft : 'auto' }}>
                  <input 
                    type="file"
                    style={{ display : 'none' }}
                    webkitdirectory={rootDir}
                    directory={rootDir}
                    onChange={handleTargetDirChange}
                    ref={dirSelector}
                  />
                  <Button onClick={() => dirSelector.current.click()}>저장 폴더 설정</Button>
              </Col>
            </Row>

            <span style={{ padding : 10 }} />

            <Row>
                <Text type="danger">*</Text>
                <span style={{ padding : 5 }} />
                <Text>저장 폴더에는 최소 하나의 파일을 저장폴더에 포함해 주세요. 지정하지 않거나 파일이 포함되지 않으면 임시폴더를 생성합니다.</Text>
            </Row>
          </Card>

          <span style={{ padding : 5 }} />

          <Card>
            <Row gutter={[4, 4]}>
                <Text>
                { 
                  images.length > 0
                  ? (
                    <> 
                      <Text>총 </Text>
                      <Text type="danger">{ images.length.toLocaleString() }</Text>
                      <Text> 개의 이미지가 발견되었습니다. 리사이즈 하려면 상단 "리사이징" 버튼을 눌러주세요.</Text>
                    </>
                  )
                  : (
                    `이미지가 없습니다.`
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
