import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">?</span>
          <span className="brand-text">Wanna Bet?</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Bets
          </Link>
          <Link to="/connections" className={`nav-link ${isActive('/connections') ? 'active' : ''}`}>
            Connections
          </Link>
          <Link to="/wallet" className={`nav-link ${isActive('/wallet') ? 'active' : ''}`}>
            Wallet
          </Link>
        </div>

        <div className="navbar-user">
          <Link to="/profile" className={`user-name-link ${isActive('/profile') ? 'active' : ''}`}>
            {user?.name}
          </Link>
          <button onClick={logout} className="btn btn-outline btn-sm">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
