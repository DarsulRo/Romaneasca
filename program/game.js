class Game {
    constructor() {

    }
    //
    started = 0
    room = null
    startingTime = 3

    //cards
    cardIndex = 1
    cardsInHand = 0
    cards = [
        "back", "B_2", "B_3", "B_4", "B_7", "B_8", "B_9", "B_10", "B_11", "F_2", "F_3", "F_4", "F_7", "F_8", "F_9", "F_10",
        "F_11", "G_2", "G_3", "G_4", "G_7", "G_8", "G_9", "G_10", "G_11", "I_2", "I_3", "I_4", "I_7", "I_8", "I_9", "I_10", "I_11"
    ]
    tableCards = []
    shuffleCards(cards) {
        for (var i = 1; i < cards.length; i++) {
            let random = Math.floor((Math.random() * 100000)) % 32 + 1
            let aux = cards[i]
            cards[i] = cards[random]
            cards[random] = aux;
        }
    }

    //players and teams
    players = []
    teams = []
    order = [{ team: 0, player: 0 }, { team: 1, player: 0 }, { team: 0, player: 1 }, { team: 1, player: 1 }]
    playerCount = 0
    readyCount = 0

    // Rounds and turns
    roundCount
    setCount
    turnCount
    turnPlayer

    basePlayer
    baseCard
    catchedBy
    canCatchAgain

    //constants
    step = 50
    second = 1000
    turnTime = 15 * this.second

    //variables
    time
    seconds

    //cards related
    cardPlayedThisTurn  // 0- not plyed yet |  1 - played | -1 first time

    joinTeam(id, username, team) {
        if (this.teams[team].players.length < 2) {
            this.teams[team].players.push({
                id: id,
                username: username,
                cards: [],
                cardCount: 0
            })
            this.readyCount++
        }
    }
    leaveTeam(id) {
        let team0Index = this.getPlayerIndex(this.teams[0].players, id)
        if (team0Index > -1) {
            this.readyCount--
            this.teams[0].players.splice(team0Index, 1)
        }
        let team1Index = this.getPlayerIndex(this.teams[1].players, id)
        if (team1Index > -1) {
            this.readyCount--
            this.teams[1].players.splice(team1Index, 1)
        }
    }
    // STARING GAME
    startGame(io) {
        console.log(`Game started in room [${this.room}]`)
        io.to(this.room).emit('clearCards')
        this.started = 1

        //try putting the interval in the #server.js and pass it as a parameter
        let gameInterval
        clearInterval(gameInterval)
        gameInterval = setInterval(() => {

            if(this.started==0){
                clearInterval(gameInterval)
            }

            if (this.isTurn()) {
                this.endTurn(io)
            }
            if (this.isTurn() && this.turnCount % 4 == 1) {
                this.endSet(io)
            }
            if (this.isTurn() && this.turnCount % 4 == 1 && this.canCatchAgain == 0) {
                this.endRound(io)
            }

            //FULL STOP
            if (this.cardsInHand < 1 && this.isTurn()) {
                this.started = 0
                clearInterval(gameInterval)
                this.endGame(io)
                return
            }

            //NEW CYCLE
            if (this.isTurn() && this.turnCount % 4 == 1 && this.canCatchAgain == 0) {
                this.newRound(io)
            }
            if (this.isTurn() && this.turnCount % 4 == 1) {
                this.newSet(io)
            }
            if (this.isTurn()) {
                this.newTurn(io)
            }
            if (this.time % this.second == 0 && this.started == 1) {
                this.newSecond(io)
            }
            this.time += this.step
            this.seconds = Math.floor(this.time / 1000)
        }, this.step)

    }
    isTurn() {
        return (this.time % this.turnTime == 0) && this.started == 1
    }

    // RUNDA
    newRound(io) {
        //console.log('new round', this.roundCount)
        io.to(this.room).emit('newRound', this.roundCount)
        this.tableCards = []
        this.setCount = 1
    }
    endRound(io) {
        this.basePlayer = this.catchedBy
        this.turnPlayer = this.basePlayer
        this.scoreCards(io)

        //inceput de runda
        this.fillCards(io)
        this.roundCount++
    }

    //SET 
    newSet(io) {
       // console.log('new set', this.setCount)
        this.turnCount = 1
    }
    endSet(io) {
        if (this.turnCount % 4 == 1 && this.turnCount > 1 && this.basePlayer % 2 != this.catchedBy % 2) {
            let p = this.players[this.getPlayerIndexByOrder(this.basePlayer)].id
            if (this.canCatchAgain == 1) {
                io.to(p).emit('willCatch', 1)

            }
        }
        this.cardsInHand--
        //new set
        this.setCount++
    }

    //TURA
    newTurn(io) {
        //console.log('new turn', this.turnCount)
        //console.log('player', this.turnPlayer)
        //console.log('')
        this.cardPlayedThisTurn = 0

        let ord = {
            team: this.order[this.turnPlayer].team,
            player: this.order[this.turnPlayer].player
        }
        io.to(this.room).emit('newTurn', ord)
        let player = this.players[this.getPlayerIndexByOrder(this.turnPlayer)]
        io.to(player.id).emit('myTurn')
    }
    endTurn(io) {
        // daca nu a continuat tura
        if (this.turnCount == 1 && this.setCount > 1 && this.cardPlayedThisTurn == 0) {
            //terminam runda si incepem alta
            this.turnCount = 0
            this.canCatchAgain = 0
            this.cardsInHand++
        }
        else if (this.roundCount != 0 && this.cardPlayedThisTurn == 0) {
            //daca nu a jucat carte
            this.forcePlayCard(io)
        }
        io.to(this.room).emit('willCatch', 0)

        //inceput de tura 
        this.catchedAgain = 0
        this.turnCount++;
        this.turnPlayer = (this.turnPlayer + 1) % 4
        this.cardPlayedThisTurn = 0
    }

    newSecond(io) {
        let obj = {
            timeLeft: (this.turnTime - this.time % this.turnTime) / this.second,
            turnTime: this.turnTime / this.second
        }
        io.to(this.room).emit('newSecond', obj)
    }


    fillCards(io) {
        let number = Math.min(4 - this.cardsInHand, (32 - (this.cardIndex - 1)) / 4)
        this.sendCards(number, this.turnPlayer, io)
        this.cardsInHand = this.cardsInHand + number
    }
    sendCards(number, turnPlayer, io) {
        if (number == 0) return
        for (let k = 0; k < number; k++) {
            for (let i = 0; i < 4; i++) {
                let p = (i + turnPlayer) % 4
                this.teams[this.order[p].team].players[this.order[p].player].cards.push(this.cards[this.cardIndex++])
            }
        }
        this.emitCards(io)
    }
    emitCards(io) {
        this.teams.forEach(team => {
            team.players.forEach(player => {
                io.to(player.id).emit('sendCards', player.cards)
            })
        });
    }

    playCard(id, card, io) {
        let playerId = this.players[this.getPlayerIndexByOrder(this.turnPlayer)].id
        let t = this.order[this.basePlayer].team
        let p = this.order[this.basePlayer].player

        //DACA POATE JUCA
        if (id == playerId && this.cardPlayedThisTurn == 0) {

            // tura speciala
            if (this.turnCount == 1 && this.setCount > 1) {
                if (this.canCatchAgain == 1) {
                    if (this.getValue(card) == this.getValue(this.baseCard) || this.getValue(card) == 7) {
                        
                    }
                    else {
                        return
                    }
                }
                else {
                    return
                }
            }

            // *S
            // REMOVE CARD FROM PLAYER HAND
            this.cardPlayedThisTurn = 1
            this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards = this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards.filter(carte => {
                return card != carte
            })
            this.tableCards.push(card)

            // SETEZ PRIMA CARTE (BAZA)
            if (this.turnCount == 1 && this.setCount == 1) {
                this.baseCard = card
                this.basePlayer = this.turnPlayer
            }

            //PRINDE
            if (this.getValue(card) == this.getValue(this.baseCard) || this.getValue(card) == 7) {
                this.catchedBy = this.turnPlayer
                let ord = {
                    team: this.order[this.turnPlayer].team,
                    player: this.order[this.turnPlayer].player
                }
                io.to(this.room).emit('catched', ord)
            }

            //CHECK IF CAN CATCH AGAIN
            if (this.turnCount == 4) {
                this.canCatchAgain = 0

                if (this.basePlayer % 2 != this.catchedBy % 2) { //daca este prins de adversar
                    this.teams[t].players[p].cards.forEach(carte => {
                        if (this.getValue(carte) == this.getValue(this.baseCard) || this.getValue(carte) == 7) {
                            this.canCatchAgain = 1
                        }
                    })
                }
            }

            io.to(id).emit('sendCards', this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards)
            io.to(this.room).emit('cardPlayed', card)
            io.to(this.room).emit('willCatch', 0)

            //end turn sooner
            if (this.time % this.turnTime != 0) {
                this.speedTurn()
            }
        }
    }
    forcePlayCard(io) {
        let t = this.order[this.turnPlayer].team
        let p = this.order[this.turnPlayer].player

        let player = this.teams[t].players[p]
        this.playCard(player.id, player.cards[0], io)
    }
    scoreCards(io) {
        let t = this.order[this.basePlayer].team

        this.tableCards.forEach(card => {
            this.teams[t].cartiDuse +=1
            if (this.getValue(card) > 9) {
                this.teams[t].points += 1
            }
        })
        io.to(this.room).emit('updateScore', this.teams)
    }
    speedTurn() {
        this.time = this.turnTime - 1 * this.second
    }
    endGame(io){
        setTimeout(() => {
            console.log(`Game over in room [${this.room}]`)
            io.emit('endGame', this.teams)
            this.stopGame(io)
        },2000)
    }



    stopGame(io) {
        this.resetGame()
    }
    resetRoom(io) {
        this.started = 0
        this.teams = [
            {
                players: [],
                points: 0,
                cartiDuse : 0
            },
            {
                players: [],
                points: 0,
                cartiDuse: 0
            }
        ]
        this.readyCount = 0

        this.initGame()
        io.to(this.room).emit('resetRoom', this)
        io.to(this.room).emit('updateRoom', this)
        io.to(this.room).emit('updateTeam', this)
    }
    initGame() {
        this.resetGame()
    }
    resetGame() {
        this.cardIndex = 1
        this.cardsInHand = 1

        this.roundCount = 0
        this.setCount = 0
        this.turnCount = 0
        this.turnPlayer = -1

        this.basePlayer = 0
        this.baseCard = 0
        this.catchedBy = 0
        this.canCatchAgain = 0
        this.cardPlayedThisTurn = -1

        this.time = 0
        this.seconds = 0

        this.teams.forEach(team=>{
            team.points = 0
            team.cartiDuse = 0
        })
        this.shuffleCards(this.cards)
    }
    getPlayerIndex(players, id) {
        let index = players.findIndex(player => {
            return player.id == id
        })
        return index
    }
    getPlayerIndexByOrder(orderIndex) {
        let index = this.players.findIndex(player => {
            return player.id == this.teams[this.order[orderIndex].team].players[this.order[orderIndex].player].id
        })
        return index
    }
    getValue(card) {
        let value = card.toString().substr(2, card.length - 2)
        return value
    }
}
module.exports = Game

//*S - possible security or performance issue