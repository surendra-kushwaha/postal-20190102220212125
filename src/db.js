import logger from './logger';
// Mongo DB start here

logger.info('Connecting database...');
const mongoose = require('mongoose');
// load VCAP configuration  and service credentials
/*const vcapCredentials = require('./config/vcap-local.json');
const options = {
  // useNewUrlParser: true,
  // autoIndex: false, // Don't build indexes
  // reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  // reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  // bufferMaxEntries: 0,
  // connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  // socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  // family: 4 // Use IPv4, skip trying IPv6
};*/

// Now lets get cfenv and ask it to parse the environment variable
var cfenv = require('cfenv');

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
    vcapLocal = require('./vcap-local.json');
    console.log("Loaded local VCAP");
} catch (e) {
    // console.log(e)
}

const appEnvOpts = vcapLocal ? {
    vcap: vcapLocal
} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

// Within the application environment (appenv) there's a services object
let services = appEnv.services;

// The services object is a map named by service so we extract the one for MongoDB
let mongodb_services = services["compose-for-mongodb"];

// This check ensures there is a services for MongoDB databases
//assert(!util.isUndefined(mongodb_services), "App must be bound to compose-for-mongodb service");

// We now take the first bound MongoDB service and extract it's credentials object
let credentials = mongodb_services[0].credentials;

// We always want to make a validated TLS/SSL connection
let options = {
    ssl: true,
    sslValidate: true
};

// If there is a certificate available, use that, otherwise assume Lets Encrypt certifications.
if (credentials.hasOwnProperty("ca_certificate_base64")) {
    let ca = [new Buffer(credentials.ca_certificate_base64, 'base64')];
    options.sslCA = ca;
}

// mongoose.connect(vcapCredentials.uri, options);
mongoose.connect(
  credentials.uri,
  options,
);

mongoose.Promise = global.Promise;

const db = mongoose.connection;

db.on('connection', () => logger.info('Connected to the database.'));

db.on('error', err => {
  logger.error(`MongoDB connection error: ${err}`);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log(
      'Mongoose default connection disconnected through app termination',
    );
    process.exit(0);
  });
});

export default db;