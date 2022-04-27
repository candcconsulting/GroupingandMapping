/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { CommonToolbarItem, StageUsage, ToolbarItemUtilities, ToolbarOrientation, ToolbarUsage, UiItemsProvider } from "@itwin/appui-abstract";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import { EmphasizeElements, IModelApp, IModelConnection } from "@itwin/core-frontend";

import { toaster } from "@itwin/itwinui-react";
import { BentleyAPIFunctions } from "../../helper/BentleyAPIFunctions";


const displayInfoToast = (message: string) => {
  toaster.setSettings({
    placement: "top-end",
    order: "descending",
  });

  toaster.informational(message, {
    duration: 3000,
  });
};

export class HideAllButtonProvider implements UiItemsProvider {
  public readonly id = "HideAllToolBar";
  /** provideToolbarButtonItems() is called for each registered UI provider as the Frontstage is building toolbars. We are adding an action button to the ContentManipulation Horizontal toolbar
   * in General use Frontstages. For more information, refer to the UiItemsProvider and Frontstage documentation on imodeljs.org.
   */
  public provideToolbarButtonItems(_stageId: string, stageUsage: string, toolbarUsage: ToolbarUsage, toolbarOrientation: ToolbarOrientation): CommonToolbarItem[] {
    console.log(stageUsage, ":", toolbarUsage)
    if (stageUsage === StageUsage.General && toolbarUsage === ToolbarUsage.ContentManipulation && toolbarOrientation === ToolbarOrientation.Horizontal) {
      const hideAllButton = ToolbarItemUtilities.createActionButton("Hide All", 1000, "icon-star-hollow", "Hide All", () => this.hideAll());
      const showAllButton = ToolbarItemUtilities.createActionButton("Show All", 1000, "icon-star", "Show All", () => this.showAll());
      return [hideAllButton, showAllButton];
    }
    return [];
  }
  public async hideAll() {
    console.log( IModelApp.viewManager);
    const vp = IModelApp.viewManager.getFirstOpenView();
    if (!vp) { return};
    const authClient = IModelApp.authorizationClient as BrowserAuthorizationClient
    const iModelId = vp.iModel.iModelId
    if (authClient && iModelId) {
      const mappings = await BentleyAPIFunctions.getMappings(authClient,iModelId);
      if (!mappings) {return};
      vp.iModel.selectionSet.emptyAll();
      for (const es of mappings.values()) {
        console.log(es.id, es.mappingName);
        if (es.mappingName === "CarbonReporting") {
          const groups = await BentleyAPIFunctions.getGroups(authClient,iModelId, es.id);
          for (const es of groups.values()) {
            console.log(es.id, es.groupName, es.groupSQL);
            const queryResult: string[] = await HideAllButtonProvider._executeQuery(vp.iModel, es.groupSQL);
            const ecResult = queryResult.map(x => x[0]);
            const provider = EmphasizeElements.getOrCreate(vp);
            provider.hideElements(ecResult,vp);
          }
        }
      }
    }
  }

  public async showAll() {
    console.log( IModelApp.viewManager);
    const vp = IModelApp.viewManager.getFirstOpenView();
    if (!vp) { return};
    const authClient = IModelApp.authorizationClient as BrowserAuthorizationClient
    const iModelId = vp.iModel.iModelId
    if (authClient && iModelId) {
      const mappings = await BentleyAPIFunctions.getMappings(authClient,iModelId);
      if (!mappings) {return};
      vp.iModel.selectionSet.emptyAll();
      for (const es of mappings.values()) {
        console.log(es.id, es.mappingName);
        if (es.mappingName === "CarbonReporting") {
          const groups = await BentleyAPIFunctions.getGroups(authClient,iModelId, es.id);
          for (const es of groups.values()) {
            console.log(es.id, es.groupName, es.groupSQL);
            const queryResult: string[] = await HideAllButtonProvider._executeQuery(vp.iModel, es.groupSQL);
            const ecResult = queryResult.map(x => x[0]);
            const provider = EmphasizeElements.getOrCreate(vp);            
            provider.emphasizeElements(ecResult,vp);
          }
        }
      }
    }
  }

  private static _executeQuery = async (imodel: IModelConnection, query: string) => {
    const rows = [];
    for await (const row of imodel.query(query))
      rows.push(row);

    return rows;
  };
/*    vp.iModel.selectionSet.add(elementSets.values)
      console.log(vp.alwaysDrawn);
      const vpSelectionSet = new SelectionSet(vp.iModel);
      if (vp.alwaysDrawn)
        vpSelectionSet.add(vp.alwaysDrawn);
        vp.invalidateScene();
    }
    displayInfoToast( "All elements selected.");
    */
  }
