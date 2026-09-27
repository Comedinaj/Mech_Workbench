import { Routes, Route } from 'react-router-dom'
import Gallery from './screens/Gallery/Gallery.jsx'
import Generator from './screens/Generator/Generator.jsx'
import Workbench from './screens/Workbench/Workbench.jsx'
import ViewerTest from './screens/ViewerTest.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/generate" element={<Generator />} />
      <Route path="/workbench/:cardId" element={<Workbench />} />
      <Route path="/viewer-test" element={<ViewerTest />} />
    </Routes>
  )
}
