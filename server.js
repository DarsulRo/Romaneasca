const socketio = require('socket.io')
const http = require('http')
const express = require('express')
const Game = require('./program/game')
const { randomInt } = require('crypto')
const {google} = require('googleapis')

//EXPRESS SETTINGS
const app = express()
app.set('view engine', 'ejs')
app.use('/public', express.static('public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//HTTP & SOCKET
const server = http.createServer(app)
const io = socketio(server)

app.get('/', (req, res) => {
    res.render('landing.ejs');
})
app.get('/game', (req, res) => {
    if (getPartyIndex(req.query.room) > -1)
        if (getParty(getPartyIndex(req.query.room)).game.playerCount > 3) {
            return res.send('Camera este plina, incearca alta.')
        }
    res.render('game.ejs')
})


function funUsername(username){
    if(username.toLowerCase()=='andrada'){
        return 'Păpădie'
    }
    if(username.toLowerCase()=='veli' || username.toLowerCase()=='velicea'){
        return 'Veli Vijelie'
    }
    return username
}
let parties = []
let allPlayers = []
//SOCKET 
io.on('connection', async (socket) => {

    //ROOM
    socket.on('joinRoom', ({ room, username }) => {
        
        username = funUsername(username)
        let partyIndex = getPartyIndex(room)
        let party = null

        if (partyIndex > -1) {
            party = getParty(partyIndex)
        }
        else {
            let p = {
                game: new Game(),
                room: room
            }
            p.game.room = room
            parties.push(p)
            party = parties[parties.length - 1]
            partyIndex = 0
            party.game.resetRoom(io)
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
        io.to(room).emit('updateRoom', party.game)
        io.to(room).emit('updateTeam', party.game)
    })


    socket.on('joinTeam', ({ room, username, team }) => {
        let party = null
        let id = socket.id

        username = funUsername(username)

        party = getParty(getPartyIndex(room))
        if (party) {
            party.game.leaveTeam(id)
            party.game.joinTeam(id, username, team)
            io.to(room).emit('updateTeam', party.game)

            if (party.game.readyCount == 4)  //INITIATING GAME
            {
                let count = party.game.startingTime
                let starting = setInterval(function () {
                    if (party.game.readyCount < 4) {
                        clearInterval(starting)
                        count = party.game.startingTime
                        return
                    }

                    io.to(room).emit('startingIn', count)
                    party.game.initGame()
                    if (count < 0) {
                        clearInterval(starting)

                        //STARING GAME
                        party.game.startGame(io)
                        io.to(room).emit('gameStarted', party.game)

                        party.game.teams.forEach(team => {
                            team.players.forEach(player => {
                                io.to(player.id).emit('sendCards', player.cards)
                            })
                        });
                        //////////////////////
                    }
                    count--;
                }, 1000)
            }
        }
    })

    socket.on('playCard', ({ card, room }) => {
        let party = parties[getPartyIndex(room)]
        if(party){
            party.game.playCard(socket.id, card, io)
        }
    })
    socket.on('wontCatch', (room) => {
        let party = parties[getPartyIndex(room)]
        if(party){
            party.game.speedTurn()
        }
    })
    socket.on('sendChatMessage', (util) => {
        let party = parties[getPartyIndex(util.room)]
        let code = randomInt(999999)
        let ord = getOrderById(party.game.teams, socket.id)

        io.to(util.room).emit('chatMessage',{
            message: util.message,
            team: ord.team,
            player: ord.player,
            code: code
        })
    })
    socket.on('lobbyMessage',(util)=>{
        let playerIndex = getPlayerIndex(allPlayers,socket.id)
        if(playerIndex !=-1){
            let username = allPlayers[playerIndex].username
            io.to(util.room).emit('newLobbyMessage',{
                username: username,
                message: util.message
            })
        }
    })


    socket.on('disconnect', () => {
        let allPlayersIndex = getPlayerIndex(allPlayers, socket.id)
        if (allPlayersIndex > -1) {
            let playerPartyIndex = allPlayers[allPlayersIndex].partyIndex
            let playerIndex = getPlayerIndex(parties[playerPartyIndex].game.players, socket.id)
            let room = allPlayers[allPlayersIndex].room

            allPlayers.splice(allPlayersIndex, 1)

            if (parties[playerPartyIndex].game.started == 1) {
                parties[playerPartyIndex].game.stopGame(io)
            }
            // console.log('leaving - ', allPlayers[allPlayersIndex].username)
            //remove player from teams
            let team0Index = getPlayerIndex(parties[playerPartyIndex].game.teams[0].players, socket.id)
            let team1Index = getPlayerIndex(parties[playerPartyIndex].game.teams[1].players, socket.id)
            if (team0Index > -1) {
                parties[playerPartyIndex].game.readyCount--
                parties[playerPartyIndex].game.teams[0].players.splice(team0Index, 1)
            }
            if (team1Index > -1) {
                parties[playerPartyIndex].game.readyCount--
                parties[playerPartyIndex].game.teams[1].players.splice(team1Index, 1)
            }

            //remove player from the rest
            parties[playerPartyIndex].game.players.splice(playerIndex, 1)
            parties[playerPartyIndex].game.playerCount--
            parties[playerPartyIndex].game.started = 0
            parties[playerPartyIndex].game.resetRoom(io)
            io.to(room).emit('stopSong')
            io.to(room).emit('updateRoom', parties[playerPartyIndex].game)
            io.to(room).emit('updateTeam', parties[playerPartyIndex].game)
        }
    })


    
    socket.on('songRequest', async ({song, room})=>{
        
        let search = await google.youtube('v3').search.list({
            key: "AIzaSyD1u6GY6BEJi6IUAd9lha6RTyRU9ORTAnk",
            part:'snippet',
            q:song,
            maxResults:1
        })
        let id = search.data.items[0].id.videoId
        let title = search.data.items[0].snippet.title
        io.to(room).emit('songId', {id, title})
    })

})

function getPartyIndex(room) {
    let partyIndex = parties.findIndex((p) => {
        return p.room == room
    })
    return partyIndex
}
function getParty(index) {
    return parties[index]
}
function getPlayerIndex(players, id) {
    let playerIndex = players.findIndex(player => {
        return player.id == id
    })
    return playerIndex
}
function getOrderById(teams, id) {
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (teams[i].players[j].id == id) {
                return {
                    team: i,
                    player: j
                }
            }
        }
    }
    return undefined
}











//STARTING SERVER
const PORT = 8000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${new Date().toLocaleTimeString()}`)
})



