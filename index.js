const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
var jwt = require('jsonwebtoken');
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors({
    origin: '*', // Allow requests from this origin
    // You can also set other CORS options here if needed
}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.user_name}:${process.env.user_password}@cluster0.pf0bweu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authoration = req.headers.authorization;
    if (!authoration) {
        res.status(401).send({ error: true, message: "Unauthorized user" });
    }
    const token = authoration.split(" ")[1];
    jwt.verify(token, process.env.jwt_token, (error, decoded) => {
        if (error) {
            res.status(403).send({ error: true, message: "Unauthorized user" });
        }
        req.decoded = decoded;
        next();
    })
    // console.log(token)
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();
        const classColloction = await client.db("summerCampSchool").collection("classes");
        const instructorsColloction = await client.db("summerCampSchool").collection("instructors");
        const userColloction = await client.db("summerCampSchool").collection("users");



        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.jwt_token, { expiresIn: "1d" })
            // console.log(token)
            res.send(JSON.stringify(token))

        })
        app.get('/classes', async (req, res) => {
            const cursor = classColloction.find();
            const result = await cursor.toArray();
            res.send(result)

        })
        app.delete('/classes', verifyJWT, async (req, res) => {
            const decoded = req.decoded;

            const user = await userColloction.findOne({ email: decoded.email });

            // if (user.role !== "admin" || user.role !== "instructor") {
            //     res.status(403).send({ error: true, message: "Unauthorized user to delete" });

            // }
            if (user.role === "instructor" && user.email === decoded.email) {
                const query = { _id: new ObjectId(req.query.class) };
                const result = await classColloction.deleteOne(query);
                res.send(result)
            }
            else if (user.role == "admin") {
                const query = { _id: new ObjectId(req.query.class) };
                const result = await classColloction.deleteOne(query);
                res.send(result)
            }
            else {
                res.status(403).send({ error: true, message: "Unauthorized user to delete" });
            }


            // console.log(user)

        })
        app.get('/instructors', async (req, res) => {
            const cursor = instructorsColloction.find();
            const result = await cursor.toArray();
            res.send(result)

        })
        app.get('/popularinstructors', async (req, res) => {
            const query = { classesTaken: { $gte: 0 } };
            const options = {
                sort: { classesTaken: -1 },
            };
            const cursor = instructorsColloction.find(query, options).limit(6);
            const result = await cursor.toArray();
            // console.log(result)
            res.send(result)

        })
        app.get('/popularClasses', async (req, res) => {
            const query = { price: { $gte: 0 } };
            const options = {
                sort: { availableSetes: 1 },
            };
            const cursor = classColloction.find(query, options).limit(6);
            const result = await cursor.toArray();
            res.send(result)

        })
        app.post('/users', async (req, res) => {
            const doc = req.body;
            const email = doc.email;
            const query = { email: email };
            const isExist = await userColloction.findOne(query);
            if (!isExist) {
                const result = await userColloction.insertOne(doc);
                // console.log(result)
                res.send(result);
            }


        })
        app.put('/users', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log("comebac after verify", decoded)
            // console.log(req.headers.authorization)

            if (decoded.email !== req.query.email) {
                res.status(403).send({ error: true, message: "Unauthorized user" });

            }
            const updateData = req.body;
            const filter = { email: req.query.email };
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    name: updateData.name,
                    phone: updateData.phone,
                    gender: updateData.gender,
                    address: updateData.address,
                    image: updateData.photo,
                },
            };
            const result = await userColloction.updateOne(filter, updateDoc, options);
            console.log(result)
            res.send(result);

        })
        app.delete('/allusers', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log("comebac after verify", decoded)

            const user = await userColloction.findOne({ email: decoded.email });

            if (user.role !== "admin") {
                res.status(403).send({ error: true, message: "Unauthorized user to delete" });

            }
            const query = { _id: new ObjectId(req.query.id) };
            const result = await userColloction.deleteOne(query);
            res.send(result)

        })
        app.get('/allusers', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log("comebac after verify", decoded)
            const user = await userColloction.findOne({ email: decoded.email });
            // console.log(user.role)
            if (user.role !== "admin") {
                res.status(403).send({ error: true, message: "Unauthorized admin to  get allusers" });
            }
            const result = await userColloction.find().toArray();

            res.send(result)


        })
        app.put('/allusers', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log("comebac after verify", decoded)
            const user = await userColloction.findOne({ email: decoded.email });
            // console.log(user.role)
            if (user.role !== "admin") {
                res.status(403).send({ error: true, message: "Unauthorized admin to  get allusers" });
            }

            const filter = { _id: new ObjectId(req.query.id) };
            const options = { upsert: false };

            const updateDoc = {
                $set: {
                    role: req.query.role,

                },
            };
            const result = await userColloction.updateOne(filter, updateDoc, options);
            // console.log(result)
            res.send(result);

        })
        app.get('/users', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log("comebac after verify", decoded)
            // console.log(req.headers.authorization)

            if (decoded.email !== req.query.email) {
                res.status(403).send({ error: true, message: "Unauthorized user" });

            }
            const email = req.query.email;
            const query = { email: email };
            const movie = await userColloction.findOne(query);
            res.send(movie)
        })




        app.get('/', (req, res) => {
            res.send("running my foot")
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})