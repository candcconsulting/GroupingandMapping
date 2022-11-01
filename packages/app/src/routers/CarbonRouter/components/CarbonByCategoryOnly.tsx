/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import React, {useCallback, useEffect, useMemo, useState} from "react";

import { BentleyCloudRpcManager, BentleyCloudRpcParams, IModelReadRpcInterface } from "@itwin/core-common";
import { CheckpointConnection, IModelApp } from "@itwin/core-frontend";
import { FrontendIModelsAccess } from "@itwin/imodels-access-frontend";

import AuthClient from "../../../services/auth/AuthClient";
import { RouteComponentProps } from "@reach/router";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import mongoAppApi, { IMaterial } from "../../../api/mongoAppApi";
import { sqlAPI } from "../../../api/queryAPI";
import { SkeletonCell } from "../../SynchronizationRouter/components/SkeletonCell";
import { IconButton, Table, tableFilters, TablePaginator, TablePaginatorRendererProps } from "@itwin/itwinui-react";
// import { epd } from "../../../data/epddata";
import { gwpCalculation } from "./Carbon";
import { SvgSave } from "@itwin/itwinui-icons-react";
import { EditEPDCell } from "./EditEPDCell";
import { NumericCell, NumericCell0, numericCellRenderer } from "../../SynchronizationRouter/components/NumericCell";
import { CellRendererProps } from "react-table";
import { getSettings } from "../../../config";

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


export const CarbonByCategoryOnly = ({
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
  const  [epdOptions, setEPDOptions] = React.useState<any[] | undefined>([]);
  const [elementCount, setElementCount] = React.useState(0);
  const [gwpTotal, setGWPTotal] = React.useState(0);
  const tempMapping = React.useRef<any>({})
  
  useEffect(() => {
    return () => {
      setElements([]);
      setEPDMapping(undefined);
      setEPD([]);
      setEPDMapping(undefined);
      if (IModelApp) {
        void IModelApp.shutdown()
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
      void mongoAppApi.getAllICE().then((allEPD) => {
        setEPD(allEPD);
        setEPDOptions(allEPD?.map((item: any) =>  {return {"label" : item.material, "value": item.uniqueId}}))
      });
      
      }
  }, [iModelId]);

  useEffect(() => {
    if (iModelId && claims.email && accessToken) {
      void mongoAppApi
        .getEPDCategories(claims.email, iModelId, accessToken)
        .then((theMapping) => {
          if (theMapping?.iModelId !== iModelId) {
            console.log(`EPD Mapping for ${iModelId} not found using default`);
          }
          setEPDMapping(theMapping);          
        });
    }
  }, [iModelId, accessToken, claims]);
  


  const getMappingLength = useCallback(() => {
    let returnValue = 0
    try {
      returnValue = Object.keys(epdMapping.categories).length
    }
    catch (e) {}
    return returnValue
  },[epdMapping]);

  const lookupMaterial = useCallback((category : string) => {
    const  returnValue: IMaterial = {material : "unmapped", "carbonFactor" : 0, unit:"-", unitType: "unknown", uniqueId : "unmapped", density : 0, "description" : "", "ICECarbonFactor" : 0}
    try {
      if (epdMapping.categories[category] !== undefined) {
        const materialEPD = epd.find((obj : any) => {return obj.uniqueId === epdMapping.categories[category]})
        if (materialEPD)        
          return materialEPD
        else {
          returnValue.material = epdMapping.categories[category] + " not found"
          return returnValue
        }
      } else return returnValue
    }
    catch(e) {
      return returnValue;
    }
  },[epdMapping, epd])

  const cachedElements = useCallback(async (iModelConnection) => {
    const tempElements = await sqlAPI.getVolumeForCategory(iModelConnection);
    return tempElements
  }, [])

  const calculateGWP = useCallback((resultElements : any[]) => {
    console.log("Calling calculateGWP")
    const gwpElements: IGWP[] = [];
    void resultElements.reduce((summary, value) => {
      let volume = 0
      let quantity = 0;
      let area = 0
      if (summary) {
        if (summary.qtoVolume === 0) 
          volume = summary.rangeVolume;
        else
          volume = Math.min(summary.rangeVolume, summary.qtoVolume);
        if (summary.qtoArea === 0) 
          area = summary.rangeArea;
        else
          area = Math.min(summary.rangeVolume, summary.qtoVolume); 
        const material = lookupMaterial(summary.category)
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
          gwp: gwpCalculation(material, {volume:volume, area : area, length : summary.qtoLength,  count : value.elementCount}),
          elementCount: summary.elementCount,
          unit: material.unit,          
        });
      } else
      {
        const material = lookupMaterial(value.category)
        if (value.qtoVolume === 0) 
          volume = value.rangeVolume;
        else
          volume = Math.min(value.rangeVolume, value.qtoVolume);
        gwpElements.push({
          material: material.material,
          category: value.category,
          quantity: +volume.toFixed(2),
          gwp: gwpCalculation(material, {volume:volume, area : value.qtoArea, length: value.qtoLength, count : value.elementCount}),
          elementCount: value.elementCount,
          unit: material.unit,
        });
      }
      return "";
    });

    return (gwpElements);
  },[lookupMaterial])

  // const useMemoisedElements = (iModelConnection : any) => useMemo(async () => {await sqlAPI.getVolumeForCategory(iModelConnection); }, [iModelConnection])

  const elementsLoaded = useCallback(() => {
    let returnValue = false;
    try {
      returnValue = (elements.length > 0)
      setElementCount(elements.length)
    }
    catch(e) {
    }
    return returnValue;
  }, [elements])

  const getElementsLength = useCallback(() => {
    try {
      return elements.length
    }
    catch(e) {
      return 0
    }
  },[elements])
  
  const getElements = useCallback(async () => {
    console.log("calling getElements ", epdMapping, epd)
    if (!epdLoaded) {
      return
    }
    console.log("running getElements ")
    const iModelConnection = await CheckpointConnection.openRemote(
      projectId,
      iModelId
    );
    const tempElements = await cachedElements(iModelConnection);
    const gwpElements = calculateGWP(tempElements);
    setElementCount(gwpElements.length)
    const total = gwpElements.reduce((accumulator, obj) => {
      return accumulator + obj.gwp;
    }, 0)
    setGWPTotal(total);
    setElements(gwpElements);

  },[ epd, epdMapping, iModelId, projectId, epdLoaded, calculateGWP, cachedElements])

  useEffect(() => {
    if (epdMapping && epd)
      setEPDLoaded(true);
  },[epdMapping, epd])

  useEffect(() => {
    if (epdLoaded && getElementsLength() < 1 )
      void getElements()
  },[epdLoaded, getElementsLength, getElements])

  const prepareTempMapping = useCallback((passMapping) => {
    tempMapping.current = passMapping;
  },[])

  const storeMapping = useCallback(async () => {
    try {
    if (tempMapping.current)
      if (Object.keys(tempMapping.current.categories).length > 0) {
        void mongoAppApi.putEPDCategories(claims.email, iModelId, accessToken, tempMapping.current);
        setEPDMapping(tempMapping.current);
        const iModelConnection = await CheckpointConnection.openRemote(
          projectId,
          iModelId
        );
        const tempElements = await cachedElements(iModelConnection);
        const gwpElements = calculateGWP(tempElements);
        setElements(gwpElements)
        tempMapping.current = {}
    }
  }
  catch (err) {
    // tempMapping is not set
    // we should disable the save key
  }
  },[claims.email, iModelId, accessToken, cachedElements, calculateGWP, projectId])

  
  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div className="esg-panel-header">
      <div className="esg-row"><div className="esg-text-left">Carbon by Material & Category</div>
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
                    Header: <div><p>Category</p><p> </p></div>,
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "material",
                    Cell: SkeletonCell,
                    Header: <div><p>Material</p> <p></p></div>,
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "elementCount",
                    Cell: NumericCell0,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: (<div><p>Count</p><p>{elementCount}</p></div>),
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {                    
                    accessor: "quantity",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),                    
                    Header: (<div><p>Quantity</p><p> </p></div>),
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
                    Header: (<div><p>GWP</p><p style={{justifyContent : "flex-end"}}>{new Intl.NumberFormat('en-EN', { minimumFractionDigits: getSettings.decimalAccuracy, maximumFractionDigits: getSettings.decimalAccuracy }).format(gwpTotal)}&nbsp;&nbsp;</p></div>),
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
                      </div>
                    ),
                    Cell: (props : any) => (
                      <EditEPDCell
                        {...props}
                        epdOptions={epdOptions}
                        mapping={epdMapping}
                        storeMapping={prepareTempMapping}
                      />
                    )
                  }
                ],
              },
            ],
            [epdMapping, epdOptions, storeMapping, prepareTempMapping, elementCount, gwpTotal]
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
  )

}

export default {};
