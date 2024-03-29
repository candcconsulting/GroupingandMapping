/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import {
  BentleyCloudRpcManager,
  BentleyCloudRpcParams,
  ColorDef,
  FeatureOverrideType,
  IModelReadRpcInterface,
} from "@itwin/core-common";
import { EmphasizeElements, IModelApp } from "@itwin/core-frontend";
import { SvgExport, SvgGroupUngroup } from "@itwin/itwinui-icons-react";
import {
  IconButton,
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
  toaster,
  ToggleSwitch,
} from "@itwin/itwinui-react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { CellRendererProps } from "react-table";

import { colourElements } from "../../../api/helperfunctions/elements";
import { iTwinAPI } from "../../../api/iTwinAPI";
import mongoAppApi, { IMaterial } from "../../../api/mongoAppApi";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { exportCSV } from "../../../api/storage/exportCSV";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
import { getSettings } from "../../../config/index";
import { getRGBColor } from "../../../routers/CarbonRouter/components/CarbonList";
import { coloredCellRenderer } from "../../../routers/CarbonRouter/components/ColoredCell";
import {
  NumericCell,
  NumericCell0,
  numericCellRenderer,
} from "../../../routers/SynchronizationRouter/components/NumericCell";
import { SkeletonCell } from "../../../routers/SynchronizationRouter/components/SkeletonCell";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import { useCommonPathPattern } from "../../MainLayout/useCommonPathPattern";

// import "./carbonWidget.scss"

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
  max: number;
  min: number;
  unit: string;
  userLabel?: string;
  groupName?: string;
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

const displayNegativeToast = (content: string) => {
  toaster.setSettings({
    placement: "top",
    order: "descending",
  });
  toaster.negative(content, {
    duration: 7000,
    hasCloseButton: false,
    type: "temporary",
  });
};

const customFilterFn = (
  rows: any,
  columnId: string[],
  filterString: string
) => {
  const regExp = filterString.replace("*", ".*");
  const filteredRows = rows.filter((o: any) =>
    o.values[columnId[0]].match(regExp, "i")
  );
  if (filteredRows && filteredRows.length > 0) {
    return filteredRows;
  }
  return [];
};

export const CarbonWidget = () => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [epdMapping, setEPDMapping] = React.useState<any>(undefined);
  const [EPDMappingLoaded, setEPDMappingLoaded] = React.useState(
    epdMapping !== undefined
  );
  const [epd, setEPD] = React.useState<IMaterial[] | undefined>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const isLoading = React.useRef(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [columns, setColumns] = React.useState<any[]>([]);
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const [minGWP, setMinGWP] = useState(0);
  const [maxGWP, setMaxGWP] = useState(1);

  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = [IModelReadRpcInterface];

  useEffect(() => {
    return () => {
      setElements([]);
      setColumns([]);
      setEPDMapping(undefined);
      setEPD([]);
      setMapping(undefined);
      setGroups([]);
    };
  }, []);

  const useAccessToken = () => {
    const [accessToken, setAccessToken] = React.useState<string>();
    useLayoutEffect(() => {
      IModelApp.authorizationClient?.getAccessToken().then(setAccessToken);
    }, []);
    return accessToken;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { section, projectId, iModelId } = useCommonPathPattern();

  const cloudRpcParams: BentleyCloudRpcParams = {
    info: { title: "imodel/rpc", version: "" },
    uriPrefix: "https://api.bentley.com",
  };
  BentleyCloudRpcManager.initializeClient(cloudRpcParams, rpcInterfaces);

  const accessToken = useAccessToken();
  const {
    results: { mappings },
  } = useApiData<{ mappings: IMapping[] }>({
    accessToken: accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  const exportCarbonElements = () => {
    void exportCSV.makeCsv(elements, "carbonExport.csv");
  };
  const groupColumns = React.useCallback(
    () => [
      {
        Header: "Table",
        columns: [
          /*                  {
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
            Header: "GWP",
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
            Header: "Count",
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
    [minGWP, maxGWP]
  );
  const allColumns = React.useCallback(
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
            sortType: "string",
          },
          {
            accessor: "groupName",
            Cell: SkeletonCell,
            Header: "Grouping",
            disableResizing: false,
            Filter: tableFilters.TextFilter(),
          },
          {
            accessor: "userlabel",
            Cell: SkeletonCell,
            Header: "Userlabel",
            disableResizing: false,
            Filter: tableFilters.TextFilter(),
            filter: customFilterFn,
          },
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
            Header: "GWP",
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
            accessor: "unit",
            Cell: SkeletonCell,
            Header: "Unit",
            disableResizing: false,
            Filter: tableFilters.TextFilter(),
          },
        ],
      },
    ],
    [minGWP, maxGWP]
  );

  React.useEffect(() => {
    setClaims(getClaimsFromToken(accessToken ?? "") ?? {});
  }, [accessToken]);

  useEffect(() => {
    if (iModelId && claims.email && accessToken) {
      void mongoAppApi
        .getEPDMapping(claims.email, iModelId, accessToken, "")
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
    if (mappings) {
      // console.log("Mappings.Length", mappings.length);
      setMappingLoaded(mappings.length > 0);
    }
  }, [mappings]);

  useEffect(() => {
    const loadGroups = async () => {
      if (mappings && EPDMappingLoaded && iModelId) {
        // mappings.forEach((mapping: IMapping) => {
        for (const aMapping of mappings) {
          if (aMapping.mappingName === epdMapping.mappingName) {
            setMapping(mapping);
            console.log("Found " + aMapping.mappingName + aMapping.id);
            setMappingLoaded(true);
            if (AuthClient.client) {
              void iTwinAPI
                .getGroups(AuthClient.client, iModelId, aMapping.id)
                .then((allGroups: any) => {
                  const ourGroups: IGroup[] = [];
                  // console.log(allGroups);
                  for (const aGroup of allGroups) {
                    //                allGroups.forEach((group: IGroup) => {
                    const groupStrings = makeGroupStrings(epdMapping);
                    if (groupStrings.indexOf(aGroup.groupName) >= 0) {
                      console.log(aGroup);
                      const material = findMapping(
                        epdMapping,
                        aGroup.groupName
                      );
                      aGroup.material = material;
                      ourGroups.push(aGroup);
                    }
                  } // );
                  setGroups(ourGroups);
                });
            }
          }
        } //);
      }
    };
    if (mappingLoaded && !groupsLoaded && EPDMappingLoaded && epdMapping) {
      console.log("mappingLoaded");
      void loadGroups();
    }
  }, [
    mappingLoaded,
    mapping,
    iModelId,
    mappings,
    EPDMappingLoaded,
    epdMapping,
    groupsLoaded,
  ]);

  useEffect(() => {
    setGroupsLoaded(groups.length > 0);
    setElementsLoaded(false);
  }, [groups]);

  useEffect(() => {
    const client = new ProjectsClient(urlPrefix, accessToken ?? "");
    const fetchElements = async () => {
      // console.log("fetchElements called");
      console.log(`Groups Loaded Length = ${groups.length}`);
      isLoading.current = true;
      //let max = 0;
      //let min = 0;

      //const iModelConnection = await CheckpointConnection.openRemote(projectId, iModelId);
      const vp = IModelApp.viewManager.selectedView;
      if (!vp) {
        return;
      }
      try {
        if (elementsLoaded) {
          return;
        }
        let allInstances: any[] = [];
        allInstances = [];
        // groups.forEach(async (aGroup: any) => {
        for (const aGroup of groups) {
          // console.log(aGroup);
          const iModelConnection = vp.iModel;
          const aMaterial = epd?.find(
            (aMaterial) => aMaterial.uniqueId === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeforGroupWidget(
            iModelConnection,
            aGroup.groupSQL,
            aMaterial,
            aGroup.groupName
          );
          const max = Math.max(...tempInstances.gwpList.map((o) => o.gwp));
          const min = Math.min(...tempInstances.gwpList.map((o) => o.gwp));
          tempInstances.gwpList.map((x) => {
            x.min = min;
            return x;
          });
          tempInstances.gwpList.map((x) => {
            x.max = max;
            return x;
          });

          allInstances.push(...tempInstances.gwpList);
          allInstances.push(...tempInstances.errorList);

          // setElements(allInstances);
          // max = Math.max(...allInstances.map((o) => o.gwp));
          // min = Math.min(...allInstances.map((o) => o.gwp));
        } //);
        console.log("Loaded");
        if (showDetails) {
          setElements(allInstances);
          setMaxGWP(Math.max(...allInstances.map((o) => o.gwp)));
          setMinGWP(Math.min(...allInstances.map((o) => o.gwp)));
          setElementsLoaded(true);
          isLoading.current = false;
          setColumns(allColumns);
        } else {
          const summarizeElements: ISummary[] = [];
          const tempElements = allInstances;
          setColumns(groupColumns);
          if (allInstances.length > 0) {
            void tempElements.reduce((summary, value) => {
              if (summary) {
                summarizeElements.push({
                  material: summary.material,
                  quantity: +summary.quantity.toFixed(
                    getSettings.decimalAccuracy
                  ),
                  gwp: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
                  elements: summary.id,
                  max: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
                  min: +summary.gwp.toFixed(getSettings.decimalAccuracy) ?? 0,
                  count: 1,
                  unit: summary.unit,
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
                if (value.gwp < summarizeElements[index].min && value.gwp > 0) {
                  summarizeElements[index].min = value.gwp;
                }
                summarizeElements[index].count += 1;
              } else {
                summarizeElements.push({
                  material: value.material,
                  quantity: value.quantity,
                  gwp: value.gwp ?? 0,
                  elements: value.id,
                  max: summary.gwp ?? 0,
                  min: summary.gwp ?? 0,
                  count: 1,
                  unit: value.unit,
                });
              }
              return "";
            });
            // setElements(allInstances);
            setElementsLoaded(true);
            setElements(summarizeElements);
            setMaxGWP(Math.max(...summarizeElements.map((o) => o.gwp)));
            setMinGWP(Math.min(...summarizeElements.map((o) => o.gwp)));
            isLoading.current = false;
          } else {
            setElements([]);
            isLoading.current = false;
          }
        }
      } catch (error) {
        const errorResponse = error as Response;
        setError(await client.extractAPIErrorMessage(errorResponse));
      }
    };
    try {
      if (!elementsLoaded && !isLoading.current && groupsLoaded) {
        isLoading.current = true;
        if (isLoading.current) {
          void fetchElements().then(() => {
            setElementsLoaded(true);
          });
        }
      }
    } catch (error) {}
  }, [
    accessToken,
    urlPrefix,
    iModelId,
    projectId,
    groups,
    groupsLoaded,
    mappingLoaded,
    mappings,
    elementsLoaded,
    allColumns,
    groupColumns,
    showDetails,
    epd,
  ]);
  //   React.useEffect(() => void fetchElements(), [fetchElements]);

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  useEffect(() => {
    const vp = IModelApp.viewManager.selectedView;
    if (vp) {
      const emph = EmphasizeElements.getOrCreate(vp);
      emph.clearEmphasizedElements(vp);
      emph.clearOverriddenElements(vp);
      vp.iModel.selectionSet.emptyAll();
    }
  }, [showDetails]);

  const showCarbonElements = async () => {
    if (!elementsLoaded) {
      displayNegativeToast("Please wait for elements table to complete");
      return;
    }
    const vp = IModelApp.viewManager.selectedView;
    let invalidElements = [];
    let counter = 1;
    const maxGWP = Math.max(...elements.map((o) => o.gwp));
    const minGWP = Math.min(...elements.map((o) => o.gwp));
    for (const elementGroup of elements) {
      const colour = ColorDef.fromString(
        getRGBColor(elementGroup.gwp, minGWP, maxGWP)
      );
      const selectedElements = elementGroup.elements;
      if (elementGroup.material.substring(0, 7).toLowerCase() === "invalid") {
        invalidElements = elementGroup.elements;
      } else {
        colourElements(vp, selectedElements, false, colour);
      }
      counter = counter + 1;
    }
    // colourElements(vp, invalidElements, ColorDef.red);
  };

  const onRowClicked = async (_rows: any, state: any) => {
    const vp = IModelApp.viewManager.selectedView;
    let selectedElements = "";
    if (!showDetails) {
      const index = elements.findIndex(
        (aElement) => aElement.material === state.values.material
      );
      selectedElements = elements[index].elements;
    } else {
      selectedElements = state.values.id;
    }
    if (vp && selectedElements) {
      colourElements(vp, selectedElements, true);
      //const allElements = ecResult;
      const allElements = selectedElements.split(",");
      vp.iModel.selectionSet.emptyAll();
      /*      for (const es of allElements.values()) {
        vp.iModel.selectionSet.add(es);
      } */
      vp.iModel.selectionSet.add(allElements);
      void vp.zoomToElements(allElements);
    }
  };

  return (
    <div className="gw_flex">
      <div className="idp-content-margins idp-scrolling-content">
        <div className="esg-panel-header-row">
          <div className="esg-column">Carbon by Category</div>
          <div className="esg-column-right-row">
            {!elementsLoaded ? (
              <></>
            ) : (
              <ToggleSwitch
                style={{ float: "left" }}
                label="Show Details"
                checked={showDetails}
                onChange={() => {
                  setShowDetails(!showDetails);
                  setElementsLoaded(false);
                }}
              ></ToggleSwitch>
            )}
            <IconButton
              onClick={() => showCarbonElements()}
              styleType={"borderless"}
            >
              <SvgGroupUngroup />
            </IconButton>
            <IconButton
              onClick={() => exportCarbonElements()}
              styleType={"borderless"}
            >
              <SvgExport />
            </IconButton>
          </div>
        </div>
        <Table
          isSortable={true}
          expanderCell={() => null}
          data={elements}
          columns={columns}
          pageSize={25}
          onRowClick={onRowClicked}
          paginatorRenderer={paginator}
          isResizable={true}
          isLoading={!elementsLoaded}
          style={{ height: "50%", width: 1500 }}
          emptyTableContent={
            error ||
            "Please wait for mappings to be loaded.  If this table does not update, please visit the ESG panel and then return here"
          }
        />
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div>
      <CarbonWidget />
    </div>
  );
}
