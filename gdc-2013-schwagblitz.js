"use strict";

window.onload = main;
var canvas;
var ctx;
var dbg;
var elemOut;
var elemTrash
var elemHome;

var g = {
  scale: 4,
  entitySize: 5,
  nodeSpacing: 64,
  logoResolution: 128,
  logoSpace: 5,
  backgroundColor: "rgb(150, 40, 40)",
  carpetColor: "rgb(255, 80, 80)",
  mazeWidth: 10,
  mazeHeight: 10,
  numAttendies: 1001,
  numConnectionsToBreak: 40,
  numNodesToDelete: 15,
  numTrashcans: 20,
  rangeToPlayer: 1,
  rangeToTrashcan: 1,
  keyState: [],
  numFlyersOut: 0,
  numFlyersTrashed: 0,
  numFlyersHome: 0,
  trashcanSize: 10,
  press: [],
  release: [],
};

var nodes = [];
var trashcans = [];
var gridToNodeMap = [];
var entities = [];
var player;
var logos = [];
var logoImages = [];
var logoURLs = [
  "images/AMD-logo1.jpg",
  "images/ARM_logo-728-75.jpg",
  "images/Epic_logoE3_small.jpg",
  "images/Logo-Tapjoy.png",
  "images/Nvidia_logo.png",
  "images/PSN-Logo.jpg",
  "images/Qualcomm-Logo.jpg",
  "images/Unity_3D_logo.png",
  "images/adobe-logo.jpg",
  "images/autodesk_logo.jpg",
  "images/games_logo_big.jpg",
  "images/gdc13_logo.jpg",
  "images/large.jpg",
  "images/mslogo_large_verge_medium_landscape.jpg",
  "images/nintendo_logo.jpg",
  "images/sega logo.gif",
];

var images = [];
var imageURLs = [
  "images/trashcan.png",
];

var rand = function(range) {
  return Math.floor(Math.random() * range);
};

var lerp = function(a, b, v) {
  return a + (b - a) * v;
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

// Nodes just lerp from startPositon to targetNode where
// this,moveTimer += elapsedTime
// lerp = this.moveTimer / this.speed;
// postion = lerp(this.startPostion, this.targetNode.position, lerp)
Entity = function(startNode) {
  if (!startNode) {
    throw 'no start node';
  }
  this.targetNode = startNode;
  this.oldNode = startNode;
  this.color = 'rgb(' + 64 + "," + 64 + "," + (128 + rand(128)) + ")";
  this.flyerColor = 'rgb(' + 64 + "," + (128 + rand(128)) + "," + 64 + ")";
  this.speed = 1 + Math.random() * 0.2;
  this.startX = 0;
  this.startY = 0;
  this.hasFlyer = false;
  this.chooseDestination();
  this.moveTimer = Math.random() * this.speed;
  this.process(0);
};

Entity.prototype.process = function(elapsedTime) {
  // Move
  this.moveTimer += elapsedTime;
  var l = this.moveTimer / this.speed;
  if (l >= 1) {
    this.chooseDestination();
  }

  // Update position
  var l = this.moveTimer / this.speed;
  this.x = lerp(this.startX, this.targetNode.x, l);
  this.y = lerp(this.startY, this.targetNode.y, l);

  // TODO(gman): Optimize by checking only things on same nodes.
  // Check if we touched the player.
  if (player) {
    var dx = this.x - player.x;
    var dy = this.y - player.y;
    if (dx * dx + dy * dy < g.rangeToPlayer * g.rangeToPlayer) {
      this.hasFlyer = true;
      ++g.numFlyersOut;
      elemOut.innerText = g.numFlyersOut.toString();
    }
  }
};

Entity.prototype.draw = function(ctx) {
  ctx.fillStyle = this.hasFlyer ? this.flyerColor : this.color;
  ctx.fillRect(this.x, this.y, g.entitySize, g.entitySize);
};

Entity.prototype.chooseDestination = function() {
  // Choose a new destination.
  var nodes = this.targetNode.connections;
  var nodeNdx = rand(nodes.length);
  var node = nodes[nodeNdx];
  this.oldNode = this.targetNode;
  if (this.hasFlyer && this.oldNode.trashcan) {
    this.hasFlyer = false;
    ++g.numFlyersTrashed;
    elemTrash.innerText = g.numFlyersTrashed.toString();
  }
  this.targetNode = node;
  this.moveTimer = 0;
  this.startX = this.oldNode.x;
  this.startY = this.oldNode.y;
};

var Trashcan = function(node) {
  this.node = node;
  this.x = node.x;
  this.y = node.y;
};

Trashcan.prototype.draw = function(ctx) {
  if (images[0].loaded) {
    ctx.drawImage(images[0].img, this.x, this.y, g.trashcanSize, g.trashcanSize);
  } else {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(this.x, this.y, g.entitySize, g.entitySize);
  }
};

var Player = function(startNode) {
  this.color = "red";
  this.startX = startNode.x;
  this.startY = startNode.y;
  this.targetNode = startNode;
  this.speed = 1;
  this.moveTimer = this.speed;
  this.dir = rand(4);
  this.process(0);
};

Player.prototype.process = function(elapsedTime) {
  // Move
  this.moveTimer += elapsedTime;
  var l = this.moveTimer / this.speed;
  if (l >= 1) {
    this.chooseDestination();
  }

  // Update position
  var l = this.moveTimer / this.speed;
  this.x = lerp(this.startX, this.targetNode.x, l);
  this.y = lerp(this.startY, this.targetNode.y, l);
}

Player.prototype.chooseDestination = function() {
  var dir = this.dir;
  var delta = 0;

  if (g.keyState[37]) { // left
    delta = -1;
  }
  if (g.keyState[39] && g.keyState[39] > g.keyState[37]) {
    delta = 1;
  }

  if (g.press[0]) { // left
    delta = -1
  }
  if (g.press[1] && g.press[1] > g.press[0]) {
    delta = 1;
  }

  var node = this.targetNode;
  var newTarget = undefined;
  var count = 0;
  for (;;) {
    dir = (dir + 4 + delta) % 4;
    newTarget = node.byDir[dir];
    if (newTarget) {
      break;
    }
    if (delta == 0) {
      delta = rand(2) ? -1 : 1;
    }
    ++count;
    if (count == 5) {
      console.log(this);
      throw 'WTF!';
    }
  }

  this.dir = dir;
  this.targetNode = newTarget;
  this.moveTimer = 0;
  this.startX = node.x;
  this.startY = node.y;
};

Player.prototype.draw = function(ctx) {
  ctx.fillStyle = this.color;
  ctx.fillRect(this.x, this.y, g.entitySize, g.entitySize);
};

var Logo = function(x, y, width, height, img) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.img = img;
  this.color = 'rgb(' + (128 + rand(128)) + "," + (128 + rand(128))  + "," + (128 + rand(128)) + ")";
};

Logo.prototype.draw = function(ctx) {
  if (this.img.loaded) {
    ctx.drawImage(this.img.img, this.x, this.y, this.width, this.height);
  } else {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
};

Node = function(x, y) {
  this.x = x;
  this.y = y;
  this.connections = [];
  this.byDir = [];
  this.trashcan = undefined;
};

// dir:
//  0: up/north
//  1: right/east
//  2: down/south
//  3: left/west
Node.prototype.getConnectionInDirection = function(dir) {
  for (var ii = 0; ii < this.connections.length; ++ii) {
  }
};

Node.prototype.addTrashcan = function(trashcan) {
  this.trashcan = trashcan;
};

Node.prototype.addConnection = function(node) {
  this.connections.push(node);

  // add byDir connection. Assumes there are 4 directions.
  var dir = -1;
  if (node.x > this.x) {
    dir = 1;
  } else if (node.x < this.x) {
    dir = 3;
  } else if (node.y > this.y) {
    dir = 2;
  } else if (node.y < this.y) {
    dir = 0;
  }
  this.byDir[dir] = node;
};

Node.prototype.removeConnection = function(other) {
  var ndx = this.connections.indexOf(other);
  if (ndx < 0) {
    throw 'wat?'
  }
  this.connections.splice(ndx, 1);

  // remove byDir connection. Assumes there are 4 directions.
  for (var ii = 0; ii < 4; ++ii) {
    if (this.byDir[ii] == other) {
      this.byDir[ii] = undefined;
    }
  }
};

function connectNodes(node, x, y) {
  var row = gridToNodeMap[y];
  if (row) {
    var dst = row[x];
    if (dst) {
      node.addConnection(dst.node);
    }
  }
}

function makeMaze() {
  // make the nodes
  for (var yy = 0; yy < g.mazeHeight; ++yy) {
    var gridRow = [];
    gridToNodeMap.push(gridRow);
    for (var xx = 0; xx < g.mazeWidth; ++xx) {
      var node = new Node(xx * g.nodeSpacing, yy * g.nodeSpacing);
      gridRow.push({node:node});
      nodes.push(node);
    }
  }

  // delete some random nodes
  for (var ii = 0; ii < g.numNodesToDelete; ++ii) {
    var x = rand(g.mazeWidth);
    var y = rand(g.mazeHeight);
    var ndx = nodes.indexOf(gridToNodeMap[y][x]);
    nodes.splice(ndx, 1);
    gridToNodeMap[y][x] = undefined;
  }

  // connect the nodes
  for (var yy = 0; yy < g.mazeHeight; ++yy) {
    for (var xx = 0; xx < g.mazeWidth; ++xx) {
      var node = gridToNodeMap[yy][xx];
      if (node) {
        connectNodes(node.node, xx, yy - 1);
        connectNodes(node.node, xx, yy + 1);
        connectNodes(node.node, xx - 1, yy);
        connectNodes(node.node, xx + 1, yy);
      }
    }
  }

  for (var ii = 0; ii < g.numConnectionsToBreak; ++ii) {
    var node = nodes[rand(nodes.length)];
    if (node.connections.length > 3) {
      var otherNdx = rand(node.connections.length);
      var other = node.connections[otherNdx];
      if (other.connections.length > 3) {
        node.removeConnection(other);
        other.removeConnection(node);
      }
    }
  }

  // Remove nodes with no connections
  var keepNodes = [];
  nodes.forEach(function(node) {
    if (node.connections.length) {
      keepNodes.push(node);
    }
  });
  nodes = keepNodes;

  // Add trashcans
  var trashcanNodes = [];
  for (var ii = 0; ii < g.numTrashcans; ++ii) {
    var node = nodes[rand(nodes.length)];
    if (trashcanNodes.indexOf(node) < 0) {
      trashcanNodes.push(node);
      var trashcan = new Trashcan(node);
      trashcans.push(trashcan);
      node.addTrashcan(trashcan);
    }
  }

  // Place logos
  for (var yy = 0; yy < g.mazeHeight - 1; ++yy) {
    for (var xx = 0; xx < g.mazeWidth - 1; ++xx) {
      var n = gridToNodeMap[yy][xx];
      if (n && !n.hasLogo) {
        var w = 1;
        var h = 1;
        n.hasLogo = true;
        if (xx < g.mazeWidth - 2 &&
            !gridToNodeMap[yy][xx + 1]) {
          ++w;
          gridToNodeMap[yy][xx + 1] = {
            hasLogo: true,
          };
        }
        if (yy < g.mazeHeight - 2 &&
            !gridToNodeMap[yy + 1][xx]) {
          ++h;
          gridToNodeMap[yy + 1][xx] = {
            hasLogo: true,
          };
        }
        var x = xx * g.nodeSpacing + g.entitySize;
        var y = yy * g.nodeSpacing + g.entitySize;
        var width  = g.nodeSpacing * w - g.entitySize;
        var height = g.nodeSpacing * h - g.entitySize;
        var img = logoImages[rand(logoImages.length)];
        logos.push(new Logo(x, y, width, height, img));
      }
    }
  }
}

function addAttendies() {
  // add entities
  for (var ii = 0; ii < g.numAttendies; ++ii) {
    var node = nodes[rand(nodes.length)];
    var entity = new Entity(node);
    entities.push(entity);
  }
}

function loadImages() {
  var loadArray = function(urls, dest, onLoadFn) {
    urls.forEach(function(url) {
      var img = new Image();
      var logo = {
        img: img,
        loaded: false,
      };
      logo.img.src = url;
      logo.img.onload = function() {
        logo.loaded = true;
        onLoadFn(logo);
      };
      dest.push(logo);
    });
  };
  loadArray(logoURLs, logoImages, function(logo) {
    var img = logo.img;
    var c = document.createElement("canvas");
    c.width = g.logoResolution;
    c.height = g.logoResolution;
    var ctx = c.getContext("2d");
    ctx.fillStyle = g.carpetColor;
    ctx.fillRect(0, 0, g.logoResolution, g.logoResolution);
    ctx.fillStyle = "white";
    var logoSize = g.logoResolution - g.logoSpace * 2;
    ctx.fillRect(g.logoSpace, g.logoSpace, logoSize, logoSize);
    var logoMax = Math.max(img.width, img.height);
    var w = logoSize * img.width / logoMax;
    var h = logoSize * img.height / logoMax;
    var x = g.logoSpace + (logoSize - w) * 0.5;
    var y = g.logoSpace + (logoSize - h) * 0.5;
    ctx.drawImage(img, x, y, w, h);
    logo.img = c;
  });

  loadArray(imageURLs, images, function(obj) {
    var img = obj.img;
  });
}

function resizeCanvas() {
  if (canvas.width != canvas.clientWidth ||
      canvas.height != canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
}

function main() {
  elemOut = document.getElementById("flyersout");
  elemTrash = document.getElementById("flyerstrashed");
  elemHome = document.getElementById("flyershome");
  canvas = document.getElementById("c");
  ctx = canvas.getContext("2d");

  loadImages();
  makeMaze();
  addAttendies();

  player = new Player(nodes[rand(nodes.length)]);

  var requestId;
  var clock = 0;
  var then = (new Date()).getTime() * 0.001;
  function process() {
    var now = (new Date()).getTime() * 0.001;
    var elapsedTime = now - then;
    elapsedTime = Math.min(elapsedTime, 0.1);  // not faster than 10fps
    then = now;
    clock += elapsedTime;

    resizeCanvas();

    // Superfulous comment.
    player.process(elapsedTime);

    // Process entities
    entities.forEach(function(entity) {
      entity.process(elapsedTime);
    })

    // Clear
    ctx.fillStyle = g.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Scale and Scroll
    ctx.save();
    var xoff = ctx.canvas.width / g.scale / 2;
    var yoff = ctx.canvas.height / g.scale / 2;
    ctx.scale(g.scale, g.scale);
    ctx.translate(-player.x + xoff, -player.y + yoff);

    // Draw Booths
    logos.forEach(function(logo) {
      logo.draw(ctx);
    });

    // Draw Entities
    entities.forEach(function(entity) {
      entity.draw(ctx);
    });

    // Draw Trashcans
    trashcans.forEach(function(trashcan) {
      trashcan.draw(ctx);
    });

    // Draw Player
    player.draw(ctx);
    ctx.restore();

    requestId = requestAnimFrame(process);
  }
  process();

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
  };

  var keyup = function(event) {
    g.keyState[event.keyCode] = 0;
  };

  var touch = document.getElementById("touch");

  var pointerup = function(event) {
    var pointers = event.getPointerList();
    if (!pointers) {
      g.release.forEach(function(n) {
        if (n !== undefined) {
          g.press[n] = 0;
        }
      });
      g.release = [];
    } else{
      pointers.forEach(function(pointer) {
        var id = pointer.identifier || 0;
        var n = g.release[id];
        g.press[n] = 0;
        g.release[id] = undefined;
      });
    }
  };

  var pointerdown = function(event) {
    var pointers = event.getPointerList();
    pointers.forEach(function(pointer) {
      var id = pointer.identifier || 0;
      var n = (pointer.clientX < touch.clientWidth * 0.5) ? 0 : 1;
      g.press[n] = clock;
      g.release[id] = n;
    });
  };

  window.addEventListener('keydown', keydown, false);
  window.addEventListener('keyup', keyup, false);
  window.addEventListener('focus', resume, false);
  window.addEventListener('blur', pause, false);
  touch.addEventListener('pointerdown', pointerdown);
  touch.addEventListener('pointerup', pointerup);
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

