/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { IModelApp } from "@itwin/core-frontend";
import axios from "axios";
import { appendFile } from "fs";
import { json, set } from "msw/lib/types/context";
import * as Realm from "realm-web";

import {
  displayNegativeToast,
  displayWarningToast,
} from "./helperfunctions/messages";
import { IMaterial } from "./mongoAppApi";
import mongoAppApi from "./mongoAppApi";
import { lookupUnitType } from "./queryAPI";

export class EC3Api {
  cookie: string;
  token: any;
  accessToken: any;
  setLoggedIn: any;

  constructor(setCarbonLoggedIn: any) {
    this.cookie = "";
    this.token = "";
    this.accessToken = "";
    this.setLoggedIn = setCarbonLoggedIn;
  }
  _app = new Realm.App(process.env.REALM_APP_ID ?? "itwin-osdfm");

  public async login(username: string, password: string) {
    try {
      /*      
      const token = "wCaTpJ30t4OjVOE3a3QxMz2sRcmE1s"
      const response = await fetch(
        `https://buildingtransparency.org/api/epds/ec30jq0e`,
        {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            "Authorization" : `Bearer ${token}`,
          },
        }
      ); 
      const data = response;
      const json = await data.json(); */
      const response = await fetch(
        `https://buildingtransparency.org/api/rest-auth/login`,
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: username, password: password }),
        }
      );
      const data = response;
      const json = await data.json();
      this.token = json;
      this.setLoggedIn(true);
    } catch (error) {
      console.log(error);
      const err = error as Error;
      displayNegativeToast(err.message);
    }
  }

  public async getEPDMapping(
    userName: string,
    iModel: string,
    accessToken: string,
    mappingName?: string
  ) {
    if (!mappingName) {
      mappingName = "";
    }
    const credentials = Realm.Credentials.function({
      accessToken: accessToken,
    });
    try {
      const user = await mongoAppApi.app.logIn(credentials);
      console.log("getEPD Mapping User Logged in ", user.id);
      let epdMapping = await user.functions.getEC3Mapping(iModel, mappingName);
      if (epdMapping === null) {
        displayWarningToast(
          `EC3 Mapping iModel {${iModel}} could not be located - loading default mapping`
        );
        epdMapping = await user.functions.getEC3Mapping("default", mappingName);
      }
      // we only want the first mapping if there is more than one
      return epdMapping;
    } catch (error) {
      console.log(error);
      const err = error as Error;
      displayNegativeToast(err.message);

      return undefined;
    }
  }

  public async getAllEPD(materials: string[]) {
    const epds: IMaterial[] = [];
    // for some reason EC3 does not store the density but stores the GWP per kg which we may not need ...
    for (const aMaterial of materials) {
      const epd = await this.getMaterial(aMaterial);
      if (epd === "Not Authorised") {
        return epds;
      }
      if (typeof epd !== "string" && epd) {
        let carbonFactor = +epd.gwp.split(" ")[0];
        let epdUnit = epd.declared_unit.split(" ")[1];
        switch (epdUnit) {
          case "t": {
            carbonFactor = carbonFactor * 1000;
            epdUnit = "kg";
            break;
          }
        }
        const aEPD: IMaterial = {
          material: aMaterial,
          carbonFactor: carbonFactor,
          ICECarbonFactor: 0,
          description: epd.category.openepd,
          density: +parseFloat(epd.density).toFixed(4) ?? 0.0,
          unit: epd.declared_unit.split(" ")[1],
          uniqueId: aMaterial,
          unitType: lookupUnitType(epd.declared_unit.split(" ")[1]),
        };
        epds.push(aEPD);
      }
    }
    return epds;
  }

  public async getMaterial(
    material: string
  ): Promise<string | any | undefined> {
    if (this.token.key === "") {
      return "Not Authorised";
    }
    try {
      const aToken = `Bearer ${this.token.key}`;
      const response = await fetch(
        `https://buildingtransparency.org/api/epds/${material}`,
        {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${aToken}`,
          },
        }
      );
      const data = response;
      const json = await data.json();
      return json;
    } catch (error) {
      console.log("Loaded EC3 EPD caught Error");
      console.log(error);
    }
  }
}

export default EC3Api;
