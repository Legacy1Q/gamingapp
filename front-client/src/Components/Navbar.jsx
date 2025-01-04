import './Navbar.css';

const Navbar = () => {
  return (
    <header>
      {/* Top Row: Logo, Search Bar, Login */}
      <div className="top-row">
        <a href="/" className="logo">Logo</a>
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
          <button type="button">Search</button>
        </div>
        <a href="/" className="login">Login</a>
      </div>

      {/* Navigation Links */}
      <nav>
        <a href="/">Games</a>
        <a href="/">Community</a>
        <a href="/">About</a>
        <a href="/">Support</a>
      </nav>
    </header>
  );
};

export default Navbar;
