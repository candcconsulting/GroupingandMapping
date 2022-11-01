"SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007"
"select * from qto.VolumeAspect where element.id in (SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007)"

"select count(*) from (SELECT BisCore.GeometricElement3d.ECInstanceId FROM BisCore.GeometricElement3d WHERE BisCore.GeometricElement3d.Category.id=0x90000000007)"