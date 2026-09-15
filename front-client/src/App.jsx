import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Home from "./Components/Home";
import GamesList from "./Connector/GamesList";
import Footer from "./Components/Footer";
import ZDasher from "./Components/ZDasher";
import About from "./Components/About";
import Contact from "./Components/Contact";
import AuthProvider from "./auth/AuthProvider";
import AccountForm from "./Components/AccountForm";
import PasswordRecovery from "./Components/PasswordRecovery";
import Community from "./Components/Community";
import ForumReports from "./Components/ForumReports";
import Profile from "./Components/Profile";
import Leaderboard from "./Components/Leaderboard";

const App = () => {
  return (
    <Router>
      <AuthProvider>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
            <Route path="/reset-password" element={<PasswordRecovery key="reset" reset />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<AccountForm key="login" />} />
            <Route path="/register" element={<AccountForm key="register" register />} />
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<GamesList />} />
            <Route path="/games/z-dasher" element={<ZDasher />} />
            <Route path="/community" element={<Community key="topics" />} />
            <Route path="/community/reports" element={<ForumReports />} />
            <Route path="/community/:id" element={<Community key="discussion" />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/support" element={<Navigate to="/contact" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
