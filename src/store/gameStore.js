import { makeAutoObservable } from "mobx";

import { mapsList } from "../data/index";
import { shuffle } from "../helpers";
import React from "react";

class GameStore {
  gameBoard = {};
  gameBoardSize = 10;
  cells = {};
  fence = {};
  cows = {};
  board = [];
  cowNumber = 0;
  colorCowNumber = 0;
  cowsList = [];

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

    this.cowNumber = mapsList[mapIndex].cowNumber;
    this.colorCowNumber = Math.round(
      Math.random() * (mapsList[mapIndex].colorCowNumber + 1)
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
  };
}

export default new GameStore();
