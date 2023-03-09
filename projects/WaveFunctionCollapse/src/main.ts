/// <reference path="./p5.d/p5.global-mode.d.ts" />


const fileElem: HTMLInputElement = document.querySelector("#file") as HTMLInputElement;
const collumnsElem: HTMLInputElement = document.querySelector("#collumns") as HTMLInputElement;
const rowsElem: HTMLInputElement = document.querySelector("#rows") as HTMLInputElement;
const templateElem: HTMLElement = document.querySelector("#tiles :nth-child(1)");
const tilesElem: HTMLDivElement = document.querySelector("#tiles") as HTMLDivElement;
const tiles: Tile[] = [];
const grid: Cell[][] = [];
let collumns: number = -1;
let rows: number = -1;

function setup(): any
{
    createCanvas(1280, 720);
    
    noLoop();
    noSmooth();

    clearGrid();
}

function generate(): void
{
    function generateRec(){
        let iter: number = 100;
        while (next() && iter-- > 0);
        drawGrid();
        if (next()){
            requestAnimationFrame(generateRec);
        }
    }
    requestAnimationFrame(generateRec);
}

function drawGrid(): void
{
    background(0x2e);
    for (let y: number = 0; y < rows; y++){
        for (let x: number = 0; x < collumns; x++){
            grid[y][x].draw();
        }
    }
}

function next(): boolean
{
    // Find all cells with the lowest entropy;
    const lowestEntropyCells: Cell[] = [];
    let lowestEntropy: number = Infinity;
    for (let i: number = 0; i < grid.length; i++)
    {
        for (let j: number = 0; j < grid[i].length; j++){
            const entropy: number = grid[i][j].possibleTiles.length;
            
            if (entropy <= 1){
                continue;
            }
            
            if (entropy < lowestEntropy){
                lowestEntropyCells.splice(0);
                lowestEntropy = entropy;
            }
            
            if (entropy === lowestEntropy){
                lowestEntropyCells.push(grid[i][j]);
            }
        }
    }

    // Pick cell and tile at random.
    const randomCell: Cell = lowestEntropyCells[floor(random(0, lowestEntropyCells.length))];
    if (randomCell)
    {
        const randomTile: Tile = randomCell.possibleTiles[floor(random(0, randomCell.possibleTiles.length))];

        // Replace possible tiles within cell.
        randomCell.possibleTiles.splice(0);
        randomCell.possibleTiles.push(randomTile);
        
        // Eliminate possibilities around chosen cell.
        randomCell.eliminatePossibilitiesAround();
        return true;
    }
    return false;
}

function clearGrid(){
    background(0x2e);
    rows = parseInt(rowsElem.value);
    collumns = parseInt(collumnsElem.value);
    for(let i: number = 0; i < rows; i++){
        line(0, height / rows * i, width, height / rows * i);
    }
    for(let i: number = 0; i < collumns; i++){
        line(width / collumns * i, 0, width / collumns * i, height);
    }

    grid.splice(0);
    for (let y: number = 0; y < rows; y++){
        grid[y] = [];
        for (let x: number = 0; x < collumns; x++){
            grid[y][x] = new Cell(x, y);
        }
    }
}

function createMutations(): void
{
    for (let i = 0; i < tiles.length; i++){
        const tile: Tile = tiles[i];
        tile.rotate(t => t.rotate(t => t.rotate(removeDuplicates)));
    }
}

function clearTiles(): void{
    for (let i = tiles.length - 1; i >= 0; i--){
        tiles[i].remove();
    }
}

function removeDuplicates(): void{
    for (let i = 0; i < tiles.length; i++){
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i].top === tiles[j].top &&
                tiles[i].right === tiles[j].right &&
                tiles[i].bottom === tiles[j].bottom &&
                tiles[i].left === tiles[j].left) {

                tiles[j--].remove();
            }
        }
    }
}

fileElem.addEventListener("change", () => {
    // Preview the file and create new tile.
    const blob: Blob = fileElem.files.item(0);
    const reader: FileReader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        const tile: Tile = new Tile(reader.result as string);
        clearGrid();
    }
});

class Cell
{
    private readonly x: number;
    private readonly y: number;
    public readonly possibleTiles: Tile[];

    constructor(x: number, y: number)
    {
        this.x = x;
        this.y = y;
        this.possibleTiles = tiles.slice();
    }

    public draw(): void
    {
        if (this.possibleTiles.length == 1){
            image(this.possibleTiles[0].image, width / collumns * this.x, height / rows * this.y, width / collumns, height / rows);
        }
        else{
            text(this.possibleTiles.length.toString(), width / collumns * (this.x + 0.5), height / rows * (this.y + 0.5));
        }
    }

    private getRelativeCellXY(x, y): Cell | undefined
    {
        const yCoord = this.y + y;
        const xCoord = this.x + x;
        if (yCoord < 0 || yCoord >= rows || xCoord < 0 || xCoord >= collumns){
            return undefined;
        }
        return grid[yCoord][xCoord];
    }

    private getRelativeCellDirection(direction: Direction): Cell | undefined{
        switch (direction){
            case Direction.top:
                return this.getRelativeCellXY(0, -1);
            case Direction.right:
                return this.getRelativeCellXY(+1, 0);
            case Direction.bottom:
                return this.getRelativeCellXY(0, +1);
            case Direction.left:
                return this.getRelativeCellXY(-1, 0);
        }
    }

    public eliminatePossibilitiesAround(): void{
        const top: Cell | undefined = this.getRelativeCellDirection(Direction.top);
        if (top){
            top.eliminatePossibilities();
        }
        const right: Cell | undefined = this.getRelativeCellDirection(Direction.right);
        if (right){
            right.eliminatePossibilities();
        }
        const bottom: Cell | undefined = this.getRelativeCellDirection(Direction.bottom);
        if (bottom){
            bottom.eliminatePossibilities();
        }
        const left: Cell | undefined = this.getRelativeCellDirection(Direction.left);
        if (left){
            left.eliminatePossibilities();
        }
    }

    private eliminatePossibilities(): void
    {
        if (this.possibleTiles.length <= 1){
            return;
        }

        // Stop short-circuiting the boolean expression by first caching the results.
        const top: boolean = this.eliminatePossibileTilesDirectional(Direction.top);
        const right: boolean = this.eliminatePossibileTilesDirectional(Direction.right);
        const bottom: boolean = this.eliminatePossibileTilesDirectional(Direction.bottom);
        const left: boolean = this.eliminatePossibileTilesDirectional(Direction.left);

        if (top || right || bottom || left)
        {
            this.eliminatePossibilitiesAround();
        }
    }

    private eliminatePossibileTilesDirectional(direction: Direction): boolean
    {
        let anyEliminated: boolean = false;
        const localDirection = direction;
        const oppositeDirection = Cell.getOppositeDirection(direction);
        const cell: Cell | undefined = this.getRelativeCellDirection(localDirection);
        if (!cell)
            return;
        
        for (let i: number = this.possibleTiles.length - 1; i >= 0; i--){
            const localEdge = this.possibleTiles[i][Direction[localDirection]];
            
            let j: number;
            for (j = 0; j < cell.possibleTiles.length; j++){
                const tileEdge = cell.possibleTiles[j][Direction[oppositeDirection]];
                if (localEdge === tileEdge){
                    break;
                }
            }

            // If no tiles were found.
            if (j === cell.possibleTiles.length){
                this.possibleTiles.splice(i, 1);
                anyEliminated = true;
            }
        }
        return anyEliminated;
    }

    private static getOppositeDirection(direction: Direction): Direction{
        switch (direction){
            case Direction.top:
                return Direction.bottom;
            case Direction.right:
                return Direction.left;
            case Direction.bottom:
                return Direction.top;
            case Direction.left:
                return Direction.right;
        }
    }
}

enum Direction{top, right, bottom, left};

class Tile
{
    public readonly image: p5.Image;
    public readonly base64: string;
    private readonly topElem: HTMLInputElement;
    private readonly rightElem: HTMLInputElement;
    private readonly bottomElem: HTMLInputElement;
    private readonly leftElem: HTMLInputElement;
    private readonly previewElem: HTMLImageElement;
    private readonly removeElem: HTMLButtonElement;
    private readonly parentElem: HTMLElement
    
    public constructor(base64: string){
        this.base64 = base64;
        this.image = loadImage(this.base64);
        tiles.push(this);

        this.parentElem = templateElem.cloneNode(true) as HTMLElement;
        tilesElem.appendChild(this.parentElem);
        this.removeElem = this.parentElem.querySelector(".remove") as HTMLButtonElement;
        this.removeElem.onclick = () => this.remove();
        this.previewElem = this.parentElem.querySelector(".preview") as HTMLImageElement;
        this.topElem = this.parentElem.querySelector(".top") as HTMLInputElement;
        this.rightElem = this.parentElem.querySelector(".right") as HTMLInputElement;
        this.bottomElem = this.parentElem.querySelector(".bottom") as HTMLInputElement;
        this.leftElem = this.parentElem.querySelector(".left") as HTMLInputElement;
        
        this.previewElem.src = this.base64;
    }

    public get top(): string
    {
        return this.topElem.value;
    }
    public set top(value: string)
    {
        this.topElem.value = value;
        clearGrid();
    }
    public get right(): string
    {
        return this.rightElem.value;
    }
    public set right(value: string)
    {
        this.rightElem.value = value;
        clearGrid();
    }
    public get bottom(): string
    {
        return this.bottomElem.value;
    }
    public set bottom(value: string)
    {
        this.bottomElem.value = value;
        clearGrid();
    }
    public get left(): string
    {
        return this.leftElem.value;
    }
    public set left(value: string)
    {
        this.leftElem.value = value;
        clearGrid();
    }

    public rotate(callback: ((tile: Tile) => void)): void
    {
        rotateBase64(this.base64, 90, (base64) => {
            const tile: Tile = new Tile(base64);
            tile.top = this.left.split('').reverse().join('');;
            tile.right = this.top
            tile.bottom = this.right.split('').reverse().join('');
            tile.left = this.bottom;
            if (callback)
            {
                callback(tile);
            }
        });
    }

    public remove(){
        tiles.splice(tiles.indexOf(this), 1);
        this.parentElem.remove();
    }
}

// Src: https://gist.github.com/Zyndoras/6897abdf53adbedf02564808aaab94db
function rotateBase64(srcBase64, degrees, callback) {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const image  = new Image();
  
    image.onload = function () {
      canvas.width  = degrees % 180 === 0 ? image.width : image.height;
      canvas.height = degrees % 180 === 0 ? image.height : image.width;
  
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(degrees * Math.PI / 180);
      ctx.drawImage(image, image.width / -2, image.height / -2);
  
      callback(canvas.toDataURL());
    };
  
    image.src = srcBase64;
  }