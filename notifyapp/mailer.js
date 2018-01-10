/*
 * Copyright 2018 Next Century Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var nodemailer = require('nodemailer');

module.exports = function Mailer(logger, mailerEmailAddress, digSupportEmailAddress, digUrl, smtp) {
  var transporter;

  if(smtp && smtp.host && smtp.port && smtp.user && smtp.pass) {
    logger.info('Creating nodemailer SMTP transporter at ' + smtp.host + ':' + smtp.port + ' with username ' + smtp.user);
    var mailerConfig = {
      host: smtp.host,
      port: smtp.port,
      secure: !smtp.tlsCipher,
      logger: logger,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    };
    if(smtp.tlsCipher) {
      logger.info('SMTP TLS Cipher ' + smtp.tlsCipher);
      mailerConfig.tls = {
        ciphers: smtp.tlsCipher
      };
    }
    transporter = nodemailer.createTransport(mailerConfig);
  } else {
    logger.info('No SMTP config.  Creating default nodemailer transporter.');
    transporter = nodemailer.createTransport();
  }

  this.sendAlertEmail = function(toEmailAddress, caseNames, callback) {
    transporter.sendMail({
      from: mailerEmailAddress,
      to: toEmailAddress,
      subject: 'DIG Alert on ' + (caseNames.length === 1 ? caseNames[0] : caseNames.length + ' of Your Saved Cases'),
      text: 'DIG has new results available in your following saved cases:\n\n' + caseNames.join('\n') +
        (digUrl ? ('\n\nYou can view your saved cases in the DIG application here:  ' + digUrl) : '') +
        '\n\nThanks!\n'
    }, function(error, info) {
      if(error) {
        logger.error(error, 'Error sending alert email to ' + toEmailAddress);
      } else {
        logger.info('Sent alert email for ' + caseNames.length + ' saved cases to ' + toEmailAddress);
      }
      callback();
    });
  };

  this.sendSupportEmail = function() {
    if(!digSupportEmailAddress) {
      logger.info('Cannot send support email because address is not specified.');
      return;
    }

    transporter.sendMail({
      from: mailerEmailAddress,
      to: digSupportEmailAddress,
      subject: 'DIG Alert App Status',
      text: 'The DIG Alert App is running as of ' + new Date().toUTCString()
    }, function(error, info) {
      if(error) {
        logger.error(error, 'Error sending support email to ' + digSupportEmailAddress);
      } else {
        logger.info('Sent support email.');
      }
    });
  };

  logger.info('DIG Support Email Address ' + digSupportEmailAddress);
  logger.info('DIG URL ' + digUrl);
  logger.info('Mailer Email Address ' + mailerEmailAddress);
  logger.info('SMTP ' + smtp ? (smtp.host + ':' + smtp.port) : 'N/A');
};

