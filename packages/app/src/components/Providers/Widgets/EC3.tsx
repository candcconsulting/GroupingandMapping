/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { Button } from "@itwin/itwinui-react";
import React, { useEffect } from "react";

import { EC3Api } from "../../../api/ec3";

const EC3 = () => {
  const loggedIn = (flag: boolean) => {
    console.log(flag);
  };
  const login = async (e: any) => {
    const ec3Api = new EC3Api(loggedIn);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button onClick={login}>Login</Button>
      </div>
    </div>
  );
};

export default EC3;
