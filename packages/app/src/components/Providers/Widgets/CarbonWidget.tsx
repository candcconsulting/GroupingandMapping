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
import {
  Table,
  tableFilters,
  TablePaginator,
  TablePaginatorRendererProps,
} from "@itwin/itwinui-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";

import { iTwinAPI } from "../../../api/iTwinAPI";
import { ProjectsClient } from "../../../api/projects/projectsClient";
import { sqlAPI } from "../../../api/queryAPI";
import { useApiData } from "../../../api/useApiData";
import { useApiPrefix } from "../../../api/useApiPrefix";
import { epd, materialMapping } from "../../../data/epddata";
import { SkeletonCell } from "../../../routers/SynchronizationRouter/components/SkeletonCell";
import AuthClient from "../../../services/auth/AuthClient";
import { useCommonPathPattern } from "../../MainLayout/useCommonPathPattern";


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
  count : number,
  max : number,
  min : number
}

const mMapping = materialMapping;
const mEPD = epd;

const makeGroupStrings = (): string => {
  let groupString = ",";
  for (const aGroup of mMapping.groups) {
    groupString = groupString + aGroup.group.toString() + ",";
  }
  return groupString;
};

const findMapping = (searchString: string): string => {
  let returnString = "";
  for (const aGroup of mMapping.groups) {
    const groupString = aGroup.group.toString();
    if (groupString.toLowerCase().includes(searchString.toLowerCase())) {
      returnString = aGroup.material;
    }
  }
  return returnString;
};


export const CarbonWidget = () => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [mapping, setMapping] = React.useState<IMapping>();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [mappingLoaded, setMappingLoaded] = React.useState(false);
  const [groupsLoaded, setGroupsLoaded] = React.useState(false);
  const isLoading = React.useRef(false);
  const [elementsLoaded, setElementsLoaded] = React.useState(false);
 

  const [error, setError] = React.useState("");
  const urlPrefix = useApiPrefix();
  const rpcInterfaces = [IModelReadRpcInterface];
  

  const useAccessToken = () => {  
    const [accessToken, setAccessToken] = React.useState<string>();
    useLayoutEffect(() => {
      IModelApp.authorizationClient?.getAccessToken().then(setAccessToken);
    }, [])
    return (accessToken);
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
    accessToken : accessToken,
    url: `https://api.bentley.com/insights/reporting/datasources/imodels/${iModelId}/mappings`,
  });

  useEffect(() => {
    if (mappings) {
      console.log("Mappings.Length", mappings.length)
      setMappingLoaded(mappings.length > 0);
    }
  }, [mappings]);

  useEffect(() => {
  const loadGroups = async () => {
    if (mappings && iModelId) {
      // mappings.forEach((mapping: IMapping) => {
      for (const aMapping of mappings) {
        if (aMapping.mappingName === mMapping.mappingName) {
          setMapping(mapping);
          console.log("Found " + aMapping.mappingName + aMapping.id);
          setMappingLoaded(true);
          if (AuthClient.client) {
            void iTwinAPI
              .getGroups(AuthClient.client, iModelId, aMapping.id)
              .then((allGroups) => {
                const ourGroups: IGroup[] = [];
                console.log(allGroups);
                for (const aGroup of allGroups) {
                  //                allGroups.forEach((group: IGroup) => {
                  const groupStrings = makeGroupStrings();
                  if (groupStrings.indexOf(aGroup.groupName) >= 0) {
                    console.log(aGroup);
                    const material = findMapping(aGroup.groupName);
                    aGroup.material = material;
                    ourGroups.push(aGroup);
                  }
                } // );
                setGroups(ourGroups);
                setGroupsLoaded(true);
              });
          }
        }
      } //);
    }
  };
  if (mappingLoaded) {
    console.log("mappingLoaded")
    void loadGroups();
  }
},[mappingLoaded, mapping, iModelId, mappings])

  useEffect(() => {
    const fetchElements = async () => {
      console.log("fetchElements called");
      console.log(`Groups Loaded Length = ${groups.length}`);
      isLoading.current = true;
      let max = 0;
      let min = 0;

      //const iModelConnection = await CheckpointConnection.openRemote(projectId, iModelId);
      const vp = IModelApp.viewManager.selectedView;
      if (!vp) {
        return;
      }
      const client = new ProjectsClient(urlPrefix, accessToken ?? "");
      try {
        if (elementsLoaded) {
          return;
        }
        let allInstances: any[] = [];
        allInstances = [];
        // groups.forEach(async (aGroup: any) => {
        for (const aGroup of groups) {
          console.log(aGroup);
          const iModelConnection = vp.iModel;
          const aMaterial = mEPD.epd.find(
            (aMaterial) => aMaterial.material === aGroup.material
          );
          const tempInstances = await sqlAPI.getVolumeforGroupWidget(
            iModelConnection,
            aGroup.groupSQL,
            aGroup.material,
            aMaterial?.carbonFactor ?? 0
          );
          allInstances.push(...tempInstances);
          // setElements(allInstances);
          max = Math.max(...allInstances.map((o) => o.gwp));
          min = Math.min(...allInstances.map((o) => o.gwp));
        } //);
        console.log("Loaded");
        const summarizeElements : ISummary[] = []
        const tempElements = allInstances;
        void tempElements.reduce((summary, value) => {
          if (summary) {
            summarizeElements.push ({
              material : summary.material,
              netVolume : +summary.netVolume.toFixed(2),
              gwp : +summary.gwp.toFixed(2) ?? 0,
              elements : summary.id,
              max : +summary.gwp.toFixed(2) ?? 0,
              min : +summary.gwp.toFixed(2) ?? 0,
              count : 1
            })

          }
          const index = summarizeElements.findIndex((aElement) => aElement.material === value.material )
          if (index >= 0) {
            summarizeElements[index].netVolume = +(summarizeElements[index].netVolume + value.netVolume).toFixed(2);
            summarizeElements[index].gwp = +(summarizeElements[index].gwp + value.gwp).toFixed(2);
            summarizeElements[index].elements = summarizeElements[index].elements + "," + value.id;
            if ((value.gwp > summarizeElements[index].max) && (value.gwp > 0)) {
              summarizeElements[index].max = value.gwp
            }
            if ((value.gwp < summarizeElements[index].min) && (value.gwp > 0)) {
              summarizeElements[index].min = value.gwp
            }
            summarizeElements[index].count += 1
          } else
          {
            summarizeElements.push ({
              material : value.material,
              netVolume : value.netVolume,
              gwp : value.gwp ?? 0,
              elements : value.id,
              max : summary.gwp ?? 0,
              min : summary.gwp ?? 0,
              count : 1
            })
          }
          return "";
        })
        // setElements(allInstances);
        setElementsLoaded(true);
        setElements(summarizeElements);
        isLoading.current = false;
      } catch (error) {
        const errorResponse = error as Response;
        setError(await client.extractAPIErrorMessage(errorResponse));
      }
      
    };
    if (!elementsLoaded && !isLoading.current && groupsLoaded) {
      isLoading.current = true;
      if (isLoading.current) {
        void fetchElements().then(() => {
          setElementsLoaded(true);
        });
      }
    }
  }, [
    accessToken,
    urlPrefix,
    iModelId,
    projectId,
    groups,
    groupsLoaded,
    mappingLoaded,
    mappings,
    elementsLoaded
  ]);
  //   React.useEffect(() => void fetchElements(), [fetchElements]);

  const pageSizeList = useMemo(() => [10, 25, 50], []);
  const paginator = useCallback(
    (props: TablePaginatorRendererProps) => (
      <TablePaginator {...props} pageSizeList={pageSizeList} />
    ),
    [pageSizeList]
  );

  const onRowClicked = async (_rows: any, state: any) => {
    const vp = IModelApp.viewManager.selectedView;
    const index = elements.findIndex((aElement) => aElement.material === state.values.material )
    const selectedElements = elements[index].elements;
    if (vp && selectedElements) {
      const emph = EmphasizeElements.getOrCreate(vp);
      emph.clearEmphasizedElements(vp);
      emph.clearOverriddenElements(vp);

      //const allElements = ecResult;
      const allElements = selectedElements.split(",");
      emph.overrideElements(
        allElements,
        vp,
        ColorDef.red,
        FeatureOverrideType.ColorOnly,
        true
      );
      emph.emphasizeElements(allElements, vp, undefined, true);
      vp.iModel.selectionSet.emptyAll();
      /*      for (const es of allElements.values()) {
        vp.iModel.selectionSet.add(es);
      } */
      vp.iModel.selectionSet.add(allElements);
      void vp.zoomToElements(allElements);
    }
  };

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
                    accessor: "netVolume",
                    Cell: SkeletonCell,
                    Header: "Volume",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "gwp",
                    Cell: SkeletonCell,
                    Header: "GWP",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "max",
                    Cell: SkeletonCell,
                    Header: "Max",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "min",
                    Cell: SkeletonCell,
                    Header: "Min",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },
                  {
                    accessor: "count",
                    Cell: SkeletonCell,
                    Header: "Count",
                    disableResizing: false,
                    Filter: tableFilters.NumberRangeFilter(),
                  },                    
                ],
              },
            ],
            []
          )}
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
