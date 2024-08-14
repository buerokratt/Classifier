from fastapi import  HTTPException
import httpx
from constants import (GRAPH_API_BASE_URL, Folder, ClassHierarchy)
from typing import List

async def fetch_folders(folder_id: str = 'root', ACCESS_TOKEN: str = 'none'):
    url = f"{GRAPH_API_BASE_URL}/me/mailFolders"
    if folder_id != 'root':
        url = f"{GRAPH_API_BASE_URL}/me/mailFolders/{folder_id}/childFolders"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    all_folders = []
    async with httpx.AsyncClient() as client:
        while url:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to fetch folders: {response.text}")
            
            data = response.json()
            all_folders.extend(data['value'])
            url = data.get('@odata.nextLink')
    
    return all_folders

async def build_folder_hierarchy(folder_id: str = 'root'):
    folders = await fetch_folders(folder_id)
    
    async def build_hierarchy(folder):
        child_folders = await build_folder_hierarchy(folder['id'])
        return Folder(
            id=folder['id'],
            displayName=folder['displayName'],
            childFolders=child_folders
        )
    
    return [await build_hierarchy(folder) for folder in folders]


async def validate_hierarchy(class_hierarchies: List[ClassHierarchy]):
    errors = []
    folder_hierarchy = await build_folder_hierarchy()

    def find_folder(name: str, folders: List[Folder]):
        return next((folder for folder in folders if folder.displayName == name), None)

    def check_hierarchy(classes: List[ClassHierarchy], folders: List[Folder], path: str):
        for cls in classes:
            folder = find_folder(cls.class_name, folders)
            if not folder:
                errors.append(f"Folder '{cls.class_name}' not found at path '{path}'")
                return False
            if cls.subclasses:
                if not check_hierarchy(cls.subclasses, folder.childFolders, f"{path}/{cls.class_name}"):
                    return False
        return True

    result = check_hierarchy(class_hierarchies, folder_hierarchy, '')
    return {"isValid": result, "errors": errors}


def find_folder_id(hierarchy: List[Folder], path: List[str]):
    current_level = hierarchy
    for folder_name in path:
        found = False
        for folder in current_level:
            if folder.displayName.lower() == folder_name.lower():
                if folder_name == path[-1]:
                    return folder.id
                current_level = folder.childFolders
                found = True
                break
        if not found:
            raise ValueError(f"Folder '{folder_name}' not found in the given path")
    raise ValueError("Path is empty or invalid")


def get_corrected_folder_hierarchy(hierarchy: List[Folder], final_folder_id: str):
    def search_hierarchy(folders: List[Folder], target_id: str, current_path: List[str]):
        for folder in folders:
            new_path = current_path + [folder.displayName]
            if folder.id == target_id:
                return new_path
            if folder.childFolders:
                result = search_hierarchy(folder.childFolders, target_id, new_path)
                if result:
                    return result
        return []

    result = search_hierarchy(hierarchy, final_folder_id, [])
    if not result:
        raise ValueError(f"Folder with ID '{final_folder_id}' not found in the hierarchy")
    return result
