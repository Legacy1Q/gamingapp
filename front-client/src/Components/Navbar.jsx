import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "../styles/Navbar.css";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

const Navbar = () => {
  const { user, loading, sessionError, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  async function handleLogout() {
    setLoggingOut(true);
    setError("");
    try { await logout(); }
    catch (failure) { setError(failure.message); }
    finally { setLoggingOut(false); }
  }
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

        <div className="navbar-account">
          {loading ? <span role="status">Checking session…</span> : user ? <>
            <Link to="/profile" style={{ color: "#6fffe9", overflowWrap: "anywhere" }}>{user.displayName || "Your profile"}</Link>
            <button type="button" className="login" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Logout"}</button>
          </> : <Link to="/login" className="login">Login</Link>}
          {(error || sessionError) && <p className="account-error" role="alert">{error || sessionError}</p>}
        </div>
      </div>

      <nav className="nav-links" aria-label="Main navigation">
        <NavLink to="/games" className={getLinkClass}>Games</NavLink>
        <NavLink to="/leaderboard" className={getLinkClass}>Leaderboard</NavLink>
        <NavLink to="/community" className={getLinkClass}>Community</NavLink>
        <NavLink to="/about" className={getLinkClass}>About</NavLink>
        <NavLink to="/contact" className={getLinkClass}>Contact</NavLink>
      </nav>
    </header>
  );
};

export default Navbar;
