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
import { IMaterial } from "../../../api/mongoAppApi";

import { useApiPrefix } from "../../../api/useApiPrefix";
import { getSettings } from "../../../config";
import "./Carbon.scss";
import { CarbonByCategory } from "./CarbonByCategory";
import { CarbonByCategoryOnly } from "./CarbonByCategoryOnly";
import { CarbonList } from "./CarbonList";
import { CarbonReview } from "./CarbonReview";
import { CarbonTrend } from "./CarbonTrend";
import PackageDashboard from "./PackageDashboard";

export interface CarbonProps extends RouteComponentProps {
  projectId?: string;
  iModelId?: string;
  accessToken: string;
}
export const gwpCalculation = (material : IMaterial, element : any) => {
  switch (material.unitType) {
    case "volume" : {
      const gwp = +(element.volume * material.carbonFactor).toFixed(getSettings.decimalAccuracy) ?? 0
      return gwp      
    }
    case "area" : {
      const gwp = +(element.area * material.carbonFactor).toFixed(getSettings.decimalAccuracy) ?? 0
      return gwp      
    }
    case "length" : {
      const gwp = +(element.length * material.carbonFactor).toFixed(getSettings.decimalAccuracy) ?? 0
      return gwp
    }
    case "unit" : {
      const gwp = +(element.count * material.carbonFactor).toFixed(getSettings.decimalAccuracy) ?? 0
      return gwp
    }
    case "weight" : {      
      const gwp = +((element.volume ?? element.weight) * material.density * material.carbonFactor).toFixed(getSettings.decimalAccuracy) ?? 0
      return gwp
    }

    default :
      return 0;
  }
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

  // console.log(iModelConnection?.name);

  const getContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <div
            className="esg-app-dashboard-grid"
            style={{
              // height: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: "1", minWidth: "50%", marginBottom: "40px" }}>
              <CarbonList
                projectId={projectId}
                accessToken={accessToken}
                iModelId={iModelId}
              ></CarbonList>
            </div>
            <div style={{ flex: "2", minWidth: 0 }}>
              <CarbonTrend
                projectId={projectId}
                accessToken={accessToken}
                iModelId={iModelId}
              ></CarbonTrend>
            </div>
          </div>
        );
      case 1:
        return (
          <div
            className="esg-app-dashboard-grid"
            style={{ overflow: "auto", height: "100%", display: "flex" }}
          >
            <div style={{ flex: "1", minWidth: "50%", marginBottom: "40px" }}>
              <CarbonByCategory
                projectId={projectId}
                accessToken={accessToken}
                iModelId={iModelId}
              ></CarbonByCategory>
            </div>
          </div>
        );

      case 2:
        return (
          <div
            className="esg-app-dashboard-grid"
            style={{ overflow: "auto", height: "90vh", display: "flex" }}
          >
            <div style={{ flex: "1", minWidth: "50%", marginBottom: "40px" }}>              
            <CarbonByCategoryOnly
                projectId={projectId}
                accessToken={accessToken}
                iModelId={iModelId}
              ></CarbonByCategoryOnly>
            </div>            
          </div>
        );
      case 3:
        return (
          <div
            className="esg-app-dashboard-grid"
            style={{ overflow: "auto", height: "90vh", display: "flex" }}>
              <div style={{ flex: "1", minWidth: "50%", marginBottom: "40px" }}>
            <CarbonReview
            projectId={projectId}
            accessToken={accessToken}
            iModelId={iModelId}
            ></CarbonReview>
            </div>
          </div>
        );
        case 5:
          return (
            <div>
              <h1>ICE Database</h1>
              <p>This site extensively uses the ICE Database, for further information you can visit the ICE FAQ</p>
              <p><a href="https://circularecology.com/ice-database-faqs.html">ICE Database FAQ</a></p>
              <PackageDashboard/>
            </div>
          );
    }
  };

  return (
    <div className="esg-dashboard-toolbar">
      <HorizontalTabs
        wrapperClassName="esg-dashboard-tabs"
        labels={[
          <Tab key={1} label="Carbon" sublabel="Carbon Review" />,
          <Tab
            key={2}
            label="Mapping By Category"
            sublabel="Review carbon by material and category from Named Mapping"
          />,
          <Tab
          key={3}
          label="Carbon By Category"
          sublabel="Review carbon by material and category using categories only"
        />,
        <Tab
          key={4}
          label="Carbon Review"
          sublabel="Check which volumes are most accurate"
      />,
          <Tab
            key={5}
            label="Suitability Index"
            sublabel="Completeness Index"
          />,
          <Tab
          key={6}
          label="ICE DB"
          sublabel="This site utilises the ICE DB"
        />,
        ]}
        onTabSelected={setTabIndex}
      >
        {getContent()}
      </HorizontalTabs>
    </div>
  );
};
