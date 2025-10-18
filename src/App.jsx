import { useState, Row, Col } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Row>
        <Col>
          <button onClick={() => setCount((count) => count + 1)}>
            count is: {count}
          </button>
        </Col>
      </Row>
    </>
  )
}

export default App
