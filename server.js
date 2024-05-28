const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./firebaseAdminKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to add user
app.post('/addUser', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).send('Name and email are required');
  }
  try {
    await db.collection('users').add({ name, email });
    res.status(200).send('User added successfully');
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to handle PDF upload
app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }
  const pdfFile = req.files.pdf;
  res.json({ message: 'PDF uploaded successfully.', fields: [] });
});

// Endpoint to edit PDF
app.post('/edit_pdf', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }
  const pdfFile = req.files.pdf;
  const pdfBytes = pdfFile.data;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  Object.keys(req.body).forEach(key => {
    if (key !== 'email') { // Skip the email field
      try {
        if (key === 'lawyer_info') {
          const field = form.getTextField(key);
          field.setText(req.body[key]);
          field.updateAppearances(helveticaFont);
          field.setFontSize(10); // Set the font size to a smaller value
        } else if (key === 'lawyercheckyes' || key === 'lawyercheckno') {
          const field = form.getCheckBox(key);
          if (req.body[key] === 'Yes') {
            field.check();
          } else {
            field.uncheck();
          }
        } else {
          const field = form.getTextField(key);
          if (field) {
            field.setText(req.body[key]);
          }
        }
      } catch (e) {
        console.error(`No such field in the PDF: ${key}`);
      }
    }
  });

  const updatedPdfBytes = await pdfDoc.save();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=updated.pdf',
  });
  res.send(Buffer.from(updatedPdfBytes));
});

// Serve static PDF file
app.get('/form.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/form.pdf'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
