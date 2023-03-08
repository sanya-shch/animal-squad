import { makeAutoObservable } from "mobx";

import { mapsList } from "../data/index";
import { shuffle } from "../helpers";

class GameStore {
  gameBoard = {};
  gameBoardSize = 10;
  cells = {};
  fence = {};
  cows = {
    // "cell-22": { id: 1 },
    // "cell-24": { id: 2 },
    // "cell-26": { id: 3 },
    // "cell-42": { id: "01", size: "big" },
    // // "cell-44": { id: 1 },
    // "cell-46": { id: 4 },
    // "cell-62": { id: 5 },
    // "cell-64": { id: "03" },
    // "cell-66": { id: 6 },
  };
  board = [];
  cowNumber = 0;
  colorCowNumber = 0;
  cowsList = [];
  checkedCowsList = [];
  progressBarValue = 5;

  ongoingGame = false;

  constructor() {
    makeAutoObservable(this);
  }

  setProgressBarValue = (value) => (this.progressBarValue = value);

  setCheckedCowsList = () => {
    const index = this.cowsList.findIndex((item) => !item.checked);

    if (index !== -1) {
      this.cowsList[index].checked = true;
    }
  };

  setOngoingGame = (value) => (this.ongoingGame = value);

  setGameBoard = () => {
    this.cells = {};
    this.gameBoard = {};

    for (let i = 0, cellIdx = 0; i < this.gameBoardSize; i++) {
      const row = [];

      for (let y = 0; y < this.gameBoardSize; y++) {
        row.push(`cell-${cellIdx}`);

        this.cells[`cell-${cellIdx}`] = {};
        cellIdx++;
      }

      this.gameBoard[i] = row;
    }
  };

  setGameData = () => {
    this.setGameBoard();

    const mapIndex = 0;

    this.fence = mapsList[mapIndex].fence;
    this.board = mapsList[mapIndex].board;

    this.cowNumber = mapsList[mapIndex].cowNumber;
    this.colorCowNumber = Math.round(
      Math.random() * mapsList[mapIndex].colorCowNumber
    );

    this.cowsList = shuffle([
      ...Array.from({ length: this.cowNumber }, (_, i) => ({
        type: "normal",
        id: i,
        img: Math.round(Math.random() * 57),
      })),
      ...Array.from({ length: this.colorCowNumber }, (_, i) => ({
        type: "colored",
        id: this.cowNumber + i,
        img: `0${Math.round(Math.random() * 4)}`,
      })),
    ]);

    this.progressBarValue = 5;
    this.checkedCowsList = [];

    this.ongoingGame = true;
  };
}

export default new GameStore();
