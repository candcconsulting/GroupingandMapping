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
import {CellRendererProps} from "react-table"
import AuthClient from "../../../services/auth/AuthClient";
import { RouteComponentProps } from "@reach/router";
import { getClaimsFromToken } from "../../../services/auth/authUtil";
import mongoAppApi from "../../../api/mongoAppApi";
import { sqlAPI } from "../../../api/queryAPI";
import { SkeletonCell } from "../../SynchronizationRouter/components/SkeletonCell";
import { Table, tableFilters, TablePaginator, TablePaginatorRendererProps } from "@itwin/itwinui-react";
import { getSettings } from "../../../config";
import { NumericCell, NumericCell0, numericCellRenderer } from "../../SynchronizationRouter/components/NumericCell";


interface ElementProps extends RouteComponentProps {
  accessToken: string;
  projectId: string;
  iModelId: string;
  sql?: string;
}

export const CarbonReview = ({
  accessToken,
  projectId,
  iModelId,
}: ElementProps) => {

  const rpcInterfaces = React.useMemo(() => [IModelReadRpcInterface], []);
  const [claims, setClaims] = React.useState<Record<string, string>>({});
  const [elements, setElements] = React.useState<any[]>([]);
  const elementsLoading = React.useRef(false);
  
  useEffect(() => {
    return () => {
      setElements([]);
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
  
  const cachedElements = useCallback(async (iModelConnection) => {
    const tempElements = await sqlAPI.getVolumeForCategory(iModelConnection);
    return tempElements
  }, [])


  // const useMemoisedElements = (iModelConnection : any) => useMemo(async () => {await sqlAPI.getVolumeForCategory(iModelConnection); }, [iModelConnection])

  const elementsLoaded = useCallback(() => {
    let returnValue = false;
    try {
      returnValue = (elements.length > 0)
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
    console.log("calling getElements ")
    if (elementsLoading.current)
      return;
    else
      elementsLoading.current = true;
    const iModelConnection = await CheckpointConnection.openRemote(
      projectId,
      iModelId
    );
    const tempElements = await sqlAPI.getVolumeForCategory(iModelConnection)
    // const tempElements = await cachedElements(iModelConnection);
    const cleanElements = []
    for (const aRow of tempElements) {
      const aCleanRow : any = {}
      console.log(aRow)
      aCleanRow.category = aRow.category
      aCleanRow.className = aRow.className
      aCleanRow.elementCount = aRow.elementCount
      aCleanRow.qtoArea = aRow.qtoArea.toFixed(getSettings.decimalAccuracy)
      aCleanRow.qtoLength = aRow.qtoLength.toFixed(getSettings.decimalAccuracy)
      aCleanRow.qtoVolume = aRow.qtoVolume.toFixed(getSettings.decimalAccuracy)
      aCleanRow.rangeArea = aRow.rangeArea.toFixed(getSettings.decimalAccuracy)
      aCleanRow.rangeVolume = aRow.rangeVolume.toFixed(getSettings.decimalAccuracy)
      cleanElements.push(aCleanRow)
    }
    setElements(cleanElements)

  },[ iModelId, projectId, cachedElements])

  useEffect(() => {
    if (!elementsLoading.current && getElementsLength() < 1 )
      void getElements()
  },[getElementsLength, getElements])


 
  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  return (
    <div className="esg-panel-header">
      <div className="esg-row"><div className="esg-text-left">Quantity Review</div>
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
                    Header: "Category",
                    disableResizing: false,
                    Filter: tableFilters.TextFilter(),
                  },
                  {
                    accessor: "elementCount",
                    Cell: NumericCell0,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "Count",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "rangeVolume",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "RangeVolume",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "qtoVolume",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "QTOVolume",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "rangeArea",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "RangeArea",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "qtoArea",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "QTOArea",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "qtoLength",
                    Cell: NumericCell,
                    cellRenderer: (props: CellRendererProps<any>) =>
                    numericCellRenderer(props),
                    Header: "QTOLength",
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
          isLoading={!elementsLoaded}
          style={{ height: "100%" }}
          emptyTableContent={"Please wait for mappings to be loaded"}
        />
      </div>
    </div>
  )

}

export default {};
