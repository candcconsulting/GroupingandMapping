/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

/** Warning: this client is for demonstration purposes only. OData compliant library should be used instead. */

import { tableFilters } from "@itwin/itwinui-react";
import { Column } from "react-table";

export class OData {
  constructor(
    private url: string,
    private requestInit?: RequestInit
  ) { }

  /** Warning: this client is for demonstration purposes only. OData compliant library should be used instead. */
  public async get(entity?: string): Promise<any[]> {
    const value: any[] = [];
    let url = this.url + (entity === undefined ? "" : `/${entity}`);
    try {
      do {
        const odataResponse = await fetch(url, this.requestInit);
        const odata = await odataResponse.json();
        url = odata["@odata.nextLink"];
        value.push(...odata.value);
      } while (url !== undefined);

      return value;
    }
    catch(error) {
      console.log("Error retrieving OData", error);
      return [];
    }
  }

  public async getPages(
    setColumns: React.Dispatch<React.SetStateAction<Column<any>[]>>,
    setData: React.Dispatch<React.SetStateAction<any[]>>,
    entity?: string): Promise<any[]>
    {

    let columnsSet = false;
    const value: any[] = [];
    let url = this.url + (entity === undefined ? "" : `/${entity}`);
    try {
      do {
        const odataResponse = await fetch(url, this.requestInit);
        const odata = await odataResponse.json();
        url = odata["@odata.nextLink"];
        value.push(...odata.value);
        if (odata.value && !columnsSet) {
          setColumns([
            {
              Header: "Header name",
              columns: Object.keys(value[0]).map((x) => ({
                id: x,
                Header: x,
                accessor: x,
                width: 200,
                Filter: (typeof value[0][x] === 'string') ? tableFilters.TextFilter() : (typeof value[0][x] === 'number') ? tableFilters.NumberRangeFilter() : undefined,
                sortType: typeof value[0][x]       
                    })).filter(x => (x.accessor.substring(0,4) !== 'BBox')),
            },
          ]);
          columnsSet = true;
        }
        setData(value);
      } while (url !== undefined);

      return value;
    }
    catch(error) {
      console.log("Error retrieving OData", error);
      return [];
    }
  }
}
