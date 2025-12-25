
const mongoose = require('mongoose');//Imports Mongoose, a library that helps Node.js communicate with MongoDB.

const connectDB = async () => {//Declares an asynchronous function named connectDB.
    try {//Starts a try block to handle potential errors during the database connection process.
        if (!process.env.MONGO_URI) {//Checks if the MONGO_URI environment variable is defined.
            throw new Error('MONGO_URI is not defined in .env'); //If not defined, throws an error with a descriptive message.
        }
        const conn = await mongoose.connect(process.env.MONGO_URI.replace('localhost', '127.0.0.1'));//Uses Mongoose to connect to MongoDB.
// await pauses execution until the connection is successful or fails and Replaces localhost with 127.0.0.1 in the MongoDB URI.
        console.log(`MongoDB Connected: ${conn.connection.host}`);//Logs a success message to the console, including the host of the connected database.
    } catch (error) {//
        console.error('CRITICAL: MongoDB Connection Failed');
        console.error(error);//Logs an error message to the console if the connection fails, along with the error details.
        process.exit(1);//Exits the process with a failure code (1) to indicate that the application cannot run without a database connection.  
    }
};

module.exports = connectDB;//Exports the connectDB function so it can be used in other parts of the application.
