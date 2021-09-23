# Creating a simple node application with the Aserto Authorization SDK

In almost every production level application, there comes the need to allow for fine grained control over what users can see and do. For the most part, authorization is left as a secondary concern - often bolted on to the application as an afterthought. Then it proves to be difficult and time consuming to hand craft the authorization solution. That’s where Aserto can help.

Aserto is a could-native authorization platform that allows developers to avoid having to build their own access control solution and instead frees them up to focus on their core user experience. In this tutorial you will learn how to integrate the Aserto SDK in the context of an Express.js API, together with a React application.

Before we get started, let’s discuss Aserto’s two major components: the Authorizer and the Control Plane.

_The Authorizer_ is where authorization decisions get made. It is an open source authorization engine which uses Open Policy Agent (OPA) to compute a decision based on policy, user context and data. In this tutorial we’re going to use the hosted version of this authorizer.

_The Control Plane_ manages the lifecycle of policies, user context, and data that are used by the authorizer. The control plane makes it easy to manage these artifacts centrally, and takes care of the details of synchronizing them to the Authorizer instance(s) deployed at the edge.

At the core of Aserto’s authorization model is an authorization policy, which we refer to simply as a Policy. Policies are authored in a textual language called Rego, defined as part of the Open Policy Agent (OPA) project in the Cloud Native Computing Foundation. Policies are treated just like application code or infrastructure-as-code - they are stored and versioned in a git repository. We’re going to define and see the policy in action later in this tutorial.

When you’ve completed this tutorial you'll have learned how to:

1. Create a React application with authentication using Auth0
2. Set up a simple Express.js application with Auth0 authentication middleware and define a protected route
3. Create and modify a very simple authorization policy
4. Integrate the Aserto Authorization Express.js SDK to enable fine grained access control

## Application Overview

The application we will build in this tutorial will be a simple one:
The user will be able to log in and out, and once they're logged in the application will attempt to access a sensitive asset served by an Express.js API. The Express.js API will call the _Aserto hosted authorizer_. The _authorizer_ will apply a _policy_ which will allow only one user to access this asset based on their email. We're going to create two test users - and expect only one of them to have access to the mock sensitive asset we'll simulate.

## Prerequisites

To get started, you’re going to need:

1. Node.JS installed on your machine
2. Auth0 Account
3. Aserto account and credentials
4. Your favorite code editor

## Auth0 Setup

We’re going to need to set up a couple of Auth0 applications and use the credentials provided in our application, service and Aserto tenant (If you don’t have one already, you should open an Auth0 account). Let's start by setting up the Auth0 configuration for the React application.

### Application Settings

Navigate to the Applications tab from the left side menu:

![Auth0 - menu - applications](/images/auth0-menu-applications.png)

And then click on "Create Application":

![Auth0 - create app](/images/auth0-app-create.png)

Next, we’ll set up a Single Page Application.

![Auth0 - Create SPA](/images/auth0-spa-create.png)

Once created, we'll navigate to the settings tab of the application and configure the callback URLs, logout URLs and allowed web origins to work with our local applications which will be running on `http://localhost:3000`. Complete the form as shown below:

![Auth0 - SPA settings](/images/auth0-spa-settings.png)

When done, scroll to the bottom of the page and hit "Save".

Next, we'll create an API so that our Express.js application can communicate with Auth0 as well.

![Auth0 - menu - APIs](/images/auth0-menu-apis.png)

Click the "Create API Button":

![Auth0 - Create API](/images/auth0-apis-create.png)

Complete the form as shown below:

![Auth0 - Create API details](/images/auth0-apis-create-details.png)

You can inspect the settings tab, we'll use some of these details later.

![Auth0 - API Settings](/images/auth0-apis-settings.png)

Now we have to set up test users in Auth0. We'll set up two users: one that will have access to our sensitive asset, and another that will not be able to access it.

Navigate to the users management section in the left hand side menu:

![Auth0 - Menu user](/images/auth0-menu-users.png)

Now we'll create the two users mentioned above. Click on the "Create User" button:

![Auth0 - Create user button](/images/auth0-user-create-button.png)

Complete the form as shown below:

![Auth0 - Create user - details](/images/auth0-user-create-details.png)

Then repeat the process for the second user:

![Auth0 - create no access create  details](/images/auth0-user-no-access-create-details.png)

The last thing we have to set up in Auth0 is a Machine to Machine application which will allow Aserto to access Auth0's API. Create a new application and then choose "Machine to Machine Applications":

![Auth0 - m2m Aserto management](/images/auth0-m2m-aserto-management.png)

From the drop down, select "Auth0 Management API", then select the permissions as indicated below.

![Auth0 - m2m Aserto management permissions](/images/auth0-m2m-aserto-management-permissions.png)

**That's it!** Auth0 is ready and configured, and we're ready to move on and start building our application.

## React Application setup

We’re going to build a very bare bones application for this tutorial. We’ll start by creating an application using the `create-react-app` generator. We are loosely following the Auth0 instructions for creating a React app that can leverage Auth0 for authentication found [here](https://auth0.com/docs/quickstart/spa/react/01-login).

Let's kick things off and use `npx create-react-app` to initialize our React application. In your terminal, execute the following command:

```
npx create-react-app aserto-react-demo
```

You can now `cd aserto-react-demo` and start the app by running:

```
npm start
```

The familiar React logo should appear, indicating that the app is ready to go.

### Adding Auth0 dependencies

Now that we have a running React application, we'll continue by installing and then importing the required dependency - `@auth0/auth0-react`.

In your terminal, execute the following command:

```
npm install @auth0/auth0-react
```

To make sure the authentication credentials aren't part of your source code, create a `.env` file in the root of the React project, and copy over the credentials from the Auth0 console (these are the SPA credentials for the Aserto Demo app mentioned above).

```
REACT_APP_AUTH0_DOMAIN={YOUR_AUTH0_SUBDOMAIN}.us.auth0.com
REACT_APP_CLIENTID={YOUR_CLIENT_ID}
REACT_APP_AUDIENCE={YOUR_APP_AUDIENCE}
```

> Make sure the `.env` file is added to the `.gitignore` file so that it is not checked in.

Then, open the file `index.js` and add the dependency:

```javascript
import { Auth0Provider } from "@auth0/auth0-react";
```

Next, we'll wrap the top level React Application component with the `Auth0Provider`, and pass it the required configuration values we added to the `.env` file.

```javascript
ReactDOM.render(
  <Auth0Provider
    domain={process.env.REACT_APP_AUTH0_DOMAIN}
    clientId={process.env.REACT_APP_CLIENTID}
    redirectUri={window.location.origin}
    audience={process.env.REACT_APP_AUDIENCE}
  >
    <App />
  </Auth0Provider>,
  document.getElementById("root")
);
```

### Building React Components

Now let's move on to building some components that will also make use of the `@auth0/auth0-react` package. We'll start by creating a `components` folder under `src`. Then we'll create a file called `LoginButton.js`.

```javascript
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  return <button onClick={() => loginWithRedirect()}>Log In</button>;
};

export default LoginButton;
```

Similar to the login button, we'll create a `LogoutButton.js` file, in the `components` folder.

```javascript
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

```javascript
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated } = useAuth0();
    return (
        isAuthenticated && (
            <div>
                <img src={user.} alt={user.name} />
                <h2>{user.name}</h2>
                <p>{user.email}</p>

            </div>
        )
    );
};

export default Profile;
```

We can now assemble the pieces in our `App.js` file:

```javascript
import "./App.css";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";
import Profile from "./components/Profile";

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

### Test the application

Let's test our application by logging in. If it's not already running, start your application by executing:

```
npm start
```

Then hit the "Log In" button. If everything works as expected, the profile and email of the signed in user should be displayed.

![Aserto - test initial](/images/aserto-test-initial.png).

Great! Our application authenticates with Auth0, and so we have our user's identity in hand. We now turn to creating the Express.js service which will host our sensitive asset and will communicate with the Aserto hosted authorizer to determine whether or not a logged in user has the permissions to access the said asset based on the user's identity.

## Service Setup

First, create a new folder called `service` (it can be located under the React application folder or in any other location you might choose) and run:

```
npm init -y
npm install express express-jwt jwks-rsa cors express-jwt-aserto dotenv
```

Create a file called `.env` - this is where we will store sensitive credentials. Create a `.gitignore` file and add both `node_modules` and `.env` to it so that they are not checked in.

To the `.env` file add the following entries and copy the values from the Auth0 console (under the APIs section).

```
AUTH0_JWKS_URI=https://{YOUR_AUTH0_DOMAIN_HERE}.us.auth0.com/.well-known/jwks.json
AUTH0_AUDIENCE=https://{YOUR_API_AUDIENCE_HERE}
AUTH0_ISSUER=https://{YOUR_AUTH0_DOMAIN_HERE}.us.auth0.com/
```

Create a file called `index.js` - that will be our server. To this file, add the following dependncies:

```javascript
const express = require("express");
const app = express();
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const cors = require("cors");
const { jwtAuthz } = require("express-jwt-aserto");
require("dotenv").config();
```

In the next section we'll define the middleware function which will call Auth0 to verify the validity of the JWT (and also enable CORS):

```javascript
//Paste after the dependencies

const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.AUTH0_JWKS_URI,
  }),

  // Validate the audience and the issuer
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_ISSUER,
  algorithms: ["RS256"],
});

// Enable CORS
app.use(cors());

// Next section of code to be pasted below
```

Next, we'll create the protected endpoint:

```javascript
// Protected API endpoint
app.get("/api/protected", checkJwt, function (req, res) {
  //send the response
  res.json({ secret: "Very sensitive information presented here" });
});

// Launch the API Server at localhost:8080
app.listen(8080);
```

In this section of code, Express.js will pass the call to the `checkJwt` middleware which will determine whether the JWT sent to it is valid or not. If it is not valid, Express.js will return a 403 (Forbidden) response.

To start the server, run the following from within the `service` directory:

```
node index.js
```

### Update the profile page

To test this endpoint we're going to have to make sure the React app actually sends the authentication token to the server. To do that, we'll have to make some changes to the `Profile.js` file in our React app.

```javascript
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [sensitiveInformation, setSensitiveInformation] = useState(false)

    useEffect(() => {
        const accessSensitiveInformation = async () => {
            const domain = process.env.REACT_APP_AUTH0_DOMAIN;

            try {
                const accessToken = await getAccessTokenSilently();

                const sensitiveInformationURL = `http://localhost:8080/api/protected`;
                const sensitiveDataResponse = await fetch(sensitiveInformationURL, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const res = await sensitiveDataResponse.json();
                setSensitiveInformation(res.secret)

            } catch (e) {
                console.log(e.message);
            }
        };

        accessSensitiveInformation();
    }, [getAccessTokenSilently, user?.sub]);


    return (
        isAuthenticated && (
            <div>
                <img src={user.} alt={user.name} />
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>{sensitiveInformation || 'No access to sensitive information'}</p>
            </div>
        )
    );
};

export default Profile;
```

In this portion of the code we use a React effect to first obtain a token from Auth0 (`getAccessTokenSilently`). Then we perform the call to our service sending the authorization token as part of our request's headers (`fetch`). Finally, we parse the JSON response from the server and set the state of the `sensitiveInformation` variable.

### Test the application

Let's test our application by logging in again. If everything works as expected, we should see the profile for the account we logged in with, as well as the label "Very sensitive information presented here". At the moment, this should work for both users we created in Auth0.

We can further test this by intentionally sending a malformed header and making sure the sensitive information isn't shown. One way to do this is to append so rouge characters to the access token like so:

```javascript
sensitiveInformationURL,
  {
    headers: {
      Authorization: `Bearer ${accessToken}SOME_ROGUE_CHARECTERS`,
    },
  };
```

In this case we'd expect the sensitive information to not be shown.

We'll remove the rogue characters and test our second user (aserto.no-access@demo.com).

![Aserto test user no access has access](/images/aserto-test-user-no-access-has-access.png)

Whoops! That's not what we want. But since we didn't add any way to authorize particular users - this "no-access" user still has access to our very sensitive information. Let's fix that by creating an Aserto policy to allow access only to our intended user.

---

## Create an Aserto Policy

The policy we'll create for this tutorial is very simple. It is going to allow access to the sensitive information only to one user, based on their email.

We start by creating a new policy in the Aserto console. Once you're logged in, on the Policies tab click the "Add Policy" button.

![Aserto - add policy button](/images/aserto-add-policy-button.png)

You'll see the following dialog, prompting you to select a code provider. As mentioned above, Aserto uses source code control to maintain policies, so we first have to provide a source code provider where the policy will be stored and changes to it would be tracked.

![Aserto - add policy details](/images/aserto-add-policy-details-1.png)

From the drop down select "Add new source code connection"

![Aserto - add policy details - add source](/images/aserto-add-policy-details-add-source.png)

Another dialog will appear, asking us to choose a specific provider:

![Aserto - add connection](/images/aserto-add-connection.png)

In this tutorial we are going to use Github, so select it as the provider. After you complete the form, you'll be redirected to Github to allow Aserto to access your Github account. After the process is complete you'll be returned to the Aserto console.

Once connected to Github, select the organization you'd like the new repo for the policy to be generated in. For the "Repo" option select "New (using template)". Complete the form as shown below and click "Create repo".

![Asertro - add connection - select org and repo](/images/aserto-add-connection-select-org-and-repo.png)

The last thing we have to do to complete the creation of the policy is naming it:

![Aserto - add policy - name policy](/images/aserto-add-policy-name-policy.png)

After selecting a name for your policy, click "Add policy" to complete the process. You should see the newly created policy under the Policies tab.

![Aserto - add policy - policies list](/images/aserto-add-policy-policies-list.png)

Next, we'll find the policy repo in our Github account, clone it and make some changes.

We'll start by updating the `.manifest` file under `src`, which currently will only points to the root of our policy.
We'll change it from

```
{
    "roots": ["policies"]
}
```

to

```
{
    "roots": ["asertodemo"]
}
```

We'll rename the file `hello.rego` to `asertodemo.GET.api.protected`.
We'll open the file and change the package name to match the path of our Express API. The basic structure of the package name is:

```
[policy-root].[VERB].[path]
```

Where the path is separated by dots instead of slashes. And so in our case, the Express.js path

```javascript
app.get('/api/protected'...
```

becomes

```
package asertodemo.GET.api.protected
```

We're also going to define the policy such that the only "allowed" user is one with the email "aserto@demo.com". The user seen here will be the same user we receive from Auth0 (based on their JWT). Aserto attaches this user object to the "input" object. Below is the finished policy:

```
package asertodemo.GET.api.protected

# default to a "closed" system,
# only grant access when explicitly granted

default allowed = false

allowed {
    input.user.email == "aserto@demo.com"
}
```

To make sure our changes take effect, we need to commit our changes and tag a release before we push them back to the repo.

```
git add .
git commit -m "Policy update"
git tag -a v0.0.1 -m "Policy update"
git push origin main
git push --tags
```

We now have a minimal policy that should satisfy the requirements we defined.

## Add a connection to Auth0

In order for Aserto to be able to work with the same users found in Auth0, we need to create a connection to Auth0. To do that, navigate to the "Connections" tab in the Aserto console, and click the "Add Connection" button. Complete the form using the M2M credentials you created before for the Aserto Management application in Auth0.

![Aserto - Connections - Auth0 details](/images/aserto-connections-auth0-details.png)

Click "Add connection" to complete the process.

## Update the Express service to use the Aserto middleware

We now need to configure and apply the Aserto middleware. In order to avoid saving any secret credentials in our source code, we'll add the following credentials to our `.env` file.

To find these credentials, click on your policy in the Policies tab. Then choose the "Policy settings" tab. You should see the following:

![Aserto - policy settings](/images/aserto-policy-settings.png)

Copy the values to the `.env` file:

```
POLICY_ID={Your Policy ID}
POLICY_ROOT=asertodemo
AUTHORIZER_API_KEY={Your Authorizer API Key}
TENANT_ID={Your tenant ID}

```

Continue by creating the configuration object for the Aserto middleware:

```javascript
const authzOptions = {
  authorizerServiceUrl: "https://authorizer.prod.aserto.com",
  policyId: process.env.POLICY_ID,
  policyRoot: process.env.POLICY_ROOT,
  authorizerApiKey: process.env.AUTHORIZER_API_KEY,
  tenantId: process.env.TENANT_ID,
};
```

We'll define a function for the Aserto middleware, and pass it the configuration object.

```javascript
//Aserto authorizer middleware function
const checkAuthz = jwtAuthz(authzOptions);
```

Lastly, add the `checkAuthz` middleware to our protected path.

```javascript
app.get("/api/protected", checkJwt, checkAuthz, function (req, res) {
  //send the response
  res.json({ secret: "Very sensitive information presented here" });
});
```

> Before testing the application, make sure you restart the server.

When we log in with the user we allowed in the policy, we will still be able to see the "Very sensitive information presented here".

![Aserto - test access user](/images/aserto-test-access-user.png)

Since we defined that only this user has access, when we attempt to login with the second user we created, we should see the message "No access to sensitive data".

![Aserto - test no access user](/images/aserto-test-no-access-user.png)

Success! The sensitive information is presented only to the user we intended.

## Summary

In this tutorial, we learned how to create a React application that authenticates with Auth0. Then our application performed a query to an Express.js API which is itself protected by Auth0 for authentication and Aserto for authorization. We learned how to create and modify a simple Aserto policy - a first step towards having fine grained control over which users can access which resources. In future tutorials we'll learn how to create more elaborate policies and leverage more of the capabilities of the Aserto's SDKs and APIs.

You can find the completed application and service [here](https://github.com/squanchd/aserto-demo).
