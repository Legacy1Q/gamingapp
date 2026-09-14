import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <div className="footer">
      <div className="footer-content">
        {/* Left Section: Footer links and mock website name */}
        <div className="footer-links-container">
          <div className="footer-links">
            <Link to="/games">Games</Link>
            <Link to="/community">Community</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-line"></div> {/* Line under the links */}
        </div>


        <div className="mock-website-name">Mike Sims © {new Date().getFullYear()}</div>

        <div className="footer-right">
          <a href="mailto:mdsims2@outlook.com">Email</a>
          <a href="https://www.linkedin.com/in/mikesimsii" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)">LinkedIn</a>
          <a href="https://github.com/Legacy1Q" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)">GitHub</a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
