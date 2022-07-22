/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { ColorDef, FeatureOverrideType } from "@itwin/core-common";
import { EmphasizeElements, IModelApp, ScreenViewport, ViewChangeOptions } from "@itwin/core-frontend";
import { StringRulesetVariableJSON } from "@itwin/presentation-common";
import { countReset } from "console";

interface ICarbonElement {
    index : number,
    label : string,
    gwp : string,
    elements : string[]
}

interface IToolTipElement {
    ecInstanceId : string,
    material : string,
    gwp : string
    userLabel : string,
    category : string,
    volume : string
}

interface IToolTip {
    userLabel : string,
    category : string,
    volume : string,
    material : string,
    gwp : string,

}

let _applyEmphasize: Boolean = true;
const  _materialsData = require("../data/materials.json");      
const _costIndex = require("../data/cost-plan-breakdown.json")
const _elements = require("../data/IFC_Hospital.json")
let _toolTipData : IToolTipElement[] = []
const _carbonElements : ICarbonElement[] = [];
let _colorsDictionary: Map<string, ColorDef> = new Map<string, ColorDef>([]);



export const visualizeElements = async (elements: { [key: string]: string }) => {
    if (!_applyEmphasize)
        return;

    if (!IModelApp.viewManager.selectedView)
        return;

    const vp = IModelApp.viewManager.selectedView;
    const emph = EmphasizeElements.getOrCreate(vp);

    clearEmphasizeElements(vp, emph)

    const elementsIds = Object.keys(elements);}

export const visualizeElementsByLabel = async (elementsIds: string[], label: string) => {
    if (!_applyEmphasize)
        return;

    if (!IModelApp.viewManager.selectedView)
        return;

    const vp = IModelApp.viewManager.selectedView;
    const emph = EmphasizeElements.getOrCreate(vp);

    clearEmphasizeElements(vp, emph)

    elementsIds.forEach(elementId => {
      emph.overrideElements(elementId, vp, getLabelColor(label), FeatureOverrideType.ColorOnly, false);
    }); 
        

    emphasizeElements(vp, emph, elementsIds)
    zoomElements(vp, elementsIds);
}

export const getLabelColor = (label: string) => {
    if (_colorsDictionary.has(label))
        return _colorsDictionary.get(label) ?? ColorDef.black;

    let newColor = generateRandomColor();
    _colorsDictionary.set(label, newColor);
    return newColor;
}

export const emphasizeCarbonElements = (carbonElements: string[]) => {
    if (!IModelApp.viewManager.selectedView)
        return;

    const vp = IModelApp.viewManager.selectedView;
    const emph = EmphasizeElements.getOrCreate(vp);

    clearEmphasizeElements(vp, emph)
    emphasizeElements(vp, emph, carbonElements)
}

export const clearCarbonElements = () => {
    if (!IModelApp.viewManager.selectedView)
        return;

    const vp = IModelApp.viewManager.selectedView;
    const emph = EmphasizeElements.getOrCreate(vp);

    clearEmphasizeElements(vp, emph)
}

export const setEmphasisMode = (enabled: Boolean = true) => {
    _applyEmphasize = enabled;
}

const generateRandomColor = (): ColorDef => {
    return ColorDef.from(getRandomInt(), getRandomInt(), getRandomInt());
}

const getRandomInt = () : number => {
	let min = 0;
	let max = 225;
	return Math.floor(Math.random() * (max - min + 1)) + min; 
}

const clearEmphasizeElements = (vp: ScreenViewport, emph: EmphasizeElements) => {
    emph.clearEmphasizedElements(vp);
    emph.clearOverriddenElements(vp);
}

const emphasizeElements = (vp: ScreenViewport, emph: EmphasizeElements, elementsIds: string[]) => {
    emph.wantEmphasis = true;
    // emph.emphasizeElements(elementsIds, vp, undefined, false);
}

const zoomElements = (vp: ScreenViewport, elementsIds: string[]) => {
    const viewChangeOpts: ViewChangeOptions = {};
    viewChangeOpts.animateFrustumChange = true;
    // viewChangeOpts.marginPercent = new MarginPercent(0.25, 0.25, 0.25, 0.25);
    vp.zoomToElements(elementsIds, { ...viewChangeOpts })
        .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error);
        });
}

const loadToolTipData = () => {
    const toolTips : IToolTipElement[]  = [];
    if ((_costIndex.length === 0) || (!_costIndex))
        return []
    if ((_elements.length === 0) || (!_elements))
        return []
    for (const _costIndexKey of Object.keys(_costIndex.costs)) {
        const aCost = _costIndex.costs[_costIndexKey];
        const ecInstanceId = ( Object.keys(_elements.Elements)[aCost.rowNumber])
        try {
            const aToolTip : IToolTipElement = {
                ecInstanceId : Object.keys(_elements.Elements)[aCost.rowNumber],
                material: aCost.matchDescription,
                gwp: aCost.gwp,
                userLabel : _elements.Elements[Object.keys(_elements.Elements)[aCost.rowNumber]].UserLabel,
                volume : _elements.Elements[Object.keys(_elements.Elements)[aCost.rowNumber]].Volume,
                category : _elements.Elements[Object.keys(_elements.Elements)[aCost.rowNumber]].category
            }
            toolTips.push(aToolTip);
        }
        catch(e) {
            console.log("Error creating tooltip for " + ecInstanceId + " referenced in " + aCost)
        }
    }
    return toolTips;
}
if (_toolTipData.length === 0) {
    _toolTipData = loadToolTipData()
// now we have to build carbonElements
}

export const getToolTipData = async (ecInstanceId : string): Promise<any> => {
    if (_toolTipData.length === 0)
        return
    console.log(_toolTipData)    
    const aToolTip = _toolTipData.filter((item : IToolTipElement) => item.ecInstanceId === ecInstanceId)    
    return aToolTip[0]
}
export const getCarbonData = async (): Promise<any> => {
    if (_carbonElements.length > 0)
        return _carbonElements;
    // now we have to build carbonElements
    console.log(_materialsData)
    let counter = 0;
    for (const materialKey of Object.keys(_materialsData.materials)) {
        const aMaterial = _materialsData.materials[materialKey];
        let materialElements = [];
        const a = aMaterial.rows.substring(1,aMaterial.rows.length - 2)
        var rows = a.split(',').map(function(item : string) {
            return parseInt(item, 10);
        });
        for (const aRow of rows) {
            materialElements.push(Object.keys(_elements.Elements)[aRow])
        }
        const carbonElement = {
            index : counter,
            label : aMaterial.name,
            gwp : aMaterial.materialGwp,
            elements : materialElements
        }
        _carbonElements.push(carbonElement);
        counter = counter + 1;


    }
    return _carbonElements;
}
