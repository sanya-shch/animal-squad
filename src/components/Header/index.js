import React from "react";
import { useNavigate } from "react-router-dom";

import "./style.scss";

const Header = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/");
  };

  return (
    <div className="header">
      <h1 onClick={handleClick}>ANIMAL SQUAD</h1>
      <div className="progress_bar_wrapper">
        <div id="progress_bar" />
      </div>
    </div>
  );
};

export default Header;
