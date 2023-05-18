/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { useActiveIModelConnection } from "@itwin/appui-react";
import { CheckpointConnection, IModelApp } from "@itwin/core-frontend";
import { Button } from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import React, { useCallback, useEffect, useState } from "react";

import { EC3Api } from "../../../api/ec3";
import { IMaterial } from "../../../api/mongoAppApi";
import { sqlAPI } from "../../../api/queryAPI";
import { exportCSV } from "../../../api/storage/exportCSV";
import { gwpCalculation } from "../../../routers/CarbonRouter/components/Carbon";

interface IGWP {
  material: string;
  quantity: number;
  gwp: number;
  elementCount: string;
  unit: string;
  category: string;
}
interface ElementCountProps extends RouteComponentProps {
  accessToken: string;
  projectId: string;
  iModelId: string;
  sql?: string;
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

const Moata = () => {
  const [elements, setElements] = React.useState<any[]>([]);
  const [epdLoaded, setEPDLoaded] = React.useState(false);
  const [elementCount, setElementCount] = React.useState(0);
  const [gwpTotal, setGWPTotal] = React.useState(0);
  const [epd, setEPD] = React.useState<any>(undefined);
  const [epdMapping, setEPDMapping] = useState<any>(undefined);
  const iModelId = useActiveIModelConnection()?.iModelId as string;

  const getiModelConnection = useActiveIModelConnection();

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

  const cachedElements = useCallback(async (iModelConnection) => {
    const tempElements = await sqlAPI.getVolumeForCategory(iModelConnection);
    return tempElements;
  }, []);
  const getElements = useCallback(async () => {
    if (!epdLoaded) {
      return;
    }
    const vp = IModelApp.viewManager.selectedView;
    if (!vp) {
      return;
    }
    const iModelConnection = vp.iModel;
    const tempElements = await cachedElements(iModelConnection);
    const gwpElements = calculateGWP(tempElements);
    setElementCount(gwpElements.length);
    const total = gwpElements.reduce((accumulator, obj) => {
      return accumulator + obj.gwp;
    }, 0);
    setGWPTotal(total);
    setElements(gwpElements);
  }, [epdLoaded, calculateGWP, cachedElements]);

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
    [elements, getElements, epdMapping, epd]
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button
          onClick={exportMoata}
          styleType="cta"
          style={{ width: "130px", height: "40px" }}
        >
          Export
        </Button>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button
          onClick={exportMoata}
          styleType="high-visibility"
          style={{ width: "130px", height: "40px" }}
        >
          Load Moata
        </Button>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button
          onClick={exportMoata}
          styleType="high-visibility"
          style={{ width: "130px", height: "40px" }}
        >
          View in Moata
        </Button>
      </div>
    </div>
  );
};

export default Moata;
