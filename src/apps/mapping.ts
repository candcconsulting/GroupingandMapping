import { UiFramework } from "@itwin/appui-react";


export interface attributeList {
    property: string;
    value : string;
}

export async function displayMappingValues() : Promise <string[]> {    
    const reportingClient_1 = require("@itwin/grouping-mapping-widget/lib/cjs/api/reportingClient")
    let attributeList = [];
    // here we need step through the mappings for the iModel
    const iModelId = UiFramework.getActiveIModelId();
    
    const mappings = await reportingClient_1.reportingClientApi.getMappings(iModelId);


    for await (const aMapping of mappings) {            
        // console.log (aResult.jsonProperties)
        // console.log(aMapping)
        const groups = await reportingClient_1.reportingClientApi.getGroups(iModelId, aMapping.id);
        console.log(groups)
        

    }
    return mappings;
}

