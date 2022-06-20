"select count(ge.ecinstanceid) as qty, ca.codevalue, es.codevalue as model from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id join bis.externalsourceaspect ea on ea.element.id = ge.ecinstanceid join bis.externalsource es on ea.source.id = es.ecinstanceid group by ca.codevalue, es.codevalue"

"select * from bis.externalsourceaspect"
"select ge.ecclassid, ge.userlabel, ca.codevalue, ea.identifier, qm.material, ifnull(qd.length, qd.height), qv.grossvolume, qa.grosssurfacearea from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id join bis.externalsourceaspect ea on ge.ecinstanceid = ea.element.id left join qto.materialaspect qm on ge.ecinstanceid = qm.element.id left join qto.volumeaspect qv on ge.ecinstanceid = qv.element.id left join qto.dimensionsaspect qd on ge.ecinstanceid = qd.element.id left join qto.surfaceareaaspect qa on ge.ecinstanceid = qa.element.id group by ca.codevalue, ea.identifier"

"select ge.ecclassid, max(ge.userlabel), ca.codevalue as Category, rl.codevalue as Model, qm.material, sum(ifnull(qd.length, ifnull(qd.height,0))) as Length, sum(ifnull(qv.grossvolume,0)) as Volume, sum(ifnull(qa.grosssurfacearea,0)) as Area, count(ge.ecinstanceid) as QTY from bis.geometricelement3d ge join bis.category ca on ca.ecinstanceid = ge.category.id join bis.externalsourceaspect ea on ge.ecinstanceid = ea.element.id left join qto.materialaspect qm on ge.ecinstanceid = qm.element.id left join qto.volumeaspect qv on ge.ecinstanceid = qv.element.id left join qto.dimensionsaspect qd on ge.ecinstanceid = qd.element.id left join qto.surfaceareaaspect qa on ge.ecinstanceid = qa.element.id join bis.repositorylink rl on rl.ecinstanceid = ea.scope.id where ca.codevalue not in ('OST_Levels', 'OST_Rooms') group by ge.ecclassid, ca.codevalue, rl.codevalue, qm.material"

"select ec_classname(Class.id), * from meta.ecpropertydef where name like 'IFCMaterial'"

"select * from meta.ecpropertydef where name like 'IFCMaterial'"

"select ge.ecInstanceId, ge.ecclassid,  ge.UserLabel,  ca.userlabel as category, ifcmaterialName as Material, ifcgrossVolume as Volume, 'm3' as unit from bis.geometricelement3d ge join ifcdynamic.ifcbridgedata bd on ge.typeDefinition.id = bd.ecinstanceid join ifcdynamic.ifcaspect_basequantities qu on ge.ecinstanceid = qu.element.id join bis.category ca on ge.category.id = ca.ecinstanceid"

"select * from bis.geometricelement3d"