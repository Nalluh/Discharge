const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const path = require('path');
const pool = require('./db'); 
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static('public'));





//send form.html to client
app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

//send dashboard.html to client
app.get('/', (req,res) =>
{
  res.sendFile(path.join(__dirname, 'public','dashboard.html'));
});

//endpoint were we will handle posting to database
app.post("/discharges", async (req, res) => {
  console.log("Request Body:", req.body ); 
  // insert "DischargeRequestor" first so we can generate a request id
  let result = await pool.query(
    'INSERT INTO "DischargeRequestor" (dept, ext, name, hospital) VALUES ($1, $2, $3, $4) RETURNING req_id',
    [req.body.PatientDischargeRequestor.department, req.body.PatientDischargeRequestor.extension, 
      req.body.PatientDischargeRequestor.name, req.body.PatientDischargeRequestor.hospital]

);
let req_id = result.rows[0].req_id;
// using req_id we can post the second half into "Patient" to establish relationship between tables
result = await pool.query(
  'INSERT INTO "Patient" (first_name,last_name,mrn,dob,gender,height,weight,phone_number,primary_language,room_number,req_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning patient_id',
  [req.body.Patient.firstName, req.body.Patient.lastName, req.body.Patient.mrn,req.body.Patient.dob, req.body.Patient.gender,req.body.Patient.height,
    req.body.Patient.weight, req.body.Patient.phoneNumber, req.body.Patient.primaryLanguage, req.body.Patient.roomNumber,req_id]
    );
    let patient_id = result.rows[0].patient_id;
    // using patient_id we can post the last portion into "TripInformation" to establish relationship between tables
result = await pool.query(
  'INSERT INTO "TripInformation" (patient_id,address,isolation_status,oxygen_needed,transportation_type,additional_info) VALUES ($1,$2,$3,$4,$5,$6)',
  [patient_id, req.body.Trip.address,req.body.Trip.isolation,req.body.Trip.amountOfOxygen,req.body.Trip.transportationType,req.body.Trip.additional_info]
);


  
  
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });