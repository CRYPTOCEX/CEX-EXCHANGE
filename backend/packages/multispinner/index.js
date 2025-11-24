"use strict";

//----------------------------------------------------------
// Modules
//----------------------------------------------------------
const Emitter = require("events").EventEmitter;
const chalk = require("chalk");
const clone = require("lodash.clonedeep");
const merge = require("lodash.merge");
const os = require("os");

// Local
const Spinners = require("./lib/spinners");
const defaultProps = require("./lib/constants").defaultProps;
const states = require("./lib/constants").states;
const validOpts = require("./lib/validOpts");
const errs = require("./lib/errs").index;

module.exports = class Multispinner extends Emitter {
  constructor(spinners, opts) {
    super(spinners, opts);

    // clone defaults
    let props = clone(defaultProps);

    // validate and merge opts
    validOpts(opts);
    merge(props, opts);

    // bind props
    Object.keys(props).map((prop) => {
      this[prop] = props[prop];
    });

    // overwrite frames in case opts.frames.length < default
    if (opts && opts.frames) this.frames = opts.frames;

    // compute remaining props
    this.frameCount = this.frames.length;
    this.indentStr = " ".repeat(this.indent);

    this.logHeader();
    this.spinners = this.initializeSpinners(spinners);
    this.timers = {};
    this.isRunning = false;
    this.lastCompletionTime = Date.now();
    this.durationColumnWidth = this.calculateDurationColumnWidth();

    if (this.autoStart) this.start();
  }

  logHeader() {
    console.log(chalk.yellow("   Duration    Status    Task"));
  }

  initializeSpinners(spinners) {
    const now = Date.now();
    return Object.entries(spinners).reduce((acc, [key, text]) => {
      acc[key] = {
        text,
        state: states.incomplete,
        startTime: now,
        currentFrameIndex: 0,
      };
      return acc;
    }, {});
  }

  start() {
    this.isRunning = true;
    Object.keys(this.spinners).forEach((key) => this.startSpinnerLoop(key));
  }

  startSpinnerLoop(spinnerKey) {
    const loop = () => {
      if (
        !this.isRunning ||
        this.spinners[spinnerKey].state !== states.incomplete
      ) {
        clearTimeout(this.timers[spinnerKey]);
        return;
      }
      this.updateSpinner(spinnerKey);
      this.spinners[spinnerKey].currentFrameIndex =
        (this.spinners[spinnerKey].currentFrameIndex + 1) % this.frameCount;
      this.timers[spinnerKey] = setTimeout(loop, this.interval);
    };
    loop();
  }

  updateSpinner(spinnerKey) {
    const spinner = this.spinners[spinnerKey];
    let duration = spinner.endTime
      ? spinner.endTime - this.lastCompletionTime
      : 0;
    let paddedDuration = `${duration} ms`.padStart(
      this.durationColumnWidth,
      " "
    );

    if (spinner.state === states.incomplete) {
      spinner.current = chalk[this.color[states.incomplete] || "white"](
        [
          "  ",
          this.indentStr,
          this.frames[spinner.currentFrameIndex],
          " ",
          this.preText,
          " ",
          spinner.text,
        ].join("")
      );
    } else {
      spinner.current = chalk[this.color[spinner.state]](
        [
          "   ",
          paddedDuration,
          "    ",
          this.indentStr,
          this.symbol[spinner.state],
          "       ",
          spinner.text,
        ].join("")
      );
    }
    this.updateDisplay();

    if (spinner.endTime) {
      this.lastCompletionTime = spinner.endTime;
    }
  }

  calculateDurationColumnWidth() {
    const maxExpectedDuration = 99999;
    return `${maxExpectedDuration} ms`.length;
  }

  updateDisplay() {
    this.update(
      Object.keys(this.spinners)
        .map((spinner) => {
          return this.spinners[spinner].current;
        })
        .join(os.EOL)
    );
  }

  complete(spinnerKey, state) {
    // throw if state is invalid
    if (!states.hasOwnProperty(state)) errs.invalidState(state);

    this.spinners[spinnerKey].state = state;
    this.spinners[spinnerKey].endTime = Date.now();
    this.updateSpinner(spinnerKey);
    this.checkCompletion();
  }

  checkCompletion() {
    if (this.allCompleted() && this.isRunning) {
      this.isRunning = false;

      this.stopAllSpinners();

      // clear if directed
      if (this.clear) this.update.clear();

      // call logUpdate.done to reset its prevLineCount
      this.update.done();

      // emit completion events
      this.emit("done");
      if (this.allSuccess()) {
        this.emit("success");
      } else {
        this.anyErrors().map((s) => this.emit("err", s));
      }
    }
  }

  stopAllSpinners() {
    Object.keys(this.timers).forEach((timerKey) => {
      clearTimeout(this.timers[timerKey]);
    });
  }

  /**
   * @method allCompleted
   * @desc Check if all spinners have been completed.
   * @returns {bool} - true if all spinners are complete
   */
  allCompleted() {
    return Object.keys(this.spinners).every((spinner) => {
      return this.spinners[spinner].state !== states.incomplete;
    });
  }

  /**
   * @method allSuccess
   * @desc Check if all spinners are in success state.
   * @returns {bool} - true if all spinners are in success state
   */
  allSuccess() {
    return Object.keys(this.spinners).every((spinner) => {
      return this.spinners[spinner].state === states.success;
    });
  }

  /**
   * @method anyErrors
   * @returns {string[]} - array of all spinner names in error state
   */
  anyErrors() {
    return Object.keys(this.spinners).reduce((accum, spinner) => {
      if (this.spinners[spinner].state === states.error) {
        accum.push(spinner);
      }
      return accum;
    }, []);
  }

  /**
   * @method success
   * @desc Complete spinner by changing its state to success.
   * @param {string} spinner - spinner to complete
   * @returns {undefined}
   */
  success(spinner) {
    this.complete(spinner, states.success);
  }

  /**
   * @method error
   * @desc Complete spinner by changing its state to error.
   * @param {string} spinner - spinner to complete
   * @returns {undefined}
   */
  error(spinner) {
    this.complete(spinner, states.error);
  }
};
