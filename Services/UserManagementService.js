var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var config = require('../public/config.js');
var mail = require('../Mail/MailingService.ts');
var publisher = require('../Mail/Publisher.ts');
var app = express();
require('./UserCRUD.ts')(app, jwt, config, bodyParser);
var db;
var secret = 'password';
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
var Connection = (function () {
    function Connection() {
        this.initConnection();
    }
    Connection.prototype.initConnection = function () {
        mongodb.MongoClient.connect('mongodb://localhost:27017/assessment', function (err, client) {
            if (err) {
                console.log('error:', err);
                process.exit(1);
            }
            else {
                db = client.db();
            }
        });
    };
    Connection.prototype.getConnection = function () {
        while (db === null) {
            this.initConnection();
            setTimeout(function () {
                console.log('timeout');
            }, 60);
        }
        return db;
    };
    return Connection;
}());
app.post('/api/v1/users', function (req, res) {
    var saltRounds = 10;
    var body = req.body;
    req.body = { mobile: req.body.mobile };
    db.collection('credential').find(req.body).toArray(function (err, mble) {
        if (err) {
            res.send(err);
        }
        else {
            if (mble[0]) {
                res.send('mobile number already in use');
            }
            else {
                req.body = { email: body.email };
                db.collection('credential').find(req.body).toArray(function (err, mail) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        if (mail[0]) {
                            res.send('email already in use');
                        }
                        else {
                            req.body = body;
                            if (req.body.password) {
                                bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
                                    if (err) {
                                        res.send(err);
                                    }
                                    else {
                                        req.body.password = hash;
                                        db.collection('credential').insertOne(req.body, function (error, ans) {
                                            if (error) {
                                                res.status(202).send(error);
                                            }
                                            else {
                                                res.status(200).send(ans);
                                                publisher.publish({ 'action': 'create',
                                                    'id': ans.ops[0]._id }, req.body.email);
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
        }
    });
});
app.post('/login', function (req, res) {
    var message;
    var token;
    var body = req.body;
    req.body = { firstname: req.body.firstname };
    db.collection('credential').find(req.body).toArray(function (err, data) {
        if (err) {
            res.status(500).send(err);
        }
        else if (!data[0]) {
            res.status(400).send('Wrong username ');
        }
        else {
            bcrypt.compare(body.password, data[0].password).then(function (result) {
                if (!result) {
                    res.status(400).send('wrong password ');
                }
                else {
                    var payload = { userId: data[0]._id };
                    token = jwt.sign(payload, config.secret.toString(), { expiresIn: 300 });
                    res.status(200).send({
                        message: 'logged in successfully',
                        token: token
                    });
                }
            });
        }
    });
});
//  function checkMbleNum(req, res) {
//     req.body = {mobile: req.body.mobile};
//      console.log('mble1:');
//     db.collection('credential').find(req.body).toArray((err, mble) => {
//         if (err) {
//             res.send(err);
//         } else {
//             if (mble[0]) {
//                 res.send('mobile number already in use');
//             } else {
//                 console.log('mble:', mble[0]);
//                 return true;
//             }
//         }
//
//     });
// }
module.exports.con = new Connection();
app.listen(3000, function () { return console.log('server is running'); });
