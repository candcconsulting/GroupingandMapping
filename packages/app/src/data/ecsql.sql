"SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007"
"select * from qto.VolumeAspect where element.id in (SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007)"

"select count(*) from (SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007)"

"select ge.ecinstanceid, ge.userlabel, ca.codevalue from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id where ca.codevalue = 'CV-CV-Concrete_Column-G-P' order by ge.ecinstanceid "

"select ec_classname(ge.ecClassId, 's.c') as ClassId, count(ge.ecInstanceId) as elementCount, coalesce(ca.userlabel, ca.codevalue) as category, sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeVolume from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id group by coalesce(ca.userlabel, ca.codevalue)"

"select distinct ec_classname(ge.ecClassId, 's.c') as ClassId, count(ge.ecInstanceId) as elementCount, sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangevolume from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id where ge.parent is null and ec_classname(ge.ecclassid, 's.c') like '%Ceiling%' group by coalesce(ca.userlabel, ca.codevalue), ge.ecclassid "

"select count(ecinstanceid), sum(Volume_PG_GEOMETRY_Volume), sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangevolume from TRUAHRZZZZM3ASTATIONCENTRAL_AMENDED_K1_ThreeD_iDGNExportExistingContext151667TSA30MVL3DM3AAR010001.Ceilings"
"select * from TRUAHRZZZZM3ASTATIONCENTRAL_AMENDED_K1_ThreeD_iDGNExportExistingContext151667TSA30MVL3DM3AAR010001.Ceilings"
"select * from generic.graphic3d"
"select * from bis.geometricelement3d limit 1"

"select * from meta.ecclassdef where name like '%aspect%'"
"select distinct ec_classname(bes.ecclassid,'s.c'),  ec_classname(bet.ecclassid, 's.c'), count(eau.ecinstanceid) from bis.ElementOwnsMultiAspects eau join bis.element bes on eau.sourceecinstanceid = bes.ecinstanceid join bis.element bet on eau.targetecinstanceid = bet.ecinstanceid where ec_classname(bes.ecclassid) not like '%text%' group by bes.ecclassid, bet.ecclassid "
"select distinct ec_classname(ge.ecClassId, 's.c') as ClassId, count(ge.ecInstanceId) as elementCount from bis.geometricelement3d ge where ec_classname(ecclassid, 's.c') like '%ceiling%' group by ecclassid"

"select ec_ClassName(class.id, 's.c'), * from meta.ecpropertydef where class.id is (bis.elementaspect) and ec_classname(class.id,'s.c') like '%Quantity%'"
"select * from QuantityTakeoffsAspects.SurfaceAreaAspect"
"select ec_classname(ge.ecclassid, 's.c'), userlabel, ge.parent.id from bis.geometricelement3d ge join qto.volumeaspect va on ge.ecinstanceid = va.element.id"

"select ec_classname(ecinstanceid, 's.c'), name from meta.ecClassDef where name like '%Area%'"
"select ge.ecclassid, count(ge.ecInstanceId) as elementCount, coalesce(ca.userlabel, ca.codevalue) as category
  , sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeVolume 
    , sum(coalesce(qtoa.netSurfaceArea, qtoa.GrossSurfaceArea, 0)) as qtoArea 
     , sum(coalesce(qtov.netVolume, qtov.GrossVolume, 0)) as qtoVolume
  from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id    
    left join qto.SurfaceAreaAspect qtoa on qtoa.Element.id = ge.ecinstanceId   
    left join qto.VolumeAspect qtov on qtov.Element.id = ge.ecinstanceId  
  group by coalesce(ca.userlabel, ca.codevalue)"

"select ge.ecclassid, count(ge.ecInstanceId) as elementCount, coalesce(ca.userlabel, ca.codevalue) as category, sum(iModel_bbox_areaxy(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeArea, sum(iModel_bbox_volume(iModel_bbox(BBoxLow.x,BBoxLow.y, BBoxLow.z, BBoxHigh.x, BBoxHigh.y, BBoxHigh.z ))) as rangeVolume , sum(coalesce(qtod.Length, qtod.Height,qtod.Width, 0)) as qtoLength  , sum(coalesce(qtoa.netSurfaceArea, qtoa.GrossSurfaceArea, 0)) as qtoArea  , sum(coalesce(qtov.netVolume, qtov.GrossVolume, 0)) as qtoVolume  from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id  left join qto.DimensionsAspect qtod on qtod.Element.id = ge.ecinstanceId   left join qto.SurfaceAreaAspect qtoa on qtoa.Element.id = ge.ecinstanceId   left join qto.VolumeAspect qtov on qtov.Element.id = ge.ecinstanceId  group by coalesce(ca.userlabel, ca.codevalue)"

"select ge.userlabel, ca.codevalue,  sa.grossSurfaceArea from QuantityTakeoffsAspects.SurfaceAreaAspect sa join bis.geometricelement3d ge on ge.ecinstanceid = sa.element.id join bis.category ca on ca.ecinstanceid = ge.category.id group by ca.codevalue, ge.userlabel"

"select ge.ecInstanceId as id, ge.userlabel as userlabel , qtov.netVolume as qtoQuantity  from bis.geometricelement3d ge left join qto.volumeaspect qtov on qtov.element.id = ge.ecinstanceid   where ge.ecinstanceid in (SELECT be.ECInstanceId FROM bis.geometricelement3d be LEFT JOIN bis.SpatialCategory cat ON be.Category.Id = cat.ECInstanceID LEFT JOIN ecdbmeta.ECClassDef ecc ON be.ECClassId = ecc.ECInstanceId LEFT JOIN bis.PhysicalType pt ON be.TypeDefinition.Id = pt.ECInstanceID WHERE (( be.codevalue LIKE '%foundations%') OR ( be.userlabel LIKE '%foundations%')) OR (( cat.codevalue LIKE '%foundations%') OR ( cat.userlabel LIKE '%foundations%')) OR ( ecc.name LIKE '%foundations%') OR (( pt.codevalue LIKE '%foundations%') OR ( pt.userlabel LIKE '%foundations%')) )"
"select * from bis.repositorylink"
"select ge.ecInstanceId as id, ge.userlabel as userlabel , sum(coalesce(qtov.netVolume, qtov.GrossVolume, 0)) as qtoQuantity  from bis.geometricelement3d ge  left join qto.VolumeAspect qtov on qtov.Element.id = ge.ecinstanceId  where ge.ecinstanceid in (SELECT be.ECInstanceId FROM bis.geometricelement3d be LEFT JOIN bis.SpatialCategory cat ON be.Category.Id = cat.ECInstanceID LEFT JOIN ecdbmeta.ECClassDef ecc ON be.ECClassId = ecc.ECInstanceId LEFT JOIN bis.PhysicalType pt ON be.TypeDefinition.Id = pt.ECInstanceID WHERE (( be.codevalue LIKE '%foundations%') OR ( be.userlabel LIKE '%foundations%')) OR (( cat.codevalue LIKE '%foundations%') OR ( cat.userlabel LIKE '%foundations%')) OR ( ecc.name LIKE '%foundations%') OR (( pt.codevalue LIKE '%foundations%') OR ( pt.userlabel LIKE '%foundations%')) )"