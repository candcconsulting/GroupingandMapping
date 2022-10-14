/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import {
  BentleyCloudRpcManager,
  BentleyCloudRpcParams,
  IModelReadRpcInterface,
} from "@itwin/core-common";
import { IModelApp } from "@itwin/core-frontend";
import { FrontendIModelsAccess } from "@itwin/imodels-access-frontend";
import { RouteComponentProps } from "@reach/router";
import React, { useEffect } from "react";
import {
  //  Area,
  // Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import mongoAppApi from "../../../api/mongoAppApi";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";

interface CarbonTrendProps extends RouteComponentProps {
  accessToken: string;
  projectId: string;
  iModelId: string;
  sql?: string;
}

const colours = [
  "#F08080",
  "#1E8449",
  "#3498DB",
  "#85929E",
  "#D0ECE7",
  "#FCF3CF",
  "#EBDEF0",
];
const dashes = ["3 3", "5 5", "7 7", "9 9", "3 1 3", "5 1 5", "7 1 7", "9 1 9"];

export const CarbonTrend = ({
  accessToken,
  projectId,
  iModelId,
}: CarbonTrendProps) => {
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [data, setData] = React.useState<any[]>([]);
  const [graphObjects, setGraphObjects] = React.useState<any[]>([]);

  React.useEffect(() => {
    setClaims(getClaimsFromToken(accessToken ?? "") ?? {});
  }, [accessToken]);

  useEffect(() => {
    async function startIModelApp() {
      await IModelApp.startup({
        authorizationClient: AuthClient.client,
        rpcInterfaces,
        hubAccess: new FrontendIModelsAccess(),
      });
    }
    void startIModelApp();
  }, [rpcInterfaces]);

  useEffect(() => {
    async function getGWPData() {
      const gwpData = await mongoAppApi.getGWP(
        claims.email,
        iModelId,
        accessToken
      );
      setData(gwpData);
    }
    if (claims.email) {
      void getGWPData();
    }
  }, [iModelId, claims.email, accessToken]);

  const gwpFormatter = (aGWP: number) => {
    if (aGWP > 1000000000) {
      return (aGWP / 1000000000).toString() + "B";
    } else if (aGWP > 1000000) {
      return (aGWP / 1000000).toString() + "M";
    } else if (aGWP > 1000) {
      return (aGWP / 1000).toString() + "K";
    } else {
      return aGWP.toString();
    }
  };

  const dateFormatter = (date: any) => {
    // console.log(date);
    if (date instanceof Date) {
      return (
        date.getFullYear().toString() +
        "/" +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        "/" +
        ("0" + date.getDate()).slice(-2)
      );
    } else {
      if (typeof date === typeof "") {
        return (
          date.substring(8, 10) +
          "/" +
          date.substring(5, 7) +
          "/" +
          date.substring(2, 4)
        );
      }
      return "NA";
    }
  };

  useEffect(() => {
    if (data?.length > 0) {
      const tempObjects = [];
      const graphData = [];
      const materials = [...new Set(data.map((item) => item.material))];
      for (const datum of data) {
        const aDatum: any = {
          storeDate: new Date(datum.storeDate),
          gwp: datum.gwp,
          material: datum.material,
          count: datum.count,
        };
        graphData.push(aDatum);
      }
      const sortedData = graphData.sort(
        (objA, objB) =>
          new Date(objA.storeDate).getTime() -
          new Date(objB.storeDate).getTime()
      );
      for (const aMaterial in materials) {
        tempObjects.push(
          <Line
            name={materials[aMaterial]}
            strokeDasharray={dashes[aMaterial]}
            yAxisId={0}
            type="monotone"
            dot={true}
            strokeWidth={3}
            dataKey="gwp"
            stroke={colours[aMaterial]}
            data={sortedData.filter((obj) => {
              return obj.material === materials[aMaterial];
            })}
          />
        );
        tempObjects.push(
          <Line
            name={materials[aMaterial]}
            strokeDasharray={dashes[aMaterial]}
            yAxisId={1}
            type="linear"
            dot={true}
            strokeWidth={1}
            legendType="triangle"
            dataKey="count"
            stroke={colours[aMaterial]}
            data={sortedData.filter((obj) => {
              return obj.material === materials[aMaterial];
            })}
          />
        );
      }
      setGraphObjects(tempObjects);
    }
  }, [data]);

  const cloudRpcParams: BentleyCloudRpcParams = {
    info: { title: "imodel/rpc", version: "" },
    uriPrefix: "https://api.bentley.com",
  };
  BentleyCloudRpcManager.initializeClient(cloudRpcParams, rpcInterfaces);

  console.log("CarbonHistory");
  return (
    <ResponsiveContainer width={"80%"} aspect={3}>
      <ComposedChart>
        <XAxis
          allowDuplicatedCategory={false}
          dataKey="storeDate"
          tickFormatter={dateFormatter}
          padding={{ left: 50 }}
        />
        <YAxis
          yAxisId={0}
          dataKey="gwp"
          padding={{ top: 20 }}
          tickFormatter={gwpFormatter}
        />
        <YAxis yAxisId={1} dataKey="count" orientation="right" />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        {graphObjects}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default {};
