require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));

//-----    Connect to our mongo dbs using mongoose package   -----//
mongoose.connect('mongodb://localhost:27017/usersDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Enter name please ..."]
    },
    email: {
        type: String,
        required: [true, "Enter email please ..."]
    },
    password: {
        type: String,
        required: [true, "Enter password please ..."]
    }
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);


app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", function(req, res) {
    const userEmail = req.body.userEmail;
    const password = req.body.password;

    User.findOne({ email: userEmail }, function(err, foundUser) {
        if (!err) {
            if (foundUser.password === password) {
                res.render("secrets", {
                    userName: foundUser.name
                });
            }
        } else {
            res.render("home");
            console.log(err);
        }
    });
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {
    const newUser = new User({
        name: req.body.userName,
        email: req.body.userEmail,
        password: req.body.password
    });

    newUser.save(function(err) {
        if (!err) {
            res.render("secrets");
        } else {
            console.log(err);
        }
    });
});

app.get("/logout", function(req, res) {
    res.render("home");
});





//-----    Server listening   -----//
app.listen(3000, function() {
    console.log("Server started on port 3000");
});