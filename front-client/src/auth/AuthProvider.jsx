import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContext";
import { getCurrentUser, submitAccountAction } from "./api";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    const version = ++generation.current;
    getCurrentUser().then((account) => {
      if (active && version === generation.current) setUser(account);
    }).catch((error) => {
      if (active) setSessionError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function login(credentials) {
    ++generation.current;
    await submitAccountAction("login", credentials);
    const account = await getCurrentUser();
    if (!account) throw new Error("Your login session could not be verified. Please try again.");
    setUser(account);
    setSessionError("");
  }

  async function logout() {
    ++generation.current;
    await submitAccountAction("logout");
    setUser(null);
    setSessionError("");
  }

  async function saveProfile(displayName) {
    const version = ++generation.current;
    await submitAccountAction("profile", { displayName });
    const account = await getCurrentUser();
    if (!account) throw new Error("Please log in again to view your profile.");
    if (version === generation.current) setUser(account);
  }

  function clearSession() {
    ++generation.current;
    setUser(null);
    setSessionError("");
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, login, logout, saveProfile, clearSession }}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
