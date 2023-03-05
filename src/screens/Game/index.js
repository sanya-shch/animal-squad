import React from "react";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";

const GamePage = observer(() => {
  return (
    <div className="game_page">
      <div
        className="game_board"
        style={{
          "--size": gameStore.gameBoardSize,
        }}
      >
        {Object.values(gameStore.gameBoard).map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="row">
            {row.map((cell, cellIndex) => (
              <div key={`cell-${cellIndex}`} className="cell">
                *
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default GamePage;
