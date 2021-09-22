# Creating a simple node application with the Aserto Authorization SDK

In almost every production level application, there comes the need to allow for a fine grained control over what users can see and do. For the most part, authorization is left as a secondary concern - often bolted on to the application as an afterthought. Then it proves to be difficult and time consuming to hand craft the authorization solution. That’s where Aserto can help.

Aserto is a could-native authorization platform that allows developers to avoid having to build their own access control solution and instead frees them up to focus on their core user experience. In this tutorial you will learn how to integrate the Aserto SDK in the context of an Express.js application.

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

We’re going to need to set up an Auth0 application and use some of the credentials provided there in our application. If you don’t have one already, open an Auth0 account.

Navigate to the Applications tab from the left side menu:

![Create Auth0 App](/images/auth0-menu-applications.png)

And then click on "Create Application":

![Create Auth0 App](/images/auth0-app-create.png)

Next, we’ll set up a Single Page Application.

![Create Auth0 SPA](/images/auth0-spa-create.png)

Once created, we'll configure the application's callback URLs, logout URLs and allowed web origins to work with our local applications which will be running on `http://localhost:3000`.

![PICTURE](/images/auth0-spa-settings.png)

Next, we'll create an API so that our Express.js application can communicate with Auth0 as well.

![PICTURE](/images/auth0-menu-apis.png)

Click the "Create API Button":
![PICTURE](/images/auth0-apis-create.png)

Complete the form as shown below:
![PICTURE](/images/auth0-apis-create-details.png)

You can inspect the settings tab, we'll use some of these details later.
![PICTURE](/images/auth0-apis-settings.png)

The last thing we have to set up in Auth0 are test users. We'll set up two users: one that will have access to our protected asset, and another that should eventually not be able to acess it.

Navigate to the users management section in the lefthand side menu:
![PICTURE](/images/auth0-menu-users.png)

Now create the two users. Click on the "Create User" button:
![PICTURE](/images/auth0-user-create-button.png)

Complete the form as shown below:
![PICTURE](/images/auth0-user-create-details.png)

Then repeat the process for the second user:
![PICTURE](/images/auth0-user-no-access-create-details.png)

## React Application setup

We’re going to build a very bare bones application for this tutorial. We’ll start by creating an application using the `create-react-app` generator. We are following the Auth0 instructions for creating a React app that can leverage Auth0 for authentication found [here]().

Let's kick things off and use `npx create-react-app` to initialize our React application.

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

Wrap the top level React Application component with the `Auth0Provider`, and pass it the required properties found in the Auth0 settings page for the single page application you created.

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

**Let's test** our application by logging in. If everything goes right, the profile picture and email of the signed in user should be displayed.

## Service Setup

We now turn to creating the Express.js service which will communicate with the Aserto hosted authorizer.

We'll start by installing and importing all of the required dependencies:

```
npm install express express-jwt jwks-rsa cors express-jwt-aserto
```

Create a file called `.env` - this is where we will store sensitive credentials. Add this file to your `.gitignore` so that it is not checked in.

To the `.env` file add the following entries and copy the values from the Auth0 console.

```
AUTH0_JWKS_URI=https://{YOUR_AUTH0_DOMAIN_HERE}.us.auth0.com/.well-known/jwks.json
AUTH0_AUDIENCE=https://{YOUR_API_AUDIENCE_HERE}
AUTH0_ISSUER=https://{YOUR_AUTH0_DOMAIN_HERE}.us.auth0.com/
```

Create a file called `index.js` - that will be our server.

```
const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const { jwtAuthz } = require('express-jwt-aserto');
require('dotenv').config()

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

To test this endpoint we're going to have to make sure the React app actually sends the authentication token to the server. To do that, we'll have to make some changes to the `Profile.js` file.

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

In this portion of the code we use a React effect to first obtain a token from Auth0. Then we preform the call to our service sending the authorization token as part of our request's headers.

**Let's test** our application by logging in again. If everything works as expected, we should see the profile picutre for the account we logged in with, as well as the label "Very sensitive information presented here". This should work for both users we created in Auth0.

We can further test this by intentionaly sending a malformed header and making sure the sensitive information isn't shown. One way to do this is to append so rouge charecthers to the acesss token like so:

```
(sensitiveInformationURL, {
    headers: {
        Authorization: `Bearer ${accessToken}SOME_ROGUE_CHARECTERS`,
    },
});
```

In this case we'd expect the sensitive information to not be shown.

Next we'll create an Aserto policy and allow access to the sensitive information to a single user.

---

## Create an Aserto Policy

The policy we'll create for this tutorial is very simple. It is going to allow access to the protected information only to one user.

We start by creating a new policy in the Aserto console. Once you're logged in, on the Policies tab click the "Add Policy" button.

![PICTURE](/images/aserto-add-policy-button.png)

You'll see the following dialog, prompting you to select a code provider.

![PICTURE](/images/aserto-add-policy-details-1.png)

From the drop down select "Add new source code connection"

![PICTURE](/images/aserto-add-policy-details-add-source.png)

Another dialog will appear.
![PICTURE](/images/aserto-add-connection.png)

In this tutorial we are going to use Github, so select it is the provider. After you complete the form, you'll be redirected to Github to allow Aserto to access your Github account. After the process is complete you'll be returned to the Aserto console.

Once connected to Github, select the organization you'd like the new repo for the policy to be generated in. For the "Repo" option select "New (using template)". Complete the form as shown below and click "Create repo".

![PICTURE](/images/aserto-add-connection-select-org-and-repo.png)

The last thing we have to do to complete the creation of the policy is naming it:

![PICTURE](/images/aserto-add-policy-name-policy.png)

After selecting a name for your policy, click "Add policy" to complete the process. You should see the newly created policy under the Policies tab.

![PICTURE](/images/aserto-add-policy-policies-list.png)

Next, we'll clone this repo and make some changes in it.

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

The package name corresponds the Express.js path that we set up:

```


```

...

Update manifest file

```
{
    "roots": ["asertodemo"]
}
```

## Update the Express service to use the Aserto middleware

Next we need to configure and apply the Aserto midddleware. In order to avoid saving any secret credentials in our source code, we'll add the following credentials to our `.env` file.

To find these credentials, click on your policy in the Policies tab. You should see the following:

Copy the values to the `.env` file:

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

When we log in with the user we allowed in the policy, we will still be able to see the "Very sensitive information presented here". But since we defined that only this user has access, when we attempt to login with the second user we created, we should see the message "No access to sensitive data".

## Summary
