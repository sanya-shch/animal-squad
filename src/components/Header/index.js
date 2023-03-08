import React from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";

const Header = observer(() => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/");
  };

  return (
    <div className="header">
      <h1 onClick={handleClick}>ANIMAL SQUAD</h1>
      <div className="progress_bar_wrapper">
        <div
          id="progress_bar"
          style={{
            width: `${gameStore.progressBarValue}%`,
          }}
        />
      </div>
    </div>
  );
});

export default Header;
