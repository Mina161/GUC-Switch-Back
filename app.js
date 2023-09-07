const express = require("express");
const cors = require('cors');
const path = require("path");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const moment = require('moment');
const saltRounds = parseInt(process.env.SALT);
const app = express();
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const upload = multer();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

// Connect to MongoDB using Mongoose
mongoose.connect("mongodb+srv://admin:admin@cluster0.ujdx5.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Mongoose Schemas
const studentSchema = new mongoose.Schema({
  appNo: { type: String, required: true },
  name: { type: String, required: true },
  phoneNo: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });
const Student = mongoose.model("Student", studentSchema);

const requestSchema = new mongoose.Schema({
  appNo: { type: String, required: true },
  student: { type: mongoose.Types.ObjectId, ref: "Student" },
  major: { type: String, enum: ["MET", "DMET", "IET", "EMS", "EDPT", "BI", "Architecture", "Applied Arts", "Civil", "Management", "Law", "Pharmacy"], required: true },
  semester: { type: Number, required: true },
  tutNo: { type: Number, required: true },
  goTo: [{ type: Number, required: true }],
  germanLevel: { type: String, required: true },
  englishLevel: { type: String, required: true },
  contacted: [{ type: String }]
}, { timestamps: true });
const Request = mongoose.model("Request", requestSchema);

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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    console.log(e);
  }
});

app.get("/match/contact", upload.none(), async function (req, res) {
  try {
    var response = await contactMatch(req.query.sender, req.query.receiver);
    console.log(req.query.sender, req.query.receiver)
    if (!response) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    console.log(e)
  }
});

// Modify addUser function to use Mongoose
async function addUser(data) {
  try {
    const found = await Student.findOne({ appNo: data.appNo });

    if (found === null) {
      const hash = bcrypt.hashSync(data.password, saltRounds);
      const user = new Student({
        appNo: data.appNo,
        name: data.name,
        phoneNo: data.phoneNo,
        email: data.email,
        password: hash,
      });
      await user.save();
      return user;
    }
    return null;
  } catch (e) {
    console.log(e);
  }
}

// Modify login function to use Mongoose
async function login(data) {
  try {
    const found = await Student.findOne({ appNo: data.appNo });

    if (found && bcrypt.compareSync(data.password, found.password)) {
      return found;
    } else {
      return null;
    }
  } catch (e) {
    console.log(e);
  }
}

// Modify addRequest function to use Mongoose
async function addRequest(data) {
  try {
    const request = new Request(data);
    await request.save();
    return request;
  } catch (e) {
    console.log(e);
  }
}

// Modify editRequest function to use Mongoose
async function editRequest(data) {
  try {
    const updatedRequest = await Request.findOneAndUpdate(
      { appNo: data.appNo },
      data,
      { new: true }
    );
    return updatedRequest;
  } catch (e) {
    console.log(e);
  }
}

// Modify deleteRequest function to use Mongoose
async function deleteRequest(appNo) {
  try {
    await Request.deleteOne({ appNo: appNo });
  } catch (e) {
    console.log(e);
  }
}

// Modify getRequest function to use Mongoose
async function getRequest(appNo) {
  try {
    const result = await Request.findOne({ appNo: appNo });
    return result;
  } catch (e) {
    console.log(e);
  }
}

// Modify getMatches function to use Mongoose
async function getMatches(appNo, limit, page) {
  try {
    const myRequest = await Request.findOne({ appNo: appNo });

    if (myRequest === null) {
      return "No Request Found";
    }

    let myArray = Array.isArray(myRequest.goTo) ? myRequest.goTo : [myRequest.goTo];

    const query = {
      major: myRequest.major,
      semester: myRequest.semester,
      tutNo: { $in: myArray },
      germanLevel: myRequest.germanLevel,
      englishLevel: myRequest.englishLevel,
      goTo: myRequest.tutNo,
    };

    const count = await Request.countDocuments(query);

    const results = await Request.find(query)
      .skip(parseInt(limit) * (parseInt(page) - 1))
      .limit(parseInt(limit));

    return {
      results: results,
      limit: parseInt(limit),
      thisPage: parseInt(page),
      count: count,
    };
  } catch (e) {
    console.log(e);
  }
}


//Mail Setup
var transporter = nodemailer.createTransport({
  service: "yahoo",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// contactMatch function
async function contactMatch(sender, receiver) {
  try {
    const sendUser = await Student.findOne({ appNo: sender });
    const recUser = await Student.findOne({ appNo: receiver }, { name: 1, email: 1 });

    if (sendUser !== null && recUser !== null) {
      await Request.updateOne({ appNo: sender }, { $push: { contacted: receiver } });

      const mailOptions = {
        from: process.env.EMAIL,
        to: recUser.email,
        subject: "Switching Partner Found!",
        html: `<h1>Hello ${recUser.name}</h1><p>We found you a switching partner</p><br /><p>Name: ${sendUser.name}, Mobile Number: ${sendUser.phoneNo}, email: ${sendUser.email}</p><br /><p>Give them a call to confirm the switch</p>`,
      };

      await transporter.sendMail(mailOptions);
    } else {
      return "Mail Failed";
    }
  } catch (e) {
    console.log(e);
  }
}

// generatePasswordReset function
async function generatePasswordReset(data) {
  try {
    const user = await Student.findOne({ appNo: data.appNo, email: data.email });
    const alreadyRequested = user?.token;

    if (!alreadyRequested) {
      const ttl = moment().add(10, 'minutes').toDate();
      const token = crypto.randomBytes(32).toString("hex");
      await Student.updateOne({ appNo: data.appNo, email: data.email }, { $set: { token: token, TTL: ttl } });

      if (user) {
        const mailOptions = {
          from: process.env.EMAIL,
          to: user?.email,
          subject: "Password Reset Request",
          html: `<h1>Hello ${user?.appNo}!</h1><p>Have you requested to reset your password? Follow this link and reset your password within 10 minutes</p><br/><a href="${process.env.BASE}reset-password/${token}">Click Here</a><br/><p>If that doesn't work follow this link: ${process.env.BASE}reset-password/${token}</p><br/><p>Not you? Ignore this email and secure your password</p>`,
        };

        await transporter.sendMail(mailOptions);
        return "Mail Sent!";
      } else {
        return "User-Email not found";
      }
    }
    return "Already sent an email or user not found";
  } catch (e) {
    console.log(e);
  }
}

// resetPassword function
async function resetPassword(data) {
  try {
    const toReset = await Student.findOne({ appNo: data.appNo, email: data.email, token: data.token });

    if (toReset != null) {
      const expiry = moment(toReset.TTL);
      const today = moment();

      if (expiry > today) {
        const hash = bcrypt.hashSync(data.password, saltRounds);
        await Student.updateOne(
          { appNo: data.appNo, email: data.email, token: data.token },
          { $unset: { token: "", TTL: "" }, $set: { password: hash } }
        );

        return "Reset Done";
      } else {
        await Student.updateOne(
          { appNo: data.appNo, email: data.email, token: data.token },
          { $unset: { token: "", TTL: "" } }
        );

        return "Token Expired";
      }
    } else {
      return "Malformed Token";
    }
  } catch (e) {
    console.log(e);
  }
}


app.listen(process.env.PORT || 8080);

module.exports = app;