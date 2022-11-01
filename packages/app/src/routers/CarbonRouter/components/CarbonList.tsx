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
import { SvgSave } from "@itwin/itwinui-icons-react";
import {
  IconButton,
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
} from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CellRendererProps } from "react-table";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

import { displayNegativeToast, displayWarningToast } from "../../../api/helperfunctions/messages";
import { iTwinAPI } from "../../../api/iTwinAPI";
// import mongoDBapi, { IGWP } from "../../../api/mongoDBapi";
import mongoAppApi, { IGWP, IMaterial } from "../../../api/mongoAppApi";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
import { getSettings } from "../../../config";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import { NumericCell, NumericCell0, numericCellRenderer } from "../../SynchronizationRouter/components/NumericCell";
// import { epd, materialMapping } from "../../../data/epddata";
// import {mongoDBapi} from "../../../api/mongoDBapi";
import {
  ColouredCell,
  SkeletonCell,
} from "../../SynchronizationRouter/components/SkeletonCell";
import { coloredCellRenderer, getColor } from "./ColoredCell";


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
  quantity: number;
  gwp: number;
  elements: string;
  count: number;
  unit: string;
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

const findMapping = (epdMapping: any, searchString: string): string => {
  let returnString = "";
  epdMapping.groups.forEach((aGroup: any) => {
    const groupString = aGroup.group.toString();
    if (groupString.toLowerCase().includes(searchString.toLowerCase())) {
      returnString = aGroup.material;
    }
  });
  return returnString;
};

const makeGroupStrings = (epdMapping: any): string => {
  let groupString = ",";
  epdMapping.groups.forEach((aGroup: any) => {
    groupString = groupString + aGroup.group.toString() + ",";
  });
  return groupString;
};

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

export const CarbonList = ({
  accessToken,
  projectId,
  iModelId,
}: ElementCountProps) => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [epdMapping, setEPDMapping] = React.useState<any>(undefined);
  const [EPDMappingLoaded, setEPDMappingLoaded] = React.useState(
    epdMapping !== undefined
  );
  const [epd, setEPD] = React.useState<IMaterial[]| undefined>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [elementCount, setElementCount] = React.useState(0);
  const [gwpTotal, setGWPTotal] = React.useState(0);
  const [pieDataLoaded, setPieDataLoaded] = React.useState(false);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const isLoading = React.useRef(false);
  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [minGWP, setMinGWP] = useState(0);
  const [maxGWP, setMaxGWP] = useState(1);
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const displayToaster = useRef(true);
  const intervalId : any = useRef(undefined);
  const toasterCount  = useRef(0);


  const {
    results: { mappings },
  } = useApiData<{ mappings: IMapping[] }>({
    accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  useEffect(() => {
    return () => {
      setElements([]);
      setEPDMapping(undefined);
      setEPD([]);
      setMapping(undefined);
      setPieData([]);
      setGroups([]);
      if (IModelApp) {
        void IModelApp.shutdown()
      }
    };
  }, []);

  useEffect(() => {
    const checkMappings = () => {
      toasterCount.current = toasterCount.current + 1
      if (toasterCount.current > 3) {
        clearInterval(intervalId.current);
        displayToaster.current = false;
        return
      }
      if (displayToaster.current)
        if (!mappings) {
          displayWarningToast("Mappings not loaded : Please ensure this iModel has Mappings defined")
          return
        }
        else
         if(mappings.length <= 0) {
          displayWarningToast("Mappings not loaded : Please ensure this iModel has Mappings defined")
          return
        }
      clearInterval(intervalId.current);
    }
  
    intervalId.current = setInterval(checkMappings, 5000);
  },[mappings])

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
    const cloudRpcParams: BentleyCloudRpcParams = {
      info: { title: "imodel/rpc", version: "" },
      uriPrefix: "https://api.bentley.com",
    };
    BentleyCloudRpcManager.initializeClient(cloudRpcParams, rpcInterfaces);
  }, [rpcInterfaces]);

  console.log("CarbonByCategory");



  useEffect(() => {
    if (iModelId && claims.email && accessToken) {
      void mongoAppApi
        .getEPDMapping(claims.email, iModelId, accessToken)
        .then((theMapping) => {
          if (theMapping?.iModelId !== iModelId) {
            console.log(`EPD Mapping for ${iModelId} not found using default`);
          }
          setEPDMapping(theMapping);
          if (theMapping) {
            setEPDMappingLoaded(true);
          }
        });
    }
  }, [iModelId, accessToken, claims]);

  useEffect(() => {
    if (iModelId) {
      void mongoAppApi.getAllICE().then((allEPD) => {
        setEPD(allEPD);
      });
    }
  }, [iModelId]);

  useEffect(() => {
    // 
    if (mappings) {      
      setMappingLoaded(mappings.length > 0);      
      console.log("setMappingLoaded");
      displayToaster.current = (mappings.length <= 0);
    }
  }, [mappings]);

  useEffect(() => {
    const loadGroups = async () => {
      if (mappings && EPDMappingLoaded) {
        let wasProcessed = false;
        displayToaster.current = false;
        clearInterval(intervalId.current)
        for (const aMapping of mappings) {
          //      mappings.forEach(async (mapping: IMapping) => {
          if (aMapping.mappingName === epdMapping.mappingName) {
            setMapping(mapping);
            console.log(
              "Found in getMappings" + aMapping.mappingName + aMapping.id
            );
            wasProcessed = true;
            setMappingLoaded(true);
            if (AuthClient.client) {
              void (await iTwinAPI
                .getGroups(AuthClient.client, iModelId, aMapping.id)
                .then((allGroups) => {
                  const ourGroups: IGroup[] = [];
                  // console.log(allGroups);
                  allGroups.forEach((group: IGroup) => {
                    const groupStrings = makeGroupStrings(epdMapping);
                    if (groupStrings.indexOf(group.groupName) >= 0) {
                      // console.log(group);
                      const material = findMapping(epdMapping, group.groupName);
                      group.material = material;
                      ourGroups.push(group);
                    }
                  });
                  setGroups(ourGroups);
                }));
            }
          }
        } //);
        if (!wasProcessed) {
          displayWarningToast(`Trying to fetch elements with no groups found - this list will not complete`)
        }
      } else {
        // console.log("mappings not loaded so skipping : " + mappingLoaded);
      }
    };
    // console.log("checking :", mappingLoaded, groupsLoaded, EPDMappingLoaded)
    if (mappingLoaded && !groupsLoaded && EPDMappingLoaded && epdMapping) {
      console.log("Loading Groups");
      void loadGroups();
    }
  }, [
    mappingLoaded,
    groupsLoaded,
    epdMapping,
    EPDMappingLoaded,
    mappings,
    mapping,
    iModelId,
  ]);

  const elementsLength = useCallback(() => {
    try
    {
      return (elements.length)
    }
    catch(e) {
      return 0
    }
  },[elements])

  useEffect(() => {
    setGroupsLoaded(groups.length > 0);
    setElementsLoaded(elementsLength() > 0);
  }, [groups, elementsLength]);

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
          // we should not be here if epd and mappings are not loaded
          const aMaterial = epd?.find(
            (aMaterial) => aMaterial.uniqueId === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeforGroup(
            iModelConnection,
            aGroup.groupSQL,
            aMaterial,
            aGroup.groupName
          );
          allInstances.push(...tempInstances.gwpList);
          allInstances.push(...tempInstances.errorList);
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
              quantity: +summary.quantity.toFixed(getSettings.decimalAccuracy),
              gwp: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
              elements: summary.id,
              unit: summary.unit,
              max: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
              min: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
              count: 1,
            });
          }
          const index = summarizeElements.findIndex(
            (aElement) => aElement.material === value.material
          );
          if (index >= 0) {
            summarizeElements[index].quantity = +(
              summarizeElements[index].quantity + value.quantity
            ).toFixed(getSettings.decimalAccuracy);
            summarizeElements[index].gwp = +(
              summarizeElements[index].gwp + value.gwp
            ).toFixed(getSettings.decimalAccuracy);
            summarizeElements[index].elements =
              summarizeElements[index].elements + "," + value.id;
            if (value.gwp > summarizeElements[index].max && value.gwp > 0) {
              summarizeElements[index].max = value.gwp;
            }
            if (
              (value.gwp < summarizeElements[index].min && value.gwp > 0) ||
              (summarizeElements[index].min === 0 && value.gwp > 0)
            ) {
              summarizeElements[index].min = value.gwp;
            }
            summarizeElements[index].count += 1;
          } else {
            summarizeElements.push({
              material: value.material,
              quantity: value.quantity,
              gwp: value.gwp ?? 0,
              elements: value.id,
              unit: value.unit,
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
        setElementCount(allInstances.length)
        const total = allInstances.reduce((accumulator, obj) => {
          return accumulator + obj.gwp;
        }, 0)
        setGWPTotal(total);        
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
    epd,
  ]);

  useEffect(() => {
    const fetchPieData = async () => {
      if (!elementsLoaded) {
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
          <p className="esg-p">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }

    return null;
  };

  const storeGWP = useCallback(async ()   => {
    if (!elementsLoaded) {
      displayNegativeToast("Please wait for Index to load fully");
      return;
    }
    const aDate = new Date();
    aDate.setHours(0,0,0,0)
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
  },[elementsLoaded, elements, iModelId, accessToken, claims.email]);

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div className="esg-row">
      <div>
        <div className="esg-panel-header">
          <div className="esg-row">
            <div className="esg-column">Carbon by Material</div>
            <div className="esg-column-right">
              <IconButton
                className="esg-icon"
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
                    accessor: "quantity",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "Quantity",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "gwp",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      coloredCellRenderer(props, minGWP, maxGWP),
                    Header: (<div><p>GWP</p><p style={{justifyContent : "flex-end"}}>{new Intl.NumberFormat('en-EN', { minimumFractionDigits: getSettings.decimalAccuracy, maximumFractionDigits: getSettings.decimalAccuracy }).format(gwpTotal)}&nbsp;&nbsp;</p></div>),
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "max",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "Max",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "min",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "Min",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "count",
                    Cell: NumericCell0,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: (<div><p>Count</p><p>{elementCount}</p></div>),
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "unit",
                    Cell: SkeletonCell,
                    Header: "Unit",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                ],
              },
            ],
            [maxGWP, minGWP, elementCount, gwpTotal]
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
            <Cell
              key={`cell-${index}`}
              fill={getColor(entry.value, minGWP, maxGWP)}
            />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip active={false} payload={[]} label={""} />}
        />
        <Legend layout="vertical" verticalAlign="top" align="left" />
      </PieChart>
    </div>
  );
};

export default {};
