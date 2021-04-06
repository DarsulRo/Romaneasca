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
    teams = [
        {
            players: [],
            points: 0
        },
        {
            players: [],
            points: 0
        }
    ]
    order = [{team:0, player:0}, {team:1, player: 0}, {team:0, player:1},{team:1,player:1}]
    playerCount = 0
    readyCount = 0

    // Rounds and turns
    roundCount = 0
    turnCount = 1
    turnPlayer = -1

    basePlayer = 0 
    baseCard = 0
    catchedBy = 0
    canCatchAgain = 0
    willCatchAgain = 0

    //constants
    step = 50
    second = 1000
    turnTime = 10000
    roundTime = 4*this.turnTime

    //variables
    time = 0 
    seconds = 0
    startTurnTime = 0 
    startRoundTime = 0 

    //cards related
    cardPlayedThisTurn = -1  // 0- not plyed yet |  1 - played | -1 first time
    
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
        io.to(this.room).emit('clearCards')
        this.started = 1
        this.cardsInHand = 4
        this.sendCards(4, this.turnPlayer+1, io)

        let interval = setInterval(async ()=>{


            if(this.time%this.turnTime == 0 && (this.turnCount != 1 || this.roundCount != 0)){
                this.endTurn(io)
            }

            if(this.cardIndex>=32){
                this.started= 0
                clearInterval(interval)
                console.log('gata cartile')
                return
            }

            if(this.turnCount%4==1 && this.time%this.turnTime == 0 && this.started==1 && this.cardIndex<32){
                if(this.canCatchAgain == 1 && this.basePlayer!=this.catchedBy){
                    //nothing, so it will start a new turn
                    console.log('will catch?')
                    io.to(this.basePlayer).emit('willCatch',this.baseCard)
                }
                else{
                    this.newRound(io)
                }
            }

            if(this.time%this.turnTime==0 && this.started==1)
            {
                this.newTurn(io)
            }

            if(this.time%this.second == 0 && this.started==1){
                this.newSecond(io)
            }


            this.time+= this.step
            this.seconds= Math.floor(this.time/1000)
        }, this.step)

    }
    
    async newRound(io){
        this.turnCount = 1
        this.roundCount++
        this.time= 0
        this.seconds = 0
        this.tableCards = []
        this.basePlayer = this.catchedBy
        io.to(this.room).emit('newRound', this.roundCount)
    }
    async endRound(io){

    }
    async newTurn(io){
        
        console.log('')
        //normal turn
        this.cardPlayedThisTurn = 0
        this.turnPlayer = (this.turnPlayer+1) % 4

        let turn = {
            player: this.turnPlayer,
            order: this.order,
            turn: this.turnCount
        }
        let player = this.players[this.getPlayerIndexByOrder(this.turnPlayer)]

        io.to(this.room).emit('newTurn', turn)
        io.to(player.id).emit('myTurn')


        console.log('round:',this.roundCount,'  turn:', this.turnCount)
        this.turnCount++
    }
    async endTurn(io){
        if(this.cardPlayedThisTurn == 0){ 

            let playerId = this.players[this.getPlayerIndexByOrder(this.turnPlayer)].id
            let team = this.order[this.turnPlayer].team
            let player = this.order[this.turnPlayer].player
            
            let card = this.teams[team].players[player].cards[0]
            this.playCard(playerId,card,io)

        }
    }
    async newSecond(io){
        let obj={
            timeLeft: (this.turnTime - this.time % this.turnTime)/this.second,
            turnTime: this.turnTime/this.second
        }
        io.to(this.room).emit('newSecond', obj)
    }

    fillCards(){
        let number = Math.min(4-this.cardsInHand, (32-this.cardIndex)/4)
        this.sendCards(number, this.turnPlayer, io)
    }
    sendCards(number, turnPlayer, io){
        for (let k = 0; k < number; k++) {
            for(let i = 0; i <4; i++){
                let p = (i+turnPlayer)%4
                this.teams[this.order[p].team].players[this.order[p].player].cards.push(this.cards[this.cardIndex++])
            }
        }
        this.emitCards(io)
    }
    emitCards(io){
        this.teams.forEach(team => {
            team.players.forEach(player =>{
                io.to(player.id).emit('sendCards',player.cards)
            })
        });
    }

    playCard(id, card, io){
        let playerId = this.players[this.getPlayerIndexByOrder(this.turnPlayer)].id

        if(id==playerId && this.cardPlayedThisTurn==0){
            this.cardPlayedThisTurn = 1
            this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards = this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards.filter(carte =>{
                return card!=carte
            })
            this.tableCards.push(card)

            if(this.getValue(card) == this.getValue(this.baseCard) || this.getValue(card) == 7){
                this.catchedBy = this.turnPlayer
                let ord={
                    team: this.order[this.turnPlayer].team,
                    player: this.order[this.turnPlayer].player
                }
                io.to(this.room).emit('catched', ord)
            }

            io.to(id).emit('sendCards', this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards)
            io.to(this.room).emit('cardPlayed', card)
        }

        let cards = this.teams[this.order[this.turnPlayer].team].players[this.order[this.turnPlayer].player].cards
        
        if(this.turnCount-1 == 1){
            this.baseCard =  this.tableCards[0]
        }

        if((this.turnPlayer+4)%4 == this.basePlayer){
            this.canCatchAgain = 0 
            cards.forEach(carte =>{
                if(this.getValue(carte) === this.getValue(this.baseCard) || this.getValue(carte) == 7){
                    this.canCatchAgain = 1
                }
            })
        }
        
        console.log('turnPlayer:',this.turnPlayer, '  basePlayer:',this.basePlayer,'  catchedBy:', this.catchedBy)
    }

    
    stopGame(io){
        this.resetRoom(io)
    }
    resetRoom(io){
        this.started=0
        this.teams = [
            {
                players: [],
                points: 0
            },
            {
                players: [],
                points: 0
            }
        ]
        this.readyCount = 0

        this.initGame()
        io.to(this.room).emit('resetRoom', this)  
        io.to(this.room).emit('updateRoom', this)
        io.to(this.room).emit('updateTeam', this)
    }
    initGame(){
        this.resetGame()
    }
    resetGame() {
        this.cardIndex = 1
        this.turnPlayer = -1
        this.catchedBy = 0
        this.baseCard = 0 
        this.basePlayer = 0
        this.time = 0
        this.seconds = 0
        this.startTurnTime = 0
        this.shuffleCards(this.cards)
    }
    getPlayerIndex(players, id) {
        let index = players.findIndex(player => {
            return player.id == id
        })
        return index
    }
    getPlayerIndexByOrder(orderIndex){
        let index = this.players.findIndex(player =>{
            return player.id == this.teams[this.order[orderIndex].team].players[this.order[orderIndex].player].id
        })
        return index
    }
    getValue(card){
        let value = card.toString().substr(2,card.length-2)
        return value
    }
}
module.exports = Game