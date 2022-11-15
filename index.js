const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const Port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Doctors advice server is running');
})

app.listen(Port, () => {
    console.log(`Server is running on Port:${Port}`);
})
