const User = require('../models/User');//Imports the User model to interact with the users collection in the database.
const Conversation = require('../models/Conversation');//Imports the Conversation model to interact with the conversations collection in the database.
const Message = require('../models/Message');//Imports the Message model to interact with the messages collection in the database.


const getAllUsers = async (req, res) => {//Defines an asynchronous function to get all users.
    try {
        const users = await User.find({}).select('-password');//Fetches all users from the database, excluding their password fields for security.
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });//Sends a 500 status code and error message if something goes wrong.
    }
};


const getAllConversations = async (req, res) => {//Defines an asynchronous function to get all conversations.
    try {

        const conversations = await Conversation.find({})//Fetches all conversations from the database.
            .populate('userId', 'name email')//Populates the userId field with the user's name and email.
            .sort({ priority: 1, updatedAt: -1 });//Sorts conversations by priority (ascending) and then by last updated time (descending).
        res.json(conversations);//Sends the list of conversations as a JSON response.
    } catch (error) {
        res.status(500).json({ message: error.message });//Sends a 500 status code and error message if something goes wrong.
    }
};


const getStats = async (req, res) => {//Defines an asynchronous function to get statistics about users, conversations, and messages.
    try {
        const userCount = await User.countDocuments();//Counts the total number of users in the database.
        const chatCount = await Conversation.countDocuments();//Counts the total number of conversations in the database.
        const messageCount = await Message.countDocuments();//Counts the total number of messages in the database.

        res.json({//Sends the counts as a JSON response.
            users: userCount,//Returns the total number of users.
            conversations: chatCount,//Returns the total number of conversations.
            messages: messageCount, //Returns the total number of messages.
        });
    } catch (error) {
        res.status(500).json({ message: error.message });//Sends a 500 status code and error message if something goes wrong.
    }
};

module.exports = { getAllUsers, getAllConversations, getStats };//Exports the defined functions so they can be used in other parts of the application.
