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
// Add code block detection and formatting
// Update the code block formatting function
function formatMessageWithCodeBlocks(text) {
    // Improved regex to better detect code blocks with or without language specification
    const codeBlockRegex = /```([\w-]*)\s*\n([\s\S]*?)\n\s*```/g;
    let formattedText = escapeHtml(text);
    let codeBlocks = [];
    let match;
    let index = 0;
    
    // Find all code blocks
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1].trim() || 'plaintext';
        const code = escapeHtml(match[2]);
        const placeholder = `__CODE_BLOCK_${index}__`;
        
        codeBlocks.push({
            placeholder,
            language,
            code
        });
        
        // Replace the entire match with the placeholder
        formattedText = formattedText.replace(match[0], placeholder);
        index++;
    }
    
    // Replace newlines with <br> for regular text
    formattedText = nl2br(formattedText);
    
    // Replace placeholders with formatted code blocks
    codeBlocks.forEach(block => {
        const codeBlockHtml = `
            <div class="code-block" data-language="${block.language}">
                <div class="code-block__header">
                    <span class="code-block__language">${block.language}</span>
                    <div class="code-block__actions">
                        <button class="code-block__action code-block__copy" title="Copy code">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button class="code-block__action code-block__toggle" title="Toggle code block">
                            <span class="material-icons">unfold_less</span>
                        </button>
                    </div>
                </div>
                <pre class="code-block__content"><code>${block.code}</code></pre>
            </div>
        `;
        formattedText = formattedText.replace(block.placeholder, codeBlockHtml);
    });
    
    return formattedText;
}

// Update the message template rendering to include collapse/expand functionality
socket.on('message', (message) => {
    // Check if this is a system message
    if (message.username === 'system') {
        const html = Mustache.render($systemMessageTemplate, {
            message: message.text,
            createdAt: moment(message.createdAt).format('hh:mm:ss A')
        });
        $messages.insertAdjacentHTML('beforeend', html);
    } else {
        // Regular message - check if it's from the current user
        const isCurrentUser = message.username === username;
        
        const html = Mustache.render($messageTemplate, {
            username: message.username,
            message: formatMessageWithCodeBlocks(message.text),
            rawMessage: message.text,
            createdAt: moment(message.createdAt).format('hh:mm:ss A'),
            isCurrentUser: isCurrentUser,
            isSystem: false,
            // Add a preview of the message (first line only)
            preview: message.text.split('\n')[0].substring(0, 100) + (message.text.length > 100 ? '...' : '')
        });
        $messages.insertAdjacentHTML('beforeend', html);
    }
    
    // Add animation to the new message
    const $newMessage = $messages.lastElementChild;
    $newMessage.style.opacity = '0';
    $newMessage.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        $newMessage.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        $newMessage.style.opacity = '1';
        $newMessage.style.transform = 'translateY(0)';
    }, 10);
    
    autoscroll();
});

// Add function to copy message with animation
function copyMessageContent(message, button) {
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    document.body.appendChild(textarea);
    textarea.select();
    
    // Find the message container
    const messageElement = button.closest('.message');
    
    try {
        document.execCommand('copy');
        console.log('Message copied to clipboard');
        
        // Show copied animation
        button.textContent = 'Copied!';
        button.disabled = true;
        
        // Add highlight animation to the message
        messageElement.classList.add('message--copied');
        
        // Collapse the message after copying
        if (!messageElement.classList.contains('message--collapsed')) {
            toggleMessageCollapse(messageElement);
        }
        
        setTimeout(() => {
            button.textContent = 'Copy';
            button.disabled = false;
            messageElement.classList.remove('message--copied');
        }, 1500);
    } catch (err) {
        console.error('Could not copy text: ', err);
    } finally {
        document.body.removeChild(textarea);
    }
}

// Function to toggle message collapse state
function toggleMessageCollapse(messageElement) {
    const messageContent = messageElement.querySelector('.message__content');
    const messagePreview = messageElement.querySelector('.message__preview');
    const toggleButton = messageElement.querySelector('.message__toggle');
    
    if (messageElement.classList.contains('message--collapsed')) {
        // Expand
        messageElement.classList.remove('message--collapsed');
        messageContent.style.display = 'block';
        messagePreview.style.display = 'none';
        if (toggleButton) {
            toggleButton.querySelector('.material-icons').textContent = 'expand_less';
            toggleButton.setAttribute('title', 'Collapse message');
        }
    } else {
        // Collapse
        messageElement.classList.add('message--collapsed');
        messageContent.style.display = 'none';
        messagePreview.style.display = 'block';
        if (toggleButton) {
            toggleButton.querySelector('.material-icons').textContent = 'expand_more';
            toggleButton.setAttribute('title', 'Expand message');
        }
    }
}

// Update event delegation for message actions
$messages.addEventListener('click', (e) => {
    // Handle message toggle button clicks
    if (e.target.closest('.message__toggle')) {
        const button = e.target.closest('.message__toggle');
        const messageElement = button.closest('.message');
        toggleMessageCollapse(messageElement);
    }
    
    // Handle copy button clicks
    if (e.target.classList.contains('copy-button') || e.target.closest('.copy-button')) {
        const button = e.target.classList.contains('copy-button') ? e.target : e.target.closest('.copy-button');
        const message = button.getAttribute('data-message');
        copyMessageContent(message, button);
    }
    
    // Rest of the event handlers...
});

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
