import * as FileSystem from 'expo-file-system/legacy';

const getUniqueFileName=async(directoryUri,fileName)=>{
  const existing=await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
  if(!existing.includes(fileName))return fileName;
  const dot=fileName.lastIndexOf('.');
  const base=dot>0?fileName.slice(0,dot):fileName;
  const ext=dot>0?fileName.slice(dot):'';
  let index=2;
  while(existing.includes(base+'-'+index+ext))index+=1;
  return base+'-'+index+ext;
};

export const saveFileToDevice=async({sourceUri,fileName,mimeType})=>{
  if(!sourceUri)throw new Error('Invoice file is not available.');
  const saf=FileSystem.StorageAccessFramework;
  let permission;
  try{
    permission=await saf.requestDirectoryPermissionsAsync(saf.getUriForDirectoryInRoot('Download'));
  }catch{
    permission=await saf.requestDirectoryPermissionsAsync();
  }
  if(!permission.granted)return false;
  const safeName=await getUniqueFileName(permission.directoryUri,fileName);
  const target=await saf.createFileAsync(permission.directoryUri,safeName,mimeType);
  const base64=await FileSystem.readAsStringAsync(sourceUri,{encoding:FileSystem.EncodingType.Base64});
  await FileSystem.writeAsStringAsync(target,base64,{encoding:FileSystem.EncodingType.Base64});
  return true;
};
