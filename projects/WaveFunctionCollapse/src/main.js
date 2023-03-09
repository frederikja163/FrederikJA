/// <reference path="./p5.d/p5.global-mode.d.ts" />
var fileElem = document.querySelector("#file");
var collumnsElem = document.querySelector("#collumns");
var rowsElem = document.querySelector("#rows");
var templateElem = document.querySelector("#tiles :nth-child(1)");
var tilesElem = document.querySelector("#tiles");
var tiles = [];
var grid = [];
var collumns = -1;
var rows = -1;
function setup() {
    createCanvas(1280, 720);
    noLoop();
    noSmooth();
    clearGrid();
}
function generate() {
    function generateRec() {
        var iter = 100;
        while (next() && iter-- > 0)
            ;
        drawGrid();
        if (next()) {
            requestAnimationFrame(generateRec);
        }
    }
    requestAnimationFrame(generateRec);
}
function drawGrid() {
    background(0x2e);
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < collumns; x++) {
            grid[y][x].draw();
        }
    }
}
function next() {
    // Find all cells with the lowest entropy;
    var lowestEntropyCells = [];
    var lowestEntropy = Infinity;
    for (var i = 0; i < grid.length; i++) {
        for (var j = 0; j < grid[i].length; j++) {
            var entropy = grid[i][j].possibleTiles.length;
            if (entropy <= 1) {
                continue;
            }
            if (entropy < lowestEntropy) {
                lowestEntropyCells.splice(0);
                lowestEntropy = entropy;
            }
            if (entropy === lowestEntropy) {
                lowestEntropyCells.push(grid[i][j]);
            }
        }
    }
    // Pick cell and tile at random.
    var randomCell = lowestEntropyCells[floor(random(0, lowestEntropyCells.length))];
    if (randomCell) {
        var randomTile = randomCell.possibleTiles[floor(random(0, randomCell.possibleTiles.length))];
        // Replace possible tiles within cell.
        randomCell.possibleTiles.splice(0);
        randomCell.possibleTiles.push(randomTile);
        // Eliminate possibilities around chosen cell.
        randomCell.eliminatePossibilitiesAround();
        return true;
    }
    return false;
}
function clearGrid() {
    background(0x2e);
    rows = parseInt(rowsElem.value);
    collumns = parseInt(collumnsElem.value);
    for (var i = 0; i < rows; i++) {
        line(0, height / rows * i, width, height / rows * i);
    }
    for (var i = 0; i < collumns; i++) {
        line(width / collumns * i, 0, width / collumns * i, height);
    }
    grid.splice(0);
    for (var y = 0; y < rows; y++) {
        grid[y] = [];
        for (var x = 0; x < collumns; x++) {
            grid[y][x] = new Cell(x, y);
        }
    }
}
function createMutations() {
    for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        tile.rotate(function (t) { return t.rotate(function (t) { return t.rotate(removeDuplicates); }); });
    }
}
function clearTiles() {
    for (var i = tiles.length - 1; i >= 0; i--) {
        tiles[i].remove();
    }
}
function removeDuplicates() {
    for (var i = 0; i < tiles.length; i++) {
        for (var j = i + 1; j < tiles.length; j++) {
            if (tiles[i].top === tiles[j].top &&
                tiles[i].right === tiles[j].right &&
                tiles[i].bottom === tiles[j].bottom &&
                tiles[i].left === tiles[j].left) {
                tiles[j--].remove();
            }
        }
    }
}
fileElem.addEventListener("change", function () {
    // Preview the file and create new tile.
    var blob = fileElem.files.item(0);
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
        var tile = new Tile(reader.result);
        clearGrid();
    };
});
var Cell = /** @class */ (function () {
    function Cell(x, y) {
        this.x = x;
        this.y = y;
        this.possibleTiles = tiles.slice();
    }
    Cell.prototype.draw = function () {
        if (this.possibleTiles.length == 1) {
            image(this.possibleTiles[0].image, width / collumns * this.x, height / rows * this.y, width / collumns, height / rows);
        }
        else {
            text(this.possibleTiles.length.toString(), width / collumns * (this.x + 0.5), height / rows * (this.y + 0.5));
        }
    };
    Cell.prototype.getRelativeCellXY = function (x, y) {
        var yCoord = this.y + y;
        var xCoord = this.x + x;
        if (yCoord < 0 || yCoord >= rows || xCoord < 0 || xCoord >= collumns) {
            return undefined;
        }
        return grid[yCoord][xCoord];
    };
    Cell.prototype.getRelativeCellDirection = function (direction) {
        switch (direction) {
            case Direction.top:
                return this.getRelativeCellXY(0, -1);
            case Direction.right:
                return this.getRelativeCellXY(+1, 0);
            case Direction.bottom:
                return this.getRelativeCellXY(0, +1);
            case Direction.left:
                return this.getRelativeCellXY(-1, 0);
        }
    };
    Cell.prototype.eliminatePossibilitiesAround = function () {
        var top = this.getRelativeCellDirection(Direction.top);
        if (top) {
            top.eliminatePossibilities();
        }
        var right = this.getRelativeCellDirection(Direction.right);
        if (right) {
            right.eliminatePossibilities();
        }
        var bottom = this.getRelativeCellDirection(Direction.bottom);
        if (bottom) {
            bottom.eliminatePossibilities();
        }
        var left = this.getRelativeCellDirection(Direction.left);
        if (left) {
            left.eliminatePossibilities();
        }
    };
    Cell.prototype.eliminatePossibilities = function () {
        if (this.possibleTiles.length <= 1) {
            return;
        }
        // Stop short-circuiting the boolean expression by first caching the results.
        var top = this.eliminatePossibileTilesDirectional(Direction.top);
        var right = this.eliminatePossibileTilesDirectional(Direction.right);
        var bottom = this.eliminatePossibileTilesDirectional(Direction.bottom);
        var left = this.eliminatePossibileTilesDirectional(Direction.left);
        if (top || right || bottom || left) {
            this.eliminatePossibilitiesAround();
        }
    };
    Cell.prototype.eliminatePossibileTilesDirectional = function (direction) {
        var anyEliminated = false;
        var localDirection = direction;
        var oppositeDirection = Cell.getOppositeDirection(direction);
        var cell = this.getRelativeCellDirection(localDirection);
        if (!cell)
            return;
        for (var i = this.possibleTiles.length - 1; i >= 0; i--) {
            var localEdge = this.possibleTiles[i][Direction[localDirection]];
            var j = void 0;
            for (j = 0; j < cell.possibleTiles.length; j++) {
                var tileEdge = cell.possibleTiles[j][Direction[oppositeDirection]];
                if (localEdge === tileEdge) {
                    break;
                }
            }
            // If no tiles were found.
            if (j === cell.possibleTiles.length) {
                this.possibleTiles.splice(i, 1);
                anyEliminated = true;
            }
        }
        return anyEliminated;
    };
    Cell.getOppositeDirection = function (direction) {
        switch (direction) {
            case Direction.top:
                return Direction.bottom;
            case Direction.right:
                return Direction.left;
            case Direction.bottom:
                return Direction.top;
            case Direction.left:
                return Direction.right;
        }
    };
    return Cell;
}());
var Direction;
(function (Direction) {
    Direction[Direction["top"] = 0] = "top";
    Direction[Direction["right"] = 1] = "right";
    Direction[Direction["bottom"] = 2] = "bottom";
    Direction[Direction["left"] = 3] = "left";
})(Direction || (Direction = {}));
;
var Tile = /** @class */ (function () {
    function Tile(base64) {
        var _this = this;
        this.base64 = base64;
        this.image = loadImage(this.base64);
        tiles.push(this);
        this.parentElem = templateElem.cloneNode(true);
        tilesElem.appendChild(this.parentElem);
        this.removeElem = this.parentElem.querySelector(".remove");
        this.removeElem.onclick = function () { return _this.remove(); };
        this.previewElem = this.parentElem.querySelector(".preview");
        this.topElem = this.parentElem.querySelector(".top");
        this.rightElem = this.parentElem.querySelector(".right");
        this.bottomElem = this.parentElem.querySelector(".bottom");
        this.leftElem = this.parentElem.querySelector(".left");
        this.previewElem.src = this.base64;
    }
    Object.defineProperty(Tile.prototype, "top", {
        get: function () {
            return this.topElem.value;
        },
        set: function (value) {
            this.topElem.value = value;
            clearGrid();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tile.prototype, "right", {
        get: function () {
            return this.rightElem.value;
        },
        set: function (value) {
            this.rightElem.value = value;
            clearGrid();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tile.prototype, "bottom", {
        get: function () {
            return this.bottomElem.value;
        },
        set: function (value) {
            this.bottomElem.value = value;
            clearGrid();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tile.prototype, "left", {
        get: function () {
            return this.leftElem.value;
        },
        set: function (value) {
            this.leftElem.value = value;
            clearGrid();
        },
        enumerable: false,
        configurable: true
    });
    Tile.prototype.rotate = function (callback) {
        var _this = this;
        rotateBase64(this.base64, 90, function (base64) {
            var tile = new Tile(base64);
            tile.top = _this.left.split('').reverse().join('');
            ;
            tile.right = _this.top;
            tile.bottom = _this.right.split('').reverse().join('');
            tile.left = _this.bottom;
            if (callback) {
                callback(tile);
            }
        });
    };
    Tile.prototype.remove = function () {
        tiles.splice(tiles.indexOf(this), 1);
        this.parentElem.remove();
    };
    return Tile;
}());
// Src: https://gist.github.com/Zyndoras/6897abdf53adbedf02564808aaab94db
function rotateBase64(srcBase64, degrees, callback) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var image = new Image();
    image.onload = function () {
        canvas.width = degrees % 180 === 0 ? image.width : image.height;
        canvas.height = degrees % 180 === 0 ? image.height : image.width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(degrees * Math.PI / 180);
        ctx.drawImage(image, image.width / -2, image.height / -2);
        callback(canvas.toDataURL());
    };
    image.src = srcBase64;
}
