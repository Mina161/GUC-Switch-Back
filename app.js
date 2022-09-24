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
  try {
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
  } catch(e) {
    console.log(e);
  }
});

app.post("/signup", upload.none(), async function (req, res) {
  try {
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
  } catch(e) {
    console.log(e);
  }
});

app.get("/request", upload.none(), async function (req, res) {
  try {
    var result = await getRequest(req.query.appNo);
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write(JSON.stringify(result));
    res.end();
  } catch(e) {
    console.log(e);
  }
});

app.post("/request", upload.none(), async function (req, res) {
  try {
    var result = await addRequest(req.body);
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write(JSON.stringify(result));
    res.end();
  } catch(e) {
    console.log(e);
  }
});

app.put("/request", upload.none(), async function (req, res) {
  try {
    var result = await editRequest(req.body);
    res.writeHead(200, {
      "Content-Type": "json",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write(JSON.stringify(result));
    res.end();
  } catch(e) {
    console.log(e);
  }
});

app.delete("/request", upload.none(), async function (req, res) {
  try {
    await deleteRequest(req.query.appNo);
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": process.env.ORIGIN,
      "Access-Control-Allow-Headers": process.env.HEADERS,
    });
    res.write("Request Deleted Successfully");
    res.end();
  } catch(e) {
    console.log(e);
  }
});

app.get("/match", upload.none(), async function (req, res) {
  try {
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
  } catch(e) {
    console.log(e);
  }
});

app.get("/match/contact", upload.none(), async function (req, res) {
  try {
    var response = await contactMatch(req.query.sender, req.query.receiver);
    console.log(req.query.sender, req.query.receiver)
    if(!response) {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": process.env.ORIGIN,
        "Access-Control-Allow-Headers": process.env.HEADERS,
      });
      res.write("Mail Sent!");
    } else {
      res.writeHead(400, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": process.env.ORIGIN,
        "Access-Control-Allow-Headers": process.env.HEADERS,
      });
      res.write("Mail Failed!");
    }
    res.end();
  } catch(e) {
    console.log(e);
  }
});

app.post("/generateReset", upload.none(), async function (req, res) {
  try {
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
  } catch(e) {
    console.log(e);
  }
});

app.post("/resetPassword", upload.none(), async function (req, res) {
  try {
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
  } catch(e) {
    console.log(e)
  }
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
  var myArray
  if(myRequest.goTo.isArray()){
    myArray = myRequest.goTo
  } else {
    myArray = [myRequest.goTo]
  }
  const query = {
    major: myRequest.major,
    semester: myRequest.semester,
    tutNo: {
      "$in" : myArray
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
  var sendUser = await client
    .db("GUC")
    .collection("students")
    .findOne({
      appNo: sender
    });

  var recUser = await client
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
  
  console.log(sendUser && recUser)
  if(sendUser!==null && recUser!==null) {

    await client
    .db("GUC")
    .collection("requests")
    .updateOne({
      appNo: sender
    }, {
      $push: {
        contacted: receiver
      }
    });

    var mailOptions = {
      from: process.env.EMAIL,
      to: recUser.email,
      subject: "Switching Partner Found!",
      html: "<h1>Hello " +
      recUser.name +
        "</h1><p>We found you a switching partner</p><br /><p>Name: " +
        sendUser.name +
        ", Mobile Number: " +
        sendUser.phoneNo +
        ", email: " +
        sendUser.email +
        "</p><br /><p>Give them a call to confirm the switch</p>",
    };

    await transporter.sendMail(mailOptions);
  } else {
    return "Mail Failed"
  }
  
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
          "<p>If that doesn't work follow this link: "+process.env.BASE+"reset-password/" + token +"</p><br/"+
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