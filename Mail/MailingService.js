var mailer = require('nodemailer');
UMS = require('../Services/UserManagementService.ts');
config = require('../public/config.js');
amqp = require('amqplib/callback_api');
var async = require('async');
var await = require('await');
module.exports.send = function (toMail) {
    var transport = mailer.createTransport({
        Service: 'Microsoft Outlook',
        host: 'smtp.office365.com',
        port: '587',
        secure: false,
        connectionTimeout: '700000',
        auth: {
            user: 'priya.shanmugam@aspiresys.com',
            pass: 'xxxx'
        }
    });
    var message = '';
    var mailOptions = {
        from: 'priya.shanmugam@aspiresys.com',
        subject: 'New node js mailing service application',
        to: [],
        text: ''
    };
    var db = UMS.con.getConnection();
    amqp.connect(config.amqp, function (err, connection) {
        if (err) {
            console.log('error in connection:', err);
        }
        else {
            if (connection) {
                connection.createChannel(function (chErr, channel) {
                    if (chErr) {
                        console.log('error in channel:', chErr);
                    }
                    else {
                        channel.assertQueue(config.queue, { durable: true });
                        channel.consume(config.queue, function (msg) {
                            message = msg.content.toString();
                            var adminsEmail = [], i = 0;
                            db.collection('credential').find({ role: 'admin' }).toArray(function (err, admins) {
                                if (err) {
                                    console.log('error in finding admins', err);
                                }
                                else if (admins[0]) {
                                    admins.forEach(function (admin) {
                                        adminsEmail[i] = admin.email;
                                        i++;
                                    });
                                    adminsEmail[adminsEmail.length] = toMail;  
                                    mailOptions.to = adminsEmail;
                                    mailOptions.text = message;
                                    transport.sendMail(mailOptions, function (err, info) {
                                        if (err) {
                                            console.log('error in mailing service ', err);
                                        }
                                        else {
                                            if (info) {
                                                channel.ack(info);
                                            }
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        }
    });
};
