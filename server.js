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

//when updating a form in db
app.post("/edit-discharges", async (req,res) => {
  const patient_id = req.body.Patient_ID;
  const req_id = req.body.Req_ID;
  
  //use a transaction to update multiple tables in case of error in one query 
  try{
    const client = await pool.connect()
    await client.query('BEGIN')


    await client.query(
      'Update public."DischargeRequestor" SET	dept = $1	,ext = $2,name = $3,	hospital = $4 WHERE req_id = $5',
      [req.body.PatientDischargeRequestor.department,
       req.body.PatientDischargeRequestor.extension,
       req.body.PatientDischargeRequestor.name,
       req.body.PatientDischargeRequestor.hospital,
      req_id
    ]
    )

    await client.query(
      'UPDATE public."Patient" SET first_name = $1, last_name = $2, phone_number = $3, mrn = $4, dob = $5, height = $6, weight = $7, gender = $8, primary_language = $9, room_number = $10 WHERE patient_id = $11',
      [
        req.body.Patient.firstName,
        req.body.Patient.lastName,
        req.body.Patient.phoneNumber,
        req.body.Patient.mrn,
        req.body.Patient.dob,
        req.body.Patient.height,
        req.body.Patient.weight,
        req.body.Patient.gender,
        req.body.Patient.primaryLanguage,
        req.body.Patient.roomNumber,
        patient_id
      ]
  );

  await client.query(
    'update public."TripInformation" SET isolation_status = $1, oxygen_needed = $2,transportation_type = $3, address = $4,	additional_info = $5, date_needed = $6, time_needed = $7 WHERE patient_id = $8',
    [
      req.body.Trip.isolation,
      req.body.Trip.amountOfOxygen,
      req.body.Trip.transportationType,
      req.body.Trip.address,
      req.body.Trip.additional_info,
      req.body.Trip.date,
      req.body.Trip.time,
      patient_id
    ]
  )

  await client.query('COMMIT');
  client.release();

  res.status(200).send('Patient discharge updated successfully.');
} catch (err) {
  console.error('Error updating patient data:', err);
  res.status(500).send('Internal server error.');
}

});
//endpoint were we will handle posting to database
app.post("/discharges", async (req, res) => {
  console.log("Request Body:", req.body ); 
  try{
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
  'INSERT INTO "TripInformation" (patient_id,address,isolation_status,oxygen_needed,transportation_type,additional_info,date,time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
  [patient_id, req.body.Trip.address,req.body.Trip.isolation,req.body.Trip.amountOfOxygen,req.body.Trip.transportationType,req.body.Trip.additional_info,
    req.body.Trip.date,req.body.Trip.time ]
);
  
res.status(200).send('Patient discharge successfully added.');
} catch (err) {
  console.error('Error updating patient data:', err);
  res.status(500).send('Internal server error.');
}


  
  
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });