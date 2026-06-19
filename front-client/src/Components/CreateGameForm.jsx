import { useState } from "react";

function CreateGameForm({ onGameCreated }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [developerName, setDeveloperName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const newGame = {
      title,
      genre,
      description,
      developerName,
    };

    const response = await fetch("http://localhost:5004/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newGame),
    });

    const createdGame = await response.json();

    onGameCreated(createdGame);

    setTitle("");
    setGenre("");
    setDescription("");
    setDeveloperName("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add New Game</h2>

      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <input placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />

      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <input placeholder="Developer Name" value={developerName} onChange={(e) => setDeveloperName(e.target.value)} />

      <button type="submit">Add Game</button>
    </form>
  );
}

export default CreateGameForm;