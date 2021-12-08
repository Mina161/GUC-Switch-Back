var express = require("express");
var path = require("path");
var app = express();
const { MongoClient } = require("mongodb");
const multer = require("multer");

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

app.post("/login", upload.none(), async function (req, res) {
  var found = await login(req.body);
  if (found === null) {
    res.writeHead(404, {
      "Content-Type": "text/plain",
    });
    res.write("User not found");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
    });
    res.write(JSON.stringify(found));
    res.end();
  }
});

app.post("/signup", upload.none(), async function (req, res) {
  var found = await addUser(req.body);
  if (found === null) {
    res.writeHead(500, {
      "Content-Type": "text/plain",
    });
    res.write("User found before");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
    });
    res.write(JSON.stringify(found));
    res.end();
  }
});

app.post("/request", upload.none(), async function (req, res) {
  await addRequest(req.body);
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });
  res.write("Request Added Successfully");
  res.end();
});

app.get("/match", upload.none(), async function (req, res) {
  var results = await getMatches(req.query.appNo);
  if (results === []) {
    res.writeHead(404, {
      "Content-Type": "text/plain",
    });
    res.write("No Matches");
    res.end();
  } else if (results === "No Request Found") {
    res.writeHead(404, {
      "Content-Type": "json",
    });
    res.write("You did not submit any requests");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
    });
    res.write(JSON.stringify(results));
    res.end();
  }
});

app.get("/match/contact", upload.none(), async function (req, res) {
  var info = await getContactInfo(req.query.appNo);
  if (info === null) {
    res.writeHead(404, {
      "Content-Type": "text/plain",
    });
    res.write("No Info found");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
    });
    res.write(JSON.stringify(info));
    res.end();
  }
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
  var user = null;
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: data.appNo });
  if (found === null) {
    await client.db("GUC").collection("students").insertOne(data);
    user = await client
      .db("GUC")
      .collection("students")
      .findOne({ appNo: data.appNo });
  }
  return user;
}

async function login(data) {
  await client.connect();
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: data.appNo, password: data.password });
  return found;
}

async function addRequest(data) {
  await client.connect();
  await client.db("GUC").collection("requests").insertOne(data);
}

async function getMatches(appNo) {
  await client.connect();

  var myRequest = await client
    .db("GUC")
    .collection("requests")
    .findOne({ appNo: appNo });

  const query = {
    major: myRequest.major,
    semester: myRequest.semester,
    tutNo: { $exists: myRequest.goTo },
    germanLevel: myRequest.germanLevel,
    englishLevel: myRequest.englishLevel,
    goTo: myRequest.tutNo,
  };
  var results = await client
    .db("GUC")
    .collection("requests")
    .find(query)
    .toArray();
  return results;
}

async function getContactInfo(appNo) {
  await client.connect();
  var info = await client
    .db("GUC")
    .collection("students")
    .findOne(
      { appNo: appNo },
      { projection: { name: 1, appNo: 1, phoneNo: 1, email: 1 } }
    );
  return info;
}

app.listen(process.env.PORT || 8080);

module.exports = app;
