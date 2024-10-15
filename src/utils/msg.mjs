// src/utils/messages.mjs

/**
 * Generates a message object.
 * @param {string} username - The username of the sender.
 * @param {string} text - The message text.
 * @returns {Object} - Returns an object containing the username, text, and creation timestamp.
 */
export const generateMessage = (username, text) => {
    return {
        username,
        text,
        createdAt: new Date().getTime()
    };
};

/**
 * Generates a location message object.
 * @param {string} username - The username of the sender.
 * @param {string} location - The location URL.
 * @returns {Object} - Returns an object containing the username, location URL, and creation timestamp.
 */
export const generateLocationMessage = (username, location) => {
    return {
        username,
        location,
        createdAt: new Date().getTime()
    };
};