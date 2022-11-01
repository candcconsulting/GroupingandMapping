/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

/** Warning: this client is for demonstration purposes only. OData compliant library should be used instead. */
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
}
