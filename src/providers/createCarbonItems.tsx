import {
  AbstractWidgetProps,
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
} from '@itwin/appui-abstract';

import react, {useEffect, useState  } from 'react';

import { Button, ProgressRadial } from '@itwin/itwinui-react';
import {displayMappingValues } from '../apps/mapping'
import { IModelApp, IModelConnection } from '@itwin/core-frontend';
import { BrowserAuthorizationClient } from '@itwin/browser-authorization';
import { BentleyAPIFunctions } from '../helper/BentleyAPIFunctions';

interface IGroup {
  groupName : string,
  description : string,
  query : string
}
const _executeQuery = async (imodel: IModelConnection, query: string) => {
  const rows = [];
  for await (const row of imodel.query(query))
    rows.push(row);

  return rows;
};


function deleteGroupHandler(): void {
  // todo              
  console.log("Deleting ...")            
}

type progressStatus = 'positive' | 'negative' | undefined


const CarbonWidget = () => {
  const [createProgressRadial, setCreateProgressRadial] = useState(0);
  const [deleteProgressRadial, setDeleteProgressRadial] = useState(0);
  const [listProgressRadial, setListProgressRadial] = useState(0);
  const [listProgressStatus, setListProgressStatus] = useState(undefined as progressStatus);
  const [createProgressStatus, setCreateProgressStatus] = useState(undefined as progressStatus);

  async function listCategoriesHandler(): Promise<void> {
    // todo  
    console.log("Listing ...");            
    const sql =  "select count(ge.ecinstanceid) as Elements, ca.codevalue as category, pp.codevalue as model from bis.geometricelement3d ge join bis.category ca on ge.category.id = ca.ecinstanceid join bis.physicalpartition pp on ge.model.id = pp.ecinstanceid group by ca.codevalue, pp.codevalue"
    const userdata = require("../data/categories.json");
    const vp = IModelApp.viewManager.getFirstOpenView();
    if (!vp) { return};
    const authClient = IModelApp.authorizationClient as BrowserAuthorizationClient
    const iModelId = vp.iModel
    if (authClient && iModelId) {
      const categories = await _executeQuery(vp.iModel, sql)
      let aExport: any[] = [];
      console.log(categories)
      var i = 0;            
      setListProgressRadial(i);
      for (const ca of categories.values()) {
        if (userdata.categories[ca[1]]) {
          console.log(userdata.categories[ca[1]].name, "=", userdata.categories[ca[1]].status, userdata.categories[ca[1]].process)
          if ("TRUE" === userdata.categories[ca[1]].process.toUpperCase() && "INVALID" === userdata.categories[ca[1]].status.toUpperCase()) {
            aExport.push(ca);
          }
        } else {
          console.log(ca[1] + " not found in category list")
        }
        i = i + 1;

        setListProgressRadial(i / categories.length * 100);
      }
      let status = 'positive' as progressStatus
      setListProgressStatus(status)
      const csvContent = "data:text/csv;charset=utf-8," + aExport.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "my_data.csv");
      document.body.appendChild(link); // Required for FF
  
      link.click();
    }  
  
  }
  
  async function createGroupHandler(): Promise<void> {
    // todo  
    console.log("Creating ..."); 
    const sql =  "select distinct ca.codevalue as name from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id"
    const userdata = require("../data/categories.json");
    const properties = require("../data/properties.json")
    const vp = IModelApp.viewManager.getFirstOpenView();
    if (!vp) { return};
    const authClient = IModelApp.authorizationClient as BrowserAuthorizationClient
    const iModelId = vp.iModel.iModelId
    if (authClient && iModelId) {
      const categories = await _executeQuery(vp.iModel, sql)
      console.log(categories)
      setCreateProgressRadial(0);
      var i = 0;
      for (const ca of categories.values()) {
        console.log(userdata.categories[ca[0]].name, "=", userdata.categories[ca[0]].status, userdata.categories[ca[0]].process)
        if ("TRUE" === userdata.categories[ca[0]].process.toUpperCase()) {
          // progressRadial = progressRadial + 1;
          /* 
          For each category
            create a group with SQL = select ecinstanceid from bis.geometricelement where ca.codevalue = ca[0]
            for each group
              create all properties
              Uniclass = search for uniclass for all classes in geometric elements
              Category
              Model
              Material
              Volume
              Area
              Length                
          */
         var body : IGroup = {
          groupName:  ca[0].replaceAll("-", "").replaceAll("$", "").replaceAll(" ", ""),
          description: ca[0].replaceAll("-", "").replaceAll("$", ""),
          query : "select ge.ecinstanceid from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id where ca.codevalue = '" + ca[0] + "'"
         }
         const mappingId = "df213bbb-d784-4473-a2b2-20a09bb96342"
         const aGroup = await BentleyAPIFunctions.createGroup(authClient,iModelId,mappingId, body);
         //console.log(aGroup);
         // aGroup.group.id will have the group Id
         const groupId = aGroup.group.id
         for (const key in properties.properties) {
           const aProperty = properties.properties[key];
           console.log(aProperty)
           switch (aProperty.type) {
             case "CalculatedProperty"  : {
               const newProperty = await BentleyAPIFunctions.createProperty(authClient, iModelId, mappingId, groupId, "calculatedProperties", aProperty.payload);
             }
             break;
             case "fixed"  : {
              const newProperty = await BentleyAPIFunctions.createProperty(authClient, iModelId, mappingId, groupId, "properties", aProperty.payload)
              break;
            }
            case  "property" : {
              // search for the properties that have the class with the description in description
              const query = "select ";
              break;
            }
            default : 
              console.log ("Property Type not recognised");
              console.log (aProperty)
         }
         i = i + 1 ;
         setListProgressRadial(i / categories.length * 100);
         }
        }
      }
    }
    let status = 'positive' as progressStatus
    setCreateProgressStatus(status)

  }
  

  return (
    <span>
    <span>Carbon Groups</span><br></br>
    <br></br>
    <div className="flexbox-container">
    <ProgressRadial value={listProgressRadial} status = {listProgressStatus}></ProgressRadial>
    <Button onClick = {() => listCategoriesHandler()}>List Categories</Button>                
    </div>
    <br></br>
    <div className="flexbox-container">
    <ProgressRadial value={createProgressRadial} status={createProgressStatus}></ProgressRadial>
    <Button onClick = {() => createGroupHandler()}>Create Groupings</Button>            
    </div>
    <br></br>
    <div className="flexbox-container">
    <ProgressRadial value={deleteProgressRadial}></ProgressRadial>
    <Button onClick = {() => deleteGroupHandler()}>Delete Groupings</Button>            
    </div>
    <br></br>              
  </span>
  )
}


export class createCarbonUIProvider implements UiItemsProvider {
  public readonly id = 'createCarbonUIProviderId';


  public provideWidgets(
    stageId: string,
    stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection,
    ): ReadonlyArray<AbstractWidgetProps> {
  
    const widgets: AbstractWidgetProps[] = [];

    if (
      location === StagePanelLocation.Right &&
      section === StagePanelSection.Start
    ) {
/*      const itwinui_react_1 = require("@itwin/itwinui-react");
      const react_1 = react;
      const mappings = displayMappingValues();
*/

      const widget: AbstractWidgetProps = {
        id: 'CarbonUI',
        label: 'HS2 Carbon',
        getWidgetContent: () => <CarbonWidget />
        
        }
      ;
      widgets.push(widget);
    }

    return widgets;
  }
}
export {}
