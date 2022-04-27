/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./App.scss";

import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import type { ScreenViewport } from "@itwin/core-frontend";
import { FitViewTool, IModelApp, StandardViewId } from "@itwin/core-frontend";
import { FillCentered } from "@itwin/core-react";
import { Header, HeaderBreadcrumbs, HeaderButton, HeaderLogo, IconButton, MenuItem, ProgressLinear, UserIcon } from "@itwin/itwinui-react";
import { SvgImodel, SvgNetwork,  SvgSettings } from "@itwin/itwinui-icons-react";
import { useAccessToken, Viewer } from "@itwin/web-viewer-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { history } from "./history";
import { GroupingMappingProvider } from "@itwin/grouping-mapping-widget";
// import { documentUIProvider } from "./providers/colourUIProvider";
import { BentleyAPIFunctions } from "./helper/BentleyAPIFunctions";
import { ThemeButton } from "./helper/ThemeButton";
import { OneClickLCAProvider } from "@itwin/one-click-lca-react";
import { SelectAllButtonProvider } from "./components/toolbar/selectAll";
import { HideAllButtonProvider } from "./components/toolbar/HideAll";

const App: React.FC = () => {
  const [iModelId, setIModelId] = useState(process.env.IMJS_IMODEL_ID);
  const [iTwinId, setITwinId] = useState(process.env.IMJS_ITWIN_ID);
  const [selectedProject, setSelectedProject] = useState({name: "Please select", description: "a project", id: ""});
  const [selectedIModel, setSelectedIModel] = useState({id: process.env.IMJS_ITWIN_ID, displayName: "iModel Display Name", name : "iModel Name"})

  const accessToken = useAccessToken();

  const authClient = useMemo(
    () =>
      new BrowserAuthorizationClient({
        scope: process.env.IMJS_AUTH_CLIENT_SCOPES ?? "",
        clientId: process.env.IMJS_AUTH_CLIENT_CLIENT_ID ?? "",
        //redirectUri: process.env.IMJS_AUTH_CLIENT_REDIRECT_URI ?? "",
        //postSignoutRedirectUri: process.env.IMJS_AUTH_CLIENT_LOGOUT_URI,
        redirectUri: `${window.location.origin}/signin-callback`,
        postSignoutRedirectUri: `${window.location.origin}/signout-callback`,    
        responseType: "code",
        authority: process.env.IMJS_AUTH_AUTHORITY,
      }),
    []
  );

  const [isAuthorized, setIsAuthorized] = useState(
    accessToken
      ? true
      : false
  );

  const login = useCallback(async () => {
    try {
      await authClient.signInSilent();
    } catch {
      await authClient.signIn();
    }
  }, [authClient]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    void login();
  }, [login]);

  const onLoginClick = async () => {
    setIsLoggingIn(true);
    await authClient.signIn();
  };

  const onLogoutClick = async () => {
    setIsLoggingIn(false);
    await authClient.signOut();
    setIsAuthorized(false);
  };

  useEffect(() => {
    if (!iTwinId) {    
      setITwinId(process.env.IMJS_ITWIN_ID)
    }
  } , [iTwinId])
  useEffect(() => {
    if (!iModelId) {    
      setIModelId(process.env.IMJS_IMODEL_ID)
    }
  } , [iModelId])
  
  useEffect(() => {
    if (accessToken) {
      setIsAuthorized(true)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("iTwinId")) {
        /* setITwinId(urlParams.get("iTwinId") as string); */

      } else {
        if (!process.env.IMJS_ITWIN_ID) {
          throw new Error(
            "Please add a valid iTwin ID in the .env file and restart the application or add it to the iTwinId query parameter in the url and refresh the page. See the README for more information."
          );
        }
      }

      if (iModelId) {
        /* setIModelId(urlParams.get("iModelId") as string); */
        BentleyAPIFunctions.getImodelData(authClient, iModelId).then(iModelData => {
          setSelectedIModel({id: iModelId, displayName: iModelData.displayName, name: iModelData.name})
      })

      } else {
        if (!process.env.IMJS_IMODEL_ID) {
          throw new Error(
            "Please add a valid iModel ID in the .env file and restart the application or add it to the iModelId query parameter in the url and refresh the page. See the README for more information."
          );
        }
      }
    }
  }, [accessToken, authClient, iModelId]);

  useEffect(() => {
    if (accessToken && iTwinId && iModelId) {
      history.push(`?iTwinId=${iTwinId}&iModelId=${iModelId}`);
      BentleyAPIFunctions.getProjectData(authClient, iTwinId).then(projData => {
        setSelectedProject({name: projData.projectNumber ,description: projData.displayName , id: projData.id});
        })
      BentleyAPIFunctions.getImodelData(authClient, iModelId).then(iModelData => {
          setSelectedIModel({id: iModelId, displayName: iModelData.displayName, name: iModelData.name})
      })
    }
  }, [accessToken, iTwinId, iModelId, authClient]);

  /** NOTE: This function will execute the "Fit View" tool after the iModel is loaded into the Viewer.
   * This will provide an "optimal" view of the model. However, it will override any default views that are
   * stored in the iModel. Delete this function and the prop that it is passed to if you prefer
   * to honor default views when they are present instead (the Viewer will still apply a similar function to iModels that do not have a default view).
   */
  const viewConfiguration = useCallback((viewPort: ScreenViewport) => {
    // default execute the fitview tool and use the iso standard view after tile trees are loaded
    const tileTreesLoaded = () => {
      return new Promise((resolve, reject) => {
        const start = new Date();
        const intvl = setInterval(() => {
          if (viewPort.areAllTileTreesLoaded) {
            clearInterval(intvl);
            resolve(true);
          }
          const now = new Date();
          // after 20 seconds, stop waiting and fit the view
          if (now.getTime() - start.getTime() > 20000) {
            reject();
          }
        }, 100);
      });
    };

    tileTreesLoaded().finally(() => {
      void IModelApp.tools.run(FitViewTool.toolId, viewPort, true, false);
      viewPort.view.setStandardRotation(StandardViewId.Iso);
    });
  }, []);

  const viewCreatorOptions = useMemo(
    () => ({ viewportConfigurer: viewConfiguration }),
    [viewConfiguration]
  );

  //#region projectMenu

  const handleIModelChange = useCallback(value => {
    setIModelId(value as string)
    if (authClient.isAuthorized) {
      BentleyAPIFunctions.getImodelData(authClient, value).then(iModelData => {
      setSelectedIModel({id: value, displayName: iModelData.iModel.displayName, name: iModelData.iModel.name})
      })
    }
  }, [authClient]);
  
  const projectIModels = useCallback((close: () => void) => {
    var menuItemsToReturn : JSX.Element[] = [];
    if (isAuthorized){
    BentleyAPIFunctions.getImodelsMinimalFromProject(authClient, selectedProject.id).then(res => {
      for (var x = 0; x < res.iModels.length; x++){
          menuItemsToReturn.push(
          <MenuItem
          key={res.iModels[x].id}
          title={res.iModels[x].displayName}
          value={res.iModels[x].id} 
          id={res.iModels[x].id}
          onClick={(value: any) => {         
              handleIModelChange(value);
              close(); // close the dropdown menu
          }}
          isSelected={(res.iModels[x].id === iModelId) ? true : false}          
          >
          {res.iModels[x].id} -- {res.iModels[x].displayName}
          </MenuItem>
          )
      }
    })
    .catch(error => {console.log("Caught an error", error.message); 
        menuItemsToReturn.push(
            <MenuItem
            key="1" title={error.message}
            onClick={(value) => {close()}}
            >An error occurred - {error.message}</MenuItem>)
            })
    handleIModelChange(iModelId);
    return (menuItemsToReturn);
    }
    else
    {
      return ([<MenuItem key="1">Please Login</MenuItem>])
    }
  },[isAuthorized, selectedProject, authClient, handleIModelChange, iModelId])
  

const noProjectChange = useCallback((close: () => void) => {  
  return ([<MenuItem key="1">Project Change not enabled</MenuItem>])
}, []) ;

//handle the change to breadcrumb1
const handleProjectInputChange = useCallback(value => {
  if (isAuthorized) {
  BentleyAPIFunctions.getProjectData(authClient, value).then(projData => {
    setSelectedProject({name: projData.projectNumber ,description: projData.displayName , id: projData.id});
    })
  }
}, [authClient, isAuthorized]);

const recentProject = useCallback((close: () => void) => {
  var menuItemsToReturn : JSX.Element[] = [];
  if (isAuthorized){
  BentleyAPIFunctions.getRecentProjects(authClient).then(res => {
    for (var x = 0; x < res.length; x++){
        menuItemsToReturn.push(
        <MenuItem
        key={res[x].id}
        title={res[x].projectNumber}
        value={res[x].id} 
        id={res[x].id}
        onClick={(value: any) => {         
            handleProjectInputChange(value);
            close(); // close the dropdown menu
        }}
        isSelected={(res[x].id === selectedProject.id) ? true : false}
        >
        {res[x].projectNumber} -- {res[x].displayName}
        </MenuItem>
        )
    }
  })
  .catch(error => {console.log("Caught an error", error.message); 
      menuItemsToReturn.push(
          <MenuItem
          key="1" title={error.message}
          onClick={(value) => {close()}}
          >An error occurred - {error.message}</MenuItem>)
          })
  return (menuItemsToReturn);
  }
  else
  {
    return ([<MenuItem key="1">Please Login</MenuItem>])
  }
},[isAuthorized, selectedProject, authClient, handleProjectInputChange])

//#endregion



  return (
    <div className="app">
    <Header
    appLogo={<HeaderLogo logo={<SvgSettings />}>Carbon Reporting</HeaderLogo>}
     breadcrumbs={
       <HeaderBreadcrumbs
         items={[
           <div>
             <HeaderButton
               className="scroll"
               key="projectBreadcrumb"
               menuItems={noProjectChange}
               name={selectedProject.name}
               description={selectedProject.description}
               startIcon={<SvgNetwork />}
             />
             <HeaderButton
             className="scroll"
             key="iModelList"
             menuItems={projectIModels}
             name={selectedIModel.name}
             description={selectedIModel.displayName}
             startIcon={<SvgImodel />}
           />
           </div>
         ]}
       />
     }
     actions={[<ThemeButton key="themeSwitched" />]}
     userIcon={
       <IconButton styleType="borderless"  onClick={() => {isAuthorized ? onLogoutClick() : onLoginClick()} }>
         <UserIcon
         className={isAuthorized===true ? "App-logo-noSpin" : "App-logo"} 
           size="medium"
           status={isAuthorized ? "online" : "offline"} 
           image={
             <img
               src="https://itwinplatformcdn.azureedge.net/iTwinUI/user-placeholder.png"
               alt="User icon"
             />
           }
         />
       </IconButton>
     }
   />
    <div className="viewer-container">
      {!accessToken && (
        <FillCentered>
          <div className="signin-content">
            <ProgressLinear indeterminate={true} labels={["Signing in..."]} />
          </div>
        </FillCentered>
      )}
      <Viewer
        iTwinId={iTwinId}
        iModelId={iModelId}
        authClient={authClient}
        viewCreatorOptions={viewCreatorOptions}
        enablePerformanceMonitors={true} // see description in the README (https://www.npmjs.com/package/@itwin/desktop-viewer-react)
        uiProviders = {[new GroupingMappingProvider(), new OneClickLCAProvider(), new SelectAllButtonProvider(),new HideAllButtonProvider()]}
      />
    </div>
    </div>

  );
};

export default App;
