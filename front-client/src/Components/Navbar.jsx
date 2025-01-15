import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";

const Navbar = () => {
  return (
    <header className="navbar">
      {/* Top Row: Logo, Search Bar, Login */}
      <div className="top-row">
        <Link to="/" className="logo">Logo</Link>
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
          <button type="button" className="search-button">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </div>
        <Link to="/login" className="login">Login</Link>
      </div>

      {/* Navigation Links */}
      <nav className="nav-links">
        <NavLink to="/games" activeClassName="active-link">Games</NavLink>
        <NavLink to="/community" activeClassName="active-link">Community</NavLink>
        <NavLink to="/about" activeClassName="active-link">About</NavLink>
        <NavLink to="/support" activeClassName="active-link">Support</NavLink>
      </nav>
    </header>
  );
};

export default Navbar;
