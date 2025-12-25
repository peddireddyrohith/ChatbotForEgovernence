const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const connectDB = require('../config/db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const addAdmin = async () => {
    try {
        await connectDB();
        console.log('Connected to Database.');

        console.log('\n--- Add New Admin ---\n');

        const name = await question('Enter Admin Name: ');
        const email = await question('Enter Admin Email: ');
        const password = await question('Enter Admin Password: ');


        if (!name || !email || !password) {
            console.log('Error: Name, Email, and Password are required.');
            process.exit(1);
        }

        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            console.log('Error: Admin with this email already exists.');
            process.exit(1);
        }

        const admin = await Admin.create({
            name,
            email,
            password,

        });

        console.log(`\nSuccess! Admin ${admin.name} created.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addAdmin();
