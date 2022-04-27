# Grouping & Mapping

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
With the addition of hte Grouping & Mapping Widget and the OneClickLCA Widget from Bentley Systems

The code is designed to show how to use the Grouping & Mapping api's but is also very useful for showing which classes are included.

There are some additional buttons within this project.
Select All : Select All elements that are emphasized to be selected for useful counting
Hide All : will cycle through all groups and Hide All elements which are part of a grouping thus allowing users to view what part of the model is not reported on.
Show All : Emphasize all elements that are part of a group, thus allowing a user to review what is already selected across all groups



## Environment Variables

Prior to running the app, you will need to add OIDC client configuration to the variables in the .env file:

```
# ---- Authorization Client Settings ----
IMJS_AUTH_CLIENT_CLIENT_ID=""
IMJS_AUTH_CLIENT_REDIRECT_URI=""
IMJS_AUTH_CLIENT_LOGOUT_URI=""
IMJS_AUTH_CLIENT_SCOPES =""
```

- You can generate a [test client](https://developer.bentley.com/tutorials/web-application-quick-start/#2-register-an-application) to get started.

- When you are ready to build a production application, [register here](https://developer.bentley.com/register/).

You should also add a valid iTwinId and iModelId for your user in the this file:

```
# ---- Test ids ----
IMJS_ITWIN_ID = ""
IMJS_IMODEL_ID = ""
```

- For the IMJS_ITWIN_ID variable, you can use the id of one of your existing Projects or Assets. 

- For the IMJS_IMODEL_ID variable, use the id of an iModel that belongs to the iTwin that you specified in the IMJS_ITWIN_ID variable. 

This project locks down the ProjectId, but allows any iModel in the Project to be used.  There is sample code in the project that shows how to enable project selection.  This is not recommended for public hosting.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.


### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

