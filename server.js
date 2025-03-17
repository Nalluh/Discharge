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

app.get('/search', (req,res) => {
  //get url param
  const patientName = req.query.query;

  //dont query right away gain some context from
  if(!patientName || patientName.length <2){
    return res.json({results:[]})
  }

  // get patients with distinct mrn
  const sql = 'SELECT DISTINCT mrn, first_name, last_name, patient_id FROM public."Patient" WHERE CONCAT(first_name, \' \', last_name) LIKE $1 LIMIT 10';

  pool.query(sql, [`%${patientName}%`], (err,results) => {
    if(err){
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });    
    }
    //send to frontend 
    res.json({results});
 
  })

});

//query for all information given a patient id
app.get('/patients',(req,res) =>{
  const patient_id = req.query.patient_id;

  const sql ='SELECT * FROM public."Patient" AS p JOIN public."TripInformation" AS t ON p.patient_id = t.patient_id join public."DischargeRequestor" as dr ON p.req_id = dr.req_id WHERE p.patient_id = $1;'
  pool.query(sql,[`${patient_id}`], (err,results) => {
    if(err){
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });    
    }
    res.json({results});
  })
 
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