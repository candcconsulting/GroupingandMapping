/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { CompressedId64Set } from "@bentley/bentleyjs-core";
import { QueryRowFormat } from "@itwin/core-common";
import { CheckpointConnection, IModelConnection } from "@itwin/core-frontend";
import { getSettings } from "../config";
import { gwpCalculation } from "../routers/CarbonRouter/components/Carbon";
import { displayWarningToast } from "./helperfunctions/messages";
import { IMaterial } from "./mongoAppApi";

const singleReturnSQL = (sql: string) => {
  const fromLoc = sql.toLowerCase().indexOf("from");
  const commaLoc = sql.toLowerCase().indexOf(",");
  let returnSQL = sql;
  if (commaLoc < fromLoc && commaLoc >= 0) {
    returnSQL = sql.substring(0, commaLoc) + " " + sql.substring(fromLoc);
  }

  return returnSQL;
};
export const lookupUnitType = (unit : string)  => {
  let unitType = ""
  switch (unit) {
    case "m3": {
      unitType = "volume";
      break;
    }
    case "m2": {
      unitType = "area";
      break;
    }
    case "m": {
      unitType = "length";
      break;
    }
    case "ea": {
      unitType = "unit";
      break;
    }
    case "kg": {
      unitType = "weight";
      break;
    }
    default: {
      unitType = "volume";
      console.log(`Unrecognised unit ${unit} using volume`);
      break;
    }
  }
  return unitType;
}
export const lookupUnit = (unitType : string)  => {
  let unit = ""
  switch (unitType) {
    case "volume": {
      unit = "m3";
      break;
    }
    case "area": {
      unit = "m2";
      break;
    }
    case "length": {
      unit = "m";
      break;
    }
    case "unit": {
      unit = "ea";
      break;
    }
    default: {
      unit = "m3";
      console.log(`Unrecognised unitType ${unitType} using volume`);
      break;
    }
  }
  return unit;
}
const getOperationType = (unitType: string) => {
  let operation = 2;
  switch (unitType) {
    case "length": {
      operation = 0;
      break;
    }
    case "area": {
      operation = 1;
      break;
    }
    case "volume": {
      operation = 2;
      break;
    }
  }
  return operation;
};

const _executeQuery = async (imodel: IModelConnection, query: string) => {
  const rows = [];
  try {
    const result = imodel.query(query, undefined, {
      rowFormat: QueryRowFormat.UseJsPropertyNames,
    })
    if (result) {
      for await (const row of result) {
        rows.push(row);
      }
    }
    else 
      console.log("no records returned")
    return rows;
  } catch (e) {
    const _e = e as Error;
    console.log(_e.message + " running ecSQL " + query);
  }
  return rows;
};

const indexMassProperties = (listMass: any, operation : number)  => {
  const returnValue: { [id: string]: {quantity : number, status : number}; } = {}; ;

  for (const mass of listMass) {
    switch (operation) {
      case 2 : returnValue[mass.candidate] = {"quantity" : mass.volume, "status" : mass.status}; break;
      case 1 : returnValue[mass.candidate] = {"quantity" : mass.area, "status" : mass.status}; break;
      case 0 : returnValue[mass.candidate] = {"quantity" : mass.length, "status" : mass.status}; break;
    }
  }
  return returnValue
}


const processRows = async (rows : any, material: any, iModel: IModelConnection, groupName : string) => {
  const returnList: IVolume[] = [];
  const errorList: IVolume[] = [];
  const operation = getOperationType(material.unitType);

  const ids = rows.filter((aRow: any) => aRow.qtoQuantity <= 0).map((aRow : any) => aRow.id);    
  let massProperties = undefined;
  let indexedMassProperties = undefined;
  if (ids.length > 0)
      { 
        // it would seem that not every element is returned when we pass them in
    massProperties = await iModel.getMassPropertiesPerCandidate({
      candidates: CompressedId64Set.compressIds(ids),
      operations: [operation],
    });
    indexedMassProperties = indexMassProperties(massProperties, operation)
  }
  let counter = 0;
  for await (const row of rows) {
    let unit = "";
    let quantity = 0;      
    const mpQuantity =  (indexedMassProperties?.[row.id] && (indexedMassProperties[row.id].status === 0)) ? indexedMassProperties[row.id].quantity : undefined
    switch (material.unitType) {
      case "volume": {
        unit = "m3";
        quantity = mpQuantity ?? row.qtoQuantity ?? 0;
        break;
      }
      case "area": {
        unit = "m2";
        quantity = mpQuantity ?? row.qtoQuantity ?? 0;
        break;
      }
      case "length": {
        unit = "m";
        quantity = mpQuantity ?? row.qtoQuantity ?? 0;
        break;
      }
      case "unit": {
        unit = "ea";
        quantity = rows.length ?? 0;
        break;
      }
      case "weight": {
        unit = "kg";
        quantity = mpQuantity ?? row.qtoQuantity ?? 0;
        break;
      }
      default: {
        unit = "m3";
        quantity = mpQuantity ?? row.qtoQuantity ?? 0;
        console.log(`Unrecognised unitType ${material.unitType} using volume`);
        break;
      }
    }
    const gwpUnit = {[material.unitType] : quantity}

    const aVolume: IVolume = {
      id: row.id,
      quantity: +quantity.toFixed(getSettings.decimalAccuracy),
      material: material.material,
      userlabel: row.userlabel,
      unit: unit,
      gwp: gwpCalculation(material, gwpUnit),
      groupName: groupName,
      category: row.category ?? ""
    };
    if (aVolume.quantity <= 0) {
      aVolume.material = "Invalid " + material.material;
      aVolume.gwp = 0;
      errorList.push(aVolume);
    } else {
      returnList.push(aVolume);
    }
    counter = counter + 1;
  }
  //console.timeLog(groupName)

  return { gwpList: returnList, errorList: errorList };

}

export const sleep = (ms : number) => new Promise<void>((resolve) => {
  setTimeout(() => resolve(), ms);
});

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
  quantity: number;
  material: string;
  userlabel: string;
  gwp: number;
  unit: string;
  max?: number;
  min?: number;
  category?: string;
  groupName?: string;
}

export interface IReturnList {
  gwpList : IVolume[];
  errorList : IVolume[];
}

export class sqlAPI {
  private static  _checkVolumeAspect: any = ""
  private static  _checkAreaAspect: any = ""
  private static  _checkLengthAspect: any = ""

  private static _runCheckVolumeAspect = async (iModel : IModelConnection)  => {
    if (sqlAPI._checkVolumeAspect === "") {
      const sql = "select name from meta.ecClassDef where name like 'VolumeAspect'"
      const rows = await _executeQuery(iModel, sql)
      if (rows.length > 0) {
        sqlAPI._checkVolumeAspect = true
        return true
      } else {
        sqlAPI._checkVolumeAspect = false 
        return false
      }
    }
    return sqlAPI._checkVolumeAspect;
  }
  private static _runCheckAreaAspect = async (iModel : IModelConnection)  => {
    if (sqlAPI._checkAreaAspect === "") {
      const sql = "select name from meta.ecClassDef where name like 'SurfaceAreaAspect'"
      const rows = await _executeQuery(iModel, sql)
      if (rows.length > 0) {
        sqlAPI._checkAreaAspect = true
        return true
      } else {
        sqlAPI._checkAreaAspect = false 
        return false
      }
    }
    return sqlAPI._checkAreaAspect;
  }
  private static _runCheckLengthAspect = async (iModel : IModelConnection)  => {
    if (sqlAPI._checkLengthAspect === "") {
      const sql = "select name from meta.ecClassDef where name like 'DimensionsAspect'"
      const rows = await _executeQuery(iModel, sql)
      if (rows.length > 0) {
        sqlAPI._checkLengthAspect = true
        return true
      } else {
        sqlAPI._checkLengthAspect = false 
        return false
      }
    }
    return sqlAPI._checkLengthAspect;
  }

  private static _setQuantityAspect = async (material : any, iModel : IModelConnection) => {
    const operation = getOperationType(material.unitType);
    let aspectJoin = ""
    let aspectProperty = ""
    switch (operation) {
      case 0: {
        // length
        const lengthAspect = await sqlAPI._runCheckLengthAspect(iModel);
        if (lengthAspect) {
          // we should be able to use max ... but for some reason does not work ...
          // lengthAspectProperty = ", sum(max(qtod.Length, qtod.Height,qtod.Width, 0)) as qtoLength "
          // need to check with developers
          aspectProperty =
            ", coalesce(qtod.Length, qtod.Height,qtod.Width, 0) as qtoQuantity ";
          aspectJoin =
            " left join qto.DimensionsAspect qtod on ge.ecinstanceId = qtod.Element.id";
        } else {
          aspectProperty = ",0 as qtoQuantity ";
          displayWarningToast(
            "QTO.DimensionsAspect not available for calculations"
          );
        }
        break;
      }
      case 1: {
        //area
        const areaAspect = await sqlAPI._runCheckAreaAspect(iModel);
        if (areaAspect) {
          aspectProperty =
            ", coalesce(qtoa.netSurfaceArea, qtoa.GrossSurfaceArea, 0) as qtoQuantity ";
          aspectJoin =
            " left join qto.SurfaceAreaAspect qtoa on ge.ecinstanceId = qtoa.Element.id ";
        } else {
          aspectProperty = ",0 as qtoQuantity ";
          displayWarningToast(
            "QTO.SurfaceAreaAspect not available for calculations"
          );
        }
        break;
      }
      case 2: {
        // volume
        const volumeAspect = await sqlAPI._runCheckVolumeAspect(iModel);
        if (volumeAspect) {
          aspectProperty =
            ", coalesce(qtov.netVolume, qtov.GrossVolume, 0) as qtoQuantity ";
          aspectJoin =
            " left join qto.VolumeAspect qtov on ge.ecinstanceId = qtov.Element.id";
        } else {
          aspectProperty = ",0 as qtoQuantity ";
          displayWarningToast("QTO.VolumeAspect not available for calculations");
        }
      }
    }
    return {aspectJoin : aspectJoin, aspectProperty: aspectProperty}
  }
  


  public static getCategories = async (iModel: CheckpointConnection, filter : string) => {
    console.log(filter);
    const sql = `select distinct ca.codevalue as categoryName from bis.category ca join bis.geometricelement3d ge on ca.ecinstanceid = ge.category.id` // where coalesce(ca.userlabel, ca.codevalue) like '${filter}'`
    const rows = await _executeQuery(iModel, sql);
    return rows;

  }
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

  public static getUniclass = async (iModelConnection : IModelConnection, uniclassSystems : string, _updateProgress : any, min : number, max : number) => {
    const sql = `select distinct name, ec_classname(class.id, 's.c') as className from meta.ecpropertydef pd join bis.geometricelement3d ge on pd.class.id = ge.ecclassId  where name in (${uniclassSystems}) group by class.id`
    const classes = await _executeQuery(iModelConnection, sql)
    const returnInstances = []
    let counter = 1
    console.log("loading ", classes.length)
    for (const aClass of classes) {
      const classSQL = `select coalesce(${aClass.name}, '<null>') as uniclassSystem, ecInstanceid, userLabel from ${aClass.className}`
      const instances = await _executeQuery(iModelConnection, classSQL)
      returnInstances.push(...instances);
      counter = counter + 1
      _updateProgress(min + ((max - min) / classes.length * counter))
    }
    return returnInstances
    
  }
  public static getVolumeforGroupWidget = async (
    iModel: IModelConnection,
    groupSQL: string,
    material: IMaterial = {material : "unmapped", "carbonFactor" : 0, unit:"-", unitType: "unknown", uniqueId : "unmapped", density : 0, "description" : "", "ICECarbonFactor" : 0},
    groupName : string
  ) => {
    // console.time(groupName)
    const newSQL = singleReturnSQL(groupSQL);
    // this needs upgrading to get the quantity based upon the material
    const {aspectJoin, aspectProperty} = await sqlAPI._setQuantityAspect(material, iModel)
    const sql = `select ge.ecInstanceId as id, ge.userlabel as userlabel ${aspectProperty} from bis.geometricelement3d ge ${aspectJoin} where ge.ecinstanceid in (${newSQL})`;
    const rows = await _executeQuery(iModel, sql);
    const gwpInstances = await processRows(rows, material, iModel, groupName)

    return gwpInstances;
  };

  public static getVolumeforGroup = async (
    iModel: CheckpointConnection,
    groupSQL: string,
    material: IMaterial | undefined = {material : "unmapped", "carbonFactor" : 0, unit:"-", unitType: "unknown", uniqueId : "unmapped", density : 0, "description" : "", "ICECarbonFactor" : 0},
    groupName : string
  ) => {
    /* Update to enable unitType.  qto is not sufficiently populated so use calculateMassProperties which will return area / length / volume and Invalid Elements */
    const newSQL = singleReturnSQL(groupSQL);
    // this needs upgrading to get the quantity based upon the material    
    const {aspectJoin, aspectProperty} = await sqlAPI._setQuantityAspect(material, iModel)
    const sql = `select ge.ecInstanceId as id, ge.userlabel as userlabel ${aspectProperty} from bis.geometricelement3d ge ${aspectJoin} where ge.ecinstanceid in (${newSQL})`;
    const rows = await _executeQuery(iModel, sql);
    const gwpInstances= await processRows(rows, material, iModel, groupName)
    return gwpInstances;
  };

  public static getVolumeForGroupByCategory = async (
    iModel: CheckpointConnection,
    groupSQL: string,
    material: IMaterial | undefined = {material : "unmapped", "carbonFactor" : 0, unit:"-", unitType: "unknown", uniqueId : "unmapped", density : 0, "description" : "", "ICECarbonFactor" : 0},
    groupName : string
  ) => {
    /* Update to enable unitType.  qto is not sufficiently populated so use calculateMassProperties which will return area / length / volume and Invalid Elements */
    const newSQL = singleReturnSQL(groupSQL);
    const {aspectJoin, aspectProperty} = await sqlAPI._setQuantityAspect(material, iModel)
    const sql = `select ge.ecInstanceId as id, ge.userlabel as userlabel, coalesce(ca.userlabel, ca.codevalue) as category ${aspectProperty} from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id ${aspectJoin} where ge.ecinstanceid in (${newSQL})`;
    const rows = await _executeQuery(iModel, sql);
    const gwpInstances= await processRows(rows, material, iModel, groupName)
    return gwpInstances;
  };

  public static getVolumeForCategory = async (
    iModel: CheckpointConnection,
  ) => {
    /* Update to enable unitType.  qto is not sufficiently populated so use calculateMassProperties which will return area / length / volume and Invalid Elements */
    // multiple calls to getMassPropertiesPerCandidate is not stable so only use this when the category is mapped
    const volumeAspect = await sqlAPI._runCheckVolumeAspect(iModel)
    let volumeAspectJoin = ""
    let volumeAspectProperty = ""
    if (volumeAspect) {
      volumeAspectProperty = ", sum(coalesce(qtov.netVolume, qtov.GrossVolume, 0)) as qtoVolume "
      volumeAspectJoin = " left join qto.VolumeAspect qtov on qtov.Element.id = ge.ecinstanceId "
    } else {
      volumeAspectProperty = ",0 as qtoVolume "
      displayWarningToast("QTO.VolumeAspect not available for calculations")
    }
    const areaAspect = await sqlAPI._runCheckAreaAspect(iModel)
    let areaAspectJoin = ""
    let areaAspectProperty = ""
    if (areaAspect) {
      areaAspectProperty = ", sum(coalesce(qtoa.netSurfaceArea, qtoa.GrossSurfaceArea, 0)) as qtoArea "
      areaAspectJoin = " left join qto.SurfaceAreaAspect qtoa on qtoa.Element.id = ge.ecinstanceId "
    } else {
      areaAspectProperty = ",0 as qtoArea "
      displayWarningToast("QTO.SurfaceAreaAspect not available for calculations")
    }
    const lengthAspect = await sqlAPI._runCheckLengthAspect(iModel)
    let lengthAspectJoin = ""
    let lengthAspectProperty = ""
    if (lengthAspect) {
      // we should be able to use max ... but for some reason does not work ...
      // lengthAspectProperty = ", sum(max(qtod.Length, qtod.Height,qtod.Width, 0)) as qtoLength "
      // need to check with developers
      lengthAspectProperty = ", sum(coalesce(qtod.Length, qtod.Height,qtod.Width, 0)) as qtoLength "
      lengthAspectJoin = " left join qto.DimensionsAspect qtod on qtod.Element.id = ge.ecinstanceId "
    } else {
      lengthAspectProperty = ",0 as qtoLength "
      displayWarningToast("QTO.DimensionsAspect not available for calculations")
    }

    const sql = `select ge.ecclassid, count(ge.ecInstanceId) as elementCount, coalesce(ca.userlabel, ca.codevalue) as category, sum(iModel_bbox_areaxy(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeArea, sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeVolume ${lengthAspectProperty} ${areaAspectProperty} ${volumeAspectProperty} from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id ${lengthAspectJoin} ${areaAspectJoin} ${volumeAspectJoin} group by coalesce(ca.userlabel, ca.codevalue)`;
    const rows = await _executeQuery(iModel, sql);
    return (rows)
  }

  public static getVolumeForCategory_NotWorking = async (
    iModel: CheckpointConnection,
    category : string,
    material: string,
    carbonFactor: number,
    unitType: string,
    checkErrors = false
  ) => {
    /* Update to enable unitType.  qto is not sufficiently populated so use calculateMassProperties which will return area / length / volume and Invalid Elements */
    // multiple calls to getMassPropertiesPerCandidate is not stable so only use this when the category is mapped
    const volumeAspect = await sqlAPI._runCheckVolumeAspect(iModel)
    let volumeAspectJoin = ""
    let volumeAspectProperty = ""
    if (volumeAspect) {
      volumeAspectProperty = ", qto.netVolume as netVolume"
      volumeAspectJoin = " join qto.VolumeAspect qto on qto.Element.id = ge.ecinstanceId "
    }
    let sql = `select ge.ecInstanceId as id, ge.userlabel as userlabel, coalesce(ca.userlabel, ca.codevalue) as category, 0 as rangeVolume ${volumeAspectProperty} from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id ${volumeAspectJoin} where coalesce(ca.userlabel, ca.codevalue) = '${category}'`;
    if (material === "unmapped") {            
      sql = `select ge.ecInstanceId as id, ge.userlabel as userlabel, coalesce(ca.userlabel, ca.codevalue) as category, iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z )) as rangeVolume ${volumeAspectProperty} from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id ${volumeAspectJoin} where coalesce(ca.userlabel, ca.codevalue) = '${category}'`;
    }    
    const rows = await _executeQuery(iModel, sql);
    if (!carbonFactor) {
      carbonFactor = 0;
    }    
    let result : IReturnList = {gwpList: [], errorList: []}
    if (!rows)
      return result;
    const operation = getOperationType(unitType);
    const ids = rows.map((aRow) => aRow.id);
    let massProperties : any = {};    
    try {
      const allProperties = await iModel.elements.getProps(ids);
      console.log(`AllProperties : ${allProperties}`);
    }
    catch (error)
      {console.log (`Error getting allProperties ${error}`)}
    
    const getQuantities = () => {
      return iModel.getMassPropertiesPerCandidate({
        candidates: CompressedId64Set.compressIds(ids),
        operations: [operation],
      
      })
    }
    const retryWithDelay = (fn : any, retries = 1) => new Promise((resolve, reject) => {      
        console.log("Attempt ", retries)
        const returnValue = getQuantities();
        // now we have
        // array of mass Properties massProperties[1].area / .length / .volume / .status
        
        return returnValue
      .then(resolve)
      .catch(async (_reason) : Promise<any> => {
        if (retries <= 3) {
          console.log(`Sleeping for ${5000 * retries}`)
          return sleep(5000 * retries)
            .then(retryWithDelay.bind(null,fn, retries + 1))
            .then(resolve)
            .catch(reject)          
        } else return reject();

      })
    })
    if (material !== "unmapped")
      massProperties = await retryWithDelay(getQuantities, 1);
    else
      massProperties = [];
    result = await processRows(rows,material,iModel, "NotWorking" );
    return result;
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
