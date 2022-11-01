/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import dotenv from "dotenv";
import * as Realm from "realm-web";
import { epd } from "../data/epddata";
import { displayNegativeToast, displayWarningToast } from "./helperfunctions/messages";
import { lookupUnitType } from "./queryAPI";

export interface IGWP {
  iModelId: string;
  storeDate: Date;
  material: string;
  volume: number;
  gwp: number;
  count: number;
  id?: string;
}

export interface IMaterial {
    material : string,
    description : string,
    density : number,
    ICECarbonFactor : number,
    carbonFactor : number,
    unit : string,
    uniqueId : string,
    unitType : string
}

export interface IepdCategories {
  iModelId: string;
  mappingName: string;
  categories: {
  }
  id?: string;
}
dotenv.config();

export class mongoAppApi {
  static app = new Realm.App(process.env.REALM_APP_ID ?? "itwin-osdfm");

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
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getGWP User Logged in ", user.id);
      const gwp = await user.functions.getGWP(iModel);
      return gwp;
    } catch (error) {
      console.log(error);
      const err = error as Error
      displayNegativeToast(err.message);
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
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      const gwp = await user.functions.putGWP(gwpStore);
      console.log("User Logged in ", user.id);
    } catch (error) {
      console.log(error);
      const err = error as Error
      displayNegativeToast(err.message);

    }
  }

  public static async getEPDMapping(
    userName: string,
    iModel: string,
    accessToken: string,
    mappingName?: string
  ) {
    if (!mappingName)
      mappingName = ""
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getEPD Mapping User Logged in ", user.id);
      let epdMapping = await user.functions.getEPDMapping(iModel, mappingName);
      if (epdMapping === null) {
        displayWarningToast(`iModel {${iModel}} could not be located - loading default mapping`)
        epdMapping = await user.functions.getEPDMapping("default", mappingName);
      }
      // we only want the first mapping if there is more than one
        return epdMapping;
    } catch (error) {
      console.log(error);
      const err = error as Error
      displayNegativeToast(err.message);

      return undefined;
    }
  }

  public static async getEPDCategories(
    userName: string,
    iModel: string,
    accessToken: string,    
  ) {
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getEPD Categories User Logged in ", user.id);
      let epdMapping = await user.functions.getEPDCategories(iModel);
      if (epdMapping === null) {
        displayWarningToast(`iModel {${iModel}} could not be located - loading default categories`)
        epdMapping = await user.functions.getEPDCategories("default");
      }
      // we only want the first mapping if there is more than one
        return epdMapping;
    } catch (error) {
      console.log(error);
      const err = error as Error
      displayNegativeToast(err.message);
      return undefined;
    }
  }

  public static async putEPDCategories(
    userName: string,
    iModel: string,
    accessToken: string,
    epdCategories: any
  ) {
    // const credentials = Realm.Credentials.jwt(accessToken);
    // const credentials = Realm.Credentials.anonymous();
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      epdCategories.mappingName = "categories"
      delete epdCategories._id
      if (epdCategories.iModelId === "default")
        epdCategories.iModelId = iModel
      const tempEPD = await user.functions.putEPDCategories(epdCategories);
      console.log("User Logged in ", user.id);
    } catch (error) {
        console.log(error);
        const err = error as Error
        displayNegativeToast(err.message);
    }
  }

  public static async getAllICE() {
    const credentials = Realm.Credentials.anonymous();
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getAllICEEPD User Logged in ", user.id);
      const projection = {
        'uniqueId': 1, 
        'material': 1, 
        'subMaterial': 1, 
        'ICEdbName': 1, 
        'Comments': 1, 
        'unitQuantity': 1, 
        'unit': 1, 
        'density': 1, 
        'carbonPerUnit': 1, 
        'carbonperKg': 1
      };
      const epd = await user.functions.getAllICEEPD(projection);
      const reshapeEPD = []
      for await (const aEpd of epd) {
        const aTempEPD = {
          material : aEpd.ICEdbName,
          description : aEpd.comments,
          density : aEpd.density,
          ICECarbonFactor : aEpd.carbonPerUnit,
          carbonFactor : aEpd.carbonPerUnit,
          unit : aEpd.unit,
          uniqueId : aEpd.uniqueId,
          unitType : lookupUnitType(aEpd.unit)
        }
        reshapeEPD.push(aTempEPD)
      }
      return reshapeEPD;
    } catch (error) {
      console.error(error);
    }
  }

  public static async getAllEPD() {
    const credentials = Realm.Credentials.anonymous();
    try { 
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getAllEPD User Logged in ", user.id);
      const epd = await user.functions.getAllEPD();
      return epd;
    } catch (error) {
      console.log(error);
    }
  }
}

export default mongoAppApi;
