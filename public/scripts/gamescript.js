var socket = io()

let choose_razboinici = document.getElementById("choose_razboinici")
let choose_faimosi = document.getElementById("choose_faimosi")

const params = new URLSearchParams(window.location.search)
document.title = `Room [${params.get('room')}]`

socket.emit('joinRoom',{
    room: params.get('room'),
    username: params.get('username')
})
socket.on('updateRoom',function(game){
    let players_container = document.querySelector('.players-container')
    players_container.innerText=''

    game.players.forEach(player => {
        if(player.id!=undefined)
            players_container.insertAdjacentText('beforeend',` ${player.username} `)
    });
    document.querySelector('.players-label').innerText=`Players [${game.playerCount}/4] : `
})


choose_razboinici.addEventListener('click',function(){
    let team = choose_razboinici.getAttribute('team')
    socket.emit('joinTeam',{
        room: params.get('room'),
        username: params.get('username'),
        team: team
    })
    
})
choose_faimosi.addEventListener('click',function(){
    let team = choose_faimosi.getAttribute('team')
    socket.emit('joinTeam',{
        room: params.get('room'),
        username: params.get('username'),
        team: team
    })
})
socket.on('updateTeam', function(game){
    updateTeams(game)
})
function updateTeams(game){
    let sides = document.querySelectorAll('.side[team] > .members')
    sides.forEach(side => {
        side.innerHTML=''
    });
    let i =0
    game.teams.forEach(team =>{
        team.players.forEach(player =>{
            sides[i].insertAdjacentHTML('beforeend', `<h4>${player.username}</h4>`)
        })
        i++
    })
    document.getElementById('ready').innerText=`Players ready... [${game.readyCount}/4]`
}

let lobbyForm = document.getElementById('lobby-chat')
lobbyForm.addEventListener('submit',()=>{
    let input = document.querySelector('#lobby-chat input')
    socket.emit('lobbyMessage',{room: params.get('room'),message:input.value})

    input.value=''
    input.focus()
})
socket.on('newLobbyMessage',util=>{
    let chatHistory = document.getElementById('chat-history')
    chatHistory.insertAdjacentHTML('beforeend',`
    <div class="message">
        <span class="user">${util.username}</span>
        <p class="content">${util.message}</p>
    </div>
    `)
    chatHistory.scrollTop = chatHistory.scrollHeight;
})

socket.on('gameStarted', (game)=>{
    game.order.forEach(ord=>{
        let box = document.querySelector(`.userbox[team="${ord.team}"][player="${ord.player}"] > .name`)
        box.innerText=game.teams[ord.team].players[ord.player].username
    })
    document.getElementById('endGame').style.display='none'
})
socket.on('startingIn', function(count){

    document.getElementById('ready').innerText = `Starting in ${count}`
    if(count == 0){
        document.getElementById("over").style.display='none'
    }
})

socket.on('resetRoom', function(game){
    document.getElementById("over").style.display='flex'
    document.getElementById('ready').innerText = 'Players ready... [0/4]'
})
socket.on('sendCards', function(cards){
    clearMyCards()
    let mycards = document.getElementById('my-cards')
    cards.forEach(card =>{
        mycards.insertAdjacentHTML('beforeend',buildMyCard(card))
    })
})
socket.on('clearCards',()=>{
   clearMyCards()
   clearTableCards()
})


socket.on('newRound', (round)=>{
    document.getElementById('round-label').innerText=`Round ${round}`
    clearTableCards()
})
socket.on('newTurn', (ord)=>{
    disableCards()
    setPlayerTurn(ord.team, ord.player)
})
socket.on('myTurn',()=>{
    enableCards()
})
socket.on('newSecond', (obj)=>{
    document.getElementById('time-left').innerText=obj.timeLeft
    let bar = document.getElementById('bar')

    if(obj.timeLeft == obj.turnTime){
        bar.style.transition = 'all 0s linear'
        bar.style.left = 0
    }
    let left = 100*(1 - (obj.timeLeft-1)/obj.turnTime)
    bar.style.transition = 'all 1.2s linear'
    bar.style.left= `-${left}%`
})


function clearMyCards(){
    let mycards = document.getElementById('my-cards')
    mycards.innerHTML=''
}
function clearTableCards(){
    let tableCards = document.getElementById('table-cards')
    tableCards.innerHTML=''
}
function getSuit(card){
    let suit = card.substring(0,1)
    return suit
}
function getValue(card){
    let value = card.substr(2,card.length-2)
    return value
}
function buildTableCard(card){
    return `
    <div class="card TABLE-CARD" >
        <img src="../public/res/carti/${card}.png" alt="">
    </div>`
}
function buildMyCard(card){
    return `
    <div onclick="playCard('${card}')" class="card" suit="${getSuit(card)}" value="${getValue(card)} card=${card}">
        <img src="../public/res/carti/${card}.png" alt="">
    </div>`
}
function disableCards(){
    document.getElementById('my-cards').classList.add('DISABLED')
}
function enableCards(){
    document.getElementById('my-cards').classList.remove('DISABLED')
}
function setPlayerTurn(t, p){
    let players = document.querySelectorAll('.userbox[team][player]')
    players.forEach(player =>{
        player.classList.remove('TURN')
    })
    document.querySelector(`.userbox[team="${t}"][player="${p}"]`).classList.add('TURN')
}
function playCard(card){
    socket.emit('playCard', {card:card, room: params.get('room')})
}
socket.on('cardPlayed', card=>{
    let tableCards = document.getElementById('table-cards')
    tableCards.insertAdjacentHTML('beforeend',buildTableCard(card))
})
socket.on('catched', (ord)=>{
    
    let players = document.querySelectorAll('.userbox[team][player]')
    players.forEach(player =>{
        player.classList.remove('CATCHED')
    })
    document.querySelector(`.userbox[team="${ord.team}"][player="${ord.player}"]`).classList.add('CATCHED')

})
socket.on('willCatch', (can)=>{
    if(can==1){
        document.querySelector('.willCatch').classList.remove('INVISIBLE')
    }
    else{
        document.querySelector('.willCatch').classList.add('INVISIBLE')
    }
})
function wontCatch(){
    socket.emit('wontCatch', params.get('room'))
}


socket.on('updateScore', teams=>{
    let razboinici = document.querySelector(`nav [team="0"] .scor`)
    razboinici.innerHTML = teams[0].points

    let faimosi = document.querySelector(`nav [team="1"] .scor`)
    faimosi.innerHTML = teams[1].points
})

socket.on('endGame',(teams)=>{
    document.getElementById('time-left').innerText = 'Game Over'
    let bar = document.getElementById('bar')
    bar.style.left = "-100%"

    let points = document.querySelectorAll('#endGame .score .points')
    let cartiDuse = document.querySelectorAll('#endGame .score .cartiDuse')
    for(let i = 0;i<2;i++){
        points[i].innerHTML= teams[i].points + ' Puncte'
        cartiDuse[i].innerHTML =teams[i].cartiDuse + ' Cărți'
    }
    document.getElementById('endGame').style.display = 'flex'

})

let chatForm = document.getElementById('chat-form')
chatForm.addEventListener('submit',()=>{
    let input = document.getElementById('chat-input')
    if(input.value == '')return
    let util = {
        room: params.get('room'),
        message: input.value
    }
    socket.emit('sendChatMessage', util)
    input.value=''
})
function shout(target){
    let util = {
        room: params.get('room'),
        message: target.innerText
    }
    socket.emit('sendChatMessage', util)
}

socket.on('chatMessage', util=>{
    let messageBox = document.querySelector(`.userbox[team="${util.team}"][player="${util.player}"] .messageBox`)
    messageBox.insertAdjacentHTML('beforeend',generateMessage(util.message, util.code))
    setTimeout(() =>{
        document.querySelector(`[code="${util.code}"]`).remove()
    },5000)
})
function generateMessage(msg,code){
    return `<div code="${code}"class="message FADEIN">${msg}</div>`
}


