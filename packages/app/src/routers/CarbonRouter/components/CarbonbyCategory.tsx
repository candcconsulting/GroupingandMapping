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
import { SvgRecords, SvgSave } from "@itwin/itwinui-icons-react";
import {
  IconButton,
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
} from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import { access } from "fs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CellRendererProps } from "react-table";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { displayNegativeToast } from "../../../api/helperfunctions/messages";
import { iTwinAPI } from "../../../api/iTwinAPI";
// import mongoDBapi, { IGWP } from "../../../api/mongoDBapi";
import mongoAppApi, { IGWP } from "../../../api/mongoAppApi";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
// import { epd, materialMapping } from "../../../data/epddata";
// import {mongoDBapi} from "../../../api/mongoDBapi";
import {
  ColouredCell,
  SkeletonCell,
} from "../../../routers/SynchronizationRouter/components/SkeletonCell";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
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
// const mMapping = materialMapping;
// const mEPD = epd;
// const mongoEPD = mongoDBapi.getAllEPD();


/*
const getColor = (value: number, min: number, max: number) => {
  const normalizedValue = value - min;
  const normalizedMax = max - min;
  const percentage = normalizedValue / normalizedMax;
  // const hue = ((1 - percentage) * 120).toString(10);
  const hue = Math.floor((1 - percentage) * 120); // go from green to red
  const saturation = Math.abs(percentage - 0.5) * 100;
  return `hsl(${hue},50%,60%)`
} */

export const getRGBColor = (value: number, min: number, max: number) => {
  const normalizedValue = value - min;
  const normalizedMax = max - min;
  const percentage = normalizedValue / normalizedMax;
  // const hue = ((1 - percentage) * 120).toString(10);
  const hue = Math.floor((1 - percentage) * 120); // go from green to red
  // const saturation = Math.abs(percentage - 0.5) * 100;
  return getRGB(hue, 50, 60);
};

const getRGB = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  let rh = r.toString(16);
  let gh = g.toString(16);
  let bh = b.toString(16);

  if (rh.length === 1) {
    rh = "0" + r;
  }
  if (gh.length === 1) {
    gh = "0" + g;
  }
  if (bh.length === 1) {
    bh = "0" + b;
  }

  return "#" + rh + gh + bh;
};



export const CarbonByCategory = ({
  accessToken,
  projectId,
  iModelId,
}: ElementCountProps) => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [epdMapping, setEPDMapping] = React.useState<any>(undefined);
  const [EPDMappingLoaded, setEPDMappingLoaded] = React.useState(epdMapping !== undefined);
  const [epd, setEPD] = React.useState<any[]>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [pieDataLoaded, setPieDataLoaded] = React.useState(false);
  const [colors, setColors] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const isLoading = React.useRef(false);
  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [minGWP, setMinGWP] = useState(0);
  const [maxGWP, setMaxGWP] = useState(1);
  const [claims, setClaims] = React.useState<Record<string, string>>({});

  const findMapping = (searchString: string): string => {
    let returnString = "";
    epdMapping.groups.forEach((aGroup: any) => {
      const groupString = aGroup.group.toString();
      if (groupString.toLowerCase().includes(searchString.toLowerCase())) {
        returnString = aGroup.material;
      }
    });
    return returnString;
  };
  
  const makeGroupStrings = (): string => {
    let groupString = ",";
    epdMapping.groups.forEach((aGroup: any) => {
      groupString = groupString + aGroup.group.toString() + ",";
    });
    return groupString;
  };

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

  useEffect ( () => {
    if (iModelId && claims.email && accessToken) {
      void mongoAppApi.getEPDMapping(claims.email, iModelId, accessToken)
      .then((theMapping) => {
        if (theMapping?.iModelId !== iModelId) {
          console.log(`EPD Mapping for ${iModelId} not found using default`)
        }
        setEPDMapping(theMapping);
        if (theMapping)
          setEPDMappingLoaded(true);
      });
    }
  }, [iModelId, accessToken, claims]);

  useEffect (() => {
    if (iModelId) {
      void mongoAppApi.getAllEPD()
      .then((allEPD) => {
        setEPD(allEPD)
      })
    }

  }, [iModelId])


  useEffect(() => {
    // console.log("setMappingLoaded");
    if (mappings) {
      setMappingLoaded(mappings.length > 0);
    }
  }, [mappings]);

useEffect(() => {
  const loadGroups = async () => {    
    if (mappings && EPDMappingLoaded) {
      for (const aMapping of mappings) {
        //      mappings.forEach(async (mapping: IMapping) => {
        if (aMapping.mappingName === epdMapping.mappingName) {
          setMapping(mapping);
          console.log(
            "Found in getMappings" + aMapping.mappingName + aMapping.id
          );
          setMappingLoaded(true);
          if (AuthClient.client) {
            void (await iTwinAPI
              .getGroups(AuthClient.client, iModelId, aMapping.id)
              .then((allGroups) => {
                const ourGroups: IGroup[] = [];
                // console.log(allGroups);
                allGroups.forEach((group: IGroup) => {
                  const groupStrings = makeGroupStrings();
                  if (groupStrings.indexOf(group.groupName) >= 0) {
                    // console.log(group);
                    const material = findMapping(group.groupName);
                    group.material = material;
                    ourGroups.push(group);
                  }
                });
                setGroups(ourGroups);
              }));
          }
        }
      } //);
    } else {
      // console.log("mappings not loaded so skipping : " + mappingLoaded);
    }
  };
  // console.log("checking :", mappingLoaded, groupsLoaded, EPDMappingLoaded)
    if (mappingLoaded && !groupsLoaded && EPDMappingLoaded && epdMapping) {
      console.log("Loading Groups")
      void loadGroups();
    }
  },[mappingLoaded, groupsLoaded, epdMapping, EPDMappingLoaded, mappings, mapping, iModelId]);

  useEffect(() => {
    setGroupsLoaded(groups.length > 0);
    setElementsLoaded(false);
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
          // console.log(aGroup);
          const aMaterial = epd.find(
            (aMaterial) => aMaterial.material === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeforGroup(
            iModelConnection,
            aGroup.groupSQL,
            aGroup.material,
            aMaterial?.carbonFactor ?? 0
          );
          allInstances.push(...tempInstances);
          const errInstances = await sqlAPI.getVolumeforGroup(
            iModelConnection,
            aGroup.groupSQL,
            "Invalid Elements",
            aMaterial?.carbonFactor ?? 0,
            true
          );
          allInstances.push(...errInstances);
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
/*        console.log(
          "elementsLoaded : ",
          elementsLoaded,
          " isLoading:",
          isLoading.current
        ); */
        void fetchElements().then(() => {
          setElementsLoaded(true);
          // setElements(elements);
          // console.log("next step");
        });
      }
    }
  }, [
    iModelId,
    elementsLoaded,
    isLoading,
    groupsLoaded,
    groups,
    projectId,
    accessToken,
    urlPrefix,
  ]);

  useEffect(() => {
    const tempColors: any[] = [];
    const fetchPieData = async () => {
      if (!elementsLoaded) {
        tempColors.push("#8884d8");
        setColors(tempColors);
        setPieData([
          {
            name: "Loading",
            value: 100,
          },
        ]);
      } else {
        if (elementsLoaded) {
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
            setPieDataLoaded(true);
            setPieData(tempPieData);
          } catch (error) {
            const errorResponse = error as Response;
            setError(await client.extractAPIErrorMessage(errorResponse));
          }
        }
      }
    };
    console.log("Elements :", elements);
    if (elementsLoaded && !pieDataLoaded) {
      void fetchPieData();
    }
  }, [
    accessToken,
    urlPrefix,
    elements,
    elementsLoaded,
    pieData,
    pieDataLoaded,
  ]);

  useEffect(() => {
    if (pieDataLoaded && pieData.length > 0) {
      const tempColors: any[] = [];
      //const pMax = Math.max(...pieData.map((o) => o.value))
      //const pMin = (Math.min(...pieData.map((o) => o.value)))
      for (let i = pieData.length - 1; i >= 0; i--) {
        // tempColors[i] = getRGBColor(pieData[i].value, pMax, pMin)
        tempColors[i] = getRGBColor(i, 0, pieData.length);
      }
      setColors(tempColors);
    }
  }, [pieDataLoaded, pieData]);
  const CustomTooltip = ({
    active,
    payload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const storeGWP = async () => {
    if (!elementsLoaded) {
      displayNegativeToast("Please wait for Index to load fully");
      return;
    }
    const aDate = new Date();
    for (const element of elements) {
      const gwpStore: IGWP = {
        iModelId: iModelId,
        storeDate: aDate,
        volume: element.volume,
        gwp: element.gwp,
        material: element.material,
        count: element.count,
      };
      void mongoAppApi.putGWP(claims.email, iModelId, accessToken, gwpStore);
    }
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
        <div className="panel-header">
          <div className="row">
            <div className="column">Carbon by Category</div>
            <div className="column-right">
              <IconButton
                className="icon"
                styleType="borderless"
                onClick={async () => {
                  await storeGWP();
                }}
              >
                <SvgSave />
              </IconButton>
            </div>
          </div>
        </div>

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
          style={{ height: "100%" }}
          emptyTableContent={error || "Please wait for mappings to be loaded"}
        />
      </div>
      <PieChart width={600} height={600}>
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
            <Cell key={`cell-${index}`} fill={colors[index]} />
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
