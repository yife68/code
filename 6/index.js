let rowId = 0;

class Row {
  blockCount = 0;
  blocks = [];
  result = null;

  get length() {
    return this.blocks.length;
  }

  constructor(blockCount) {
    this.blockCount = blockCount;
    this.init();
    this.id = rowId++;
  }

  random() {
    const min = 0;
    const max = this.blockCount;
    return parseInt(Math.floor(Math.random() * (max - min + 1) + min), 10);
  }

  getBlock(index) {
    return this.blocks[index];
  }

  each(callback) {
    for (let j = 0; j < this.length; j++) {
      callback(this.getBlock(j), j, this);
    }
  }

  isRowPass() {
    return this.blocks.every((block) => !block.isBlack)
      ? this.result === null
      : this.result === true;
  }

  setResult(result) {
    this.result = result;
  }

  getCanClick() {
    return this.result === null;
  }

  init() {
    const randomNum = this.random();

    for (let i = 0; i < this.blockCount; i++) {
      const isCurrentBlockBlack = i === randomNum;
      this.blocks.push(new Block(isCurrentBlockBlack, this));
    }
  }
}

class Block {
  isBlack = false;
  isBeenClick = false;
  row = null;
  blockDOM;

  // 解决掘金循环引用报错阻塞代码问题
  toJSON() {
    return "{}";
  }

  constructor(isBlack = false, row) {
    this.isBlack = isBlack;
    this.row = row;
  }

  generateBlockDOM() {
    if (this.blockDOM) return this.blockDOM;
    const div = document.createElement("div");

    div.classList.add("block", this.isBlack ? "isBlack" : "isWhite");

    div.block = this;
    this.blockDOM = div;
    div.setAttribute("data-row-id", this.row.id);
    return div;
  }

  changeColor() {
    this.blockDOM.style.setProperty("background", "#aaa");
  }

  hasCorrectClick() {
    return (
      (this.isBlack && this.isBeenClick) || (!this.isBlack && !this.isBeenClick)
    );
  }

  click() {
    if (this.row.getCanClick()) {
      this.changeColor();
      this.isBeenClick = true;
      this.row.setResult(this.hasCorrectClick());
    }
  }

  error() {
    this.blockDOM.classList.add("error");
  }
}

class Game {
  /** 游戏渲染总行数 */
  rowCount = 6;
  /** 每一行有多少块 */
  rowblockCount = 4;

  /** 游戏状态 */
  status = "stoped"; // stoped gaming paused
  /** 游戏级别 */
  level = 1;
  /** 游戏进程记录，走过了多少行 */
  rowStepsCount = 0;
  /** 当前分数 */
  score = 0;
  /** 游戏进行中的时长 */
  duration = 0;
  /** 游戏结束的标记，游戏结束后，点击开始游戏即重新开始 */
  gameover = false;

  mode = {
    /** 无尽模式：不会结束游戏，但踩到白块会扣分，初始级别5级 */
    endlessMode: false,
    /** 急速模式：初始级别10级，游戏级别上升速度为原来的3倍，且分数加成为原来的2倍 */
    fastMode: false
  };

  /* 0 白块，1 黑块，存储游戏从开始到结束的数据 */
  gameData = [];
  /* 获取需要渲染的数据 */
  get renderData() {
    return this.gameData.slice(0, this.rowCount);
  }

  /** 游戏动画帧id */
  animationId = -1;
  /** 游戏向下移动动画偏移量记录 */
  translateY = 0;

  /** 游戏容器 dom */
  blocksContainer = document.querySelector("#blocks");
  /** 行高 */
  rowHeight;

  constructor() {
    this.init();
    this.initEventsOnce();
  }

  init() {
    this.initGameInfo();
    this.initRowHeight();
    this.initBlocksPosition();
    this.generateGameData(2);
    this.renderBlocksToDOM();
    this.setBlockContainerTranslateY(0);
    this.setMaskVisibleAndGameOverStatus(false);
    this.triggerGameRule(false);
  }

  initEventsOnce() {
    this.initActionButtonsEvent();
    this.initBlocksEventProxy();
  }

  initGameInfo() {
    this.gameData = [];
    this.score = 0;
    this.rowStepsCount = 0;
    this.level = 1;
    this.duration = 0;
    this.translateY = 0;
    this.status = "stoped";
    this.renderGameInfo();
  }

  initActionButtonsEvent() {
    const rule = document.querySelector("#rule");
    const fastModeBtn = document.querySelector("#fast");
    const endlessModeBtn = document.querySelector("#endless");
    const startGameBtn = document.querySelector("#start");
    const restartGameBtn = document.querySelector("#restart");
    const pauseGameBtn = document.querySelector("#pause");
    const continueGameBtn = document.querySelector("#continue");
    const stopGameBtn = document.querySelector("#stop");
    const levelBtn = document.querySelector("#level");

    rule.addEventListener("click", this.triggerGameRule.bind(this));
    fastModeBtn.addEventListener(
      "click",
      this.modeChange.bind(this, "fastMode")
    );
    endlessModeBtn.addEventListener(
      "click",
      this.modeChange.bind(this, "endlessMode")
    );
    startGameBtn.addEventListener("click", this.startGame.bind(this));
    restartGameBtn.addEventListener("click", this.restartGame.bind(this));
    pauseGameBtn.addEventListener("click", this.pauseGame.bind(this));
    continueGameBtn.addEventListener("click", this.continueGame.bind(this));
    stopGameBtn.addEventListener("click", this.stopGame.bind(this));
    levelBtn.addEventListener("click", () => this.level++);
  }

  eventHandler(e) {
    if ([...e.target.classList].includes("block")) {
      if (this.status !== "gaming") return;

      const { block } = e.target;
      const isBeenClick = block.isBeenClick;

      block.click();

      if (block.hasCorrectClick()) {
        if (!isBeenClick && block.isBlack) this.scoreCalc();
      } else {
        if (this.mode.endlessMode && !block.isBlack && !isBeenClick) {
          this.score -= this.level;
          return;
        }
        this.gameOver(block);
      }

      this.renderGameInfo();
    }
  }

  initRowHeight() {
    this.rowHeight =
      parseInt(window.getComputedStyle(this.blocksContainer).height, 10) / 5;
  }

  initBlocksEventProxy() {
    this.blocksContainer.addEventListener(
      "mousedown",
      this.eventHandler.bind(this)
    );
    this.blocksContainer.addEventListener(
      "touchstart",
      this.eventHandler.bind(this)
    );
  }

  initBlocksPosition() {
    this.blocksContainer.style.position = "relative";
    this.blocksContainer.style.top = -1 * this.rowHeight + "px";
  }

  generateGameData(count) {
    for (let i = 0; i < count; i++) {
      this.gameData.unshift(new Row(this.rowblockCount));
    }
  }

  renderBlocksToDOM() {
    const fragment = document.createDocumentFragment();
    const renderData = this.renderData;

    for (let i = 0; i < renderData.length; i++) {
      const row = renderData[i];

      row.each((block) => {
        fragment.appendChild(block.generateBlockDOM());
      });
    }

    this.blocksContainer.innerHTML = "";
    this.blocksContainer.appendChild(fragment);
  }

  setBlockContainerTranslateY(nextTranslateY) {
    this.blocksContainer.style.setProperty(
      "transform",
      `translateY(${nextTranslateY}px)`
    );
  }

  triggerPausedBtnActive() {
    const pauseBtn = document.querySelector("#pause");

    if (this.status === "paused") {
      pauseBtn.style.setProperty("color", "orange");
    } else {
      pauseBtn.style.setProperty("color", null);
    }
  }

  triggerGameModeBtnActive() {
    Object.keys(this.mode).forEach((key) => {
      const button = document.querySelector(`#${key.replace("Mode", "")}`);

      if (this.mode[key]) {
        button.style.setProperty("color", "orange");
      } else {
        button.style.setProperty("color", null);
      }
    });
  }

  levelCalc() {
    const oldLevel = this.level;

    this.rowStepsCount++;

    const levelBasic = this.mode.fastMode ? 3 : 1;
    const nextLevel = Math.ceil(this.rowStepsCount / (100 / levelBasic));

    if (nextLevel > this.level) {
      this.level = nextLevel;
    }

    if (this.level !== oldLevel) this.score += 100;
  }

  scoreCalc() {
    const scoreBasic = this.mode.fastMode ? 2 : 1;

    this.score += this.level * scoreBasic;
  }

  renderGameInfo() {
    const score = document.querySelector("#score");
    const level = document.querySelector("#level");
    const time = document.querySelector("#time");

    const duration = parseInt(this.duration / 1000, 10);

    score.innerHTML = this.score;
    level.innerHTML = this.level;

    if (this.startTimeStamp) {
      time.innerHTML = `${`${parseInt(duration / 60, 10)}`.padStart(2, 0)}:${`${
        duration % 60
      }`.padStart(2, 0)}`;
    } else {
      time.innerHTML = "00:00";
    }

    this.triggerPausedBtnActive();
    this.triggerGameModeBtnActive();
  }

  render() {
    const step = this.rowHeight / (200 / (1 + this.level * 0.1));
    let nextTranslateY = this.translateY + step;
    this.translateY = nextTranslateY;

    if (nextTranslateY >= this.rowHeight) {
      nextTranslateY = this.translateY = 0;

      if (this.checkGameOver()) {
        return;
      }
      this.generateGameData(1);
      this.renderBlocksToDOM();
      this.levelCalc();
    }

    this.setBlockContainerTranslateY(nextTranslateY);
    this.renderGameInfo();

    const keyFrame = 5;
    this.duration += keyFrame;
    this.animationId = setTimeout(() => {
      this.render();
    }, keyFrame);
  }

  setMaskVisibleAndGameOverStatus(visible) {
    const mask = document.querySelector("#mask");
    mask.classList[visible ? "remove" : "add"]("hide");

    this.gameover = visible;
  }

  checkGameOver() {
    if (this.mode.endlessMode) return false;
    const renderData = this.renderData;
    const lastRow = renderData[renderData.length - 1];
    const penultimateRow = renderData[renderData.length - 2];

    if (
      this.gameData.length === this.rowCount - 1
        ? !lastRow.isRowPass()
        : this.gameData.length >= this.rowCount
        ? !penultimateRow.isRowPass()
        : false
    ) {
      this.gameOver();
      return true;
    }
    return false;
  }

  gameOver(block) {
    if (this.mode.endlessMode) return;
    console.error("结束");
    this.setMaskVisibleAndGameOverStatus(true);
    if (!block) {
      this.setBlockContainerTranslateY(0);
    }
    this.status = "stoped";
    window.clearTimeout(this.animationId);

    let lastErrorBlock = block;
    !block &&
      this.renderData.reverse().forEach((row) => {
        !lastErrorBlock &&
          (lastErrorBlock = row.blocks.findLast((block) => {
            return !block.hasCorrectClick();
          }));
      });

    setTimeout(() => {
      lastErrorBlock && lastErrorBlock.error();
    }, 500);
  }

  modeChange(mode) {
    const modeKeys = Object.keys(this.mode);
    if (this.status !== "stoped") return;

    modeKeys.forEach((key) => key !== mode && (this.mode[key] = false));
    this.mode[mode] = !this.mode[mode];

    this.renderGameInfo();
  }

  triggerGameRule(visible) {
    const ruleinfo = document.querySelector("#ruleinfo");
    const currentVisible = ![...ruleinfo.classList].includes("hide");
    const nextVisible =
      typeof visible === "boolean" ? visible : !currentVisible;

    if (nextVisible && this.status === "gaming") {
      this.pauseGame();
    } else if (!nextVisible && this.status === "paused") {
      this.continueGame();
    }

    ruleinfo.classList[nextVisible ? "remove" : "add"]("hide");
  }

  restartGame() {
    this.stopGame();
    this.startGame();
  }

  resetGame() {
    this.stopGame();
  }

  stopGame(init = true) {
    this.pauseGame();

    init && this.init();
    this.status = "stoped";
  }

  pauseGame() {
    if (this.status !== "gaming") return;
    window.clearTimeout(this.animationId);
    this.status = "paused";
    this.triggerPausedBtnActive();
  }

  continueGame() {
    if (this.status !== "paused") return;
    this.render();
    this.status = "gaming";
  }

  startGame() {
    if (this.gameover) return this.restartGame();
    if (this.status !== "stoped") return;

    if (this.mode.endlessMode) this.level = 5;
    else if (this.mode.fastMode) {
      this.level = 10;
      this.rowStepsCount = 300;
    }

    this.triggerGameRule(false);
    this.pauseGame();
    this.render();
    this.status = "gaming";
    this.startTimeStamp = Date.now();
  }
}

new Game();
