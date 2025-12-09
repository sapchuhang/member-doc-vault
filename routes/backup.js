const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Document = require('../models/Document');
const AdminSettings = require('../models/AdminSettings');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

// @route   GET api/backup/database
// @desc    Export database as JSON
// @access  Private
router.get('/database', auth, async (req, res) => {
    try {
        const members = await Member.findAll();
        const documents = await Document.findAll();
        const admins = await AdminSettings.findAll({
            attributes: { exclude: ['password', 'securityAnswer'] }
        });

        const backup = {
            exportDate: new Date().toISOString(),
            members,
            documents,
            admins
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=database-backup-${Date.now()}.json`);
        res.json(backup);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/backup/database-file
// @desc    Download SQLite database file
// @access  Private
router.get('/database-file', auth, async (req, res) => {
    try {
        const dbPath = path.join(__dirname, '..', 'database.sqlite');

        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ msg: 'Database file not found' });
        }

        res.download(dbPath, `database-backup-${Date.now()}.sqlite`);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/backup/files
// @desc    Download all uploaded files as ZIP
// @access  Private
router.get('/files', auth, async (req, res) => {
    try {
        const uploadsPath = path.join(__dirname, '..', 'uploads');

        if (!fs.existsSync(uploadsPath)) {
            return res.status(404).json({ msg: 'Uploads folder not found' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=files-backup-${Date.now()}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);
        archive.directory(uploadsPath, 'uploads');
        await archive.finalize();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/backup/full
// @desc    Full backup (database + files)
// @access  Private
router.get('/full', auth, async (req, res) => {
    try {
        const dbPath = path.join(__dirname, '..', 'database.sqlite');
        const uploadsPath = path.join(__dirname, '..', 'uploads');

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=full-backup-${Date.now()}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        // Add database file
        if (fs.existsSync(dbPath)) {
            archive.file(dbPath, { name: 'database.sqlite' });
        }

        // Add uploads folder
        if (fs.existsSync(uploadsPath)) {
            archive.directory(uploadsPath, 'uploads');
        }

        await archive.finalize();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
