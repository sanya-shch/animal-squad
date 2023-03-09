export class Sprite {
  constructor({
    position,
    imageSrc,
    width,
    height,
    imageWidth,
    imageHeight,
    step = 5,
    moveDirectionX = true,
    moveDirectionY = true,
  }) {
    this.position = position;
    this.width = width;
    this.height = height;
    this.image = new Image();
    this.image.src = imageSrc;
    this.moveDirectionX = moveDirectionX;
    this.moveDirectionY = moveDirectionY;
    this.step = step;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
  }

  draw(ctx) {
    if (this.moveDirectionX) {
      if (this.position.x + this.imageWidth + this.step < this.width) {
        this.position.x += this.step;
      } else {
        this.moveDirectionX = false;
      }
    } else {
      if (this.position.x - this.step >= 0) {
        this.position.x -= this.step;
      } else {
        this.moveDirectionX = true;
      }
    }

    if (this.moveDirectionY) {
      if (this.position.y + this.imageHeight * 0.85 + this.step < this.height) {
        this.position.y += this.step;
      } else {
        this.moveDirectionY = false;
      }
    } else {
      if (this.position.y - this.step >= 0) {
        this.position.y -= this.step;
      } else {
        this.moveDirectionY = true;
      }
    }

    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.imageWidth,
      this.imageHeight
    );
  }

  update(ctx) {
    this.draw(ctx);
  }
}
