/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { ColorDef, FeatureOverrideType } from "@itwin/core-common";
import { EmphasizeElements } from "@itwin/core-frontend";

export const colourElements = (
  vp: any,
  elementSet: any,
  clear?: boolean,
  colour?: any
) => {
  const emph = EmphasizeElements.getOrCreate(vp);
  if (clear) {
    emph.clearEmphasizedElements(vp);
    emph.clearOverriddenElements(vp);
  }
  if (!colour) {
    colour = ColorDef.fromString("yellow");
  }
  //const allElements = ecResult;
  let allElements = [];
  if (typeof elementSet === "string") {
    allElements = elementSet.split(",");
  } else {
    allElements = elementSet;
  }

  emph.overrideElements(
    allElements,
    vp,
    colour,
    FeatureOverrideType.ColorOnly,
    true
  );
  emph.emphasizeElements(allElements, vp, undefined, true);
};

export const hideElements = (vp: any, elementSet: any) => {
  const emph = EmphasizeElements.getOrCreate(vp);
  emph.clearEmphasizedElements(vp);
  emph.clearOverriddenElements(vp);
  //const allElements = ecResult;
  let allElements = [];
  if (typeof elementSet === "string") {
    allElements = elementSet.split(",");
  } else {
    allElements = elementSet;
  }

  emph.hideElements(allElements, vp);
};

export const resetElements = (vp: any, clearHidden = true) => {
  const emph = EmphasizeElements.getOrCreate(vp);
  emph.clearEmphasizedElements(vp);
  emph.clearOverriddenElements(vp);
  if (clearHidden) {
    emph.clearHiddenElements(vp);
  }
};
