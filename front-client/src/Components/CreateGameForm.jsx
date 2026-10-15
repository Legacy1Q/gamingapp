import { apiBaseUrl } from "../config.js";
import { useState } from "react";
import PropTypes from "prop-types";

function CreateGameForm({ onGameCreated }) {
  CreateGameForm.propTypes = {
    onGameCreated: PropTypes.func.isRequired,
  };
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {

    const newGame = {
      title,
      genre,
      description,
      developerName,
    };

    const csrf = await fetch(new URL("/auth/csrf", apiBaseUrl), { credentials: "include", cache: "no-store" });
    if (!csrf.ok) throw new Error("Unable to prepare your request.");
    const { token } = await csrf.json();
    const response = await fetch(new URL("/games", apiBaseUrl), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify(newGame),
    });

    if (!response.ok) throw new Error("Unable to add the game. Check that you are logged in as the owner.");
    const createdGame = await response.json();

    onGameCreated(createdGame);

    setTitle("");
    setGenre("");
    setDescription("");
    setDeveloperName("");
    } catch (failure) {
      setError(failure.message || "Unable to add the game.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add New Game</h2>
      {error && <p role="alert">{error}</p>}

      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <input placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />

      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <input placeholder="Developer Name" value={developerName} onChange={(e) => setDeveloperName(e.target.value)} />

      <button type="submit">Add Game</button>
    </form>
  );
}

export default CreateGameForm;
