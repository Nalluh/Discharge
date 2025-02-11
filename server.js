const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

app.use(express.static('public'));


app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.get('/', (req,res) =>
{
  res.sendFile(path.join(__dirname, 'public','dashboard.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });