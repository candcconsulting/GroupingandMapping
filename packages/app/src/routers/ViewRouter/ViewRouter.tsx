/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { UiItemsProvider } from "@itwin/appui-abstract";
import { GroupingMappingProvider } from "@itwin/grouping-mapping-widget";
import {
  MeasureTools,
  MeasureToolsUiItemsProvider,
} from "@itwin/measure-tools-react";
import { OneClickLCAProvider } from "@itwin/one-click-lca-react";
import {
  PropertyGridManager,
  PropertyGridUiItemsProvider,
} from "@itwin/property-grid-react";
import {
  ReportsConfigProvider,
  ReportsConfigWidget,
} from "@itwin/reports-config-widget-react";
import {
  TreeWidget,
  TreeWidgetUiItemsProvider,
} from "@itwin/tree-widget-react";
import {
  Viewer,
  ViewerContentToolsProvider,
  ViewerNavigationToolsProvider,
  ViewerStatusbarItemsProvider,
} from "@itwin/web-viewer-react";
import { RouteComponentProps, Router } from "@reach/router";
import React, { useCallback, useEffect, useState } from "react";
import { displayNegativeToast } from "../../api/helperfunctions/messages";

import { useApiData } from "../../api/useApiData";
import { useApiPrefix } from "../../api/useApiPrefix";
import { ErrorBoundary } from "../../components/ErrorBoundary/ErrorBoundary";
import { CarbonUIProvider } from "../../components/Providers/CarbonUIProvider";
import { ResultsWidgetProvider } from "../../components/Providers/Widgets/ResultsWidgetProvider";
import AuthClient from "../../services/auth/AuthClient";
import { SelectionRouter } from "../SelectionRouter/SelectionRouter";
// import "../../components/Providers/Widgets/carbonWidget.scss"

const useThemeWatcher = () => {
  const [theme, setTheme] = React.useState(() =>
    document.documentElement.classList.contains("iui-theme-dark")
      ? "dark"
      : "light"
  );
  React.useEffect(() => {
    const themeObserver = new MutationObserver((mutations) => {
      const html = mutations[0].target as HTMLElement;
      setTheme(html.classList.contains("iui-theme-dark") ? "dark" : "light");
    });
    themeObserver.observe(document.documentElement, {
      subtree: false,
      attributes: true,
      childList: false,
      characterData: false,
      attributeFilter: ["class"],
    });
    return () => themeObserver.disconnect();
  }, []);
  return theme;
};
export interface ViewProps extends RouteComponentProps {
  accessToken?: string;
  projectId?: string;
  iModelId?: string;
  versionId?: string;
}
const View = (props: ViewProps) => {
  (window as any).ITWIN_VIEWER_HOME = window.location.origin;
  const {
    results: { namedVersion: fetchedVersion },
    state,
  } = useApiData<{ namedVersion: { changesetId: string } }>({
    accessToken: props.versionId ? props.accessToken : undefined,
    url: `https://api.bentley.com/imodels/${props.iModelId}/namedversions/${props.versionId}`,
  });
  const urlPrefix = useApiPrefix();
  (globalThis as any).IMJS_URL_PREFIX = urlPrefix ? `${urlPrefix}-` : "";
  const theme = useThemeWatcher();
  const changesetId = props.versionId ? fetchedVersion?.changesetId : undefined;
  const onIModelAppInit = useCallback(async () => {
    try {
      await TreeWidget.initialize();
      await PropertyGridManager.initialize();
      await MeasureTools.startup();
    } 
    catch(error) 
    {
      displayNegativeToast("Error Initializing viewer - Try refresh")
    }
  }, []);
  const [reportsConfigInitialized, setReportsConfigInitialized] = useState(
    false
  );
  useEffect(() => {
    const init = async () => {
      try {
        await ReportsConfigWidget.initialize();
        setReportsConfigInitialized(true);
      } 
      catch(error) 
      {
        displayNegativeToast("Error Initializing viewer - Try refresh")
      }
  
    };

    void init();
  }, []);
  const uiProviders: UiItemsProvider[] = [];
  try {
    if (reportsConfigInitialized) {
      uiProviders.push(new GroupingMappingProvider());
      uiProviders.push(new OneClickLCAProvider());
      uiProviders.push(new ReportsConfigProvider());
      uiProviders.push(new ViewerNavigationToolsProvider());
      uiProviders.push(new ResultsWidgetProvider());
      uiProviders.push(
        new ViewerContentToolsProvider({
          vertical: {
            measureGroup: false,
          },
        })
      );
      uiProviders.push(new ViewerStatusbarItemsProvider());
      uiProviders.push(new TreeWidgetUiItemsProvider());
      uiProviders.push(
        new PropertyGridUiItemsProvider({
          enableCopyingPropertyText: true,
        })
      );
      uiProviders.push(new MeasureToolsUiItemsProvider());
      uiProviders.push(new CarbonUIProvider());
    }
  } 
  catch(error) 
  {
    displayNegativeToast("Error Initializing viewer - Try refresh")
  }

try {
  return (state || !props.versionId) && AuthClient.client ? (
    <Viewer
      changeSetId={changesetId}
      iTwinId={props.projectId ?? ""}
      iModelId={props.iModelId ?? ""}
      authClient={AuthClient.client}
      theme={theme}
      enablePerformanceMonitors={true}
      onIModelAppInit={onIModelAppInit}
      uiProviders={uiProviders}
    />
  ) : null;
}
catch(error) {
  displayNegativeToast("Something went wrong with the viewer ... please try refresh")
  return <p>Please refresh the browser</p>
}
};

interface ViewRouterProps extends RouteComponentProps {
  accessToken: string;
}

export const ViewRouter = ({ accessToken }: ViewRouterProps) => {
  return (
    <ErrorBoundary>
      <Router className="full-height-container">
        <SelectionRouter
          accessToken={accessToken}
          path="*"
          hideIModelActions={["view"]}
        />
        <View path="project/:projectId/imodel/:iModelId" />
        <View
          path="project/:projectId/imodel/:iModelId/version/:versionId"
          accessToken={accessToken}
        />
      </Router>
    </ErrorBoundary>
  );
};
