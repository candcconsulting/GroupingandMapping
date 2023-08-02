/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { RouteComponentProps, Router, useNavigate } from "@reach/router";
import React from "react";

interface EC3RouterProps extends RouteComponentProps {
  accessToken: string;
}

export const HandleEC3 = () => {
  const navigate = useNavigate();
  void navigate("/");
  return <div></div>;
};

export const EC3Handler = ({ accessToken }: EC3RouterProps) => {
  return (
    <Router className="full-height-container">
      <HandleEC3 />
    </Router>
  );
};
