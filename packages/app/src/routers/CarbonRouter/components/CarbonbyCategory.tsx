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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CellRendererProps } from "react-table";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

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
import { coloredCellRenderer } from "./ColoredCell";

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

interface ISummary {
  material: string;
  netVolume: number;
  gwp: number;
  elements: string;
  count: number;
  max: number;
  min: number;
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
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [colors, setColors] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const isLoading = React.useRef(false);
  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = [IModelReadRpcInterface];
  const [minGWP, setMinGWP] = useState(0);
  const [maxGWP, setMaxGWP] = useState(1);

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
    console.log("setMappingLoaded");
    if (mappings) {
      setMappingLoaded(mappings.length > 0);
    }
  }, [mappings]);

  const loadGroups = async () => {
    console.log("inside getMappings");
    if (mappings) {
      for (const aMapping of mappings) {
        //      mappings.forEach(async (mapping: IMapping) => {
        if (aMapping.mappingName === mMapping.mappingName) {
          setMapping(mapping);
          console.log(
            "Found in getMappings" + aMapping.mappingName + aMapping.id
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
              });
            if (groups.length > 0) {
              setGroupsLoaded(true);
              setElementsLoaded(false);
            }
          }
        }
      } //);
    } else {
      console.log("mappings not loaded so skipping : " + mappingLoaded);
    }
  };
  useEffect(() => {
    if (mappingLoaded && !groupsLoaded) {
      void loadGroups();
    }
  });

  useEffect(() => {
    setGroupsLoaded(groups.length > 0);
  }, [groups]);

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
      console.log(`Groups Loaded Length = ${groups.length}`);
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
        const allInstances: any[] = [];
        // allInstances = [];
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
          // setElements(allInstances);
        } //);
        console.log("Loaded");
        isLoading.current = false;
        const summarizeElements: ISummary[] = [];
        const tempElements = allInstances;
        void tempElements.reduce((summary, value) => {
          if (summary) {
            summarizeElements.push({
              material: summary.material,
              netVolume: +summary.netVolume.toFixed(2),
              gwp: +summary.gwp.toFixed(2) ?? 0,
              elements: summary.id,
              max: +summary.gwp.toFixed(2) ?? 0,
              min: +summary.gwp.toFixed(2) ?? 0,
              count: 1,
            });
          }
          const index = summarizeElements.findIndex(
            (aElement) => aElement.material === value.material
          );
          if (index >= 0) {
            summarizeElements[index].netVolume = +(
              summarizeElements[index].netVolume + value.netVolume
            ).toFixed(2);
            summarizeElements[index].gwp = +(
              summarizeElements[index].gwp + value.gwp
            ).toFixed(2);
            summarizeElements[index].elements =
              summarizeElements[index].elements + "," + value.id;
            if (value.gwp > summarizeElements[index].max && value.gwp > 0) {
              summarizeElements[index].max = value.gwp;
            }
            if (value.gwp < summarizeElements[index].min && value.gwp > 0) {
              summarizeElements[index].min = value.gwp;
            }
            summarizeElements[index].count += 1;
          } else {
            summarizeElements.push({
              material: value.material,
              netVolume: value.netVolume,
              gwp: value.gwp ?? 0,
              elements: value.id,
              max: summary.gwp ?? 0,
              min: summary.gwp ?? 0,
              count: 1,
            });
          }
          return "";
        });
        // console.log(summarizeElements);
        setElements(summarizeElements);
        // setElements(allInstances)
        setMaxGWP(Math.max(...summarizeElements.map((o) => o.gwp)));
        setMinGWP(Math.min(...summarizeElements.map((o) => o.gwp)));
        setElementsLoaded(true);        
      } catch (error) {
        const errorResponse = error as Response;
        setError(await client.extractAPIErrorMessage(errorResponse));
      }
    };

    if (!elementsLoaded && !isLoading.current && groupsLoaded) {
      isLoading.current = true;
      if (isLoading.current) {
        console.log(
          "elementsLoaded : ",
          elementsLoaded,
          " isLoading:",
          isLoading.current
        );
        void fetchElements().then(() => {
          setElementsLoaded(true);
          // setElements(elements);
          console.log("next step");
        });
      }
    }
  }, [iModelId, elementsLoaded, isLoading, groupsLoaded, groups, projectId, accessToken, urlPrefix]);

  // random number generator
  function rand(frm: number, to: number) {
    return ~~(Math.random() * (to - frm)) + frm;
  }

  useEffect(() => {
    const fetchPieData = async () => {
      if (!elementsLoaded) {
        const COLORS: any[] = [];
        COLORS.push("#8884d8");
        setColors(COLORS);
        setPieData([
          {
            name: "Loading",
            value: 100,
          },
        ]);
      } else {
        if (elementsLoaded) {
          const COLORS: any[] = [];
          const client = new ProjectsClient(urlPrefix, accessToken);
          try {
            const result: any[] = [];
            let pieEntry = {};
            for await (const entry of elements) {
              pieEntry = {
                name: entry.material,
                value: entry.gwp,
              };
              result.push(pieEntry);
              // now we need to reduce the categories as there will be duplicates
            }
            const tempPieData = await result.reduce((acc: any, curr) => {
              const objInAcc: any = acc.find((o: any) => o.name === curr.name);
              if (objInAcc) {
                objInAcc.value += curr.value;
              } else {
                acc.push(curr);
              }
              return acc;
            }, []);
            setPieData(tempPieData);
            while (COLORS.length < pieData.length) {
              COLORS.push(
                `rgb(${rand(0, 255)}, ${rand(0, 255)}, ${rand(0, 255)})`
              );
            }
            setColors(COLORS);
          } catch (error) {
            const errorResponse = error as Response;
            setError(await client.extractAPIErrorMessage(errorResponse));
          }
        }
      }
    };
    console.log("Elements :", elements);
    if (elementsLoaded) {
      void fetchPieData();
    }
  }, [accessToken, urlPrefix, elements, elementsLoaded]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active: boolean;
    payload: {
      name: string;
      value: number;
    }[];
    label: string;
  }) => {
    if (active) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].name} : ${payload[0].value}`}</p>
          <p className="desc">use filter to reduce segments</p>
        </div>
      );
    }

    return null;
  };

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div className="row">
      <div>
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
                  /*                    {
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
                    }, */
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
                    Cell: SkeletonCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      coloredCellRenderer(props, minGWP, maxGWP),
                    Header: "GWP",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "max",
                    Cell: ColouredCell,
                    Header: "Max",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "min",
                    Cell: ColouredCell,
                    Header: "Min",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "count",
                    Cell: ColouredCell,
                    Header: "Count",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                ],
              },
            ],
            [maxGWP, minGWP]
          )}
          pageSize={25}
          paginatorRenderer={paginator}
          isResizable={true}
          isLoading={!elementsLoaded}
          style={{ height: "50%" }}
          emptyTableContent={error || "Please wait for mappings to be loaded"}
        />
      </div>
      <PieChart width={400} height={400}>
        <Pie
          data={pieData}
          color="#000000"
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          fill="#8884d8"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip active={false} payload={[]} label={""} />}
        />
      </PieChart>
    </div>
  );
};

export default {};
