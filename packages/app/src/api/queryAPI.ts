/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { QueryRowFormat } from "@itwin/core-common";
import { CheckpointConnection, IModelConnection } from "@itwin/core-frontend";

const _executeQuery = async (imodel: IModelConnection, query: string) => {
  const rows = [];
  try {
    for await (const row of imodel.query(query, undefined, {
      rowFormat: QueryRowFormat.UseJsPropertyNames,
    })) {
      rows.push(row);
    }

    return rows;
  } catch (e) {
    const _e = e as Error;
    console.log(_e.message + " running ecSQL " + query);
  }
  return rows;
};

export interface classCount {
  class: string;
  category: string;
  count: number;
}

export interface propertyList {
  name: string;
  displayLabel: string;
  className: string;
}
export interface propertyCount {
  name: string;
  displayLabel: string;
  classType: string;
  count: number;
  className: string;
}
export interface propertyCategoryCount {
  category: string;
  classType: string;
  count: number;
}
export interface graphicalClass {
  classId: any;
  className: string;
}

export interface IclassIndex {
  name: string;
  instanceCount: number;
  trustIndex: number;
}

export interface IInstanceCount {
  property: string;
  count: number;
}

export interface IVolume {
  id: string;
  netVolume: number;
  material: string;
  userlabel: string;
  gwp: number;
}

export class sqlAPI {
  public static getClassIndex = async (
    iModel: CheckpointConnection,
    className: string,
    propertyList: propertyList[]
  ) => {
    let sql = "";
    if (propertyList.length === 0) {
      sql =
        "select '" +
        className +
        "' as class, count(ecInstanceId) as Instances, 0.0 as TrustIndex from " +
        className;
    } else {
      const propertySearch = propertyList.map(function(property) {
        return "count(nullIF(" + property.name + ",'')) + ";
      });
      let searchString = propertySearch.join("");
      searchString = searchString.slice(0, -2);

      sql =
        "select '" +
        className +
        "' as class, count(ecInstanceId) as Instances, (" +
        searchString +
        ") / (" +
        propertyList.length +
        ".00 * count(ecInstanceId)) as TrustIndex from " +
        className;
    }

    const rows = await _executeQuery(iModel, sql);
    const classIndex: IclassIndex = {
      name: rows[0].class,
      instanceCount: rows[0].instances,
      trustIndex: Math.round(rows[0].trustIndex * 100) / 100,
    };
    return classIndex;
  };

  public static getClassCount = async (iModel: CheckpointConnection) => {
    const sql =
      "select EC_CLASSNAME(ge.ecclassid, 's.c') as className, count(ge.ecinstanceid) as rowCount, ca.codeValue as Category from bis.GeometricElement3d ge join bis.category ca on ge.category.id = ca.ecinstanceid where EC_CLASSNAME(ge.ecclassid, 's.c') not like 'biscore%' group by ge.ecclassid, ca.codevalue";
    const rows = await _executeQuery(iModel, sql);
    const returnCount: classCount[] = [];
    for await (const row of rows) {
      const aClass: classCount = {
        class: row.className,
        category: row.category,
        count: row.rowCount,
      };
      returnCount.push(aClass);
    }
    return returnCount;
  };

  public static getPropertyCategoryCount = async (
    iModel: CheckpointConnection,
    searchProperty: string
  ) => {
    let sql = `select distinct ca.codevalue as CategoryName, 'Element' as classType, count(ge.ecinstanceid) as total from meta.ecpropertydef pr join bis.geometricelement3d ge on ge.ecclassid = pr.class.id join bis.category ca on ge.category.id = ca.ecinstanceid   where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and class.id IS (Bis.Element) group by ca.codevalue`;
    let rows = await _executeQuery(iModel, sql);
    const returnList: propertyCategoryCount[] = [];
    for await (const row of rows) {
      const aProperty: propertyCategoryCount = {
        category: row.categoryName,
        classType: row.classType,
        count: row.total,
      };
      returnList.push(aProperty);
    }
    sql = `select distinct ca.codevalue as CategoryName, 'Aspect' as classType, count(ge.ecinstanceid) as total from meta.ecpropertydef pr join bis.elementmultiaspect ma on pr.class.id = ma.ecclassid join bis.geometricelement3d ge on ge.ecinstanceid = ma.element.id  join bis.category ca on ge.category.id = ca.ecinstanceid where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and class.id IS (Bis.ElementAspect) group by ca.codevalue`;
    rows = await _executeQuery(iModel, sql);
    for await (const row of rows) {
      const aProperty: propertyCategoryCount = {
        category: row.categoryName,
        classType: row.classType,
        count: row.total,
      };
      returnList.push(aProperty);
    }
    return returnList;
  };

  public static getCountforGroup = async (
    iModel: CheckpointConnection,
    groupSQL: string
  ) => {
    const sql = `select count(*) from (${groupSQL})`;
    const rows = await _executeQuery(iModel, sql);
    return rows[0];
  };

  public static getVolumeforGroupWidget = async (
    iModel: IModelConnection,
    groupSQL: string,
    material: string,
    carbonFactor: number
  ) => {
    const sql = `select element.Id as id,  netVolume, ge.userlabel as userlabel from qto.VolumeAspect as va join bis.geometricelement3d ge  on ge.ecinstanceid = va.element.id where element.id in (${groupSQL}) `;
    const rows = await _executeQuery(iModel, sql);
    if (!carbonFactor) {
      carbonFactor = 0;
    }
    const returnList: IVolume[] = [];
    for await (const row of rows) {
      const aVolume: IVolume = {
        id: row.id,
        netVolume: Math.round(row.netVolume * 100) / 100,
        material: material,
        userlabel: row.userlabel,
        gwp: Math.round(row.netVolume * carbonFactor * 100) / 100,
      };
      returnList.push(aVolume);
    }
    return returnList;
  };

  public static getVolumeforGroup = async (
    iModel: CheckpointConnection,
    groupSQL: string,
    material: string,
    carbonFactor: number
  ) => {
    const sql = `select element.Id as id,  netVolume, ge.userlabel as userlabel from qto.VolumeAspect as va join bis.geometricelement3d ge  on ge.ecinstanceid = va.element.id where element.id in (${groupSQL}) `;
    const rows = await _executeQuery(iModel, sql);
    if (!carbonFactor) {
      carbonFactor = 0;
    }
    const returnList: IVolume[] = [];
    for await (const row of rows) {
      const aVolume: IVolume = {
        id: row.id,
        netVolume: Math.round(row.netVolume * 100) / 100,
        material: material,
        userlabel: row.userlabel,
        gwp: Math.round(row.netVolume * carbonFactor * 100) / 100,
      };
      returnList.push(aVolume);
    }
    return returnList;
  };

  public static getPropertyInstances = async (
    iModel: CheckpointConnection,
    searchProperty: string,
    searchClass: string
  ) => {
    const sql = `select distinct ${searchProperty} as property, count(ecinstanceid) as total from ${searchClass} group by ${searchProperty}`;
    const rows = await _executeQuery(iModel, sql);
    const returnList: IInstanceCount[] = [];
    for await (const row of rows) {
      const aProperty: IInstanceCount = {
        property: row.property,
        count: row.total,
      };
      returnList.push(aProperty);
    }

    return returnList;
  };

  public static getGraphicalClasses = async (iModel: CheckpointConnection) => {
    // find all classes that are defined in bis.geometricelement3d (ie used)
    const sql =
      "select distinct ecclassid, ec_classname(ecclassid) as className from bis.geometricelement3d where ec_classname(ecclassid) not like '%biscore%'";
    const rows = await _executeQuery(iModel, sql);
    const returnList: graphicalClass[] = [];
    for await (const row of rows) {
      const aGraphicalClass: graphicalClass = {
        classId: row.ecclassid,
        className: row.className,
      };
      returnList.push(aGraphicalClass);
    }
    return returnList;
  };

  public static getPropertyCount = async (
    iModel: CheckpointConnection,
    searchProperty: string
  ) => {
    let sql = `select distinct pr.name as name, pr.displaylabel as displaylabel, 'Element' as classType,count(ge.ecinstanceid) as total, ec_ClassName(pr.class.id, 's.c') as className  from meta.ecpropertydef pr join bis.geometricelement3d ge on ge.ecclassid = pr.class.id  where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and class.id IS (Bis.Element) group by pr.name`;
    let rows = await _executeQuery(iModel, sql);
    const returnList: propertyCount[] = [];
    for await (const row of rows) {
      const aProperty: propertyCount = {
        name: row.name,
        displayLabel: row.displaylabel,
        classType: row.classType,
        count: row.total,
        className: row.className,
      };
      returnList.push(aProperty);
    }
    sql = `select distinct pr.name as name, pr.displaylabel as displaylabel, 'Aspect' as classType, count(ge.ecinstanceid) as total, ec_ClassName(pr.class.id, 's.c') as className from meta.ecpropertydef pr join bis.elementmultiaspect ma on pr.class.id = ma.ecclassid join bis.geometricelement3d ge on ge.ecinstanceid = ma.element.id  where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and class.id IS (Bis.ElementAspect) group by pr.name`;
    rows = await _executeQuery(iModel, sql);
    for await (const row of rows) {
      const aProperty: propertyCount = {
        name: row.name,
        displayLabel: row.displaylabel,
        classType: row.classType,
        count: row.total,
        className: row.className,
      };
      returnList.push(aProperty);
    }
    return returnList;
  };

  public static getPropertyList = async (
    iModel: CheckpointConnection,
    searchProperty: string
  ) => {
    const sql = `select distinct pr.name as name, pr.displaylabel as displaylabel from meta.ecpropertydef pr where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and (class.id IS (Bis.Element) OR class.id IS (Bis.ElementAspect))`;
    const rows = await _executeQuery(iModel, sql);
    const returnList: propertyList[] = [];
    for await (const row of rows) {
      const aProperty: propertyList = {
        name: row.name,
        displayLabel: row.displaylabel,
        className: "Grouped",
      };
      returnList.push(aProperty);
    }
    return returnList;
  };

  public static getPropertyListClass = async (
    iModel: CheckpointConnection,
    searchProperty: string
  ) => {
    const sql = `select distinct pr.name as name, pr.displaylabel as displaylabel, ec_classname(class.id, 's.c') as className from meta.ecpropertydef pr where (pr.name like '%${searchProperty}%' or pr.displayLabel like '%${searchProperty}%') and (class.id IS (Bis.Element) OR class.id IS (Bis.ElementAspect))`;
    const rows = await _executeQuery(iModel, sql);
    const returnList: propertyList[] = [];
    for await (const row of rows) {
      const aProperty: propertyList = {
        name: row.name,
        displayLabel: row.displaylabel,
        className: row.className,
      };
      returnList.push(aProperty);
    }
    return returnList;
  };

  public static getClassPropertyList = async (
    iModel: CheckpointConnection,
    searchProperty: string,
    searchClass: string
  ) => {
    if (!searchClass) {
      searchClass = "%";
    }
    const sql = `select distinct pr.name as name, pr.displaylabel as displaylabel from meta.ecpropertydef pr where ec_ClassName(class.id, 's.c') = '${searchClass}'`;
    const rows = await _executeQuery(iModel, sql);
    const returnList: propertyList[] = [];
    for await (const row of rows) {
      const aProperty: propertyList = {
        name: row.name,
        displayLabel: row.displaylabel,
        className: searchClass,
      };
      returnList.push(aProperty);
    }
    return returnList;
  };
}