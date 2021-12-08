var express = require("express");
var path = require("path");
var app = express();
const { MongoClient } = require("mongodb");
const multer = require('multer');

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const upload = multer();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.render("index", { title: "GUC Switch Server" });
});

app.post("/login",upload.none(), async function (req, res) {
  console.log(req.body);
  var found = await login(req.body);
  if (found === null) {
    res.writeHead(404, { "Content-Type": "text/plain", "Access-Control-Allow-Headers": "localhost:3000/*" });
    res.write("User not found");
    res.end();
  } else {
    res.writeHead(200, { "Content-Type": "json", "Access-Control-Allow-Headers": "localhost:3000/*" });
    res.write(JSON.stringify(found));
    res.end();
  }
});

app.post("/signup",upload.none(), async function (req, res) {
  console.log(req.body);
  var err = await addUser(req.body);
  if (err) {
    res.end("User Found Before");
  } else res.end("Signed in");
});

// Client Setup
const uri =
  "mongodb+srv://admin:admin@cluster0.ujdx5.mongodb.net/GUC?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function addUser(data) {
  await client.connect();
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: data.appNo });
  if (found === null)
    await client.db("GUC").collection("students").insertOne(data);
  client.close();
  return found !== null;
}

async function login(data) {
  await client.connect();
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: data.appNo, password: data.password });
  console.log(found);
  client.close();
  return found;
}

async function addRequest(data) {
  await client.connect();
  await client.db("GUC").collection("requests").insertOne(data);
  client.close();
}

app.listen(process.env.PORT || 8080);

module.exports = app;
