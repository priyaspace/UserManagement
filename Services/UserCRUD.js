var UMS = require('./UserManagementService.ts');
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs');
var morgan = require('morgan');
var path = require('path');
module.exports = function (app, jwt, config, bodyParser) {
    app.use(bodyParser.json());
    var fileStream = fs.createWriteStream(path.join(__dirname, 'log.log'), { flags: 'a' });
    morgan.token('tokens', function (req, res) { });
    app.use(morgan(function (tokens, req, res) {
        return [
            tokens.date(req, res),
            tokens.url(req, res),
            tokens.method(req, res),
            tokens.status(req, res),
            req.headers['user-agent'],
            tokens.res(req, res, 'content-length')
        ].join(' - ');
    }, { stream: fileStream }));
    app.get('/api/v1/users', function (req, res) {
        var db = UMS.con.getConnection();
        db.collection('credential').find().toArray(function (err, users) {
            if (err) {
                res.send('error:', err);
            }
            else {
                if (users[0]) {
                    res.status(200).send(users);
                }
                else {
                    res.status(204).send();
                }
            }
        });
    });
    app.get('/api/v1/users/:id', function (req, res) {
        var db = UMS.con.getConnection();
        db.collection('credential').find(ObjectId(req.params.id.toString())).toArray(function (err, data) {
            if (err) {
                res.status(500).send(err);
            }
            else {
                if (!data[0]) {
                    res.status(204).send();
                }
                else {
                    res.status(200).send(data);
                }
            }
        });
    });
    app.put('/api/v1/users/:id', function (req, res) {
        var db = UMS.con.getConnection();
        db.collection('credential').find(ObjectId(req.params.id.toString())).toArray(function (err, user) {
            if (err) {
                res.send(err);
            }
            else {
                if (!user[0]) {
                    res.status(204).send();
                }
                else {
                    var id = ObjectId(req.params.id.toString());
                    db.collection('credential').update({ _id: id }, req.body, function (error, ans) {
                        if (error) {
                            res.send(error);
                        }
                        else {
                            res.send(ans);
                        }
                    });
                }
            }
        });
    });
    app.delete('/api/v1/users/:id', function (req, res) {
        var token = req.headers['x-access-token'];
        if (!token) {
            res.status(401).send('No token provided');
        }
        jwt.verify(token, config.secret, function (error, decoded) {
            if (error) {
                res.status(500).send('Authorization failed');
            }
            else {
                var db_1 = UMS.con.getConnection();
                db_1.collection('credential').find(ObjectId(decoded.userId)).toArray(function (err, user) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        if (user[0]) {
                            if (user[0].role != 'admin') {
                                res.status(500).send('authorization failed');
                            }
                            else {
                                db_1.collection('credential').find(ObjectId(req.params.id.toString())).toArray(function (err, user) {
                                    if (err) {
                                        res.send(err);
                                    }
                                    else {
                                        if (user[0]) {
                                            db_1.collection('credential').deleteOne({ '_id': ObjectId(req.params.id.toString()) }, function (delErr) {
                                                if (delErr) {
                                                    res.status(202).send(delErr);
                                                }
                                                else {
                                                    db_1.collection('credential').find(ObjectId(req.params.id.toString())).toArray(function (findErr, data) {
                                                        if (findErr) {
                                                            res.send(findErr);
                                                        }
                                                        if (!data[0]) {
                                                            res.status(200).send('Data deleted successfully');
                                                        }
                                                        else {
                                                            res.status(202).send('Not able to delete. Try again');
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            res.status(204).send();
                                        }
                                    }
                                });
                            }
                        }
                        else {
                            res.status(204).send();
                        }
                    }
                });
            }
        });
    });
};
