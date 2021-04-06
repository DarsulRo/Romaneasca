var socket = io()

let choose_razboinici = document.getElementById("choose_razboinici")
let choose_faimosi = document.getElementById("choose_faimosi")

const params = new URLSearchParams(window.location.search)
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
    let sides = document.querySelectorAll('[team] > .members')
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

socket.on('gameStarted', (game)=>{
    game.order.forEach(ord=>{
        let box = document.querySelector(`[team="${ord.team}"][player="${ord.player}"] > .name`)
        box.innerText=game.teams[ord.team].players[ord.player].username
    })
})
socket.on('startingIn', function(count){

    document.getElementById('ready').innerText = count
    if(count == 0){
        document.getElementById("over").style.display='none'
    }
})


socket.on('sendCards', function(cards){
    clearMyCards()
    let mycards = document.getElementById('my-cards')
    cards.forEach(card =>{
        mycards.insertAdjacentHTML('beforeend',buildMyCard(card))
    })
})
socket.on('resetRoom', function(game){
    document.getElementById("over").style.display='flex'
    document.getElementById('ready').innerText = 'Players ready... [0/4]'
})
socket.on('clearCards',()=>{
   clearMyCards()
   clearTableCards()
})


socket.on('newRound', (round)=>{
    document.getElementById('round-label').innerText=`Round ${round}`
    clearTableCards()
})
socket.on('newTurn', (turn)=>{
    disableCards()
    setPlayerTurn(turn.player, turn.order)
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
function setPlayerTurn(turnPlayer, order){
    let players = document.querySelectorAll('.userbox[team][player]')
    players.forEach(player =>{
        player.classList.remove('TURN')
    })
    document.querySelector(`[team="${order[turnPlayer].team}"][player="${order[turnPlayer].player}"]`).classList.add('TURN')
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
    document.querySelector(`[team="${ord.team}"][player="${ord.player}"]`).classList.add('CATCHED')

})
socket.on('willCatch', (baseCard)=>{

})