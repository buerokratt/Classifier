from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import json
import uuid
import requests
from pydantic import BaseModel
from file_converter import FileConverter
from constants import (
    UPLOAD_FAILED, UPLOAD_SUCCESS, EXPORT_TYPE_ERROR, IMPORT_TYPE_ERROR,
    S3_UPLOAD_FAILED, S3_DOWNLOAD_FAILED, JSON_EXT, YAML_EXT, YML_EXT, XLSX_EXT
)
from s3_ferry import S3Ferry

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

UPLOAD_DIRECTORY = os.getenv("UPLOAD_DIRECTORY", "/shared")
CHUNK_UPLOAD_DIRECTORY = os.getenv("CHUNK_UPLOAD_DIRECTORY", "/shared/chunks")
RUUTER_PRIVATE_URL = os.getenv("RUUTER_PRIVATE_URL")
S3_FERRY_URL = os.getenv("S3_FERRY_URL")
s3_ferry = S3Ferry(S3_FERRY_URL)

class ExportFile(BaseModel):
    dgId: int
    exportType: str

class ImportChunks(BaseModel):
    dg_id: int
    chunks: list

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)

def get_ruuter_private_url():
    return os.getenv("RUUTER_PRIVATE_URL")

async def authenticate_user(request: Request):
    cookie = request.cookies.get("customJwtCookie")
    if not cookie:
        raise HTTPException(status_code=401, detail="No cookie found in the request")

    url = f"{RUUTER_PRIVATE_URL}/auth/jwt/userinfo"
    headers = {
        'cookie': f'customJwtCookie={cookie}'
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Authentication failed")

@app.post("/datasetgroup/data/import")
async def upload_and_copy(request: Request, dgId: int = Form(...), dataFile: UploadFile = File(...)):
    try:
        await authenticate_user(request)

        print(f"Received dgId: {dgId}")
        print(f"Received filename: {dataFile.filename}")

        file_converter = FileConverter()
        file_type = file_converter._detect_file_type(dataFile.filename)
        file_name = f"{uuid.uuid4()}.{file_type}"
        file_location = os.path.join(UPLOAD_DIRECTORY, file_name)
        
        with open(file_location, "wb") as f:
            f.write(dataFile.file.read())

        success, converted_data = file_converter.convert_to_json(file_location)
        if not success:
            upload_failed = UPLOAD_FAILED.copy()
            upload_failed["reason"] = "Json file convert failed."
            raise HTTPException(status_code=500, detail=upload_failed)
        
        json_local_file_path = file_location.replace(YAML_EXT, JSON_EXT).replace(YML_EXT, JSON_EXT).replace(XLSX_EXT, JSON_EXT)
        with open(json_local_file_path, 'w') as json_file:
            json.dump(converted_data, json_file, indent=4)

        save_location = f"/dataset/{dgId}/primary_dataset/dataset_{dgId}_aggregated{JSON_EXT}"
        source_file_path = file_name.replace(YML_EXT, JSON_EXT).replace(XLSX_EXT, JSON_EXT)
        
        response = s3_ferry.transfer_file(save_location, "S3", source_file_path, "FS")
        if response.status_code == 201:
            os.remove(file_location)
            if file_location != json_local_file_path:
                os.remove(json_local_file_path)
            upload_success = UPLOAD_SUCCESS.copy()
            upload_success["saved_file_path"] = save_location
            return JSONResponse(status_code=200, content=upload_success)
        else:
            raise HTTPException(status_code=500, detail=S3_UPLOAD_FAILED)
    except Exception as e:
        print(f"Exception in data/import : {e}")
        raise HTTPException(status_code=500, detail=str(e)) 

@app.post("/datasetgroup/data/download")
async def download_and_convert(request: Request, exportData: ExportFile, backgroundTasks: BackgroundTasks):
    await authenticate_user(request)
    dg_id = exportData.dgId
    export_type = exportData.exportType

    if export_type not in ["xlsx", "yaml", "json"]:
        raise HTTPException(status_code=500, detail=EXPORT_TYPE_ERROR)

    save_location = f"/dataset/{dg_id}/primary_dataset/dataset_{dg_id}_aggregated{JSON_EXT}"
    local_file_name = f"group_{dg_id}_aggregated"

    response = s3_ferry.transfer_file(f"{local_file_name}{JSON_EXT}", "FS", save_location, "S3")
    if response.status_code != 201:
        raise HTTPException(status_code=500, detail=S3_DOWNLOAD_FAILED)

    json_file_path = os.path.join('..', 'shared', f"{local_file_name}{JSON_EXT}")

    file_converter = FileConverter()
    with open(f"{json_file_path}", 'r') as json_file:
        json_data = json.load(json_file)
    
    if export_type == "xlsx":
        output_file = f"{local_file_name}{XLSX_EXT}"
        file_converter.convert_json_to_xlsx(json_data, output_file)
    elif export_type == "yaml":
        output_file = f"{local_file_name}{YAML_EXT}"
        file_converter.convert_json_to_yaml(json_data, output_file)
    elif export_type == "json":
        output_file = f"{json_file_path}"
    else:
        raise HTTPException(status_code=500, detail=EXPORT_TYPE_ERROR)

    backgroundTasks.add_task(os.remove, json_file_path)
    if output_file != json_file_path:
        backgroundTasks.add_task(os.remove, output_file)

    return FileResponse(output_file, filename=os.path.basename(output_file))

@app.get("/datasetgroup/data/download/json")
async def download_and_convert(request: Request, dgId: int, background_tasks: BackgroundTasks):
    await authenticate_user(request)

    saveLocation = f"/dataset/{dgId}/primary_dataset/dataset_{dgId}_aggregated{JSON_EXT}"
    localFileName = f"group_{dgId}_aggregated"

    response = s3_ferry.transfer_file(f"{localFileName}{JSON_EXT}", "FS", saveLocation, "S3")
    if response.status_code != 201:
        raise HTTPException(status_code=500, detail=S3_DOWNLOAD_FAILED)

    jsonFilePath = os.path.join('..', 'shared', f"{localFileName}{JSON_EXT}")

    with open(f"{jsonFilePath}", 'r') as jsonFile:
        jsonData = json.load(jsonFile)

    background_tasks.add_task(os.remove, jsonFilePath)

    return jsonData

@app.post("/datasetgroup/data/import/chunk")
async def upload_and_copy(request: Request, import_chunks: ImportChunks):
    await authenticate_user(request)

    dgID = import_chunks.dg_id
    chunks = import_chunks.chunks
    
    for index, chunk in enumerate(chunks, start=1):
        fileLocation = os.path.join(CHUNK_UPLOAD_DIRECTORY, f"{index}.json")
        with open(fileLocation, 'w') as jsonFile:
            json.dump(chunk, jsonFile, indent=4)

        saveLocation = f"/dataset/{dgID}/chunks/{index}{JSON_EXT}"
    
        response = s3_ferry.transfer_file(saveLocation, "S3", fileLocation, "FS")
        if response.status_code == 201:
            os.remove(fileLocation)
        else:
            raise HTTPException(status_code=500, detail=S3_UPLOAD_FAILED)
    else:
        return True

@app.get("/datasetgroup/data/download/chunk")
async def download_and_convert(request: Request, dgId: int, pageId: int, backgroundTasks: BackgroundTasks):
    await authenticate_user(request)
    save_location = f"/dataset/{dgId}/chunks/{pageId}{JSON_EXT}"
    local_file_name = f"group_{dgId}_chunk_{pageId}"

    response = s3_ferry.transfer_file(f"{local_file_name}{JSON_EXT}", "FS", save_location, "S3")
    if response.status_code != 201:
        raise HTTPException(status_code=500, detail=S3_DOWNLOAD_FAILED)

    json_file_path = os.path.join('..', 'shared', f"{local_file_name}{JSON_EXT}")

    with open(f"{json_file_path}", 'r') as json_file:
        json_data = json.load(json_file)

    for index, item in enumerate(json_data, start=1):
        item['rowID'] = index

    backgroundTasks.add_task(os.remove, json_file_path)

    return json_data
