import twitterIcon from '../assets/twitter.png';
import instagramIcon from '../assets/instagram.png';
import linkedInIcon from '../assets/linkedin.png';
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
            <a href="#community">Community</a>
            <a href="#about">About</a>
            <a href="#support">Support</a>
          </div>
          <div className="footer-line"></div> {/* Line under the links */}
        </div>

        <div className="mock-website-name">5Head Studios © 2026</div>

        {/* Right Section: Social Media Icons moved to far right */}
        <div className="footer-right">
          <a href="#twitter">
            <img src={twitterIcon} alt="Twitter" />
          </a>
          <a href="#linkedIn">
            <img src={linkedInIcon} alt="LinkedIn" />
          </a>
          <a href="#instagram">
            <img src={instagramIcon} alt="Instagram" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
