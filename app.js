var express = require("express");
var cors = require('cors')
var path = require("path");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const moment = require('moment');
const saltRounds = parseInt(process.env.SALT);
var app = express();
const {
  MongoClient
} = require("mongodb");
const multer = require("multer");
const nodemailer = require("nodemailer");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const upload = multer();
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors())

app.get("/", function (req, res) {
  res.render("index", {
    title: "GUC Switch Server"
  });
});

app.post("/login", upload.none(), async function (req, res) {
  var found = await login(req.body);
  if (found === null) {
    res.writeHead(404, {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write("User not found");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
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
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write("User found before");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write(JSON.stringify(found));
    res.end();
  }
});

app.get("/request", upload.none(), async function (req, res) {
  var result = await getRequest(req.query.appNo);
  res.writeHead(200, {
    "Content-Type": "json",
    "Access-Control-Allow-Origin": process.env.ORIGIN,
    "Access-Control-Allow-Headers": process.env.HEADERS,
  });
  res.write(JSON.stringify(result));
  res.end();
});

app.post("/request", upload.none(), async function (req, res) {
  var result = await addRequest(req.body);
  res.writeHead(200, {
    "Content-Type": "json",
    "Access-Control-Allow-Origin": process.env.ORIGIN,
    "Access-Control-Allow-Headers": process.env.HEADERS,
  });
  res.write(JSON.stringify(result));
  res.end();
});

app.put("/request", upload.none(), async function (req, res) {
  var result = await editRequest(req.body);
  res.writeHead(200, {
    "Content-Type": "json",
    "Access-Control-Allow-Origin": process.env.ORIGIN,
    "Access-Control-Allow-Headers": process.env.HEADERS,
  });
  res.write(JSON.stringify(result));
  res.end();
});

app.delete("/request", upload.none(), async function (req, res) {
  await deleteRequest(req.query.appNo);
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": process.env.ORIGIN,
    "Access-Control-Allow-Headers": process.env.HEADERS,
  });
  res.write("Request Deleted Successfully");
  res.end();
});

app.get("/match", upload.none(), async function (req, res) {
  var results = await getMatches(
    req.query.appNo,
    req.query.limit,
    req.query.page
  );
  if (results === "No Request Found") {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write("You did not submit any requests");
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write(JSON.stringify(results));
    res.end();
  }
});

app.get("/match/contact", upload.none(), async function (req, res) {
  await contactMatch(req.query.sender, req.query.receiver);
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": process.env.ORIGIN,
    "Access-Control-Allow-Headers": process.env.HEADERS,
  });
  res.write("Mail Sent!");
  res.end();
});

app.post("/generateReset", upload.none(), async function (req, res) {
  var response = await generatePasswordReset(req.body);
  if (response === "Mail Sent!") {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
  } else {
    res.writeHead(400, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
  }
  res.write(response)
  res.end();
});

app.post("/resetPassword", upload.none(), async function (req, res) {
  var response = await resetPassword(req.body);
  if (response === "Reset Done") {
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
  } else {
    res.writeHead(400, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });

  }
  res.write(response);
  res.end();
});

// Client Setup
const uri = process.env.DB_URI;
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
    .findOne({
      appNo: data.appNo
    });
  if (found === null) {
    var hash = bcrypt.hashSync(data.password, saltRounds);
    await client.db("GUC").collection("students").insertOne({
      ...data,
      password: hash
    });
    user = await client
      .db("GUC")
      .collection("students")
      .findOne({
        appNo: data.appNo
      });
  }
  return user;
}

async function login(data) {
  await client.connect();
  var found = await client
    .db("GUC")
    .collection("students")
    .findOne({
      appNo: data.appNo
    });
  if (found && bcrypt.compareSync(data.password, found.password)) return found;
  else return null
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
    .updateOne({
      appNo: data.appNo
    }, {
      $set: data
    });
  return await client
    .db("GUC")
    .collection("requests")
    .findOne({
      appNo: data.appNo
    });
}

async function deleteRequest(appNo) {
  await client.connect();
  await client.db("GUC").collection("requests").deleteOne({
    appNo: appNo
  });
}

async function getRequest(appNo) {
  await client.connect();
  let result = await client
    .db("GUC")
    .collection("requests")
    .findOne({
      appNo: appNo
    });
  return result;
}

async function getMatches(appNo, limit, page) {
  await client.connect();

  var myRequest = await client
    .db("GUC")
    .collection("requests")
    .findOne({
      appNo: appNo
    });

  if (myRequest === null) return "No Request Found";

  const query = {
    major: myRequest.major,
    semester: myRequest.semester,
    tutNo: {
      $exists: myRequest.goTo
    },
    germanLevel: myRequest.germanLevel,
    englishLevel: myRequest.englishLevel,
    goTo: myRequest.tutNo,
  };

  var allResults = await client.db("GUC").collection("requests").find(query);

  var count = await allResults.count()

  var results = await allResults
    .skip(parseInt(limit) * (parseInt(page) - 1))
    .limit(parseInt(limit))
    .toArray();

  return {
    results: results,
    limit: parseInt(limit),
    thisPage: parseInt(page),
    count: count
  };
}

//Mail Setup
var transporter = nodemailer.createTransport({
  service: "yahoo",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

async function contactMatch(sender, receiver) {
  await client.connect();
  var appUser = await client
    .db("GUC")
    .collection("students")
    .findOne({
      appNo: sender
    });

  var info = await client
    .db("GUC")
    .collection("students")
    .findOne({
      appNo: receiver
    }, {
      projection: {
        name: 1,
        email: 1
      }
    });

  if(appUser) {
    var mailOptions = {
      from: process.env.EMAIL,
      to: info.email,
      subject: "Switching Partner Found!",
      html: "<h1>Hello " +
        info.name +
        "</h1><p>We found you a switching partner</p><br /><p>Name: " +
        appUser.name +
        ", Mobile Number: " +
        appUser.phoneNo +
        ", email: " +
        appUser.email +
        "</p><br /><p>Give them a call to confirm the switch</p>",
    };
  }

  await transporter.sendMail(mailOptions);
}

// Forgot Password Functions
async function generatePasswordReset(data) {
  await client.connect();
  var user = await client.db("GUC").collection("students").findOne({appNo: data.appNo,
    email: data.email})
  var alreadyRequested = user?.token 
  if(!alreadyRequested){
    var ttl = moment().add(10,'minutes').toDate();
    var token = crypto.randomBytes(32).toString("hex");
    var updated = await client.db("GUC").collection("students").updateOne({
      appNo: data.appNo,
      email: data.email
    }, {
      $set: {
        token: token,
        TTL: ttl
      }
    })
    if (user){
      var mailOptions = {
        from: process.env.EMAIL,
        to: user?.email,
        subject: "Password Reset Request",
        html: "<h1>Hello " + user?.appNo + "!</h1>" +
          "<p>Have you requested to reset your password? Follow this link and reset your password within 10 minutes</p><br/>" +
          "<a href=\"" + process.env.BASE + "reset-password/" + token + "\">Click Here</a><br/>" +
          "<p>Not you? Ignore this email and secure your password</p>"
      };
      await transporter.sendMail(mailOptions); 
      return "Mail Sent!"
    } else 
      return "User-Email not found"
  }
  return "Already sent a mail or user not found"
}

async function resetPassword(data) {
  await client.connect();
  var toReset = await client.db("GUC").collection("students").findOne({
    appNo: data.appNo,
    email: data.email,
    token: data.token
  })
  if (toReset != null) {
    expiry = moment(toReset.TTL)
    today = moment()
    if (expiry > today) {
      var hash = bcrypt.hashSync(data.password, saltRounds);
      client.db("GUC").collection("students").updateOne({
        appNo: data.appNo,
        email: data.email,
        token: data.token
      }, {
        $unset: {
          token: "",
          TTL: ""
        },
        $set: {
          password: hash
        }
      })
      return "Reset Done"
    } else {
      client.db("GUC").collection("students").updateOne({
        appNo: data.appNo,
        email: data.email,
        token: data.token
      }, {
        $unset: {
          token: "",
          TTL: ""
        }
      })
      return "Token Expired"
    }
  } else {
    return "Malformed Token"
  }
}

app.listen(process.env.PORT || 8080);

module.exports = app;