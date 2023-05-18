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

import MoataApi from "../../../api/moata";
import { IMaterial } from "../../../api/mongoAppApi";
import { sqlAPI } from "../../../api/queryAPI";
import { exportCSV } from "../../../api/storage/exportCSV";
import { getSettings } from "../../../config";
import AuthClient from "../../../services/auth/AuthClient";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import {
  NumericCell,
  NumericCell0,
  numericCellRenderer,
} from "../../SynchronizationRouter/components/NumericCell";
import { SkeletonCell } from "../../SynchronizationRouter/components/SkeletonCell";
// import { epd } from "../../../data/epddata";
import { gwpCalculation } from "./Carbon";
import { EditEPDCell } from "./EditEPDCell";

interface ElementCountProps extends RouteComponentProps {
  accessToken: string;
  projectId: string;
  iModelId: string;
  sql?: string;
}

interface IGWP {
  material: string;
  quantity: number;
  gwp: number;
  elementCount: string;
  unit: string;
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

export const Moata = ({
  accessToken,
  projectId,
  iModelId,
}: ElementCountProps) => {
  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const [epd, setEPD] = React.useState<any>(undefined);
  const [epdMapping, setEPDMapping] = useState<any>(undefined);
  const [elements, setElements] = React.useState<any[]>([]);
  const [epdLoaded, setEPDLoaded] = React.useState(false);
  const [epdOptions, setEPDOptions] = React.useState<any[] | undefined>([]);
  const [elementCount, setElementCount] = React.useState(0);
  const [gwpTotal, setGWPTotal] = React.useState(0);
  const tempMapping = React.useRef<any>({});

  useEffect(() => {
    return () => {
      setElements([]);
      setEPDMapping(undefined);
      setEPD([]);
      setEPDMapping(undefined);
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

  // useEffect(() => {
  //   if (iModelId) {
  //     void mongoAppApi.getAllEPD().then((allEPD) => {
  //       setEPD(allEPD);
  //     });
  //   }
  // }, [iModelId]);

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
    if (iModelId && claims.email && accessToken) {
      void MoataApi.getEPDCategories(claims.email, iModelId, accessToken).then(
        (theMapping) => {
          if (theMapping?.iModelId !== iModelId) {
            console.log(`EPD Mapping for ${iModelId} not found using default`);
          }
          setEPDMapping(theMapping);
        }
      );
    }
  }, [iModelId, accessToken, claims]);

  const getMappingLength = useCallback(() => {
    let returnValue = 0;
    try {
      returnValue = Object.keys(epdMapping.categories).length;
    } catch (e) {}
    return returnValue;
  }, [epdMapping]);

  const lookupMaterial = useCallback(
    (category: string) => {
      const returnValue: IMaterial = {
        material: "unmapped",
        carbonFactor: 0,
        unit: "-",
        unitType: "unknown",
        uniqueId: "unmapped",
        density: 0,
        description: "",
        ICECarbonFactor: 0,
      };
      try {
        if (epdMapping.categories[category] !== undefined) {
          const materialEPD = epd.find((obj: any) => {
            return obj.uniqueId === epdMapping.categories[category];
          });
          if (materialEPD) {
            return materialEPD;
          } else {
            returnValue.material =
              epdMapping.categories[category] + " not found";
            return returnValue;
          }
        } else {
          return returnValue;
        }
      } catch (e) {
        return returnValue;
      }
    },
    [epdMapping, epd]
  );

  const cachedElements = useCallback(async (iModelConnection) => {
    const tempElements = await sqlAPI.getVolumeForCategory(iModelConnection);
    return tempElements;
  }, []);

  const calculateGWP = useCallback(
    (resultElements: any[]) => {
      console.log("Calling calculateGWP");
      const gwpElements: IGWP[] = [];
      void resultElements.reduce((summary, value) => {
        let volume = 0;
        let quantity = 0;
        let area = 0;
        if (summary) {
          if (summary.qtoVolume === 0) {
            volume = summary.rangeVolume;
          } else {
            volume = Math.min(summary.rangeVolume, summary.qtoVolume);
          }
          if (summary.qtoArea === 0) {
            area = summary.rangeArea;
          } else {
            area = Math.min(summary.rangeVolume, summary.qtoVolume);
          }
          const material = lookupMaterial(summary.category);
          switch (summary.unit) {
            case "m3": {
              quantity = volume;
              break;
            }
            case "m2": {
              quantity = area;
              break;
            }
            case "m": {
              quantity = summary.qtoLength;
              break;
            }
            case "ea": {
              quantity = summary.elementCount;
              break;
            }
            case "kg": {
              quantity = volume;
              break;
            }
            default: {
              quantity = volume;
              console.log(`Unrecognised unit ${summary.unit} using volume`);
              break;
            }
          }
          gwpElements.push({
            material: material.material,
            category: summary.category,
            // this needs fixing so that we use hte correct quantity and not always the volume
            quantity: +quantity.toFixed(2),
            gwp: gwpCalculation(material, {
              volume: volume,
              area: area,
              length: summary.qtoLength,
              count: value.elementCount,
            }),
            elementCount: summary.elementCount,
            unit: material.unit,
          });
        } else {
          const material = lookupMaterial(value.category);
          if (value.qtoVolume === 0) {
            volume = value.rangeVolume;
          } else {
            volume = Math.min(value.rangeVolume, value.qtoVolume);
          }
          gwpElements.push({
            material: material.material,
            category: value.category,
            quantity: +volume.toFixed(2),
            gwp: gwpCalculation(material, {
              volume: volume,
              area: value.qtoArea,
              length: value.qtoLength,
              count: value.elementCount,
            }),
            elementCount: value.elementCount,
            unit: material.unit,
          });
        }
        return "";
      });

      return gwpElements;
    },
    [lookupMaterial]
  );

  // const useMemoisedElements = (iModelConnection : any) => useMemo(async () => {await sqlAPI.getVolumeForCategory(iModelConnection); }, [iModelConnection])

  const elementsLoaded = useCallback(() => {
    let returnValue = false;
    try {
      returnValue = elements.length > 0;
      setElementCount(elements.length);
    } catch (e) {}
    return returnValue;
  }, [elements]);

  const getElementsLength = useCallback(() => {
    try {
      return elements.length;
    } catch (e) {
      return 0;
    }
  }, [elements]);

  const getElements = useCallback(async () => {
    console.log("calling getElements ", epdMapping, epd);
    if (!epdLoaded) {
      return;
    }
    console.log("running getElements ");
    const iModelConnection = await CheckpointConnection.openRemote(
      projectId,
      iModelId
    );
    const tempElements = await cachedElements(iModelConnection);
    const gwpElements = calculateGWP(tempElements);
    setElementCount(gwpElements.length);
    const total = gwpElements.reduce((accumulator, obj) => {
      return accumulator + obj.gwp;
    }, 0);
    setGWPTotal(total);
    setElements(gwpElements);
  }, [
    epd,
    epdMapping,
    iModelId,
    projectId,
    epdLoaded,
    calculateGWP,
    cachedElements,
  ]);

  useEffect(() => {
    if (epdMapping && epd) {
      setEPDLoaded(true);
    }
  }, [epdMapping, epd]);

  useEffect(() => {
    if (epdLoaded && getElementsLength() < 1) {
      void getElements();
    }
  }, [epdLoaded, getElementsLength, getElements]);

  const prepareTempMapping = useCallback((passMapping) => {
    tempMapping.current = passMapping;
  }, []);

  const exportMoata = useCallback(
    async (counter = 0) => {
      console.log("Exporting");
      if (elements.length <= 0) {
        // not sure why this happens ... but for some reason the app caches 0 elements and gets stuck needs resolving ... start an in incognito session seems to fix the problem
        console.log("awaiting elements");
        if (counter === 0) {
          await getElements();
          void exportMoata(1);
        }
        return;
      }
      const moataElements: any[] = [];
      try {
        Object.keys(epdMapping.categories).forEach((key: string) => {
          console.log(key);
          console.log(elements);
          const elementIndex = elements.findIndex(
            (element) => element.category === key
          );
          const epdIndex = epd.findIndex(
            (aepd: any) => aepd.uniqueId === epdMapping.categories[key]
          );
          if (elementIndex >= 0) {
            const aElement = elements[elementIndex];
            const moataElement: IExportMoata = {
              mcpAssetCode: epdMapping.categories[key],
              quantity: aElement.quantity,
              unit: aElement.unit,
              quantity2: 0,
              unit2: "",
              notes: epd[epdIndex].material,
              folder1: key,
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
        });
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
    [elements, epdMapping, epdLoaded]
  );

  const storeMapping = useCallback(async () => {
    try {
      if (tempMapping.current) {
        if (Object.keys(tempMapping.current.categories).length > 0) {
          void MoataApi.putEPDCategories(
            claims.email,
            iModelId,
            accessToken,
            tempMapping.current
          );
          setEPDMapping(tempMapping.current);
          const iModelConnection = await CheckpointConnection.openRemote(
            projectId,
            iModelId
          );
          const tempElements = await cachedElements(iModelConnection);
          const gwpElements = calculateGWP(tempElements);
          setElements(gwpElements);
          tempMapping.current = {};
        }
      }
    } catch (err) {
      // tempMapping is not set
      // we should disable the save key
    }
  }, [
    claims.email,
    iModelId,
    accessToken,
    cachedElements,
    calculateGWP,
    projectId,
  ]);

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div className="esg-panel-header">
      <div className="esg-row">
        <div className="esg-text-left">Carbon by Material & Category</div>
        <div className="esg-text-right">{getMappingLength()} Mappings</div>
      </div>
      <div className="esg-row">
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
                    accessor: "category",
                    Cell: SkeletonCell,
                    Header: (
                      <div>
                        <p>Category</p>
                        <p> </p>
                      </div>
                    ),
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "material",
                    Cell: SkeletonCell,
                    Header: (
                      <div>
                        <p>Material</p> <p></p>
                      </div>
                    ),
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "elementCount",
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
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "quantity",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      numericCellRenderer(props),
                    Header: (
                      <div>
                        <p>Quantity</p>
                        <p> </p>
                      </div>
                    ),
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
                  {
                    accessor: "gwp",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                      numericCellRenderer(props),
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
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "ice",
                    Header: (
                      <div>
                        EPDs{" "}
                        <IconButton
                          title={"Save EPD"}
                          styleType={"borderless"}
                          onClick={() => storeMapping()}
                        >
                          <SvgSave />
                        </IconButton>
                        <IconButton
                          title={"Export"}
                          styleType={"borderless"}
                          onClick={() => exportMoata()}
                        >
                          <SvgExport />
                        </IconButton>
                      </div>
                    ),
                    Cell: (props: any) => (
                      <EditEPDCell
                        {...props}
                        epdOptions={epdOptions}
                        mapping={epdMapping}
                        storeMapping={prepareTempMapping}
                      />
                    ),
                  },
                ],
              },
            ],
            [
              epdMapping,
              epdOptions,
              storeMapping,
              prepareTempMapping,
              elementCount,
              gwpTotal,
            ]
          )}
          pageSize={25}
          paginatorRenderer={paginator}
          isResizable={true}
          isLoading={!elementsLoaded}
          style={{ height: "100%" }}
          emptyTableContent={"Please wait for mappings to be loaded"}
        />
      </div>
    </div>
  );
};

export default {};
