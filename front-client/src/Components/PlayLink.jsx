import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../auth/AuthContext";

export default function PlayLink({ playUrl, className, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading || !playUrl) {
    return <button className={className} disabled>{loading ? "Checking session…" : "Coming Soon"}</button>;
  }
  if (!user) {
    return <Link className={className} to="/login" state={{ returnTo: location.pathname }}>Log in to play</Link>;
  }
  const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
  let url;
  try { url = new URL(playUrl, backendUrl); } catch { return <span>Game unavailable</span>; }
  if (!["http:", "https:"].includes(url.protocol)) return <span>Game unavailable</span>;
  return <a className={className} href={url.href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

PlayLink.propTypes = { playUrl: PropTypes.string, className: PropTypes.string, children: PropTypes.node.isRequired };
