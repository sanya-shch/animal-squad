import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";
import * as fenceItems from "../../assets/fenceItems";
import * as cowList from "../../assets/cowList";
import cowIcon from "../../assets/cow.png";
import colorCowIcon from "../../assets/cow_color.png";
import Header from "../../components/Header";

const GamePage = observer(() => {
  useEffect(() => {
    let timer = null;
    let timerClick = null;

    if (gameStore.ongoingGame) {
      timer = setInterval(() => {
        if (gameStore.progressBarValue + 2 >= 100) {
          gameStore.setOngoingGame(false);
          gameStore.setProgressBarValue(100);
        } else {
          gameStore.setProgressBarValue(gameStore.progressBarValue + 2);
        }
      }, 200);
    } else {
      clearInterval(timer);
    }

    const mousedownFunc = () => {
      if (gameStore.ongoingGame) {
        timerClick = setInterval(() => {
          gameStore.setCheckedCowsList();
        }, 200);
      }
    };
    const mouseupFunc = () => {
      gameStore.setOngoingGame(false);

      clearInterval(timerClick);
    };

    document.addEventListener("mousedown", mousedownFunc);
    document.addEventListener("mouseup", mouseupFunc);

    return () => {
      clearInterval(timer);
      clearInterval(timerClick);
      document.removeEventListener("mousedown", mousedownFunc);
      document.removeEventListener("mouseup", mouseupFunc);
    };
  }, [gameStore.ongoingGame]);

  return (
    <div className="game_page">
      <Header />
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
        {gameStore.cowsList.map((item) => (
          <div
            key={`cow-item-${item.id}`}
            className={`cow_item ${item.checked ? "checked" : ""}`}
            style={{
              bottom: `${Math.round(5 + Math.random() * (100 - 5))}px`,
              left: `calc(${Math.round(
                15 + Math.random() * (85 - 15)
              )}% - 5vw)`,
            }}
          >
            <img
              src={item.type === "normal" ? cowIcon : colorCowIcon}
              alt="cow"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default GamePage;
