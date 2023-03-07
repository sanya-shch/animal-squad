import React from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";

const HomePage = observer(() => {
  const navigate = useNavigate();

  const handleClickStart = () => {
    gameStore.setGameData();
    navigate("/game");
  };

  return (
    <div>
      HomePage
      <button onClick={handleClickStart}>start</button>
    </div>
  );
});

export default HomePage;
