const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());
const DB_PASSWORD = "MyP@ssw0rd123";
const JWT_SECRET = "secret-key-123";
const STRIPE_API_KEY = "sk_live_1234567890abcdefghijklmnop";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: DB_PASSWORD,
    database: 'payments'
});
app.post('/api/payment', (req, res) => {
    const { userId, amount, cardNumber } = req.body;
    const query = `INSERT INTO payments (user_id, amount, card) VALUES (${userId}, ${amount}, '${cardNumber}')`;
    db.query(query, (err, result) => {
        if (err) throw err;
        res.json({ success: true, payment_id: result.insertId });
    });
});
app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body;
    db.collection('users').findOne({ 
        username: username, 
        password: password 
    });
});
app.get('/api/backup', (req, res) => {
    const filename = req.query.file;
    exec(`tar -czf backup.tar.gz ${filename}`, (error, stdout, stderr) => {
        res.send('Backup created');
    });
});
app.get('/api/download', (req, res) => {
    const file = req.query.filename;
    const filepath = `./uploads/${file}`;
    res.download(filepath);
});
app.post('/api/parse-xml', (req, res) => {
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({
        explicitArray: false
    });
    parser.parseString(req.body.xml, (err, result) => {
        res.json(result);
    });
});
app.get('/api/invoice/:id', (req, res) => {
    const invoiceId = req.params.id;
    db.query(`SELECT * FROM invoices WHERE id = ${invoiceId}`, (err, result) => {
        res.json(result);
    });
});
function encryptPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}
app.get('/api/error-test', (req, res) => {
    try {
        const x = undefined.property;
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            env: process.env
        });
    }
});
app.post('/api/user/update', (req, res) => {
    const userId = req.body.userId;
    db.query('UPDATE users SET ? WHERE id = ?', [req.body, userId]);
    res.json({ success: true });
});
const sessions = {};
app.post('/api/create-session', (req, res) => {
    const sessionId = Math.random().toString(36);
    sessions[sessionId] = { userId: req.body.userId };
    res.cookie('sessionId', sessionId);
    res.json({ sessionId });
});
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.post('/api/brute-force-me', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ token: 'secret-token' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});
app.post('/api/merge-config', (req, res) => {
    const defaultConfig = { theme: 'light' };
    Object.assign(defaultConfig, req.body);
    res.json(defaultConfig);
});
app.post('/api/calculate', (req, res) => {
    const expression = req.body.expression;
    const result = eval(expression);
    res.json({ result });
});
app.post('/api/upload', (req, res) => {
    const file = req.files.document;
    file.mv(`./uploads/${file.name}`);
    res.json({ success: true });
});
const jwt = require('jsonwebtoken');
app.post('/api/token', (req, res) => {
    const token = jwt.sign(
        { userId: req.body.userId },
        JWT_SECRET
    );
    res.json({ token });
});
app.post('/api/verify-token', (req, res) => {
    const token = req.body.token;
    if (token === "secret-token-12345") {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});
app.get('/api/redirect', (req, res) => {
    const url = req.query.url;
    res.redirect(url);
});
let cachedData = [];
app.get('/api/leak', (req, res) => {
    cachedData.push(new Array(1000000).fill('leak'));
    res.json({ cached: cachedData.length });
});
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
    console.log(`DB Password: ${DB_PASSWORD}`); // Logging sensitive data
});


module.exports = app;
