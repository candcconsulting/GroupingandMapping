/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";

export class iTwinAPI {
  public static async getImodelsMinimalFromProject(
    authClient: BrowserAuthorizationClient,
    projectGuid: string
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(
      `https://api.bentley.com/imodels/?iTwinId=${projectGuid}`,
      {
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
          Prefer: "return=minimal",
        },
      }
    );
    const data = await response;
    const json = await data.json();
    return json;
  }

  public static async getImodelData(
    authClient: BrowserAuthorizationClient,
    iModelId: string
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(
      `https://api.bentley.com/imodels/${iModelId}`,
      {
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
          Prefer: "return=minimal",
        },
      }
    );
    const data = await response;
    const json = await data.json();
    return json;
  }

  public static async getRecentProjects(
    authClient: BrowserAuthorizationClient
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch("https://api.bentley.com/iTwins/recents", {
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
    });
    const data = await response;
    const json = await data.json();
    const info: {
      id: string;
      displayName: string;
      projectNumber: string;
    }[] = [];
    for (let i = 0; i < json.projects.length; i++) {
      info.push({
        id: json.projects[i].id,
        displayName: json.projects[i].displayName,
        projectNumber: json.projects[i].projectNumber,
      });
    }
    return info;
  }

  public static async getProjectData(
    authClient: BrowserAuthorizationClient,
    projectId: string
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(
      "https://api.bentley.com/iTwins/" + projectId,
      {
        //https://api.bentley.com/projects/favorites?top=1000
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
          // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
        },
      }
    );
    const data = await response;
    const json = await data.json();
    const info = {
      id: projectId,
      displayName: json.project.displayName,
      projectNumber: json.project.projectNumber,
    };
    return info;
  }

  public static async getMappings(
    authClient: BrowserAuthorizationClient,
    iModelId: string
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(
      "https://api.bentley.com/insights/reporting/datasources/imodels/" +
        iModelId +
        "/mappings",
      {
        //https://api.bentley.com/projects/favorites?top=1000
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
          // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
        },
      }
    );
    const data = await response;
    const json = await data.json();
    const info: { id: string; mappingName: string }[] = [];
    for (let i = 0; i < json.mappings.length; i++) {
      info.push({
        id: json.mappings[i].id,
        mappingName: json.mappings[i].mappingName,
      });
    }

    return info;
  }
  public static async getGroups(
    authClient: BrowserAuthorizationClient,
    iModelId: string,
    mappingId: string
  ) {
    const accessToken = await authClient.getAccessToken();
    const response = await fetch(
      "https://api.bentley.com/insights/reporting/datasources/imodels/" +
        iModelId +
        "/mappings/" +
        mappingId +
        "/groups",
      {
        //https://api.bentley.com/projects/favorites?top=1000
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
          // 'Access-Control-Allow-Origin' : 'http://localhost:3000',
        },
      }
    );
    const data = await response;
    const json = await data.json();
    const info: {
      id: string;
      groupName: string;
      groupSQL: string;
      material: string;
    }[] = [];
    for (let i = 0; i < json.groups.length; i++) {
      info.push({
        id: json.groups[i].id,
        groupName: json.groups[i].groupName,
        groupSQL: json.groups[i].query,
        material: "",
      });
    }

    return info;
  }
}
