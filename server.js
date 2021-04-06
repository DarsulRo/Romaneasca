const socketio = require('socket.io')
const http = require('http')
const express = require('express')
const Game = require('./program/game')

//EXPRESS SETTINGS
const app = express()
app.set('view engine', 'ejs')
app.use('/public',express.static('public'));
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//HTTP & SOCKET
const server = http.createServer(app)
const io = socketio(server)


app.get('/',(req,res)=>{
    res.render('landing.ejs');
})
app.get('/game',(req,res)=>{
    if(getPartyIndex(req.query.room)>-1)
        if(getParty(getPartyIndex(req.query.room)).game.playerCount > 3) {
            return res.send('Prea multi jucatori')
        }
    res.render('game.ejs')
})



let parties = []
let allPlayers = []
//SOCKET 
io.on('connection', socket =>{

    //ROOM
    socket.on('joinRoom',({room, username})=>{
        let partyIndex = getPartyIndex(room)
        let party = null

        if(partyIndex>-1){
            party = getParty(partyIndex)
        }
        else{
            let p = {
                game: new Game(),
                room: room
            }
            p.game.room = room
            parties.push(p)
            party = parties[parties.length-1]
            partyIndex = 0
            party.game.initGame()
        }

        let player = {
            username: username,
            id: socket.id,
            room: room,
            partyIndex: partyIndex
        }
        
        allPlayers.push(player)
        party.game.playerCount++
        party.game.players.push(player)

        socket.join(room)
        io.to(room).emit('updateRoom',party.game)
        io.to(room).emit('updateTeam',party.game)
    })


    socket.on('joinTeam', ({room, username, team})=>{
        let party = null
        let id = socket.id

        party = getParty(getPartyIndex(room))
        if(party){
            party.game.leaveTeam(id)
            party.game.joinTeam(id,username,team)
            io.to(room).emit('updateTeam',party.game)

            if(party.game.readyCount == 4)  //INITIATING GAME
            {
                let count = party.game.startingTime
                let starting = setInterval(function(){
                    if(party.game.readyCount<4){
                        clearInterval(starting)
                        count = party.game.startingTime
                        return
                    }
                    
                    io.to(room).emit('startingIn', count)
                    party.game.initGame()
                    if(count < 0){
                        clearInterval(starting)

                        //STARING GAME
                        party.game.startGame(io)
                        io.to(room).emit('gameStarted', party.game)

                        party.game.teams.forEach(team => {
                            team.players.forEach(player =>{
                                io.to(player.id).emit('sendCards',player.cards)
                            })
                        });
                        //////////////////////
                    }
                    count --;
                },1000)
            }
        }
    })

    socket.on('playCard', ({card,room})=>{
        let party = parties[getPartyIndex(room)]
        party.game.playCard(socket.id, card, io)
    })
    socket.on('wontCatch',()=>{
        let party = parties[getPartyIndex(room)]
        party.game.willCatchAgain = 0
    })
    socket.on('disconnect',()=>{
        let allPlayersIndex = getPlayerIndex(allPlayers, socket.id)
        if(allPlayersIndex>-1){
            let playerPartyIndex = allPlayers[allPlayersIndex].partyIndex 
            let playerIndex = getPlayerIndex(parties[playerPartyIndex].game.players, socket.id)
            let room = allPlayers[allPlayersIndex].room

            allPlayers.splice(allPlayersIndex,1)

            if(parties[playerPartyIndex].game.started==1){
                parties[playerPartyIndex].game.stopGame(io)
            }
            // console.log('leaving - ', allPlayers[allPlayersIndex].username)
            //remove player from teams
            let team0Index = getPlayerIndex(parties[playerPartyIndex].game.teams[0].players, socket.id)
            let team1Index = getPlayerIndex(parties[playerPartyIndex].game.teams[1].players, socket.id)
            if(team0Index>-1){
                parties[playerPartyIndex].game.readyCount--
                parties[playerPartyIndex].game.teams[0].players.splice(team0Index, 1)
            }
            if(team1Index>-1){
                parties[playerPartyIndex].game.readyCount--
                parties[playerPartyIndex].game.teams[1].players.splice(team1Index, 1)
            }
    
            //remove player from the rest
            parties[playerPartyIndex].game.players.splice(playerIndex,1)
            parties[playerPartyIndex].game.playerCount--
            
            io.to(room).emit('updateRoom',parties[playerPartyIndex].game)
            io.to(room).emit('updateTeam',parties[playerPartyIndex].game)
        }
    })
})

function getPartyIndex(room){
    let partyIndex = parties.findIndex((p) =>{
        return p.room == room
    })
    return partyIndex
}
function getParty(index){
    return parties[index]
}
function getPlayerIndex(players, id){
    let playerIndex = players.findIndex(player=>{
        return player.id == id
    })
    return playerIndex
}


//STARTING SERVER
const PORT = 8000
server.listen(PORT,() =>{
    console.log(`Server running on port ${PORT} at ${new Date().toLocaleTimeString()}`)
})