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
  let allElements = []
  if (typeof elementSet === 'string')
    allElements = elementSet.split(",");
  else
    allElements = elementSet;
    
  emph.overrideElements(
    allElements,
    vp,
    colour,
    FeatureOverrideType.ColorOnly,
    true
  );
  emph.emphasizeElements(allElements, vp, undefined, true);
};