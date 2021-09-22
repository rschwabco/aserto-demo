const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const { jwtAuthz } = require('express-jwt-aserto');
require('dotenv').config()



const checkJwt = jwt({
    // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.AUTH0_JWKS_URI
    }),

    // Validate the audience and the issuer
    audience: process.env.AUTH0_AUDIENCE, //replace with your API's audience, available at Dashboard > APIs
    issuer: process.env.AUTH0_ISSUER,
    algorithms: ['RS256']
});

// Enable CORS
app.use(cors());

//Aserto authorizer
const authzOptions = {
    authorizerServiceUrl: "https://authorizer.prod.aserto.com",
    policyId: process.env.POLICY_ID,
    policyRoot: process.env.POLICY_ROOT,
    authorizerApiKey: process.env.AUTHORIZER_API_KEY,
    tenantId: process.env.TENANT_ID
};

//Aserto authorizer middleware function
const checkAuthz = jwtAuthz(authzOptions)

// Create timesheets API endpoint
app.get('/api/protected', checkJwt, checkAuthz, function (req, res) {
    //send the response
    res.json({ secret: "Very sensitive information presented here" });
});

// Launch the API Server at localhost:8080
app.listen(8080);
