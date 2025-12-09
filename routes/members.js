const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Document = require('../models/Document');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage engine
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('document');

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images and PDFs Only!');
    }
}

// @route   GET api/members
// @desc    Get all members
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const members = await Member.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(members);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/members
// @desc    Add new member
// @access  Private
router.post('/', auth, async (req, res) => {
    const { customId, name, email, address, phone, panNumber, citizenshipNumber, nidNumber } = req.body;

    try {
        const member = await Member.create({
            customId,
            name,
            email,
            address,
            phone,
            panNumber,
            citizenshipNumber,
            nidNumber
        });

        res.json(member);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/members/:id
// @desc    Update member details
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { customId, name, email, address, phone, panNumber, citizenshipNumber, nidNumber } = req.body;

    try {
        let member = await Member.findByPk(req.params.id);
        if (!member) return res.status(404).json({ msg: 'Member not found' });

        member.customId = customId || member.customId;
        member.name = name || member.name;
        member.email = email || member.email;
        member.address = address || member.address;
        member.phone = phone || member.phone;
        member.panNumber = panNumber || member.panNumber;
        member.citizenshipNumber = citizenshipNumber || member.citizenshipNumber;
        member.nidNumber = nidNumber || member.nidNumber;

        await member.save();
        res.json(member);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/members/:id/documents
// @desc    Upload document for a member
// @access  Private
router.post('/:id/documents', auth, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ msg: err });
        }

        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        try {
            const { title, docType } = req.body;
            const document = await Document.create({
                memberId: req.params.id,
                title: title || 'Document',
                filePath: `/uploads/${req.file.filename}`,
                docType: docType || 'other'
            });

            res.json(document);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
});

// @route   GET api/members/:id/documents
// @desc    Get all documents for a member
// @access  Private
router.get('/:id/documents', auth, async (req, res) => {
    try {
        const documents = await Document.findAll({
            where: { memberId: req.params.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/members/:id
// @desc    Delete member and their documents
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) return res.status(404).json({ msg: 'Member not found' });

        // Delete associated documents and files
        const documents = await Document.findAll({ where: { memberId: req.params.id } });
        documents.forEach(doc => {
            const filePath = path.join(__dirname, '..', doc.filePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        await Document.destroy({ where: { memberId: req.params.id } });

        await member.destroy();
        res.json({ msg: 'Member removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/members/documents/:id
// @desc    Delete a specific document
// @access  Private
router.delete('/documents/:id', auth, async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        if (!document) return res.status(404).json({ msg: 'Document not found' });

        // Delete file from disk
        const filePath = path.join(__dirname, '..', document.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await document.destroy();
        res.json({ msg: 'Document removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/members/:id/download-all
// @desc    Download all documents for a member as ZIP
// @access  Private
router.get('/:id/download-all', auth, async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) return res.status(404).json({ msg: 'Member not found' });

        const documents = await Document.findAll({ where: { memberId: req.params.id } });

        if (documents.length === 0) {
            return res.status(404).json({ msg: 'No documents found' });
        }

        const archiver = require('archiver');

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${member.name.replace(/\s+/g, '_')}-documents-${Date.now()}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        documents.forEach(doc => {
            const filePath = path.join(__dirname, '..', doc.filePath);
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath);
                archive.file(filePath, { name: `${doc.docType || 'document'}${ext}` });
            }
        });

        await archive.finalize();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/members/:id/pdf
// @desc    Generate member profile PDF
// @access  Private
router.get('/:id/pdf', auth, async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) return res.status(404).json({ msg: 'Member not found' });

        const documents = await Document.findAll({ where: { memberId: req.params.id } });

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${member.name.replace(/\s+/g, '_')}-profile-${Date.now()}.pdf`);

        doc.pipe(res);

        // Title
        doc.fontSize(24).font('Helvetica-Bold').text('Member Profile', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Personal Information
        doc.fontSize(16).font('Helvetica-Bold').text('Personal Information');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');

        const info = [
            ['Name:', member.name],
            ['Email:', member.email],
            ['Phone:', member.phone || 'N/A'],
            ['Address:', member.address || 'N/A'],
            ['PAN Number:', member.panNumber || 'N/A'],
            ['Citizenship Number:', member.citizenshipNumber || 'N/A'],
            ['National ID:', member.nidNumber || 'N/A'],
            ['Member Since:', new Date(member.createdAt).toLocaleDateString()]
        ];

        info.forEach(([label, value]) => {
            doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
            doc.font('Helvetica').text(` ${value}`);
            doc.moveDown(0.3);
        });

        // Documents Section
        doc.moveDown(2);
        doc.fontSize(16).font('Helvetica-Bold').text('Documents');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');

        if (documents.length === 0) {
            doc.text('No documents uploaded');
        } else {
            documents.forEach((document, index) => {
                doc.font('Helvetica-Bold').text(`${index + 1}. ${document.docType || 'Document'}`, { continued: true });
                doc.font('Helvetica').text(` - Uploaded: ${new Date(document.createdAt).toLocaleDateString()}`);
                doc.moveDown(0.3);
            });
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(8).font('Helvetica').text('This is a computer-generated document.', { align: 'center' });

        doc.end();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
