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
import React, { useCallback, useEffect, useMemo } from "react";

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

export const CarbonByCategory = ({
  accessToken,
  projectId,
  iModelId,
  sql,
}: ElementCountProps) => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
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

  console.log("CarbonByCategory");
  const {
    results: { mappings },
  } = useApiData<{ mappings: IMapping[] }>({
    accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  useEffect(() => {
    if (!mappingLoaded && mappings) {
      mappings.forEach((mapping: IMapping) => {
        if (mapping.mappingName === mMapping.mappingName) {
          setMapping(mapping);
          console.log("Found " + mapping.mappingName + mapping.id);
          setMappingLoaded(true);
          if (AuthClient.client) {
            void iTwinAPI
              .getGroups(AuthClient.client, iModelId, mapping.id)
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
              });
          }
        }
      });
    }
    setGroupsLoaded(true);
  }, [iModelId, mappings, mappingLoaded]);

  function checkGroups() {
    if (!groupsLoaded) {
      window.setTimeout(checkGroups, 100);
    }
  }

  const fetchElements = React.useCallback(async () => {
    console.log(
      "fetchElements called"
    ); /*
    if (sql === "" || !sql) {
      setElements([])
      return
      } */
    // setElements([]);
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

    const client = new ProjectsClient(urlPrefix, accessToken);
    try {
      let allInstances: any[] = elements;
      allInstances = [];
      groups.forEach(async (aGroup: any) => {
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
      });
    } catch (error) {
      const errorResponse = error as Response;
      setError(await client.extractAPIErrorMessage(errorResponse));
    }
    setIsLoading(false);
  }, [accessToken, urlPrefix, iModelId, projectId, sql, groups]);

  React.useEffect(() => void fetchElements(), [fetchElements]);

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div>
      <div className="idp-content-margins idp-scrolling-content">
        <div className="panel-header">Carbon by Category</div>
        <Table
          isSortable={true}
          expanderCell={() => null}
          data={elements}
          columns={React.useMemo(
            () => [
              {
                Header: "Table",
                columns: [
                  {
                    accessor: "id",
                    Cell: SkeletonCell,
                    Header: "Id",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "userlabel",
                    Cell: SkeletonCell,
                    Header: "Userlabel",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "material",
                    Cell: SkeletonCell,
                    Header: "Material",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "netVolume",
                    Cell: SkeletonCell,
                    Header: "Volume",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "gwp",
                    Cell: ColouredCell,
                    Header: "GWP",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                ],
              },
            ],
            []
          )}
          pageSize={25}
          paginatorRenderer={paginator}
          isResizable={true}
          isLoading={isLoading}
          style={{ height: "50%", width: 750 }}
          emptyTableContent={
            error ||
            "No instances found in iModel.  Enter a valid search criteria"
          }
        />
      </div>
    </div>
  );
};

export default {};