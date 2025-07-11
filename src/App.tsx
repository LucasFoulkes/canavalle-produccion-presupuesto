import { useState } from 'react'
import { Card, CardContent } from './components/ui/card.tsx'
import { Button } from './components/ui/button.tsx'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Card >
      <CardContent>
        <h1>Hello world!</h1>
        <Button
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </Button>
      </CardContent>
    </Card>
  )
}

export default App
