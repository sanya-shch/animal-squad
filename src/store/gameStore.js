import { makeAutoObservable } from "mobx";

import { mapsList } from "../data/index";
import { shuffle } from "../helpers";

class GameStore {
  gameBoard = {};
  gameBoardSize = 10;
  cells = {};
  fence = {};
  forest = {};
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
  progressBarValue = 5;
  score = 0;
  ongoingGame = false;
  showInfoBlock = false;
  infoBlockText = "";

  constructor() {
    makeAutoObservable(this);
  }

  finishGame = () => {
    this.ongoingGame = false;

    const coloredCows = this.cowsList.filter(
      (item) => item.type === "colored" && item.checked
    );
    const normalCows = this.cowsList.filter(
      (item) => item.type !== "colored" && item.checked
    );

    const coloredCowsNumber = coloredCows.reduce(
      (acc, item) => {
        if (item.img === "01" || item.img === "02") {
          acc.big.push(item.img);
        } else {
          acc.small.push(item.img);
        }
        return acc;
      },
      { big: [], small: [] }
    );

    if (coloredCows.length === 0 && normalCows.length === 0) {
      this.infoBlockText = "No animal in the pen";
      this.showInfoBlock = true;

      this.score = 0;
    } else if (
      coloredCowsNumber.big.length +
        coloredCowsNumber.small.length +
        normalCows.length >
      this.board.flat().length
    ) {
      this.infoBlockText = "There are too many animals in the pen";
      this.showInfoBlock = true;

      this.score = 0;
    } else {
      this.infoBlockText = "Animals in a pen";
      this.showInfoBlock = true;

      this.score +=
        coloredCowsNumber.small.length * 2 +
        coloredCowsNumber.big.length +
        normalCows.length;

      if (coloredCowsNumber.big.length) {
        for (let i = 0; i < coloredCowsNumber.big.length; i++) {
          this.cows[this.board[i][i % 2 ? 0 : this.board[i].length - 2]] = {
            id: coloredCowsNumber.big[i],
            size: "big",
          };

          this.board[i][i % 2 ? 0 : this.board[i].length - 2] = "-";
          this.board[i][i % 2 ? 1 : this.board[i].length - 1] = "-";
        }
      }

      this.board.forEach((row) => {
        row.forEach((item) => {
          if (item !== "-") {
            if (coloredCowsNumber.small.length) {
              this.cows[item] = { id: coloredCowsNumber.small.pop() };
            } else if (normalCows.length) {
              this.cows[item] = { id: normalCows.pop().img };
            }
          }
        });
      });

      this.cowsList = [];
    }
  };

  setProgressBarValue = (value) => (this.progressBarValue = value);

  setCheckedCowsList = () => {
    const index = this.cowsList.findIndex((item) => !item.checked);

    if (index !== -1) {
      this.cowsList[index].checked = true;
    } else {
      this.finishGame();
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

    this.showInfoBlock = false;
    this.infoBlockText = "";

    this.cows = {};

    this.fence = mapsList[mapIndex].fence;
    this.board = mapsList[mapIndex].board;
    this.forest = mapsList[mapIndex].forest;

    this.cowNumber = mapsList[mapIndex].cowNumber;
    this.colorCowNumber = Math.round(
      Math.random() * mapsList[mapIndex].colorCowNumber
    );

    this.cowsList = shuffle([
      ...Array.from({ length: this.cowNumber }, (_, i) => ({
        type: "normal",
        id: i,
        img: Math.round(1 + Math.random() * (56 - 1)),
        bottom: Math.round(5 + Math.random() * (100 - 5)),
        left: Math.round(15 + Math.random() * (85 - 15)),
      })),
      ...Array.from({ length: this.colorCowNumber }, (_, i) => ({
        type: "colored",
        id: this.cowNumber + i,
        img: `0${Math.round(1 + Math.random() * (4 - 1))}`,
        bottom: Math.round(5 + Math.random() * (100 - 5)),
        left: Math.round(15 + Math.random() * (85 - 15)),
      })),
    ]).sort((a, b) => b.bottom - a.bottom);

    this.progressBarValue = 5;

    this.ongoingGame = true;
  };
}

export default new GameStore();
