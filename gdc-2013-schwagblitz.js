"use strict";

window.onload = main;
var canvas;
var ctx;

var g = {
  nodeSpacing: 50,
  mazeWidth: 10,
  mazeHeight: 10,
  numAttendies: 1001,
  numConnectionsToBreak: 40,
};

var nodes = [];
var gridToNodeMap = [];
var entities = [];

var rand = function(range) {
  return Math.floor(Math.random() * range);
};

var lerp = function(a, b, v) {
  return a + (b - a) * v;
};

// Nodes just lerp from startPositon to targetNode where
// this,moveTimer += elapsedTime
// lerp = this.moveTimer / this.speed;
// postion = lerp(this.startPostion, this.targetNode.position, lerp)
Entity = function(startNode) {
  this.targetNode = startNode;
  this.oldNode = startNode;
  this.color = 'rgb(' + 64 + "," + 64 + "," + (128 + rand(128)) + ")";
  this.speed = 1 + Math.random() * 0.2;
  this.startX = 0;
  this.startY = 0;
  this.haveFlyer = false;
  this.chooseDestination();
  this.moveTimer = Math.random() * this.speed;
};

Entity.prototype.process = function(elapsedTime) {
  this.moveTimer += elapsedTime;
  var lerp = this.moveTimer / this.speed;
  if (lerp >= 1) {
    this.chooseDestination();
  }
};

Entity.prototype.draw = function(ctx) {
  var l = this.moveTimer / this.speed;
  var x = lerp(this.startX, this.targetNode.x, l);
  var y = lerp(this.startY, this.targetNode.y, l);
  ctx.fillStyle = this.color;
  ctx.fillRect(x, y, 5, 5);
};

Entity.prototype.chooseDestination = function() {
  // Choose a new destination.
  var nodes = this.targetNode.connections;
  var node = nodes[rand(nodes.length)];
  this.oldNode = this.targetNode;
  this.targetNode = node;
  this.moveTimer = 0;
  this.startX = this.oldNode.x;
  this.startY = this.oldNode.y;
};

Node = function(x, y) {
  this.x = x;
  this.y = y;
  this.connections = [];
};

Node.prototype.addConnection = function(node) {
  this.connections.push(node);
};

function connectNodes(node, x, y) {
  var row = gridToNodeMap[y];
  if (row) {
    var dst = row[x];
    if (dst) {
      node.addConnection(dst);
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
      gridRow.push(node);
      nodes.push(node);
    }
  }
  // connect the nodes
  for (var yy = 0; yy < g.mazeHeight; ++yy) {
    for (var xx = 0; xx < g.mazeWidth; ++xx) {
      var node = gridToNodeMap[yy][xx];
      connectNodes(node, xx, yy - 1);
      connectNodes(node, xx, yy + 1);
      connectNodes(node, xx - 1, yy);
      connectNodes(node, xx + 1, yy);
    }
  }

  for (var ii = 0; ii < g.numConnectionsToBreak; ++ii) {
    var node = nodes[rand(nodes.length)];
    if (node.connections.length > 1) {
      var otherNdx = rand(node.connections.length);
      var other = node.connections[otherNdx];
      // find our node on the connection
      var ndx = other.connections.indexOf(node);
      if (ndx < 0) {
        throw 'wat?'
      }
      other.connections.splice(ndx, 1);
      node.connections.splice(otherNdx, 1);
    }
  }
}

function main() {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 512;

  makeMaze();

  // add entities
  for (var ii = 0; ii < g.numAttendies; ++ii) {
    var node = nodes[rand(nodes.length)];
    var entity = new Entity(node);
    entities.push(entity);
  }

  var then = (new Date()).getTime() * 0.001;
  function process() {
    var now = (new Date()).getTime() * 0.001;
    var elapsedTime = now - then;
    elapsedTime = Math.min(elapsedTime, 0.1);  // not faster than 10fps
    then = now;

    // Process entities
    entities.forEach(function(entity) {
      entity.process(elapsedTime);
    })

    // Draw Entities
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    entities.forEach(function(entity) {
      entity.draw(ctx);
    })
    ctx.restore();

    requestAnimationFrame(process);
  }
  process();
}


