var socket = io()

socket.on("message", (message)=>{
    console.log(message)
})

socket.emit("from", "this is from client")