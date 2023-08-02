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
import { SvgExport, SvgSave } from "@itwin/itwinui-icons-react";
import {
  IconButton,
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
} from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CellRendererProps } from "react-table";
import { Cell as ChartCell, Legend, Pie, PieChart, Tooltip } from "recharts";

// import { displayNegativeToast } from "../../../api/helperfunctions/messages";
import { iTwinAPI } from "../../../api/iTwinAPI";
import MoataApi from "../../../api/moata";
// import mongoDBapi, { IGWP } from "../../../api/mongoDBapi";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { exportCSV } from "../../../api/storage/exportCSV";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
import { getSettings } from "../../../config";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import {
  NumericCell,
  NumericCell0,
  numericCellRenderer,
} from "../../SynchronizationRouter/components/NumericCell";
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
  category: string;
}

interface IExportMoata {
  mcpAssetCode: string;
  quantity: number;
  unit: string;
  quantity2: number;
  unit2: string;
  notes: string;
  folder1: string;
  folder1Operator: string;
  folder1Factor: number;
  folder2: string;
  folder2Operator: string;
  folder2Factor: number;
  folder3: string;
  folder3Operator: string;
  folder3Factor: number;
  folder4: string;
  folder4Operator: string;
  folder4Factor: number;
  folder5: string;
  folder5Operator: string;
  folder5Factor: number;
  folder6: string;
  folder6Operator: string;
  folder6Factor: number;
  folder7: string;
  folder7Operator: string;
  folder7Factor: number;
  folder8: string;
  folder8Operator: string;
  folder8Factor: number;
  folder9: string;
  folder9Operator: string;
  folder9Factor: number;
  folder10: string;
  folder10Operator: string;
  folder10Factor: number;
}

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

export const Moata = ({
  accessToken,
  projectId,
  iModelId,
}: ElementCountProps) => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [elementCount, setElementCount] = React.useState(0);
  const [gwpTotal, setGWPTotal] = React.useState(0);
  const [epdMapping, setEPDMapping] = React.useState<any>(undefined);
  const [EPDMappingLoaded, setEPDMappingLoaded] = React.useState(
    epdMapping !== undefined
  );
  const [epd, setEPD] = React.useState<any[] | undefined>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [pieDataLoaded, setPieDataLoaded] = React.useState(false);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const isLoading = React.useRef(false);
  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [minGWP, setMinGWP] = useState(0);
  const [maxGWP, setMaxGWP] = useState(1);
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const [epdOptions, setEPDOptions] = React.useState<any[] | undefined>([]);

  useEffect(() => {
    return () => {
      setElements([]);
      setEPDMapping(undefined);
      setEPD([]);
      setMapping(undefined);
      setGroups([]);
      setPieData([]);
      if (IModelApp) {
        void IModelApp.shutdown();
      }
    };
  }, []);

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

  console.log("MoataByCategory");

  const {
    results: { mappings },
  } = useApiData<{ mappings: IMapping[] }>({
    accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  useEffect(() => {
    if (iModelId && claims.email && accessToken) {
      void MoataApi.getEPDMapping(claims.email, iModelId, accessToken).then(
        (theMapping) => {
          if (theMapping?.iModelId !== iModelId) {
            console.log(
              `Moata Mapping for ${iModelId} not found using default`
            );
          } else {
            console.log(`Using Moata Mapping ${theMapping.mappingName}`);
          }
          setEPDMapping(theMapping);
          if (theMapping) {
            setEPDMappingLoaded(true);
          }
        }
      );
    }
  }, [iModelId, accessToken, claims]);

  useEffect(() => {
    if (iModelId) {
      void MoataApi.getAllEPD().then((allEPD) => {
        setEPD(allEPD);
        setEPDOptions(
          allEPD?.map((item: any) => {
            return { label: item.material, value: item.uniqueId };
          })
        );
      });
    }
  }, [iModelId]);

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
          const aMaterial = epd?.find(
            (aMaterial) => aMaterial.uniqueId === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeForGroupByCategory(
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
        for (const element of tempElements) {
          const index = summarizeElements.findIndex(
            (aElement) =>
              aElement.material === element.material &&
              aElement.category === element.category
          );
          if (index >= 0) {
            summarizeElements[index].quantity = +(
              summarizeElements[index].quantity + element.quantity
            ).toFixed(2);
            summarizeElements[index].gwp = +(
              summarizeElements[index].gwp + element.gwp
            ).toFixed(2);
            summarizeElements[index].elements =
              summarizeElements[index].elements + "," + element.id;
            if (element.gwp > summarizeElements[index].max && element.gwp > 0) {
              summarizeElements[index].max = element.gwp;
            }
            if (
              (element.gwp < summarizeElements[index].min && element.gwp > 0) ||
              (summarizeElements[index].min === 0 && element.gwp > 0)
            ) {
              summarizeElements[index].min = element.gwp;
            }
            summarizeElements[index].count += 1;
          } else {
            summarizeElements.push({
              material: element.material,
              category: element.category,
              quantity: element.quantity,
              gwp: element.gwp ?? 0,
              elements: element.id,
              unit: element.unit,
              max: element.gwp ?? 0,
              min: element.gwp ?? 0,
              count: 1,
            });
          }
        }
        // console.log(summarizeElements);
        setElements(summarizeElements);
        // setElements(allInstances)
        setMaxGWP(Math.max(...summarizeElements.map((o) => o.gwp)));
        setMinGWP(Math.min(...summarizeElements.map((o) => o.gwp)));
        setElementsLoaded(true);
        setElementCount(allInstances.length);
        const total = summarizeElements.reduce((accumulator, obj) => {
          return accumulator + obj.gwp;
        }, 0);
        setGWPTotal(total);
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
                name: entry.material + "/" + entry.category,
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

  const exportMoata = useCallback(
    async (counter = 0) => {
      console.log("Exporting");
      if (!epd) {
        console.log("EPD is not set");
        return;
      }
      if (elements.length <= 0) {
        // not sure why this happens ... but for some reason the app caches 0 elements and gets stuck needs resolving ... start an in incognito session seems to fix the problem
        console.log("awaiting elements");
        if (counter === 0) {
          // await getElements();
          void exportMoata(1);
        }
        return;
      }
      const moataElements: any[] = [];
      try {
        for (const element of elements) {
          // Object.keys(epd).forEach((key: string) => {
          console.log(element);
          console.log(elements);
          const epdIndex = epd.findIndex(
            (epd) => epd.material === element.material
          );
          if (epdIndex >= 0) {
            const aElement = element;
            const moataElement: IExportMoata = {
              mcpAssetCode: epd[epdIndex].uniqueId,
              quantity: aElement.quantity,
              unit: aElement.unit,
              quantity2: 0,
              unit2: "",
              notes: epd[epdIndex].material,
              folder1: element.category,
              folder1Operator: "",
              folder1Factor: 0,
              folder2: "",
              folder2Operator: "",
              folder2Factor: 0,
              folder3: "",
              folder3Operator: "",
              folder3Factor: 0,
              folder4: "",
              folder4Operator: "",
              folder4Factor: 0,
              folder5: "",
              folder5Operator: "",
              folder5Factor: 0,
              folder6: "",
              folder6Operator: "",
              folder6Factor: 0,
              folder7: "",
              folder7Operator: "",
              folder7Factor: 0,
              folder8: "",
              folder8Operator: "",
              folder8Factor: 0,
              folder9: "",
              folder9Operator: "",
              folder9Factor: 0,
              folder10: "",
              folder10Operator: "",
              folder10Factor: 0,
            };
            moataElements.push(moataElement);
          }
        }
        // export moataElements
        // seems that the Moata import is hard coded to handle all folders ...
        void exportCSV.makeCsv(
          moataElements,
          "moataExport.csv",
          ",",
          "MCP Asset Code,Quantity,Unit,Quantity 2,Unit 2,Notes,Folder 1,Folder 1 Operator,Folder 1 Factor,Folder 2,Folder 2 Operator,Folder 2 Factor,Folder 3,Folder 3 Operator,Folder 3 Factor,Folder 4,Folder 4 Operator,Folder 4 Factor,Folder 5,Folder 5 Operator,Folder 5 Factor,Folder 6,Folder 6 Operator,Folder 6 Factor,Folder 7,Folder 7 Operator,Folder 7 Factor,Folder 8,Folder 8 Operator,Folder 8 Factor,Folder 9,Folder 9 Operator,Folder 9 Factor,Folder 10,Folder 10 Operator,Folder 10 Factor"
        );
      } catch (err) {
        console.log("Error ", err);
      }
    },
    [elements, epdMapping, epd]
  );

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
        <div className="esg-column">Carbon by Material</div>
        <div className="esg-column-right">
          <IconButton
            title={"Export"}
            styleType={"borderless"}
            onClick={() => exportMoata()}
          >
            <SvgExport />
          </IconButton>
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
                    accessor: "category",
                    Cell: SkeletonCell,
                    Header: "Category",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "quantity",
                    Cell: NumericCell,
                    Header: "Quantity",
                    disableResizing: false,
                    sortType: "number",
                    filterType: "number",
                    fieldType: "number",
                    Filter: tableFilters.NumberRangeFilter(),
                    cellRenderer: (props: CellRendererProps<any>) =>
                      numericCellRenderer(props),
                  },
                  {
                    accessor: "gwp",
                    // eslint-disable-next-line no-restricted-globals
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      coloredCellRenderer(props, minGWP, maxGWP),
                    Header: (
                      <div>
                        <p>GWP</p>
                        <p style={{ justifyContent: "flex-end" }}>
                          {new Intl.NumberFormat("en-EN", {
                            minimumFractionDigits: getSettings.decimalAccuracy,
                            maximumFractionDigits: getSettings.decimalAccuracy,
                          }).format(gwpTotal)}
                          &nbsp;&nbsp;
                        </p>
                      </div>
                    ),
                    fieldType: "number",
                    sortType: "number",
                    filterType: "number",
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
                    fieldType: "number",
                    sortType: "number",
                    filterType: "number",
                    Filter: tableFilters.NumberRangeFilter(),
                    style: { justifyContent: "flex-end" },
                  },
                  {
                    accessor: "min",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      numericCellRenderer(props),
                    Header: "Min",
                    disableResizing: false,
                    fieldType: "number",
                    sortType: "number",
                    Filter: tableFilters.NumberRangeFilter(),
                    style: { justifyContent: "flex-end" },
                  },
                  {
                    accessor: "count",
                    Cell: NumericCell0,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      numericCellRenderer(props),
                    Header: (
                      <div>
                        <p>Count</p>
                        <p>{elementCount}</p>
                      </div>
                    ),
                    disableResizing: false,
                    fieldType: "number",
                    sortType: "number",
                    Filter: tableFilters.NumberRangeFilter(),
                    style: { justifyContent: "flex-end" },
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
            [maxGWP, minGWP, gwpTotal, elementCount]
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
            <ChartCell
              key={`cell-${index}`}
              fill={getColor(entry.value, minGWP, maxGWP)}
            />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip active={false} payload={[]} label={""} />}
        />
        <Legend layout="vertical" verticalAlign="top" align="right" />
      </PieChart>
    </div>
  );
};

export default {};
