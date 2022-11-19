const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();

const Port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cj5piaf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const db = client.db("doc-advice");
        // appointment options
        const appointmentOptionsCollection = db.collection('appointment-options');
        const appointmentBookingCollection = db.collection('appointments');
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
