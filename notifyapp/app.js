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

var Client = require('./client.js');
var Logger = require('./logger.js');
var Mailer = require('./mailer.js');
var Runner = require('./runner.js');
var Scheduler = require('./scheduler.js');

var LOG_NAME = process.env.LOG_NAME || 'DIG Alerts App';
var LOG_PATH = process.env.LOG_PATH || '/var/log/dig_alerts_app.log';

var SMTP_HOST = process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
var SMTP_PORT = process.env.SMTP_PORT || 465;
var SMTP_USER = process.env.SMTP_USER;
var SMTP_PASS = process.env.SMTP_PASS;
var SMTP_TLS_CIPHER = process.env.SMTP_TLS_CIPHER;

var MAILER_EMAIL_ADDRESS = process.env.MAILER_EMAIL_ADDRESS || 'dig-alert@nextcentury.com';
var DIG_SUPPORT_EMAIL_ADDRESS = process.env.DIG_SUPPORT_EMAIL_ADDRESS || 'dig-support@nextcentury.com';
var DIG_URL = process.env.DIG_URL;
var DATE_FIELD = process.env.DATE_FIELD || 'timestamp';

var ES_AUTH = process.env.ES_AUTH || null;
var ES_HOST = process.env.ES_HOST || 'localhost';
var ES_PORT = process.env.ES_PORT || 9200;
var ES_PROTOCOL = process.env.ES_PROTOCOL || 'http';

var USER_INDEX_NAME = process.env.USER_INDEX_NAME || 'dig-profiles';
var USER_INDEX_TYPE = process.env.USER_INDEX_TYPE || 'profile';
var DATA_INDEX_NAME = process.env.DATA_INDEX_NAME || 'dig-webpages';
var DATA_INDEX_TYPE = process.env.DATA_INDEX_TYPE || 'webpage';

var logger = new Logger(LOG_NAME, LOG_PATH);

logger.info('============================================================');
logger.info('Starting the DIG alert and email notification application...');

var mailer = new Mailer(logger, MAILER_EMAIL_ADDRESS, DIG_SUPPORT_EMAIL_ADDRESS, DIG_URL, {
  host: SMTP_HOST,
  port: SMTP_PORT,
  user: SMTP_USER,
  pass: SMTP_PASS,
  tlsCipher: SMTP_TLS_CIPHER
});

//mailer.sendSupportEmail();

var client = new Client(logger, ES_AUTH, ES_HOST, ES_PORT, ES_PROTOCOL);

var runner = new Runner(logger, client, USER_INDEX_NAME, USER_INDEX_TYPE, DATA_INDEX_NAME, DATA_INDEX_TYPE, DATE_FIELD, function(toEmailAddress, caseNames, callback) {
  mailer.sendAlertEmail(toEmailAddress, caseNames, callback);
  callback();
});

var scheduler = new Scheduler(logger);

scheduler.runMinutely(runner.checkUsersMinutely);
scheduler.runHourly(runner.checkUsersHourly);
scheduler.runDaily(runner.checkUsersDaily);
scheduler.runWeekly(runner.checkUsersWeekly);

//runner.checkUsersMinutely();
