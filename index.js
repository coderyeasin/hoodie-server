const express = require("express");
const app = express()
const cors = require('cors')
const { MongoClient } = require('mongodb');
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Choose your hoodie');
})


//////////////////Firebase Admin

const serviceAccount = require("./hoodies-8bf37-firebase-adminsdk-km47h-56b327e6be.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



////////////////DATABASE

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tie3l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


/////////////////////Token checking
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodedUser.email
        }
        catch {
            
        }
    }
  

    next()
}






///////////////////API with ASYNC function
async function server() {
    try {
        await client.connect();
        console.log('connected');

        ///DB
        const database = client.db('clothes')
        const clothCOllection = database.collection('hoodies')

        ///////REST API
        /////////////hoodies collectiooon
        app.get('/hoodies', async (req, res) => {
            const result = await clothCOllection.find({}).toArray()
            res.json(result)
        })

        app.post('/hoodies', async(req, res) => {
            // const result = (req.body)
            // console.log('hitted', result);
            const result = await clothCOllection.insertOne(req.body)
            console.log(result);
            res.json(result)
        })
        
        //////////////orders
        app.get('/allorders', async (req, res) => {
            const result = await clothCOllection.find({}).toArray()
            res.json(result)
        })
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email
            const query = {email: email}
            const result = await clothCOllection.find( query).toArray()
            res.json(result)
        })
        
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await clothCOllection.findOne(query);
            res.send(result)
        })

        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id
            const updateOrder = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {status: updateOrder.status}
            }
            const result = await clothCOllection.updateOne(filter, updateDoc, options)
            console.log(result);
            res.json(result)
        })
  
        app.post('/orders', async (req, res) => {
            const result = await clothCOllection.insertOne(req.body)
            console.log(result);
            res.json(result)
        })
/////////////////////////////////////
        app.get('/allusers', async (req, res) => {
            const result = await clothCOllection.find({}).toArray()
            res.json(result)
        })

        ///////////-admin query
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email}
            const user = await clothCOllection.findOne(query)
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true
            }
            res.json({admin : isAdmin})
        })
        
        /////////////////User save

        app.post('/users', async (req, res) => {
            const result = await clothCOllection.insertOne(req.body)
            console.log(result);
            res.json(result)
        })
        ////////////---upsert must for user--- google * n field
        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = {email : user.email}
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await clothCOllection.updateOne(filter, updateDoc, options)
            console.log(result);
            res.json(result)
        })


        ///////////////////////////
        app.get('/review', async (req, res) => {
            const result = await clothCOllection.find({}).toArray()
            res.json(result)
        })

        app.post('/review', async (req, res) => {
            const result = await clothCOllection.insertOne(req.body)
            console.log(result);
            res.send(result)
        })



        ///////////////////////----Verify Admin--2 put method and same route use korar jonne route name change hoiche
        app.put('/users/admin',verifyToken, async (req, res) => {
            const user = req.body
            console.log('verify', req.decodedEmail);

            const requester = req.decodedEmail
            if (requester) {
                const requesterAccount = await clothCOllection.findOne({ email: requester })
                
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: "admin" } }
                    const result = await clothCOllection.updateOne(filter, updateDoc)
                    res.json(result)    
                }
            }
            else {
                res.status(403).json({message: 'you do not access have to makeAdmin'})
            }


            
        })

        // normal Admin
        // app.put('/users/admin', async (req, res) => {
        //     const user = req.body
        //     const filter = { email: user.email }
        //     const updateDoc = { $set: { role: "admin" } }
        //     const result = await clothCOllection.updateOne(filter, updateDoc)
        //     res.json(result)
        // })

        //DELETE API
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await clothCOllection.deleteOne(query);
            res.send(result)

        })

        //payment from user

        app.post("/create-payment-intent", async (req, res) => {
          const paymentInfo = req.body;
          const amount = paymentInfo.price * 100; //stripe uses cent--- 5 * 100
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            automatic_payment_methods: {
              enabled: true,
            },
            //   payment_method_types:['card']
          });
          res.json({ clientSecret: paymentIntent.client_secret });
        });



    }
    finally {
        // await client.close()
    }
}
server().catch(console.dir)

///////////////////END API



app.listen(port, () => {
    console.log(`Cool Hoodie Listening at: ${port}`)
})


// 
// 