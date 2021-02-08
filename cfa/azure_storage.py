import os
import datetime as dt
from pathlib import Path

from azure.storage.blob import ContainerClient, ContentSettings
from tqdm import tqdm

CACHE_MAX_AGE = int(dt.timedelta(days=1).total_seconds())
IMG_SUFFIXES = ['.svg']


def get_container_client():
    conn_str = os.environ['AZURE_BLOB_CONN_STRING']
    container_name = os.getenv('AZURE_BLOB_CONTAINER', 'container')
    return ContainerClient.from_connection_string(conn_str, container_name=container_name)


def upload_icons(icons_dir: str, overwrite: bool):
    container = get_container_client()
    blobs = {blob.name for blob in container.list_blobs()}

    imgs = [file for file in Path(icons_dir).iterdir()
            if file.is_file() and file.suffix in IMG_SUFFIXES]

    existing = ', '.join(img.name for img in imgs if img.name in blobs)
    if existing:
        print('Existing:', existing)
        if overwrite:
            print('Existing blobs will be overwritten')
        else:
            print('Existing blobs will be skipped')
            imgs = [img for img in imgs if img.name not in blobs]

    if not imgs:
        print('Nothing to upload')
        return

    pbar = tqdm(imgs, ncols=80)
    for img in pbar:
        pbar.set_description(f'Uploading {img.name}')
        if img.suffix == '.svg':
            content_settings = ContentSettings(content_type='image/svg+xml',
                                               cache_control=f'public, max-age={CACHE_MAX_AGE}')
            with img.open('rb') as f:
                container.upload_blob(img.name, f, content_settings=content_settings,
                                      overwrite=overwrite)
