/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import {
  BentleyCloudRpcManager,
  BentleyCloudRpcParams,
  IModelReadRpcInterface,
} from "@itwin/core-common";
import { CheckpointConnection, IModelApp } from "@itwin/core-frontend";
import { FrontendIModelsAccess } from "@itwin/imodels-access-frontend";
import {
  DefaultCell,
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
} from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

import { iTwinAPI } from "../../../api/iTwinAPI";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
import { epd, materialMapping } from "../../../data/epddata";
import {
  ColouredCell,
  SkeletonCell,
} from "../../../routers/SynchronizationRouter/components/SkeletonCell";
import AuthClient from "../../../services/auth/AuthClient";

interface ElementCountProps extends RouteComponentProps {
  accessToken: string;
  projectId: string;
  iModelId: string;
  sql?: string;
}

interface IMapping {
  id: string;
  mappingName: string;
  description: string;
  extractionEnabled: boolean;
  createdOn: string;
  createdBy: string;
  modifiedOn: string;
  modifiedBy: string;
}

interface IGroup {
  id: string;
  groupName: string;
  groupSQL: string;
  material?: string;
}

const mMapping = materialMapping;
const mEPD = epd;

const makeGroupStrings = (): string => {
  let groupString = ",";
  mMapping.groups.forEach((aGroup: any) => {
    groupString = groupString + aGroup.group.toString() + ",";
  });
  return groupString;
};

const findMapping = (searchString: string): string => {
  let returnString = "";
  mMapping.groups.forEach((aGroup: any) => {
    const groupString = aGroup.group.toString();
    if (groupString.toLowerCase().includes(searchString.toLowerCase())) {
      returnString = aGroup.material;
    }
  });
  return returnString;
};

export const CarbonPivot = ({
  accessToken,
  projectId,
  iModelId,
}: PropsWithChildren<ElementCountProps>) => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [colors, setColors] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = [IModelReadRpcInterface];

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

  const cloudRpcParams: BentleyCloudRpcParams = {
    info: { title: "imodel/rpc", version: "" },
    uriPrefix: "https://api.bentley.com",
  };
  BentleyCloudRpcManager.initializeClient(cloudRpcParams, rpcInterfaces);

  console.log("CarbonPivot");

  const {
    results: { mappings },
  } = useApiData<{ mappings: IMapping[] }>({
    accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  function checkMappings() {
    if (!mappings) {
      window.setTimeout(checkMappings, 100);
    } else {
      setMappingLoaded(true);
    }
  }
  const getMappings = async () => {
    console.log("inside getMappings");
    checkMappings();
    console.log("mappings supposed to be loaded");
    if (!mappingLoaded && mappings) {
      for (const aMapping of mappings) {
        //      mappings.forEach(async (mapping: IMapping) => {
        if (aMapping.mappingName === mMapping.mappingName) {
          setMapping(mapping);
          console.log(
            "Found in getMappins" + aMapping.mappingName + aMapping.id
          );
          setMappingLoaded(true);
          if (AuthClient.client) {
            const groupsFlag = await iTwinAPI
              .getGroups(AuthClient.client, iModelId, aMapping.id)
              .then((allGroups) => {
                const ourGroups: IGroup[] = [];
                console.log(allGroups);
                allGroups.forEach((group: IGroup) => {
                  const groupStrings = makeGroupStrings();
                  if (groupStrings.indexOf(group.groupName) >= 0) {
                    console.log(group);
                    const material = findMapping(group.groupName);
                    group.material = material;
                    ourGroups.push(group);
                  }
                });
                setGroups(ourGroups);
                setGroupsLoaded(true);
                setElementsLoaded(false);
              });
          }
        }
      } //);
    } else {
      console.log("mappings not loaded so skipping : " + mappingLoaded);
    }
  };

  useEffect(() => {
    const loadMappings = async () => {
      console.log("loadMappings");
      if (!mappingLoaded && mappings) {
        // mappings.forEach(async (mapping: IMapping) => {
        for (const aMapping of mappings) {
          if (aMapping.mappingName === mMapping.mappingName) {
            setMapping(mapping);
            console.log(
              "Found in loadMappings " + aMapping.mappingName + aMapping.id
            );
            setMappingLoaded(true);
            if (AuthClient.client) {
              void iTwinAPI
                .getGroups(AuthClient.client, iModelId, aMapping.id)
                .then((allGroups) => {
                  const ourGroups: IGroup[] = [];
                  console.log(allGroups);
                  for (const aGroup of allGroups) {
                    const groupStrings = makeGroupStrings();
                    if (groupStrings.indexOf(aGroup.groupName) >= 0) {
                      console.log(aGroup);
                      const material = findMapping(aGroup.groupName);
                      aGroup.material = material;
                      ourGroups.push(aGroup);
                    }
                  }
                  setGroups(ourGroups);
                });
            }
          }
        } //);
      }
    };
    /*    void loadMappings();
    setGroupsLoaded(true);
    setElementsLoaded(false); */
  }, [iModelId, mappings, mappingLoaded]);

  function checkGroups() {
    if (!groupsLoaded && groups.length <= 0) {
      window.setTimeout(checkGroups, 100);
    }
    setGroupsLoaded(true);
  }
  useEffect(() => {
    const fetchElements = async () => {
      console.log(
        "fetchElements called"
      ); /*
    if (sql === "" || !sql) {
      setElements([])
      return
      } */
      // setElements([]);
      console.log("getMappings");
      await getMappings();
      console.log("Mappings Loaded");
      console.log(`Waiting for groups Length = ${groups.length}`);
      checkGroups();
      console.log(`Groups Loaded Length = ${groups.length}`);
      setIsLoading(true);
      let max = 0;
      let min = 0;
      const iModelConnection = await CheckpointConnection.openRemote(
        projectId,
        iModelId
      );
      if (groups.length === 0) {
        return;
      }

      const client = new ProjectsClient(urlPrefix, accessToken);
      try {
        if (elementsLoaded) {
          return;
        }
        let allInstances: any[] = elements;
        allInstances = [];
        // groups.forEach(async (aGroup: any) => {
        for (const aGroup of groups) {
          console.log(aGroup);
          const aMaterial = mEPD.epd.find(
            (aMaterial) => aMaterial.material === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeforGroup(
            iModelConnection,
            aGroup.groupSQL,
            aGroup.material,
            aMaterial?.carbonFactor || 0
          );
          console.log(`Instances length = ${allInstances.length}`);
          allInstances.push(...tempInstances);
          console.log(`Instances length = ${allInstances.length}`);
          setElements(allInstances);
          max = Math.max(...elements.map((o) => o.gwp));
          min = Math.min(...elements.map((o) => o.gwp));
          setIsLoading(false);
        } //);
        console.log("Loaded");
        setElementsLoaded(true);
      } catch (error) {
        const errorResponse = error as Response;
        setError(await client.extractAPIErrorMessage(errorResponse));
      }
    };
    void fetchElements();
  }, [
    accessToken,
    urlPrefix,
    iModelId,
    projectId,
    groupsLoaded,
    groups,
    mappingLoaded,
    mappings,
  ]);

  // random number generator

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  const columnDefs = React.useMemo(
    () => [
      {
        children: [
          {
            field: "id",
            headerName: "Id",
            filter: true,
            sortable: true,
          },
          {
            field: "userlabel",
            headerName: "Userlabel",
            filter: true,
            sortable: true,
          },
          {
            field: "material",
            headerName: "Material",
            filter: true,
            sortable: true,
          },
          {
            field: "netVolume",
            headerName: "Volume",
            filter: true,
            sortable: true,
          },
          {
            field: "gwp",
            headerName: "GWP",
            filter: true,
            sortable: true,
          },
        ],
      },
    ],
    []
  );
  const gridData = elements;

  return (
    <div>
      <div className="row">
        <div className="column">
          <div className="panel-header">Carbon by Category</div>
          <div
            className="ag-theme-alpine"
            style={{ height: 400, width: 1200 }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default {};
