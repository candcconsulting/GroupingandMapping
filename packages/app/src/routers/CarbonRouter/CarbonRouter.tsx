/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { RouteComponentProps, Router } from "@reach/router";
import React from "react";

import { SelectionRouter } from "../SelectionRouter/SelectionRouter";
import { Carbon } from "./components/Carbon";

interface CarbonRouterProps extends RouteComponentProps {
  accessToken: string;
}

export const CarbonRouter = ({ accessToken }: CarbonRouterProps) => {
  return (
    <Router className="full-height-container">
      <SelectionRouter
        accessToken={accessToken}
        path="*"
        hideIModelActions={["esg"]}
      />
      <Carbon
        accessToken={accessToken}
        path="project/:projectId/imodel/:iModelId"
      />
    </Router>
  );
};
