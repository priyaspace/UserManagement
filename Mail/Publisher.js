var amqp = require('amqplib/callback_api');
config = require('../public/config.js');
var mailService = require('./MailingService.ts');
module.exports.publish = function (data, toMail) {
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
                        channel.purgeQueue(config.queue);
                        channel.assertQueue(config.queue, { durable: true });
                        channel.sendToQueue(config.queue, Buffer.from(JSON.stringify(data)));
                        channel.close();
                        mailService.send(toMail);
                    }
                });
            }
        }
    });
};
