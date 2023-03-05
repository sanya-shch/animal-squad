import { makeAutoObservable } from "mobx";

class GameStore {
  gameBoard = {};
  gameBoardSize = 15;

  constructor() {
    makeAutoObservable(this);
  }

  startGame = () => {
    const points = {};

    this.gameBoard = {};

    for (let i = 0, pointIdx = 0; i < 15; i++) {
      const row = [];

      for (let y = 0; y < 15; y++) {
        row.push(`point-${pointIdx}`);

        points[`point-${pointIdx}`] = { number: 0 };
        pointIdx++;
      }

      this.gameBoard[i] = row;
    }
  };
}

export default new GameStore();
