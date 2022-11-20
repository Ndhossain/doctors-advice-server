const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();

const Port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const verifyJwt = (req, res, next) => {
    const tokenInfo = req.headers.authorization;
    if (!tokenInfo) {
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = tokenInfo.split(' ')[1];
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cj5piaf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const db = client.db("doc-advice");
        const appointmentOptionsCollection = db.collection('appointment-options');
        const appointmentBookingCollection = db.collection('appointments');
        // jwt initialization
        app.get('/jwt', (req, res) => {
            const uid = req.query.uid;
            console.log(uid);
            const token = jwt.sign({uid}, process.env.SECRET_TOKEN, {expiresIn: '1d'})
            res.send({accessToken: token});
        })
        // appointment options
        app.get('/appointment-options', async (req, res) => {
            const query = {};
            const cursor = await appointmentOptionsCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: req.query.date };
            const bookingsForQueryDate = await appointmentBookingCollection.find(bookingQuery).toArray();
            cursor.forEach(option => {
                const bookedOptions = bookingsForQueryDate.filter(booking => option.name === booking.treatment);
                const bookedSlots = bookedOptions.map(booking => booking.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
            })
            res.send(cursor);
        })
        // appointment bookings
        app.post('/bookings', async (req, res) => {
            const query = {
                uid: req.body.uid,
                appointmentDate: req.body.appointmentDate,
                treatment: req.body.treatment,
            };
            const alreadyBooked = await appointmentBookingCollection.find(query).toArray();
            if(alreadyBooked.length > 0) {
                return res.send({acknowledged: false, message: "Already booked for today"})
            }
            const data = req.body;
            const result = await appointmentBookingCollection.insertOne(data);
            res.send(result);
        })
        app.get('/bookings', async (req, res) => {
            const query = {
                uid: req.query.uid,
            };
            const cursor = await appointmentBookingCollection.find(query).toArray();
            res.send(cursor);
        })
    } finally {}
}

run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('Doctors advice server is running');
})

app.listen(Port, () => {
    try {
        client.connect(err => {
            console.log('Database connected');
        });
        console.log(`Server is running on Port:${Port}`);
    } catch (err) {
        console.log(err);
    }
})
