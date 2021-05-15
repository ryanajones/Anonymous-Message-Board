require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

// Mongoose connect
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', (err) => {
  console.error(err);
});
db.once('open', () => {
  console.log('Connected to database');
});

// Mongoose disconnect
process.on('SIGINT', () => {
  db.close(() => {
    console.log(`Closing connection to ${dbName}`);
    process.exit(0);
  });
});

const app = express();

app.use('/public', express.static(`${process.cwd()}/public`));
console.log(`${process.cwd()}/public`);
app.use(cors({ origin: '*' })); // For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helmet secrutiy middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://code.jquery.com/jquery-2.2.1.min.js',
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  })
);
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(
  helmet.referrerPolicy({
    policy: ['same-origin'],
  })
);

// Sample front-end
app.route('/b/:board/').get(function (req, res) {
  res.sendFile(`${process.cwd()}/views/board.html`);
});
app.route('/b/:board/:threadid').get(function (req, res) {
  res.sendFile(`${process.cwd()}/views/thread.html`);
});

// Index page (static HTML)
app.route('/').get(function (req, res) {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API
apiRoutes(app);

// 404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404).type('text').send('Not Found');
});

// Start our server and tests!
app.listen(process.env.PORT || 3000, function () {
  console.log(`Listening on port ${process.env.PORT}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        const error = e;
        console.log('Tests are not valid:');
        console.log(error);
      }
    }, 1500);
  }
});

module.exports = app; // for testing
