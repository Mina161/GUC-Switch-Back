var express = require("express");
var path = require("path");
var app = express();
const { MongoClient } = require("mongodb");
const multer = require("multer");
const nodemailer = require("nodemailer");

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

app.get("/request", upload.none(), async function (req, res) {
  var result = await getRequest(req.query.appNo);
  if (result === null) {
    res.writeHead(404, {
      "Content-Type": "text/plain",
    });
    res.write("No Requests Found");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "text/plain",
    });
    res.write(result);
    res.end();
  }
});

app.post("/request", upload.none(), async function (req, res) {
  var result = await addRequest(req.body);
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });
  res.write(result);
  res.end();
});

app.put("/request", upload.none(), async function (req, res) {
  var result = await editRequest(req.body);
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });
  res.write(result);
  res.end();
});

app.delete("/request", upload.none(), async function (req, res) {
  await deleteRequest(req.query.appNo);
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });
  res.write("Request Deleted Successfully");
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
  await contactMatch(req.query.sender,req.query.receiver);
  res.writeHead(200, {
    "Content-Type": "text/plain",
  });
  res.write("Mail Sent!");
  res.end();
});

//Server Constants
var appUser = null;

// Client Setup
const uri =
  "mongodb+srv://admin:" +
  process.env.DB_PASS +
  "@cluster0.ujdx5.mongodb.net/GUC?retryWrites=true&w=majority";
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
  appUser = user;
  return user;
}

async function login(data) {
  await client.connect();
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: data.appNo, password: data.password });
  appUser = found;
  return found;
}

async function addRequest(data) {
  await client.connect();
  await client.db("GUC").collection("requests").insertOne(data);
  return await client.db("GUC").collection("requests").findOne(data);
}

async function editRequest(data) {
  await client.connect();
  await client
    .db("GUC")
    .collection("requests")
    .updateOne({ appNo: data.appNo }, { $set: data });
  return await client
    .db("GUC")
    .collection("requests")
    .findOne({ appNo: data.appNo });
}

async function deleteRequest(appNo) {
  await client.connect();
  await client.db("GUC").collection("requests").deleteOne({ appNo: appNo });
}

async function getRequest(appNo) {
  await client.connect();
  return await client.db("GUC").collection("requests").findOne(appNo);
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

//Mail Setup
var transporter = nodemailer.createTransport({
  service: "yahoo",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

async function contactMatch(sender,receiver) {
  await client.connect();
  var appUser = await client
  .db("GUC")
  .collection("students")
  .findOne({ appNo: sender });

  var info = await client
    .db("GUC")
    .collection("students")
    .findOne({ appNo: receiver }, { projection: { name: 1, email: 1 } });

  var mailOptions = {
    from: process.env.EMAIL,
    to: info.email,
    subject: "Switching Partner Found!",
    html: '<h1>Hello '+info.name+'</h1><p>We found you a switching partner</p><br /><p>Name: '+appUser.name+', Mobile Number: '+appUser.phoneNo+', email: '+appUser.email+'</p><br /><p>Give them a call to confirm the switch</p>',
  };

  await transporter.sendMail(mailOptions);
}

app.listen(process.env.PORT || 8080);

module.exports = app;
