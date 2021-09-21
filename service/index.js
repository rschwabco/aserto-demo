const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const { displayStateMap, jwtAuthz, is } = require('express-jwt-aserto');

const authzOptions = {
    authorizerServiceUrl: "https://authorizer.prod.aserto.com",
    policyId: "c22c1e35-1b0f-11ec-808e-015eb15c5e57",
    policyRoot: "asertodemo",
};


// Enable CORS
app.use(cors());

const checkJwt = jwt({
    // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://dev-apjz4h14.us.auth0.com/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    audience: 'https://dev-apjz4h14.us.auth0.com/api/v2/', //replace with your API's audience, available at Dashboard > APIs
    issuer: 'https://dev-apjz4h14.us.auth0.com/',
    algorithms: ['RS256']
});

// Enable the use of request body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));



// Create timesheets API endpoint
app.get('/api/protected', checkJwt, function (req, res) {
    var timesheet = req.body;

    // Save the timesheet to the database...

    //send the response
    res.status(201).json({ foo: "bar" });
});

// Launch the API Server at localhost:8080
app.listen(8080);
