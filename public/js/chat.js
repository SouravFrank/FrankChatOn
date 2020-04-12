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
const $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    //NewMessage element
    const $newMessage = $messages.lastElementChild

    //height if the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    
    //visible height
    const visibleHeight = $messages.offsetHeight
    
    //Height of message container
    const containerHeight = $messages.scrollHeight

    //How far I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if( containerHeight - newMessageHeight <= scrollOffset ) {
        $messages.scrollTop = $messages.scrollHeight
    }
     
}

socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render($messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('hh:mm:ss A')
    })
    $messages.insertAdjacentHTML('beforeend', html  )  
    autoscroll()
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render($locationTemplate, {
        username: message.username,
        location: message.location,
        createdAt: moment(message.createdAt).format('hh:mm:ss A')
    })
    $messages.insertAdjacentHTML('beforeend', html  )  
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {  
    console.log(users);
      
    const html = Mustache.render($sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
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

socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
})