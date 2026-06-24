import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Home from "./Components/Home";
import GamesList from "./Connector/GamesList";
import Footer from "./Components/Footer";

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<GamesList />} />
            <Route path="/community" element={<Home />} />
            <Route path="/about" element={<Home />} />
            <Route path="/support" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
