console.log('--- DIAGNOSTIC START ---');
require('dotenv').config({ path: 'backend/.env' });
const apiKey = process.env.META_API_KEY;
if (!apiKey) {
    console.log('STATUS: MISSING');
} else {
    console.log('STATUS: FOUND');
    console.log('PREFIX:', apiKey.substring(0, 8));
    console.log('LENGTH:', apiKey.length);
}
console.log('--- DIAGNOSTIC END ---');
