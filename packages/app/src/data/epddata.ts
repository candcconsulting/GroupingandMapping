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
  ],
};

export const materialMapping = {
  mappingName: "CarbonReporting",
  groups: [
    {
      material: "steelwork",
      group: ["Steelwork"],
    },
    { material: "concrete", group: ["Foundations", "Floors"] },
  ],
};

export default {};
