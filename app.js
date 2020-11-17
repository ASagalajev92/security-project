require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCrete = require("mongoose-findorcreate");




// =================================================================================
// PACKAGEs SETTINGS
// =================================================================================

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

app.use(session({
    secret: 'Bega mega secret',
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());



// =================================================================================
// DB SETTINGS
// =================================================================================

//-----    Connect to our mongo dbs using mongoose package   -----//
mongoose.connect('mongodb://localhost:27017/usersDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    secrets: [String],
    //-----    google auth field  -----//
    googleId: String,
    //-----    facebook auth field   -----//
    facebookId: String
});

//-----   Locale passport plugin activation    -----//
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCrete);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


//-----    fixed position , passport google oauth2.0 boiler code  -----//
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID_G,
        clientSecret: process.env.CLIENT_SECRET_G,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
        // passReqToCallback: true
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));

//-----    facebook auth2.0 using passport-facebook package   -----//
passport.use(new FacebookStrategy({
        clientID: process.env.CLIENT_ID_FB,
        clientSecret: process.env.CLIENT_SECRET_FB,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ facebookId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));





// =================================================================================
// ROUTEs
// =================================================================================

app.get("/", function(req, res) {
    res.render("home");
});


//-----    AUTHONTICATION   -----//
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        //-----    If succes then redirect into secrets   -----//
        res.redirect("/secrets");
    });


app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


//-----    OTHER ROUTES   -----//
app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets")
            });
        }
    })

});


app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {

    User.register({
            username: req.body.username,
            email: req.body.userEmail
        }, req.body.password,
        function(err, user) {
            if (err) {
                console.log('ERR', err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
                });
            }
        });

});


app.get("/secrets", function(req, res) {
    //-----    Searching for users who have secrets   -----//
    User.find({ "secrets": { $ne: null } }, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        }
    });
});

app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secrets.push(submittedSecret);
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }
    });
});


app.get("/logout", function(req, res) {
    //-----    Logout with passport    -----//
    req.logout();
    res.redirect("/");
});



//-----    Server listening   -----//
app.listen(3000, function() {
    console.log("Server started on port 3000");
});