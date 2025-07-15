const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./contacts.db');

// Create contacts table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone validation function
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Routes

// Get all contacts
app.get('/api/contacts', (req, res) => {
    db.all('SELECT * FROM contacts ORDER BY firstName, lastName', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single contact by ID
app.get('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        res.json(row);
    });
});

// Create new contact
app.post('/api/contacts', (req, res) => {
    const { firstName, lastName, address, email, phone } = req.body;
    
    // Validation
    if (!firstName || !lastName || !address || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Check for duplicate email
    db.get('SELECT id FROM contacts WHERE email = ?', [email], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }
        
        // Insert new contact
        db.run('INSERT INTO contacts (firstName, lastName, address, email, phone) VALUES (?, ?, ?, ?, ?)',
            [firstName, lastName, address, email, phone], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.status(201).json({
                    id: this.lastID,
                    firstName,
                    lastName,
                    address,
                    email,
                    phone
                });
            });
    });
});

// Update contact
app.put('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, address, email, phone } = req.body;
    
    // Validation
    if (!firstName || !lastName || !address || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Check for duplicate email (excluding current contact)
    db.get('SELECT id FROM contacts WHERE email = ? AND id != ?', [email, id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }
        
        // Update contact
        db.run('UPDATE contacts SET firstName = ?, lastName = ?, address = ?, email = ?, phone = ? WHERE id = ?',
            [firstName, lastName, address, email, phone, id], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                if (this.changes === 0) {
                    res.status(404).json({ error: 'Contact not found' });
                    return;
                }
                res.json({
                    id: parseInt(id),
                    firstName,
                    lastName,
                    address,
                    email,
                    phone
                });
            });
    });
});

// Delete contact
app.delete('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        res.json({ message: 'Contact deleted successfully' });
    });
});

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Contact Management Application is ready!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});