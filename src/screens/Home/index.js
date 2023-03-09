import React from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";

import "./style.scss";

import gameStore from "../../store/gameStore";
import cowIcon from "../../assets/cow.png";
import Canvas from "../../components/Canvas";
import { Sprite } from "../../classes/Sprite.js";

const HomePage = observer(() => {
  const navigate = useNavigate();

  const canvasRef = React.useRef(null);

  const [images, setImages] = React.useState(null);

  React.useEffect(() => {
    setImages(
      Array.from(
        { length: 10 },
        (_, i) =>
          new Sprite({
            position: {
              x: 100 + Math.round(30 + Math.random() * (200 - 30)),
              y: 100 + Math.round(30 + Math.random() * (200 - 30)),
            },
            imageSrc: cowIcon,
            width: window.innerWidth,
            height: window.innerHeight,
            imageWidth: 100,
            imageHeight: 100,
            step: Math.round(3 + Math.random() * (7 - 3)),
            moveDirectionX: Math.round(Math.random()),
            moveDirectionY: Math.round(Math.random()),
          })
      )
    );
  }, []);

  const handleClickStart = () => {
    gameStore.setGameData();
    navigate("/game");
  };

  const draw = (ctx) => {
    // ctx.fillStyle = "#41ba62";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    images?.forEach(item => item.update(ctx))
  };

  return (
    <div className="home_page">
      <div className="main_title">ANIMAL SQUAD</div>
      <div className="start_btn" onClick={handleClickStart}>Play</div>
      {/*<div className="x">*/}
      {/*  <img className="y" src={cowIcon} alt="cow" />*/}
      {/*</div>*/}
      <Canvas ref={canvasRef} draw={draw} />
    </div>
  );
});

export default HomePage;
