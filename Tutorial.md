# Creating a simple node application with the Aserto Authorization SDK

In almost every production level application, there comes the need to allow for a fine grained control over what users can see and do. For the most part, authorization is left as a secondary concern - often bolted on to the application as an afterthought. Then it proves to be difficult and time consuming to hand craft the authorization solution. That’s where Aserto can help.

Aserto is a could-native authorization platform that allows developers to avoid having to build their own access control solution and instead frees them up to focus on their core user experience. In this post you will learn how to integrate the Aserto SDK in the context of an Express.js application.

When you’ve completed this tutorial you would have learned how to:

1. Create a React application with authentication using Auth0
2. Set up a simple Express.js application
3. Define authentication middleware and define protected routes
4. Define a very simple authorization policy
5. Integrate the Aserto Authorization Express.js SDK to enable fine grained authorization control.

Before we get started, let’s discuss Aserto’s two major components: the Authorizer and the Control Plane.

_The Authorizer_ is where authorization decisions get made. It is an open source authorization engine which uses Open Policy Agent (OPA) to compute a decision based on policy, user context and data. In this tutorial we’re going to use the hosted version of this authorizer.

_The Control Plane_ manages the lifecycle of policies, user context, and data that are used by the authorizer. The control plane makes it easy to manage these artifacts centrally, and takes care of the details of synchronizing them to the Authorizer instance(s) deployed at the edge.

At the core of Aserto’s authorization model is an authorization policy, which we refer to simply as a Policy. Policies are authored in a textual language called Rego, defined as part of the Open Policy Agent (OPA) project in the Cloud Native Computing Foundation. Policies are treated just like application code or infrastructure-as-code - they are stored and versioned in a git repository. We’re going to define and see the policy in action later in this tutorial.

## Application Overview

The application we will build in this tutorial will be a simple one:
The user will be able to log in and out, and once they're logged in the application will attempt to access a protected asset served by an simple Express.js API. The Express.js API will call the Aserto hosted authorizer. The authorizer apply a policy which will allow only one user to access this asset based on their email.

To get started, you’re going to need:

1. Node.JS installed on your machine
2. Auth0 Account
3. Aserto account and credentials
4. Your favorite code editor

## Auth0 Setup

![PICTURE]()

We’re going to need to set up an Auth0 application and use some of the credentials provided there in our application. If you don’t have one already, open an Auth0 account.

Next, we’ll set up a Single Page Application.

![PICTURE]()

Create an API

![PICTURE]()

Create a test user

## React Application setup

We’re going to build a very bare bones application for this tutorial. We’ll start by creating an application using create-react-app. We are following the Auth0 instructions for creating a React app that can authenticate with Auth0 found [here]().

We'll use `npx create-react-app` to initialize our React application.

```
npx create-react-app aserto-react-demo
```

Now that we have a running React application, we'll continue by installing and then importing the required depedency `@auth0/auth0-react`.

In your terminal, execute

```
npm install @auth0/auth0-react
```

Then in `index.js`

```
import { Auth0Provider } from "@auth0/auth0-react";
```

Wrap the top level React Application component with the `Auth0Provider`, and pass it the required properties found in the Auth0 settings page for the application you created.

```
ReactDOM.render(
  <Auth0Provider
    domain="***.us.auth0.com"
    clientId="***********************"
    redirectUri={window.location.origin}
    audience="https://***.us.auth0.com/api/v2/"
    scope="read:current_user update:current_user_metadata"
  >
    <App />
  </Auth0Provider>,
  document.getElementById('root')
);

```

Now let's move on to building some components that will make use of the `Auth0Provider`. We'll start by creating a `components` folder under `src`. Then we'll create a file called `LoginButton.js`.

```
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
    const { loginWithRedirect } = useAuth0();

    return <button onClick={() => loginWithRedirect()}>Log In</button>;
};

export default LoginButton;
```

Similar to the login button, we'll create a `LogoutButton.js` component.

```
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LogoutButton = () => {
    const { logout } = useAuth0();

    return (
        <button onClick={() => logout({ returnTo: window.location.origin })}>
            Log Out
        </button>
    );
};

export default LogoutButton;
```

Lastly, we'll create a component to present the user's profile once they're logged in.

```
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated } = useAuth0();
    return (
        isAuthenticated && (
            <div>
                <img src={user.picture} alt={user.name} />
                <h2>{user.name}</h2>
                <p>{user.email}</p>

            </div>
        )
    );
};

export default Profile;
```

We can now assemble the pieces in our `App.js` file:

```
import './App.css';
import LoginButton from './components/LoginButton'
import LogoutButton from './components/LogoutButton'
import Profile from './components/Profile'

function App() {
  return (
    <div className="App">
      <LoginButton />
      <LogoutButton />
      <Profile />
    </div>
  );
}

export default App;

```

## Service Setup

We turn now to creating the Express.js service which will communicate with the Aserto hosted authorizer.

We'll start by installing and importing all of the required dependencies:

```
npm install express express-jwt jwks-rsa cors express-jwt-aserto
```

Create a file called `index.js` - that will be our server.

```
const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const { jwtAuthz } = require('express-jwt-aserto');
```

Next we define the middleware function which will call Auth0 to verify the validy of the JWT.

```
//Paste after the dependencies

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

// Next section of code to be pasted below
```

Next, we'll create the protected endpoint.

```

// Create timesheets API endpoint
app.get('/api/protected', checkJwt, function (req, res) {
    //send the response
    res.json({ secret: "Very sensitive information presented here" });
});

// Launch the API Server at localhost:8080
app.listen(8080);
```

To test this endpoint we're going to have to make sure the React app actually sends the authentication token. To do that, we'll update the `Profile.js` file.

```
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [sensitiveInformation, setSensitiveInformation] = useState(false)

    useEffect(() => {
        const accessProtectedInformation = async () => {
            const domain = "dev-apjz4h14.us.auth0.com";

            try {
                const accessToken = await getAccessTokenSilently({
                    audience: `https://${domain}/api/v2/`,
                    scope: "read:current_user",
                });

                const sensitiveInformationURL = `http://localhost:8080/api/protected`;
                const metadataResponse = await fetch(sensitiveInformationURL, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const res = await metadataResponse.json();
                setSensitiveInformation(res.secret)

            } catch (e) {
                console.log(e.message);
            }
        };

        accessProtectedInformation();
    }, [getAccessTokenSilently, user?.sub]);


    return (
        isAuthenticated && (
            <div>
                <img src={user.picture} alt={user.name} />
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>{sensitiveInformation || 'No access to sensitive information'}</p>
            </div>
        )
    );
};

export default Profile;
```

In this portion of the code we use an effect to first obtain a token from Auth0. Then we preform the call to our service sending the authorization token as part of our request's headers.

Let's test our application by logging in. If everything works as expected, we should see the profile picutre for the account we logged in with, as well as the label "Very sensitive information presented here". This should work for both users we created in Auth0.

Next we'll create an Aserto policy and allow access to the sensitive information to a single user.

---

## Create an Aserto Policy

The policy we'll create for this tutorial is very simple. It is going to allow access to the protected information only to one user.

We start by creating a new policy in the Aserto console.

![PICTURE]()

Aserto will save the new policy in the connected Github account. We will clone this repo and make some changes in it.

```
package asertodemo.GET.api.protected

# default to a "closed" system,
# only grant access when explicitly granted

default allowed = false
default visible = false
default enabled = false

allowed {
    input.user.email == "roie.cohen@gmail.com"
}

enabled {
    visible
}

visible {
    input.app == "web-console"
}

```

### Understanding the policy

...

Update manifest file

```
{
    "roots": ["asertodemo"]
}
```

## Update the Express service to use the Aserto middleware

Next we need to configure and apply the Aserto midddleware. In order to avoid saving any secret credentials in our source code, we'll add the following credentials to our `.env` file.

```
POLICY_ID=**********
POLICY_ROOT=asertodemo
AUTHORIZER_API_KEY=****************
TENANT_ID={Your tenant ID}

```

Continue by creating the configuration object for the Aserto middleware

```
const authzOptions = {
    authorizerServiceUrl: "https://authorizer.prod.aserto.com",
    policyId: process.env.POLICY_ID,
    policyRoot: process.env.POLICY_ROOT,
    authorizerApiKey: process.env.AUTHORIZER_API_KEY,
    tenantId: process.env.TENANT_ID
};

```

We'll define a function for the Aserto middleware:

```
//Aserto authorizer middleware function
const checkAuthz = jwtAuthz(authzOptions)
```

Lastly, add the `checkAuthz` middleware to our protected path.

```
app.get('/api/protected', checkJwt, checkAuthz, function (req, res) {
    //send the response
    res.json({ secret: "Very sensitive information presented here" });
});
```
