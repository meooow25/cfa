import os
import zlib
from collections import defaultdict

from azure.cosmos import CosmosClient, ContainerProxy
from tqdm import tqdm


def get_container() -> ContainerProxy:
    conn_str = os.environ['AZURE_COSMOS_CONN_STRING']
    db_name = os.getenv('AZURE_COSMOS_DATABASE', 'database')
    container_name = os.getenv('AZURE_COSMOS_CONTAINER', 'container')

    client = CosmosClient.from_connection_string(conn_str=conn_str)
    database = client.get_database_client(db_name)
    return database.get_container_client(container_name)


def crc32_9(s):
    """Returns the lowest 9 bits of the input's CRC32 hash as hex"""
    n32 = zlib.crc32(s.encode())
    n9 = n32 & 0x1ff
    return f'{n9:03x}'


def save_users(users_with_achievements: list):
    container = get_container()

    # There are more than 300k users and bulk updating on Cosmos is a pain in the ass.
    # Updating one by one takes forever.
    # Stored procedures can be used but they time out after a few seconds.
    # So here's the hack:
    # - Group users into 512 buckets, here using 9 bits of the handle's CRC32.
    # - Upload each group as an item, takes ~10 minutes.
    # - Add a UDF (user-defined function) on the container that calculates the same 9 bits.
    # - On the HTTP-triggered Azure function, perform an SQL query using the UDF to get the group,
    #   filter out the right user and send it down.

    by_prefix = defaultdict(list)
    for user in users_with_achievements:
        pre = crc32_9(user['handle'])
        by_prefix[pre].append(user)

    items = [{'id': key, 'users': value} for key, value in by_prefix.items()]
    for item in tqdm(items, desc='Uploading', ncols=80):
        container.upsert_item(item)
