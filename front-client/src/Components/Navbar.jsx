import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "../styles/Navbar.css";

const Navbar = () => {
  const getLinkClass = ({ isActive }) => (isActive ? "active-link" : undefined);

  return (
    <header className="navbar">
      <div className="top-row">
        <Link to="/" className="logo">GameHub</Link>

        <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
          <input type="text" placeholder="Search games..." aria-label="Search games" />
          <button type="submit" className="search-button" aria-label="Search">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </form>

        <Link to="/login" className="login">Login</Link>
      </div>

      <nav className="nav-links" aria-label="Main navigation">
        <NavLink to="/games" className={getLinkClass}>Games</NavLink>
        <NavLink to="/community" className={getLinkClass}>Community</NavLink>
        <NavLink to="/about" className={getLinkClass}>About</NavLink>
        <NavLink to="/support" className={getLinkClass}>Support</NavLink>
      </nav>
    </header>
  );
};

export default Navbar;
