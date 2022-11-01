/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
export const epd = {
  epd: [
    {
      material: "steelwork",
      description: "32/40 Concrete with 50% GGBS",
      density: 7800,
      ICEcarbonFactor: 0.089,
      carbonFactor: 213.6,
    },
    {
      material: "concrete",
      description: "Steel Section with 85% ERC",
      density: 2400,
      ICEcarbonFactor: 1.21,
      carbonFactor: 9438,
    },
    {
      material: "glazing",
      description: "Double glazing with reinforced thermal insulation",
      density: 7800,
      ICEcarbonFactor: 0.089,
      carbonFactor: 91.5,
    },
    {
      material: "plasterboard",
      description: "Gyproc® Normal Standard Plasterboard",
      density: 720,
      ICEcarbonFactor: 0.03,
      carbonFactor: 20.7,
    },
  ],
};

export const materialMapping = {
  mappingName: "CarbonReporting",
  groups: [
    {
      material: "steelwork",
      group: ["Steelwork", "Beams", "Columns", "SteelFraming"],
    },
    {
      material: "concrete",
      group: ["Foundations", "Floors", "ConcreteStructures", "WallsConcrete"],
    },
    { material: "glazing", group: ["Glazing", "Windows"] },
    { material: "plasterboard", group: ["WallsPlaster"] },
  ],
};

export const categoryMapping = {
  "_id": {
    "$oid": "634e99210c5e4453798c197f"
  },
  "iModelId" : "9902d569-59f9-44ef-a2a5-00c6f432ce20",
  "mappingName"  : "categories",
  "categories" :
  [
    {    
    "category" : "CV-CV-Bracing-G-P",
    "material" : "steelwork"    
    }    
  ]    
    
}
export default {};
