const socket = io()

//Elements
const $messageForm = document.querySelector('#text_form')
const $messageFormInput = $messageForm.querySelector('textarea')
const $messageFormButton = $messageForm.querySelector('button[type="submit"]')
const $geoLocation = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $toggleComposeButton = document.getElementById('toggle-compose')
const $composeArea = document.querySelector('.compose')

//Templates
const $messageTemplate = document.querySelector('#message-template').innerHTML
const $locationTemplate = document.querySelector('#location-template').innerHTML
const $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

// Function to handle autoscrolling
const autoscroll = () => {
    const $newMessage = $messages.lastElementChild

    // Calculate the height of the new message including margin
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    
    // Visible height of the messages container
    const visibleHeight = $messages.offsetHeight
    
    // Total height of the messages container
    const containerHeight = $messages.scrollHeight

    // How far have we scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    // If we are at the bottom before the new message, scroll to the bottom
    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = containerHeight
    }
}

// Toggle compose area
$toggleComposeButton.addEventListener('click', () => {
    $composeArea.classList.toggle('expanded');
    $toggleComposeButton.classList.toggle('expanded');
    if ($composeArea.classList.contains('expanded')) {
        $messageFormInput.style.height = '100%';
        $toggleComposeButton.querySelector('.btn-text').textContent = 'Collapse';
    } else {
        $messageFormInput.style.height = 'auto';
        $messageFormInput.style.height = ($messageFormInput.scrollHeight) + 'px';
        $toggleComposeButton.querySelector('.btn-text').textContent = 'Expand';
    }
});

// Updated auto-resize textarea function
$messageFormInput.addEventListener('input', function() {
    if (!$composeArea.classList.contains('expanded')) {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    }
});

// Function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Function to convert newlines to <br> tags
function nl2br(str) {
    return str.replace(/\n/g, '<br>');
}

// Function to copy message content
function copyMessageContent(message, button) {
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        console.log('Message copied to clipboard');
        button.textContent = 'Copied!';
        button.disabled = true;
        setTimeout(() => {
            button.textContent = 'Copy';
            button.disabled = false;
        }, 1000);
    } catch (err) {
        console.error('Could not copy text: ', err);
    } finally {
        document.body.removeChild(textarea);
    }
}

// Event delegation for copy buttons
$messages.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-button')) {
        const message = e.target.getAttribute('data-message');
        copyMessageContent(message, e.target);
    }
});

// Add a system message template reference
const $systemMessageTemplate = document.querySelector('#system-message-template').innerHTML

// Update the message event handler to differentiate message types
socket.on('message', (message) => {
    // Check if this is a system message
    if (message.username === 'system') {
        const html = Mustache.render($systemMessageTemplate, {
            message: message.text,
            createdAt: moment(message.createdAt).format('hh:mm:ss A')
        })
        $messages.insertAdjacentHTML('beforeend', html)
    } else {
        // Regular message - check if it's from the current user
        const isCurrentUser = message.username === username;
        
        const html = Mustache.render($messageTemplate, {
            username: message.username,
            message: nl2br(escapeHtml(message.text)),
            rawMessage: message.text,
            createdAt: moment(message.createdAt).format('hh:mm:ss A'),
            isCurrentUser: isCurrentUser,
            isSystem: false
        })
        $messages.insertAdjacentHTML('beforeend', html)
    }
    
    // Add a subtle animation to the new message
    const $newMessage = $messages.lastElementChild
    $newMessage.style.opacity = '0'
    $newMessage.style.transform = 'translateY(20px)'
    
    // Trigger animation after a small delay
    setTimeout(() => {
        $newMessage.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        $newMessage.style.opacity = '1'
        $newMessage.style.transform = 'translateY(0)'
    }, 10)
    
    autoscroll()
})

// Update location message handler to identify current user
socket.on('locationMessage', (message) => {
    const isCurrentUser = message.username === username;
    
    const html = Mustache.render($locationTemplate, {
        username: message.username,
        location: message.location,
        createdAt: moment(message.createdAt).format('hh:mm:ss A'),
        isCurrentUser: isCurrentUser
    })
    $messages.insertAdjacentHTML('beforeend', html)
    
    // Add animation to location message
    const $newMessage = $messages.lastElementChild
    $newMessage.style.opacity = '0'
    $newMessage.style.transform = 'translateY(20px)'
    
    setTimeout(() => {
        $newMessage.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        $newMessage.style.opacity = '1'
        $newMessage.style.transform = 'translateY(0)'
    }, 10)
    
    autoscroll()
})

// Add typing indicator functionality
let typingTimeout;
$messageFormInput.addEventListener('input', function() {
    // Resize textarea as before
    if (!$composeArea.classList.contains('expanded')) {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    }
    
    // Emit typing event
    clearTimeout(typingTimeout);
    socket.emit('typing', { username, room });
    
    // Clear typing status after 2 seconds of inactivity
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { username, room });
    }, 2000);
});

// Handle typing indicators from other users
socket.on('userTyping', (user) => {
    // Only show typing indicator if it's not the current user
    if (user !== username) {
        // Check if typing indicator already exists
        let typingElement = document.querySelector('.typing-indicator');
        if (!typingElement) {
            typingElement = document.createElement('div');
            typingElement.className = 'typing-indicator';
            typingElement.innerHTML = `<span class="typing-user">${user}</span> is typing<span class="typing-dots">...</span>`;
            $messages.appendChild(typingElement);
            autoscroll();
        } else {
            typingElement.innerHTML = `<span class="typing-user">${user}</span> is typing<span class="typing-dots">...</span>`;
        }
    }
});

// Handle when user stops typing
socket.on('userStoppedTyping', (user) => {
    const typingElement = document.querySelector('.typing-indicator');
    if (typingElement) {
        typingElement.remove();
    }
});

socket.on('roomData', ({ room, users }) => {
    console.log(users)
    const html = Mustache.render($sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

// New function to handle message sending
function sendMessage() {
    const message = $messageFormInput.value.trim();
    if (message) {
        $messageFormButton.setAttribute('disabled', 'disabled');
        socket.emit('sendMessage', message, (callback) => {
            $messageFormButton.removeAttribute('disabled');
            $messageFormInput.value = '';
            $messageFormInput.style.height = 'auto';
            $messageFormInput.focus();
        });
    }
}

// Updated event listener for form submission
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
});

// New event listener for textarea key presses
$messageFormInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        if (!$composeArea.classList.contains('expanded')) {
            e.preventDefault();
            sendMessage();
        }
    }
});

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
            console.log('Location sent')
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
