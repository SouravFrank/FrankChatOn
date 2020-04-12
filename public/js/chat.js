const socket = io()

//Elements
const $messageForm = document.querySelector('#text_form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $geoLocation = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

//Templates
const $messageTemplate = document.querySelector('#message-template').innerHTML
const $locationTemplate = document.querySelector('#location-template').innerHTML

socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render($messageTemplate, {
        message: message.text,
        createdAt: moment(message.createdAt).format('hh:mm:ss A')
    })
    $messages.insertAdjacentHTML('beforeend', html  )  
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render($locationTemplate, {
        location: message.location,
        createdAt: moment(message.createdAt).format('hh:mm:ss A')
    })
    $messages.insertAdjacentHTML('beforeend', html  )  
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    $messageForm.setAttribute('disabled', 'disabled')

    //Disabled
    const message = e.target.elements.message.value
    socket.emit('sendMessage', message, (callback) => {
        //Enabled
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()
        console.log(callback);
    })  
})

$geoLocation.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alert('Geolocation unsupported!')
    }
    //Disabled
    $geoLocation.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('getLocation', {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }, () => {
            console.log('Location send')
            //Enabled
            $geoLocation.removeAttribute('disabled')
        })    
    })
})
