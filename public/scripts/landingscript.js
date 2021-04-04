let form = document.getElementById('landing-form')

form.addEventListener('submit',function(e){
    e.preventDefault()
    let username = document.getElementById('username').value
    let room = document.getElementById('room').value

    if(username != '' && room != ''){
        form.submit()
    }else{
        console.log('NULL')
    }
})