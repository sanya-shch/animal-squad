import React, { forwardRef, useEffect } from "react";
import { observer } from "mobx-react-lite";

const Canvas = observer(
  forwardRef(({ draw, ...props }, canvasRef) => {
    useEffect(() => {
      if (!canvasRef) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.fillStyle = "#41ba62";

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let animationFrameId;

      const render = () => {
        draw(ctx);

        animationFrameId = window.requestAnimationFrame(render);
      };
      render();

      return () => {
        window.cancelAnimationFrame(animationFrameId);
      };
    }, [draw, canvasRef]);

    return <canvas ref={canvasRef} {...props} />;
  })
);

export default Canvas;
