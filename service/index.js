const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const { jwtAuthz } = require('express-jwt-aserto');

const authzOptions = {
    authorizerServiceUrl: "https://authorizer.prod.aserto.com",
    policyId: "c22c1e35-1b0f-11ec-808e-015eb15c5e57",
    policyRoot: "asertodemo",
    authorizerApiKey: "437d2402b527997a3f7c0fe9f0d810c5bee74d44e6d68b0712528c9d73c297f8",
    tenantId: "82df8ce7-1b0f-11ec-a877-005eb15c5e57"
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

//Aserto authorizer
const checkAuthz = jwtAuthz(authzOptions)


// Create timesheets API endpoint
app.get('/api/protected', checkJwt, checkAuthz, function (req, res) {
    //send the response
    res.status(201).json({ foo: "bar" });
});

// Launch the API Server at localhost:8080
app.listen(8080);
