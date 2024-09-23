// src/utils/users.mjs

const users = [];

/**
 * Adds a new user to the users array.
 * @param {Object} param0 - Object containing user id, username, and room.
 * @returns {Object} - Returns an object with either the user or an error message.
 */
export const addUser = ({ id, username, room }) => {
    // Clean the data
    username = username.trim().toLowerCase();
    room = room.trim().toLowerCase();

    // Validate the data
    if (!username || !room) {
        return { error: "Username and room are required" };
    }

    // Check for existing user
    const existingUser = users.find((user) => user.room === room && user.username === username);

    // Validate username
    if (existingUser) {
        return { error: 'Username is in use!' };
    }

    // Store user
    const user = { id, username, room };
    users.push(user);
    return { user };
};

/**
 * Removes a user from the users array.
 * @param {string} id - The id of the user to remove.
 * @returns {Object} - Returns the removed user object.
 */
export const removeUser = (id) => {
    const index = users.findIndex((user) => user.id === id);

    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
};

/**
 * Gets a user by id.
 * @param {string} id - The id of the user to get.
 * @returns {Object} - Returns the user object.
 */
export const getUser = (id) => {
    return users.find((user) => user.id === id);
};

/**
 * Gets all users in a specific room.
 * @param {string} room - The room to get users from.
 * @returns {Array} - Returns an array of users in the room.
 */
export const getUsersInRoom = (room) => {
    room = room.trim().toLowerCase();
    return users.filter((user) => user.room === room);
};