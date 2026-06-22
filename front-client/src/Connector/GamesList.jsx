import { useEffect, useState } from "react";
<<<<<<< HEAD

import GameCard from "../Components/GameCard";
=======
import CreateGameForm from "../Components/CreateGameForm";
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee

function GamesList() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5004/games")
<<<<<<< HEAD
      .then((response) => response.json())
      .then((data) => setGames(data))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);


  return (
    <div>
      <h1>Game Library</h1>

      {games.map((game) => (
        <GameCard key={game.id} game={game} />
=======
      .then(response => response.json())
      .then(data => setGames(data))
      .catch(error => console.error("Error fetching games:", error));
  }, []);

  return (
    <div>
      <h1>Games</h1>

      <CreateGameForm onGameCreated={handleGameCreated} />

      {games.map(game => (
        <div key={game.id}>
          <h2>{game.title}</h2>
          <p>{game.genre}</p>
          <p>{game.description}</p>
          <p>Developer: {game.developerName}</p>
        </div>
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
      ))}
    </div>
  );
}

<<<<<<< HEAD
=======
function handleGameCreated(newGame) {
    setGames(prevGames => [...prevGames, newGame]);
}

>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
export default GamesList;