// truffle migrate
// npm run dev

import BlockchainModule from './BlockchainModule';

let gameBoard = document.querySelector("#gameboard");
let currentFigure = '';
let currentPosition = 0;
let firstClick = null;
let secondClick = null;
let possibleMoves = [];
let playingColor = 'white'; // Текущий цвет, чей ход
let yourColor = null;

let didTheWhiteKingMove = false;
let didTheWhiteRightRookMove = false;
let didTheWhiteLeftRookMove = false;

let didTheBlackKingMove = false;
let didTheBlackRightRookMove = false;
let didTheBlackLeftRookMove = false;

let doublePawnMove = false;
let coordinateOfDoublePawnMove = null;

let globalNewFigure = null;
let restartClick = false;

let pieces = [
    rook0, knight0, bishop0, queen0, king0, bishop0, knight0, rook0,
    pawn0, pawn0, pawn0, pawn0, pawn0, pawn0, pawn0, pawn0,
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    pawn1, pawn1, pawn1, pawn1, pawn1, pawn1, pawn1, pawn1,
    rook1, knight1, bishop1, queen1, king1, bishop1, knight1, rook1
];

function getSquare(coordinate) {
    return document.querySelector(`#gameboard .square[square-id="${coordinate}"]`);
}

function getFigure(position) {
    const piece = pieces[position];
    if (piece === '') return '';
    const start = piece.indexOf("<div class='piece' id='") + "<div class='piece' id='".length;
    const end = piece.indexOf("'", start);
    const figureName = piece.slice(start, end);
    return figureName.split('-')[1];
}

function getColor(position) {
    const piece = pieces[position];
    if (piece === '') return '';
    return piece.includes('white') ? 'white' : 'black';
}

function checkSquare(coordinate) {
    return pieces[coordinate] !== '';
}

function sendMoveMessage(startPos, endPos, newFigure = null) {
    const opponentAddress = document.getElementById('recipientAddress').value.trim();
    let message = `move:${startPos}:${endPos}`;
    if (newFigure) {
        const figureName = newFigure.includes('white') ? `white-${getFigure(pieces.indexOf(newFigure))}` : `black-${getFigure(pieces.indexOf(newFigure))}`;
        message += `:${figureName}`;
    }
    blockchain.sendMessageFromTo(blockchain.state.account, opponentAddress, message)
        .then(() => {
            console.log(`Move sent: ${message}`);
            playingColor = playingColor === 'white' ? 'black' : 'white';
        })
        .catch(error => console.error('Error sending move:', error));
}

function sendGameRequest() {
    const opponentAddress = document.getElementById('recipientAddress').value.trim();
    if (!opponentAddress) {
        alert('Please enter an opponent address.');
        return;
    }
    const message = 'gameRequest';
    blockchain.sendMessageFromTo(blockchain.state.account, opponentAddress, message)
        .then(() => console.log(`Game request sent to ${opponentAddress}`))
        .catch(error => console.error('Error sending game request:', error));
}

function sendGameAccept(opponentAddress) {
    const message = 'gameAccept';
    blockchain.sendMessageFromTo(blockchain.state.account, opponentAddress, message)
        .then(() => console.log(`Game accept sent to ${opponentAddress}`))
        .catch(error => console.error('Error sending game accept:', error));
}

function applyMoveFromMessage(message) {
    console.log(`Applying move from message: ${message}`);
    const parts = message.split(':');
    if (parts[0] !== 'move') return;

    const startPos = parseInt(parts[1]);
    const endPos = parseInt(parts[2]);
    const newFigureName = parts[3];

    if (newFigureName) {
        const color = newFigureName.includes('white') ? 'white' : 'black';
        const figure = newFigureName.split('-')[1];
        const newFigure = (color === 'white' ?
            { rook: rook1, knight: knight1, bishop: bishop1, queen: queen1 } :
            { rook: rook0, knight: knight0, bishop: bishop0, queen: queen0 })[figure];

        pieces[startPos] = '';
        const startSquare = getSquare(startPos);
        if (startSquare) startSquare.innerHTML = '';

        pieces[endPos] = newFigure;
        const endSquare = getSquare(endPos);
        if (endSquare) {
            endSquare.innerHTML = newFigure;
            const svg = endSquare.querySelector('svg');
            if (svg) svg.style.fill = color === 'white' ? 'lavender' : 'black';
            if (yourColor === 'black') endSquare.classList.add('rotated');
        }
    } else {
        const piece = pieces[startPos];
        pieces[startPos] = '';
        const startSquare = getSquare(startPos);
        if (startSquare) startSquare.innerHTML = '';

        pieces[endPos] = piece;
        const endSquare = getSquare(endPos);
        if (endSquare) {
            endSquare.innerHTML = piece;
            const svg = endSquare.querySelector('svg');
            if (svg) svg.style.fill = getColor(endPos) === 'white' ? 'lavender' : 'black';
            if (yourColor === 'black') endSquare.classList.add('rotated');
        }

        if (getFigure(endPos) === 'king' && startPos === 60 && endPos === 62) {
            moveRookForCastling(63, 61, 'white');
        } else if (getFigure(endPos) === 'king' && startPos === 60 && endPos === 58) {
            moveRookForCastling(56, 59, 'white');
        } else if (getFigure(endPos) === 'king' && startPos === 4 && endPos === 6) {
            moveRookForCastling(7, 5, 'black');
        } else if (getFigure(endPos) === 'king' && startPos === 4 && endPos === 2) {
            moveRookForCastling(0, 3, 'black');
        }
    }

    playingColor = playingColor === 'white' ? 'black' : 'white';
}

// Вспомогательная функция для рокировки
function moveRookForCastling(startPos, endPos, color) {
    const rook = pieces[startPos];
    pieces[startPos] = '';
    const startSquare = getSquare(startPos);
    if (startSquare) startSquare.innerHTML = '';

    pieces[endPos] = rook;
    const endSquare = getSquare(endPos);
    if (endSquare) {
        endSquare.innerHTML = rook;
        const svg = endSquare.querySelector('svg');
        if (svg) {
            svg.style.fill = color === 'white' ? 'lavender' : 'black';
        }
        if (yourColor === 'black') endSquare.classList.add('rotated');
    }
}

function movePiece(startPos, endPos) {
    // Проверка, что ход делает игрок, чей сейчас ход
    if (playingColor !== yourColor) {
        console.log(`It's not your turn! Current turn: ${playingColor}, Your color: ${yourColor}`);
        return;
    }

    if (getFigure(startPos) === 'pawn' && Math.abs(endPos - startPos) === 16) {
        doublePawnMove = true;
        coordinateOfDoublePawnMove = endPos;
    } else {
        doublePawnMove = false;
        coordinateOfDoublePawnMove = null;
    }

    const color = getColor(startPos);
    if (getFigure(startPos) === 'pawn' && (Math.floor(endPos / 8) === 0 || Math.floor(endPos / 8) === 7) && globalNewFigure === null) {
        showPossibleTransformations(color, newFigure => {
            pieces[startPos] = '';
            getSquare(startPos).innerHTML = '';
            getSquare(endPos).innerHTML = newFigure;
            getSquare(endPos).style.fill = color === 'white' ? 'lavender' : 'black';
            pieces[endPos] = newFigure;
            getSquare(endPos).innerHTML = newFigure;
            sendMoveMessage(startPos, endPos, newFigure); // Смена хода происходит в sendMoveMessage
        });
        globalNewFigure = null;
    } else {
        globalNewFigure = null;

        if (getFigure(startPos) === 'king' && color === 'white') didTheWhiteKingMove = true;
        if (getFigure(startPos) === 'king' && color === 'black') didTheBlackKingMove = true;
        if (getFigure(startPos) === 'rook' && color === 'white' && startPos === 63) didTheWhiteRightRookMove = true;
        if (getFigure(startPos) === 'rook' && color === 'white' && startPos === 56) didTheWhiteLeftRookMove = true;
        if (getFigure(startPos) === 'rook' && color === 'black' && startPos === 7) didTheBlackLeftRookMove = true;
        if (getFigure(startPos) === 'rook' && color === 'black' && startPos === 0) didTheBlackRightRookMove = true;

        if (getFigure(startPos) === 'pawn' && getFigure(endPos) === '' && getColor(startPos) === 'white' && Math.abs(endPos - startPos) === 7) {
            pieces[startPos + 1] = '';
            getSquare(startPos + 1).innerHTML = '';
        } else if (getFigure(startPos) === 'pawn' && getFigure(endPos) === '' && getColor(startPos) === 'white' && Math.abs(endPos - startPos) === 9) {
            pieces[startPos - 1] = '';
            getSquare(startPos - 1).innerHTML = '';
        } else if (getFigure(startPos) === 'pawn' && getFigure(endPos) === '' && getColor(startPos) === 'black' && Math.abs(endPos - startPos) === 7) {
            pieces[startPos - 1] = '';
            getSquare(startPos - 1).innerHTML = '';
        } else if (getFigure(startPos) === 'pawn' && getFigure(endPos) === '' && getColor(startPos) === 'black' && Math.abs(endPos - startPos) === 9) {
            pieces[startPos + 1] = '';
            getSquare(startPos + 1).innerHTML = '';
        }

        const temp = pieces[startPos];
        pieces[startPos] = '';
        getSquare(startPos).innerHTML = '';
        pieces[endPos] = temp;
        getSquare(endPos).innerHTML = temp;
        getSquare(endPos).style.fill = color === 'white' ? 'lavender' : 'black';

        if (getFigure(endPos) === 'king' && startPos === 60 && endPos === 62) {
            const temp = pieces[63];
            pieces[63] = '';
            getSquare(63).innerHTML = '';
            pieces[61] = temp;
            getSquare(61).innerHTML = temp;
            getSquare(61).style.fill = 'lavender';
            if (yourColor === 'black') getSquare(61).classList.add('rotated');
        } else if (getFigure(endPos) === 'king' && startPos === 60 && endPos === 58) {
            const temp = pieces[56];
            pieces[56] = '';
            getSquare(56).innerHTML = '';
            pieces[59] = temp;
            getSquare(59).innerHTML = temp;
            getSquare(59).style.fill = 'lavender';
            if (yourColor === 'black') getSquare(59).classList.add('rotated');
        } else if (getFigure(endPos) === 'king' && startPos === 4 && endPos === 6) {
            const temp = pieces[7];
            pieces[7] = '';
            getSquare(7).innerHTML = '';
            pieces[5] = temp;
            getSquare(5).innerHTML = temp;
            getSquare(5).style.fill = 'black';
            if (yourColor === 'black') getSquare(5).classList.add('rotated');
        } else if (getFigure(endPos) === 'king' && startPos === 4 && endPos === 2) {
            const temp = pieces[0];
            pieces[0] = '';
            getSquare(0).innerHTML = '';
            pieces[3] = temp;
            getSquare(3).innerHTML = temp;
            getSquare(3).style.fill = 'black';
            if (yourColor === 'black') getSquare(3).classList.add('rotated');
        }

        if (yourColor === 'black') getSquare(endPos).classList.add('rotated');
        sendMoveMessage(startPos, endPos); // Смена хода происходит в sendMoveMessage
    }
}

function rotateBoard() {
    const pieces = document.querySelectorAll('.piece');
    gameBoard.style.transform = `rotate(180deg)`;
    pieces.forEach((piece) => piece.classList.add('rotated'));
}

function playMoveSound() {
    const audio = new Audio('moveSound.mp3');
    audio.play();
}

function createBoard() {
    const oldGameBoard = document.querySelector('#gameboard');
    if (oldGameBoard) {
        oldGameBoard.remove();
    }

    const newGameBoard = document.createElement('div');
    newGameBoard.id = 'gameboard';
    document.body.appendChild(newGameBoard);
    gameBoard = newGameBoard;

    pieces.forEach((startPiece, i) => {
        const square = document.createElement('div');
        square.classList.add('square');
        square.innerHTML = startPiece;
        square.setAttribute('square-id', i);
        if ((i % 2 === 0 && Math.floor(i / 8) % 2 === 0) || (i % 2 !== 0 && Math.floor(i / 8) % 2 !== 0)) {
            square.classList.add('beige');
        } else {
            square.classList.add('brown');
        }
        gameBoard.append(square);

        const svg = square.querySelector('svg');
        if (svg) {
            if (checkSquare(i) && getColor(i) === 'white') {
                svg.style.fill = 'lavender';
            } else if (checkSquare(i) && getColor(i) === 'black') {
                svg.style.fill = 'black';
            }
        }
    });

    if (yourColor === 'black') rotateBoard();
}

function resetBoard() {
    const squares = document.querySelectorAll('.square');
    squares.forEach((square) => square.remove());
    pieces = [
        rook0, knight0, bishop0, queen0, king0, bishop0, knight0, rook0,
        pawn0, pawn0, pawn0, pawn0, pawn0, pawn0, pawn0, pawn0,
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        pawn1, pawn1, pawn1, pawn1, pawn1, pawn1, pawn1, pawn1,
        rook1, knight1, bishop1, queen1, king1, bishop1, knight1, rook1
    ];
    createBoard();
}

function getPossibleMoves(currentFigure, currentPosition) {
    switch (currentFigure) {
        case 'pawn': return getPossibleMovesForPawn(currentPosition);
        case 'rook': return getPossibleMovesForRook(currentPosition);
        case 'knight': return getPossibleMovesForKnight(currentPosition);
        case 'bishop': return getPossibleMovesForBishop(currentPosition);
        case 'queen': return getPossibleMovesForQueen(currentPosition);
        case 'king': return getPossibleMovesForKing(currentPosition);
    }
}

function getFilteredPossibleMoves(currentFigure, currentPosition) {
    switch (currentFigure) {
        case 'pawn': return filterForAnyMoves(currentPosition, getPossibleMovesForPawn(currentPosition));
        case 'rook': return filterForAnyMoves(currentPosition, getPossibleMovesForRook(currentPosition));
        case 'knight': return filterForAnyMoves(currentPosition, getPossibleMovesForKnight(currentPosition));
        case 'bishop': return filterForAnyMoves(currentPosition, getPossibleMovesForBishop(currentPosition));
        case 'queen': return filterForAnyMoves(currentPosition, getPossibleMovesForQueen(currentPosition));
        case 'king': return filterForKingMoves(currentPosition, getPossibleMovesForKing(currentPosition));
    }
}

function isMate(color) {
    let allPossibleMoves = [];
    for (let i = 0; i < 64; i++) {
        if (checkSquare(i) && getColor(i) === color) {
            const currentFigure = getFigure(i);
            allPossibleMoves = allPossibleMoves.concat(getFilteredPossibleMoves(currentFigure, i));
        }
    }
    return allPossibleMoves.length === 0;
}

function showPossibleTransformations(color, callback) {
    gameBoard.style.pointerEvents = 'none';
    gameBoard.classList.add('smoothed');
    const recommendedPieces = color === 'white' ? [rook1, knight1, bishop1, queen1] : [rook0, knight0, bishop0, queen0];
    const rectangle = document.createElement('div');
    rectangle.classList.add('rectangle');

    const parent = document.querySelector('body');
    const parentRect = parent.getBoundingClientRect();
    const topPosition = (parentRect.height - 80) / 2;
    const leftPosition = (parentRect.width - 320) / 2;
    rectangle.style.top = `${topPosition}px`;
    rectangle.style.left = `${leftPosition}px`;

    recommendedPieces.forEach((piece, i) => {
        const square = document.createElement('div');
        square.setAttribute('square-id', i);
        square.classList.add('square');
        square.innerHTML = piece;
        if (color === 'white') {
            square.querySelector('svg').style.fill = 'lavender';
        } else {
            square.querySelector('svg').style.fill = 'black';
        }
        square.addEventListener('click', function(event) {
            const square1 = event.target.closest('.square');
            const choice = square1.getAttribute('square-id');
            gameBoard.classList.remove('smoothed');
            const choicePanel = document.querySelectorAll('.rectangle');
            choicePanel.forEach(p => p.parentNode.removeChild(p));
            globalNewFigure = recommendedPieces[parseInt(choice)];
            callback(recommendedPieces[parseInt(choice)]);
            gameBoard.style.pointerEvents = 'auto';
        });
        rectangle.append(square);
    });
    parent.append(rectangle);
}

function showFinalScreen(winColor) {
    gameBoard.style.pointerEvents = 'none';
    gameBoard.classList.add('smoothed');

    const block1 = document.createElement('div');
    block1.style.height = '160px';
    block1.style.width = '320px';
    block1.style.display = 'flex';
    block1.style.alignItems = 'center';
    block1.style.justifyContent = 'center';

    const winMessageText = document.createElement('span');
    winMessageText.textContent = `${winColor} is win!`;
    winMessageText.style.fontSize = '40px';
    winMessageText.style.color = winColor;
    block1.appendChild(winMessageText);

    const block2 = document.createElement('div');
    block2.style.height = '160px';
    block2.style.width = '320px';
    block2.style.display = 'flex';
    block2.style.alignItems = 'center';
    block2.style.justifyContent = 'center';

    const restartButton = document.createElement('button');
    restartButton.textContent = 'Click to restart';
    restartButton.classList.add('restart-button');
    restartButton.addEventListener('click', function() {
        if (!restartClick) {
            sendRestartMessage();
            restartButton.textContent = 'Waiting for the opponent...';
            restartButton.setAttribute('disabled', '');
            restartClick = true;
        }
    });
    block2.appendChild(restartButton);

    const winMessage = document.createElement('div');
    winMessage.appendChild(block1);
    winMessage.appendChild(block2);
    winMessage.style.border = `3px solid ${winColor}`;
    winMessage.style.borderRadius = '5px';
    winMessage.style.backgroundColor = winColor === 'white' ? 'rgb(88, 88, 88)' : 'rgb(180, 180, 180)';
    winMessage.classList.add('win');
    document.querySelector('body').append(winMessage);
}

function removeFinalScreen() {
    const winElement = document.querySelector('.win');
    if (winElement) winElement.parentNode.removeChild(winElement);
    gameBoard.classList.remove('smoothed');
    gameBoard.style.pointerEvents = 'auto';
}

function getPossibleMovesForPawn(currentPos) {
    const [row, col] = [Math.floor(currentPos / 8), currentPos % 8];
    let moves = [];
    let color = getColor(currentPos);
    const direction = (color === 'white') ? -1 : 1;
    const doubleStep = (color === 'white' && currentPos >= 48 && currentPos <= 55) || (color === 'black' && currentPos >= 8 && currentPos <= 15);

    if (color === 'white' && row === 0) return moves;
    if (color === 'black' && row === 7) return moves;

    const singleStepPos = currentPos + direction * 8;
    if (!checkSquare(singleStepPos) && getFigure(singleStepPos) === '') moves.push(singleStepPos);

    if (doubleStep && getFigure(singleStepPos) === '' && getFigure(singleStepPos + direction * 8) === '') {
        moves.push(singleStepPos + direction * 8);
    }

    const leftAttackPos = currentPos + direction * 9;
    if (leftAttackPos >= 0 && leftAttackPos <= 63 && col !== 0 && checkSquare(leftAttackPos) && getColor(leftAttackPos) !== color) {
        moves.push(leftAttackPos);
    }
    if (doublePawnMove && coordinateOfDoublePawnMove === currentPos + direction && col !== 0) {
        moves.push(leftAttackPos);
    }

    const rightAttackPos = currentPos + direction * 7;
    if (rightAttackPos >= 0 && rightAttackPos <= 63 && col !== 7 && checkSquare(rightAttackPos) && getColor(rightAttackPos) !== color) {
        moves.push(rightAttackPos);
    }
    if (doublePawnMove && coordinateOfDoublePawnMove === currentPos - direction && col !== 7) {
        moves.push(rightAttackPos);
    }

    return moves;
}

function getPossibleMovesForRook(currentPos) {
    const [row, col] = [Math.floor(currentPos / 8), currentPos % 8];
    const color = getColor(currentPos);
    let moves = [];
    const directions = [{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }];

    for (const direction of directions) {
        let newRow = row + direction.row;
        let newCol = col + direction.col;
        while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const newPos = newRow * 8 + newCol;
            if (checkSquare(newPos)) {
                if (getColor(newPos) === color) break;
                moves.push(newPos);
                break;
            }
            moves.push(newPos);
            newRow += direction.row;
            newCol += direction.col;
        }
    }
    return moves;
}

function getPossibleMovesForKnight(currentPos) {
    const boardSize = 8;
    const moves = [];
    let color = getColor(currentPos);
    const knightMoves = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];
    const [row, col] = [Math.floor(currentPos / boardSize), currentPos % boardSize];

    for (const [rDiff, cDiff] of knightMoves) {
        const newRow = row + rDiff;
        const newCol = col + cDiff;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
            const newPosition = newRow * boardSize + newCol;
            if ((checkSquare(newPosition) && getColor(newPosition) !== color) || !checkSquare(newPosition)) {
                moves.push(newPosition);
            }
        }
    }
    return moves;
}

function getPossibleMovesForBishop(currentPos) {
    const boardSize = 8;
    const moves = [];
    const color = getColor(currentPos);
    const [startRow, startCol] = [Math.floor(currentPos / boardSize), currentPos % boardSize];

    const isValidMove = (row, col) => {
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
            if (checkSquare(row * boardSize + col) && getColor(row * boardSize + col) !== color) return true;
            if (checkSquare(row * boardSize + col) && getColor(row * boardSize + col) === color) return false;
            return true;
        }
    };

    const findMovesInDirection = (rowIncrement, colIncrement) => {
        let newRow = startRow + rowIncrement;
        let newCol = startCol + colIncrement;
        while (isValidMove(newRow, newCol)) {
            const newPosition = newRow * boardSize + newCol;
            moves.push(newPosition);
            if (checkSquare(newPosition) && getColor(newPosition) !== color) break;
            newRow += rowIncrement;
            newCol += colIncrement;
        }
    };

    findMovesInDirection(-1, -1);
    findMovesInDirection(-1, 1);
    findMovesInDirection(1, -1);
    findMovesInDirection(1, 1);
    return moves;
}

function getPossibleMovesForQueen(currentPos) {
    return [...getPossibleMovesForBishop(currentPos), ...getPossibleMovesForRook(currentPos)];
}

function getPossibleMovesForKing(currentPos) {
    const boardSize = 8;
    let moves = [];
    const color = getColor(currentPos);
    const [row, col] = [Math.floor(currentPos / boardSize), currentPos % boardSize];

    for (let rDiff = -1; rDiff <= 1; rDiff++) {
        for (let cDiff = -1; cDiff <= 1; cDiff++) {
            if (rDiff === 0 && cDiff === 0) continue;
            const newRow = row + rDiff;
            const newCol = col + cDiff;
            if ((newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize &&
                    checkSquare(newRow * boardSize + newCol) && getColor(newRow * boardSize + newCol) !== color) ||
                (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && !checkSquare(newRow * boardSize + newCol))) {
                moves.push(newRow * boardSize + newCol);
            }
        }
    }

    if (color === 'black' && !didTheBlackKingMove && !isCheck(color)) {
        if (!checkSquare(5) && !checkSquare(6) && !didTheBlackLeftRookMove) moves.push(6);
        if (!checkSquare(3) && !checkSquare(2) && !checkSquare(1) && !didTheBlackRightRookMove) moves.push(2);
    }

    if (color === 'white' && !didTheWhiteKingMove && !isCheck(color)) {
        if (!checkSquare(61) && !checkSquare(62) && !didTheWhiteRightRookMove) moves.push(62);
        if (!checkSquare(59) && !checkSquare(58) && !checkSquare(57) && !didTheWhiteLeftRookMove) moves.push(58);
    }
    return moves;
}

function checkKingMove(startPos, endPos) {
    const color = getColor(startPos);
    const pieceStart = pieces[startPos];
    const pieceEnd = pieces[endPos];

    pieces[startPos] = '';
    pieces[endPos] = pieceStart;

    for (let i = 0; i < 64; i++) {
        if (checkSquare(i) && getColor(i) !== color) {
            let figure = getFigure(i);
            let enemyMoves = [];
            if (figure === 'king') enemyMoves = [];
            else if (figure === 'pawn') {
                const direction = (color === 'white') ? 1 : -1;
                const leftAttackPos = i + direction * 7;
                if (leftAttackPos >= 0 && leftAttackPos <= 63 && i % 8 !== 7) enemyMoves.push(leftAttackPos);
                const rightAttackPos = i + direction * 9;
                if (rightAttackPos >= 0 && rightAttackPos <= 63 && i % 8 !== 0) enemyMoves.push(rightAttackPos);
            } else {
                enemyMoves = getPossibleMoves(figure, i);
            }
            if (enemyMoves.includes(endPos)) {
                pieces[startPos] = pieceStart;
                pieces[endPos] = pieceEnd;
                return false;
            }
        }
    }
    pieces[startPos] = pieceStart;
    pieces[endPos] = pieceEnd;
    return true;
}

function filterForKingMoves(currentPos, moves) {
    let didKing;
    let filter1 = [];
    moves.forEach(move => {
        if (checkKingMove(currentPos, move)) filter1.push(move);
    });

    const color = getColor(currentPos);
    let anotherKingPos = -1;
    for (let i = 0; i < 64; i++) {
        if (getFigure(i) === 'king' && getColor(i) !== color) {
            anotherKingPos = i;
            break;
        }
    }
    const possibleMovesForAnotherKing = [anotherKingPos + 8, anotherKingPos - 8, anotherKingPos + 1, anotherKingPos - 1,
        anotherKingPos + 7, anotherKingPos - 7, anotherKingPos + 9, anotherKingPos - 9];

    switch (color) {
        case 'white': didKing = didTheWhiteKingMove; break;
        case 'black': didKing = didTheBlackKingMove; break; // Исправлено 'back' на 'black'
    }
    if (!didKing) {
        if (!filter1.includes(61)) filter1 = filter1.filter(i => i !== 62);
        if (!filter1.includes(59)) filter1 = filter1.filter(i => i !== 58);
        if (!filter1.includes(5)) filter1 = filter1.filter(i => i !== 6);
        if (!filter1.includes(3)) filter1 = filter1.filter(i => i !== 2);
    }
    return filter1.filter(item => !possibleMovesForAnotherKing.includes(item));
}

function isCheck(color) {
    let kingPos = getKingPos(color);
    return !checkKingMove(kingPos, kingPos);
}

function getKingPos(color) {
    for (let i = 0; i < 64; i++) {
        if (getFigure(i) === 'king' && getColor(i) === color) return i;
    }
    return -1;
}

function simulateMove(startPos, endPos, color) {
    const pieceStart = pieces[startPos];
    const pieceEnd = pieces[endPos];
    pieces[startPos] = '';
    pieces[endPos] = pieceStart;
    let isHaveACheck = isCheck(color);
    pieces[startPos] = pieceStart;
    pieces[endPos] = pieceEnd;
    return isHaveACheck;
}

function filterForAnyMoves(currentPos, moves) {
    let color = getColor(currentPos);
    let finalRes = [];
    moves.forEach(move => {
        if (!simulateMove(currentPos, move, color)) finalRes.push(move);
    });
    return finalRes;
}

function drawPossibleMoves(moves) {
    moves.forEach(move => {
        if (!checkSquare(move)) {
            const circleElement = document.createElement('div');
            circleElement.classList.add('circle');
            getSquare(move).appendChild(circleElement);
        } else {
            getSquare(move).querySelector('svg').classList.add('attacked');
        }
    });
}

function removeAttacks() {
    const circles = document.querySelectorAll('.circle');
    const squares = document.querySelectorAll('.attacked');
    circles.forEach(circle => circle.parentNode.removeChild(circle));
    squares.forEach(square => square.classList.remove('attacked'));
}

const blockchain = new BlockchainModule();
function startGame() {
    createBoard(); // Отрисовка доски только после начала игры
    gameBoard.addEventListener('click', function(event) {
        if (playingColor !== yourColor) {
            console.log(`It's not your turn! Current turn: ${playingColor}, Your color: ${yourColor}`);
            return;
        }
        if (firstClick === null) {
            const square1 = event.target.closest('.square');
            if (square1) {
                currentPosition = parseInt(square1.getAttribute('square-id'));
                if (checkSquare(currentPosition) && getColor(currentPosition) === yourColor) {
                    currentFigure = square1.querySelector('div').getAttribute('id').split('-')[1];
                    firstClick = currentPosition;
                    possibleMoves = getPossibleMoves(currentFigure, currentPosition);
                    drawPossibleMoves(possibleMoves);
                } else {
                    firstClick = null;
                    secondClick = null;
                }
            }
        } else {
            const square2 = event.target.closest('.square');
            if (square2) {
                currentPosition = parseInt(square2.getAttribute('square-id'));
                if (currentPosition === firstClick) {
                    removeAttacks();
                    possibleMoves = [];
                    firstClick = null;
                    secondClick = null;
                } else {
                    secondClick = currentPosition;
                    removeAttacks();
                    if (possibleMoves.includes(secondClick)) {
                        movePiece(firstClick, secondClick);
                    }
                    possibleMoves = [];
                    firstClick = null;
                    secondClick = null;
                }
            }
        }
    });
}

(async () => {
    try {
        await blockchain.initialize();
        console.log('Blockchain initialized');

        const accountSelect = document.getElementById('accountSelect');
        const recipientAddress = document.getElementById('recipientAddress');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const messagesList = document.getElementById('messages');
        const startGameButton = document.createElement('button'); // Новая кнопка

        // Настройка кнопки Start Game
        startGameButton.textContent = 'Start Game';
        startGameButton.id = 'startGameButton';
        document.body.appendChild(startGameButton);
        startGameButton.addEventListener('click', () => {
            sendGameRequest();
        });

        const accounts = await blockchain.logAllAccounts();
        for (const account of accounts) {
            const option = document.createElement('option');
            option.value = account;
            option.text = `${account} (${await blockchain.getBalance(account)} ETH)`;
            accountSelect.appendChild(option);
        }

        blockchain.state.account = accounts[0];
        accountSelect.value = blockchain.state.account;
        yourColor = accounts.indexOf(blockchain.state.account) === 0 ? 'white' : 'black';
        // createBoard() убрано отсюда, теперь вызывается в startGame()

        accountSelect.addEventListener('change', () => {
            blockchain.state.account = accountSelect.value;
            yourColor = accounts.indexOf(blockchain.state.account) === 0 ? 'white' : 'black';
            // resetBoard();
            console.log('Current account changed to:', blockchain.state.account);
            messagesList.innerHTML = '';
        });

        sendButton.addEventListener('click', async () => {
            const to = recipientAddress.value.trim();
            const message = messageInput.value.trim();
            if (!to || !message) {
                alert('Please enter a recipient address and message.');
                return;
            }
            await blockchain.sendMessageFromTo(blockchain.state.account, to, message);
            messageInput.value = '';
        });

        blockchain.state.chatContract.events.messageSentEvent({})
            .on('data', (event) => {
                const from = event.returnValues.from;
                const to = event.returnValues.to;
                const message = event.returnValues.message;

                if (from !== blockchain.state.account && to === blockchain.state.account) {
                    const li = document.createElement('li');
                    li.textContent = `From ${from}: ${message}`;
                    messagesList.appendChild(li);
                    console.log(`New message from ${from}: ${message}`);

                    if (message === 'gameRequest') {
                        if (confirm(`Player ${from} wants to play a game. Accept?`)) {
                            sendGameAccept(from);
                            yourColor = 'black';
                            startGame();
                        }
                    } else if (message === 'gameAccept') {
                        yourColor = 'white';
                        startGame();
                    } else if (message.startsWith('move:')) {
                        applyMoveFromMessage(message);
                    }
                }
            })
            .on('error', (error) => console.error('Error in messageSentEvent listener:', error));
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize: ' + error.message);
    }
})();