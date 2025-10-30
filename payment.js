const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(express.json());

// VULNERABILITY 1: Hardcoded sensitive credentials
const DB_PASSWORD = "MyP@ssw0rd123";
const JWT_SECRET = "secret-key-123";
const STRIPE_API_KEY = "sk_live_1234567890abcdefghijklmnop";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

// VULNERABILITY 2: Insecure database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: DB_PASSWORD,
    database: 'payments'
});

// VULNERABILITY 3: No input validation + SQL Injection
app.post('/api/payment', (req, res) => {
    const { userId, amount, cardNumber } = req.body;
    
    // SQL Injection vulnerability
    const query = `INSERT INTO payments (user_id, amount, card) VALUES (${userId}, ${amount}, '${cardNumber}')`;
    db.query(query, (err, result) => {
        if (err) throw err;
        res.json({ success: true, payment_id: result.insertId });
    });
});

// VULNERABILITY 4: NoSQL Injection (if using MongoDB)
app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body;
    // NoSQL injection - user can pass {"$gt": ""}
    db.collection('users').findOne({ 
        username: username, 
        password: password 
    });
});

// VULNERABILITY 5: Command Injection
app.get('/api/backup', (req, res) => {
    const filename = req.query.file;
    // Command injection via user input
    exec(`tar -czf backup.tar.gz ${filename}`, (error, stdout, stderr) => {
        res.send('Backup created');
    });
});

// VULNERABILITY 6: Path Traversal
app.get('/api/download', (req, res) => {
    const file = req.query.filename;
    // No sanitization - can access ../../../../etc/passwd
    const filepath = `./uploads/${file}`;
    res.download(filepath);
});

// VULNERABILITY 7: XXE (XML External Entity)
app.post('/api/parse-xml', (req, res) => {
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({
        // XXE vulnerability - external entities enabled
        explicitArray: false
    });
    parser.parseString(req.body.xml, (err, result) => {
        res.json(result);
    });
});

// VULNERABILITY 8: Insecure Direct Object Reference (IDOR)
app.get('/api/invoice/:id', (req, res) => {
    const invoiceId = req.params.id;
    // No authorization check - any user can access any invoice
    db.query(`SELECT * FROM invoices WHERE id = ${invoiceId}`, (err, result) => {
        res.json(result);
    });
});

// VULNERABILITY 9: Weak cryptography
function encryptPassword(password) {
    // Using deprecated MD5 for passwords
    return crypto.createHash('md5').update(password).digest('hex');
}

// VULNERABILITY 10: Information disclosure
app.get('/api/error-test', (req, res) => {
    try {
        // Intentional error
        const x = undefined.property;
    } catch (error) {
        // Exposing full stack trace to user
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            env: process.env
        });
    }
});

// VULNERABILITY 11: Mass assignment
app.post('/api/user/update', (req, res) => {
    const userId = req.body.userId;
    // Directly using all request body fields - user can change isAdmin, balance, etc.
    db.query('UPDATE users SET ? WHERE id = ?', [req.body, userId]);
    res.json({ success: true });
});

// VULNERABILITY 12: Insecure session management
const sessions = {};
app.post('/api/create-session', (req, res) => {
    const sessionId = Math.random().toString(36); // Weak random
    sessions[sessionId] = { userId: req.body.userId };
    // No expiration, no secure flag
    res.cookie('sessionId', sessionId);
    res.json({ sessionId });
});

// VULNERABILITY 13: CORS misconfiguration
app.use((req, res, next) => {
    // Allowing all origins - CORS vulnerability
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// VULNERABILITY 14: No rate limiting
app.post('/api/brute-force-me', (req, res) => {
    const { username, password } = req.body;
    // No rate limiting - vulnerable to brute force attacks
    if (username === 'admin' && password === 'admin123') {
        res.json({ token: 'secret-token' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// VULNERABILITY 15: Prototype pollution
app.post('/api/merge-config', (req, res) => {
    const defaultConfig = { theme: 'light' };
    // Vulnerable to prototype pollution
    Object.assign(defaultConfig, req.body);
    res.json(defaultConfig);
});

// VULNERABILITY 16: Eval usage
app.post('/api/calculate', (req, res) => {
    const expression = req.body.expression;
    // Using eval with user input - code injection
    const result = eval(expression);
    res.json({ result });
});

// VULNERABILITY 17: Insecure file upload
app.post('/api/upload', (req, res) => {
    const file = req.files.document;
    // No file type validation, no size limit, no virus scan
    file.mv(`./uploads/${file.name}`);
    res.json({ success: true });
});

// VULNERABILITY 18: JWT with no expiration
const jwt = require('jsonwebtoken');
app.post('/api/token', (req, res) => {
    const token = jwt.sign(
        { userId: req.body.userId },
        JWT_SECRET
        // No expiration set
    );
    res.json({ token });
});

// VULNERABILITY 19: Timing attack vulnerability
app.post('/api/verify-token', (req, res) => {
    const token = req.body.token;
    // String comparison - vulnerable to timing attacks
    if (token === "secret-token-12345") {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

// VULNERABILITY 20: Unvalidated redirects
app.get('/api/redirect', (req, res) => {
    const url = req.query.url;
    // No validation - open redirect vulnerability
    res.redirect(url);
});

// VULNERABILITY 21: Memory leak
let cachedData = [];
app.get('/api/leak', (req, res) => {
    // Continuously adding to array without cleanup
    cachedData.push(new Array(1000000).fill('leak'));
    res.json({ cached: cachedData.length });
});

// VULNERABILITY 22: Running on default port with no HTTPS
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
    console.log(`DB Password: ${DB_PASSWORD}`); // Logging sensitive data
});

module.exports = app;