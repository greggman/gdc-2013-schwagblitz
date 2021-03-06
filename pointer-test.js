"use strict";

window.onload = main;
var dbg;

var g = {
  keyState: [],
  press: [],
};

var inherit = function(subClass, superClass) {
  /**
   * TmpClass.
   * @ignore
   * @constructor
   */
  var TmpClass = function() { };
  TmpClass.prototype = superClass.prototype;
  subClass.prototype = new TmpClass();
};

function main() {
  var out = document.getElementById("out");
  var requestId;
  var clock = 0;
  var then = (new Date()).getTime() * 0.001;
  function process() {
    var now = (new Date()).getTime() * 0.001;
    var elapsedTime = now - then;
    elapsedTime = Math.min(elapsedTime, 0.1);  // not faster than 10fps
    then = now;
    clock += elapsedTime;
    requestId = requestAnimFrame(process);
  }
  process();

  var displayInputState = function() {
    var delta = 0;
    var path = "";

    if (g.keyState[37]) { // left
      path += "1";
      delta = -1;
    }
    if (g.keyState[39] && g.keyState[39] > g.keyState[37]) {
      path += "2";
      delta = 1;
    }

    if (g.press[0]) { // left
      path += "3";
      delta = -1
    }
    if (g.press[1] && g.press[1] > g.press[0]) {
      path += "4";
      delta = 1;
    }

    var dir = (delta > 0) ? "right" : ((delta < 0) ? "left" : "straight");
    out.innerText =
        "dir: " + dir +
        "\ng.keyState[37]: " + g.keyState[37] +
        "\ng.keyState[39]: " + g.keyState[39] +
        "\ng.press[0]:" + g.press[0] +
        "\ng.press[1]:" + g.press[1] +
        "\npath: " + path +
        "";
  };
  displayInputState();

  var clearKeys = function() {
    g.keyState = [];
  };

  var resume = function() {
    if (requestId === undefined) {
      process();
    }
  };

  var pause = function() {
    if (requestId !== undefined) {
      cancelRequestAnimFrame(requestId);
      requestId = undefined;
    }
  };

  var setVisibilityChangeFn = function(onchange) {
    var hidden = "hidden"
    var prefixes = ["", "moz", "webkit", "ms", "op"];
    for (var ii = 0; ii < prefixes.length; ++ii) {
      var prefix = prefixes[ii];
      if ((prefix + hidden) in document) {
        document.addEventListener(prefix + "visibilitychange", onchange);
      }
      hidden = "Hidden";
    }
  };

  var keyCodeToDirection = function(keyCode) {
    switch (keyCode) {
    case 40: // down
      return 2;
    case 37: // left
      return 3;
    case 38: // up
      return 0;
    case 39: // right
      return 1;
    }
    return -1;
  };

  var keydown = function(event) {
    g.keyState[event.keyCode] = clock;
    displayInputState();
  };

  var keyup = function(event) {
    g.keyState[event.keyCode] = 0;
    displayInputState();
  };

  var touch = document.getElementById("touch");

  var handleTouch = function(down, dir) {
    return function(event) {
      g.press[dir] = down ? clock : 0;
      displayInputState();
    };
  };

  var preventDefault = function(event) {
    event.preventDefault();
  };

  window.addEventListener('keydown', keydown, false);
  window.addEventListener('keyup', keyup, false);
  window.addEventListener('focus', resume, false);
  window.addEventListener('blur', pause, false);
  ["touchleft", "touchright"].forEach(function(id, index) {
    var touch = document.getElementById(id);
    touch.addEventListener('pointerdown', handleTouch(true, index));
    touch.addEventListener('pointerup', handleTouch(false, index));
    touch.addEventListener('pointermove', preventDefault);
  });
  setVisibilityChangeFn(function(event) {
    if (window.hidden) {
      pause();
    } else {
      resume();
    }
  });
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
this.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           return window.setTimeout(callback, 1000/60);
         };
})();

/**
 * Provides cancelRequestAnimationFrame in a cross browser way.
 */
this.cancelRequestAnimFrame = (function() {
  return window.cancelCancelRequestAnimationFrame ||
         window.webkitCancelRequestAnimationFrame ||
         window.mozCancelRequestAnimationFrame ||
         window.oCancelRequestAnimationFrame ||
         window.msCancelRequestAnimationFrame ||
         window.clearTimeout;
})();

