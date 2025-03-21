import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GameRoom from '.components/GameRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameRoom />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
      </Routes>
    </Router>
  );
}
export default App;