var express = require('express');
var path = require('path');
var app = express();
const { MongoClient } = require('mongodb');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", function(req,res){
  res.render("index", {title: "GUC Switch Server"})
})

app.post("/login",async function(req, res){
  console.log(req.body)
  var err = await login(req.body)
  if(err) {
    res.end("User Not Found");
  }
  else res.end("Logged in");
})

app.post("/signup",async function(req, res){
  console.log(req.body)
  var err = await addUser(req.body)
  if(err) {
    res.end("User Found Before");
  }
  else res.end("Signed in");
})

// Client Setup
const uri = "mongodb+srv://admin:admin@cluster0.ujdx5.mongodb.net/GUC?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function addUser(data) {
  await client.connect();
  var found = await client.db("GUC").collection("students").findOne({appNo: data.appNo})
  if(found === null)
    await client.db("GUC").collection("students").insertOne(data)
  client.close()
  return found !== null
}

async function login(data) {
  await client.connect();
  var found = await client.db("GUC").collection("students").findOne({appNo: data.appNo, password: data.password})
  client.close()
  return found === null
}

async function addRequest(data) {
  await client.connect();
  await client.db("GUC").collection("requests").insertOne(data)
  client.close()
}

app.listen(process.env.PORT || 3000);

module.exports = app;
