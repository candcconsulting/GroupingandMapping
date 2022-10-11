/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { access } from "fs";
import * as Realm from "realm-web";

export interface IGWP {
  iModelId: string;
  storeDate: Date;
  material: string;
  volume: number;
  gwp: number;
  count: number;
  id?: string;
}

const REALM_APP_ID = "itwin-osdfm";

export class mongoAppApi {
  static app = new Realm.App(REALM_APP_ID);

  public static async getGWP(
    userName: string,
    iModel: string,
    accessToken: string
  ) {
    if (accessToken.substring(0, 6).toLowerCase() === "bearer") {
      accessToken = accessToken.substring(7);
    }
    // const credentials = Realm.Credentials.jwt(accessToken);
    // const credentials = Realm.Credentials.anonymous();
    const credentials = Realm.Credentials.emailPassword(
      userName.toLowerCase(),
      userName.toLowerCase()
    );
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("User Logged in ", user.id);
      const gwp = await user.functions.getGWP(iModel);
      return gwp;
    } catch (error) {
      console.log(error);
    }
  }

  public static async putGWP(
    userName: string,
    iModel: string,
    accessToken: string,
    gwpStore: IGWP
  ) {
    // const credentials = Realm.Credentials.jwt(accessToken);
    // const credentials = Realm.Credentials.anonymous();
    const credentials = Realm.Credentials.emailPassword(
      userName.toLowerCase(),
      userName.toLowerCase()
    );
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("User Logged in ", user.id);
      const gwp = await user.functions.putGWP(gwpStore);
      console.log("success ", gwp);
    } catch (error) {
      console.log(error);
    }
  }
}

export default mongoAppApi;
