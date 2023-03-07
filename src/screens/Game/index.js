import React from "react";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";
import * as fenceItems from "../../assets/fenceItems";
import * as cowList from "../../assets/cowList";

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
                {/*{cell}*/}
                {gameStore.fence[cell] && (
                  <img
                    src={fenceItems[`fence${gameStore.fence[cell]}`]}
                    className="fence"
                    alt="fence"
                  />
                )}
                {gameStore.cows[cell] && (
                  <img
                    src={cowList[`cow_${gameStore.cows[cell].id}`]}
                    className={`cow ${gameStore.cows[cell].size ?? "normal"}`}
                    alt="cow"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default GamePage;
