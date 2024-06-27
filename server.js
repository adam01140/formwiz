const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
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

// List of field names that exist in the PDF


//put textbox names here and checkmarks
const pdfFieldNames = [
  'PetitionerName1[0]', 'PetitionerStrAddress[0]', 'case_number' 'PetitionerCity[0]', 'PetitionerState[0]',
  'PetitionerZip[0]', 'PetitionerTel[0]', 'current_date', 'monthly_income_source1', 'lawyer_info', 
  'lawyercheckyes', 'lawyercheckno', 'job_title', 'employer_name', 'job', 'employer_address', 
  'superior_court_checkbox', 'supreme_court_checkbox', 'food_stamps', 'supp_sec_inc', 'ssp', 
  'medical', 'county_relief', 'calworks', 'capi', 'ihss', 'wic', 'unemployment', 'low_gross_income',
  'waive_some', 'pay_later', 'waive_within_6months', 'previous_available', 'changing_income_checkbox',
  'monthly_income_source1_amount', 'monthly_income_source2', 'monthly_income_source2_amount',
  'monthly_income_source3', 'monthly_income_source3_amount', 'monthly_income_source4', 
  'monthly_income_source4_amount',
  'not_enough', 'waive_all', 'dependency_name1', 'dependency_age1', 'dependency_relationship1',
  'dependency_income1', 'dependency_name2', 'dependency_age2', 'dependency_relationship2',
  'dependency_income2', 'dependency_name3', 'dependency_age3', 'dependency_relationship3',
  'dependency_income3', 'dependency_name4', 'dependency_age4', 'dependency_relationship4',
  'dependency_income4', 'dependency_income_total', 'monthly_income_total', 'total_combined_income',
  'cash_amount', 'bank_name1', 'bank_amount1', 'bank_name2', 'bank_amount2', 'bank_name3', 'bank_amount3',
  'vehicle1_make_year', 'vehicle1_market_value', 'vehicle1_amount_owed', 'vehicle2_make_year', 
  'vehicle2_market_value', 'vehicle2_amount_owed', 'vehicle3_make_year', 'vehicle3_market_value', 
  'vehicle3_amount_owed', 
  'real_estate1_address', 'real_estate1_market_value', 'real_estate1_amount_owed',
  'real_estate2_address', 'real_estate2_market_value', 'real_estate2_amount_owed', 
  'property1_description','property1_market_value', 'property1_amount_owed', 'property2_description', 'property2_market_value',
  'property2_amount_owed', 
  'payroll_description1', 'payroll_deduction1', 'payroll_description2', 
  'payroll_deduction2', 'payroll_description3', 'payroll_deduction3', 'payroll_description4', 
  'payroll_deduction4', 
  'rent_expense', 'food_expense', 'utilities_expense', 'clothing_expense', 
  'laundry_expense', 'medical_expense', 'insurance_expense', 'school_childcare_expense', 'support_expense',
  'transportation_expense', 
  'installment_payment1', 'installment_payment2', 'installment_payment3', 
  'installment_payment1_amount', 'installment_payment2_amount', 'installment_payment3_amount',
  'withheld_earnings', 
  'other_expense1', 'other_expense2', 'other_expense3', 
  'other_expense1_amount','other_expense2_amount','other_expense3_amount',
  'total_monthly_expenses'
];







// Endpoint to edit PDF
app.post('/edit_pdf', async (req, res) => {
  // Check if the PDF file is included in the request and is not empty
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }
  const pdfFile = req.files.pdf;
  const pdfBytes = pdfFile.data;
  if (!pdfBytes) {
    return res.status(400).send('PDF file is empty.');
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Log all field names in the PDF
  const fields = form.getFields();
  fields.forEach(field => {
    console.log(`Field name: ${field.getName()}`);
  });
  
  // Process only the fields that exist in the PDF
  pdfFieldNames.forEach(key => {
    if (req.body[key] !== undefined) {
      try {
        if (key === 'lawyer_info') {
          const field = form.getTextField(key);
          field.setText(req.body[key]);
          field.updateAppearances(helveticaFont);
        } else if (['lawyercheckyes', 'lawyercheckno', 'superior_court_checkbox', 'supreme_court_checkbox', 'low_gross_income', 'waive_all', 'not_enough', 'waive_some', 'pay_later', 'waive_within_6months', 'previous_available', 'changing_income_checkbox'].includes(key)) {
          const field = form.getCheckBox(key);
          if (req.body[key] === 'Yes') {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (['food_stamps', 'supp_sec_inc', 'ssp', 'medical', 'county_relief', 'calworks', 'capi', 'ihss', 'wic', 'unemployment'].includes(key)) {
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