/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/

import { useActiveIModelConnection } from "@itwin/appui-react";
import { HorizontalTabs, Tab } from "@itwin/itwinui-react";
import { RouteComponentProps, useLocation, useNavigate } from "@reach/router";
import React, { BaseSyntheticEvent } from "react";

import { useApiPrefix } from "../../../api/useApiPrefix";
import "../../../data/epddata.ts";
import "./Carbon.scss";
import { CarbonByCategory } from "./CarbonbyCategory";

export interface CarbonProps extends RouteComponentProps {
  projectId?: string;
  iModelId?: string;
  accessToken: string;
}
export const Carbon = ({
  iModelId = "",
  projectId = "",
  accessToken,
  navigate: localNavigate,
}: CarbonProps) => {
  const location = useLocation();
  const [tabIndex, setTabIndex] = React.useState(0);
  const [searchProperty, setSearchProperty] = React.useState("");
  const serverEnvironmentPrefix = useApiPrefix();
  const globalNavigate = useNavigate();
  const iModelConnection = useActiveIModelConnection();
  const searchProperties = (e: BaseSyntheticEvent) => {
    e.preventDefault();
    console.log("Searching ...");
    if (!document) {
      return;
    }
    const searchElement = document.getElementById(
      "searchCriteria"
    ) as HTMLInputElement;
    setSearchProperty(searchElement.value || "");
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      console.log("Searching ...");
      if (!document) {
        return;
      }
      setSearchProperty(e.target.value || "");
    }
  };

  console.log(iModelConnection?.name);

  const getContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <div
            className="app-dashboard-grid"
            style={{ overflow: "auto", height: "90vh", display: "flex" }}
          >
            <CarbonByCategory
              projectId={projectId}
              accessToken={accessToken}
              iModelId={iModelId}
            ></CarbonByCategory>
          </div>
        );
      case 1:
        return (
          <div
            className="app-dashboard-grid"
            style={{ overflow: "auto", height: "90vh", display: "flex" }}
          ></div>
        );
      case 2:
        return (
          <div
            className="app-dashboard-grid"
            style={{ overflow: "auto", height: "90vh", display: "flex" }}
          ></div>
        );
    }
  };

  return (
    <div className="dashboard-toolbar">
      <HorizontalTabs
        wrapperClassName="dashboard-tabs"
        labels={[
          <Tab key={1} label="Carbon" sublabel="Carbon Review" />,
          <Tab
            key={2}
            label="Properties"
            sublabel="User defined slection of properties and instances"
          />,
          <Tab
            key={3}
            label="Suitability Index"
            sublabel="Completeness Index"
          />,
        ]}
        onTabSelected={setTabIndex}
      >
        {getContent()}
      </HorizontalTabs>
    </div>
  );
};
