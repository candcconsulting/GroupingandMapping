
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";



export class BentleyAPIFunctions{

  public static async getImodelsMinimalFromProject(authClient: BrowserAuthorizationClient, projectGuid:string){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(`https://api.bentley.com/imodels/?projectId=${projectGuid}`, {
      mode: 'cors',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken,
          'Prefer': 'return=minimal',
        },
      })
    const data = await response;
    const json = await data.json();
    return json;
  }

  public static async getImodelData(authClient: BrowserAuthorizationClient, iModelId:string){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(`https://api.bentley.com/imodels/${iModelId}`, {
      mode: 'cors',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken,
          'Prefer': 'return=minimal',
        },        
      })
    const data = await response;
    const json = await data.json();
    return json;
  }

  public static async getRecentProjects(authClient : BrowserAuthorizationClient){
    const accessToken = await authClient.getAccessToken();
      const response = await fetch("https://api.bentley.com/projects/recents", {
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': accessToken,
              },
            })
        const data = await response;
        const json = await data.json();
        var info: { id: string; displayName: string; projectNumber: string; }[] = [];
        for (var i = 0; i < json.projects.length; i++)
        {
          info.push({id: json.projects[i].id, displayName: json.projects[i].displayName , projectNumber: json.projects[i].projectNumber });
        }
        return  info;
  }  

  public static async getProjectData(authClient : BrowserAuthorizationClient, projectId: string){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch("https://api.bentley.com/projects/" + projectId, { //https://api.bentley.com/projects/favorites?top=1000
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
            // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
            },
        })
    const data = await response;
    const json = await data.json();
    const info = ({id:projectId, displayName:json.project.displayName, projectNumber:json.project.projectNumber})
    return  info;
  }

  public static async getMappings(authClient : BrowserAuthorizationClient, iModelId: string){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch("https://api.bentley.com/insights/reporting/datasources/imodels/" + iModelId + "/mappings", { //https://api.bentley.com/projects/favorites?top=1000
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
            // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
            },
        })
    const data = await response;
    const json = await data.json();
    var info: { id: string; mappingName: string; }[] = [];
    for (var i = 0; i < json.mappings.length; i++)
    {
      info.push({id: json.mappings[i].id, mappingName: json.mappings[i].mappingName});
    }

    return  info;
  }
  public static async getGroups(authClient : BrowserAuthorizationClient, iModelId: string, mappingId : string){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch("https://api.bentley.com/insights/reporting/datasources/imodels/" + iModelId + "/mappings/" + mappingId + "/groups", { //https://api.bentley.com/projects/favorites?top=1000
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
            // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
            },
        })
    const data = await response;
    const json = await data.json();
    var info: { id: string; groupName: string; groupSQL: string }[] = [];
    for (var i = 0; i < json.groups.length; i++)
    {
      info.push({id: json.groups[i].id, groupName: json.groups[i].groupName, groupSQL: json.groups[i].query});
    }

    return  info;
  }
  public static async createGroup(authClient : BrowserAuthorizationClient, iModelId: string, mappingId : string, body : any){
    const accessToken = await authClient.getAccessToken();
    const response = await fetch("https://api.bentley.com/insights/reporting/datasources/imodels/" + iModelId + "/mappings/" + mappingId + "/groups", { //https://api.bentley.com/projects/favorites?top=1000
        method: "POST",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
            // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
            },
        body : JSON.stringify(body)
        })
    const data = await response;
    const json = await data.json();
    return  json;
  }

  public static async createProperty(authClient : BrowserAuthorizationClient, iModelId: string, mappingId : string, groupId : string, propertyType : string, body : any){
    const accessToken = await authClient.getAccessToken();
    const url = "https://api.bentley.com/insights/reporting/datasources/imodels/" + iModelId + "/mappings/" + mappingId + "/groups/" + groupId + "/" + propertyType
    const response = await fetch(url, { //https://api.bentley.com/projects/favorites?top=1000
        method: "POST",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
            // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
            },
        body : JSON.stringify(body)
        })
    const data = await response;
    const json = await data.json();
    return  json;
  }



}

