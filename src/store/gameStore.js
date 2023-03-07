import { makeAutoObservable } from "mobx";

import { mapsList } from "../data/index";

class GameStore {
  gameBoard = {};
  gameBoardSize = 10;
  cells = {};
  fence = {};
  cows = {};
  board = [];

  constructor() {
    makeAutoObservable(this);
  }

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
  };
}

export default new GameStore();
