let media = document.getElementById('media')
media.addEventListener('submit',()=>{
    let input = document.querySelector('#media input')
    let param = new URLSearchParams(window.location.search)
    socket.emit('songRequest', {song: input.value,room: param.get('room')})
    input.value=''
    input.focus()
})


var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '150',
    width: '300',
    videoId: '',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  //event.target.playVideo();
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;
function onPlayerStateChange(event) {
//   if (event.data == YT.PlayerState.PLAYING && !done) {
//     setTimeout(stopVideo, 6000);
//     done = true;
//   }
}
function stopVideo() {
  player.stopVideo();
}
socket.on('songId', ({id,title}) =>{
    player.loadVideoById(id)
    player.playVideo()
    player.setVolume(20)
    let songTitle = document.querySelector('.song-title')
    songTitle.innerHTML = title
})
socket.on('stopSong',()=>{
  player.pauseVideo()
})

let mute = document.querySelector('.volume')
mute.addEventListener('click',()=>{
    let volumeImg = document.querySelector('.volume img')

    if(player.isMuted()==true){
        player.unMute();
        volumeImg.setAttribute('src','../public/res/images/volume.svg')
    }
    else {
        player.mute()
        volumeImg.setAttribute('src','../public/res/images/muted.svg')
    }
})