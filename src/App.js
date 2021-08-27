import React, { useEffect, useState } from 'react'

import 'antd/dist/antd.css'

import { Card, Divider, Layout, Row, Col, Button, message } from 'antd'
import SideMenu from './components/SideMenu'
import Text from 'antd/lib/typography/Text'

const { ipcRenderer } = window.require("electron")

const { Header, Content, Footer } = Layout

function App() {
  const [ images, setImages ] = useState([])
  const [ source, setSource ] = useState(null)
  const [ loading, setLoading ] = useState(false)

  const readImage = dir =>{
    ipcRenderer.send('explorer', { type : 'read-image', dir })
  }

  const changeSrcDir = async (name) =>{
    setSource(name)
  }

  const handleResize = async () =>{
    setLoading(true)

    const payload = images.map(img => [ source, img ].join('/')) 

    ipcRenderer.send('image-handler', { type : 'resize', images : payload })
  }

  useEffect(() =>{
    ipcRenderer.on('set-image', (event, payload) =>{
      setImages(payload)
    })

    ipcRenderer.on('resize-complete', (event, payload) =>{
      message.success(`${images.length}개의 상품이 리사이징이 완료되었어요`)
      setLoading(false)
    })
  }, [])

  return (
      <Layout style={{ width : 1260, height : 660 }}>
        <SideMenu readImage={readImage} ipcRenderer={ipcRenderer} changeSrcDir={changeSrcDir}/>
        <Content style={{ margin: '24px 16px 0' }}>

          {
            source &&
            <>
              <Card>
                <Row >
                  <Text>현재 디렉토리는</Text>
                  <Text type="success" style={{ padding : '0 5px', fontWeight : '700' }}>{ source }</Text>
                  <Text>입니다.</Text>
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
                <Text>리사이즈 이미지 : 1000x1000 으로 리사이징 합니다.</Text>
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
                images.map((img) =>{
                  return (
                    <Row><span style={{ padding : 5 }}/>{ img }</Row>
                  )
                })
              }
          </Card>
        </Content>
    </Layout>
  )
}

export default App
