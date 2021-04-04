class Game {
    constructor() {

    }
    //
    started = 0
    room = null

    //cards
    cardIndex = 1
    cardsInHand = 0
    cards = [
        "back", "B_2", "B_3", "B_4", "B_7", "B_8", "B_9", "B_10", "B_11", "F_2", "F_3", "F_4", "F_7", "F_8", "F_9", "F_10",
        "F_11", "G_2", "G_3", "G_4", "G_7", "G_8", "G_9", "G_10", "G_11", "I_2", "I_3", "I_4", "I_7", "I_8", "I_9", "I_10", "I_11"
    ]
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
    turnPlayer = 0
    catchedBy = 0
    base = 0 
    round = 0

    //constants
    step = 50
    second = 1000
    turnTime = 10000
    roundTime = 4*this.turnTime

    //variables
    time = 0 
    seconds = 0
    startTurnTime
    
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
        io.to(this.room).emit('clearTable')
        this.started = 1
        this.cardsInHand = 4
        this.sendCards(4, this.turnPlayer, io)

        let interval = setInterval(async ()=>{
            if(this.time%this.roundTime==0){
               this.newRound(io)
            }
            if(this.time%this.turnTime==0)
            {
                this.newTurn(io)
                
            }
            if(this.time%this.second == 0){
                this.newSecond(io)
            }

            this.time+= this.step
            this.seconds= Math.floor(this.time/1000)
        }, this.step)

    }
    async newRound(io){
        this.round++
        this.time=0
        io.to(this.room).emit('newRound', this.round)
    }
    async newTurn(io){
        let turn = {
            player: this.turnPlayer,
            order: this.order
        }

        let player = this.players[this.getPlayerIndexByOrder(this.turnPlayer)]
        io.to(this.room).emit('newTurn', turn)
        io.to(player.id).emit('myTurn')

        this.turnPlayer = (this.turnPlayer+1) % 4

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
    startRound() {

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
        this.turnPlayer = 0
        this.catchedBy = 0
        this.base = 0 
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
}
module.exports = Game