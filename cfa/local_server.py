import json
from typing import List

from bottle import Bottle, static_file


def launch(
        port: int, users_with_achievements: List[dict], icons_dir: str,
        ach_path: str = '/ach', icon_path: str = '/static'):

    by_handle = {user['handle']: user for user in users_with_achievements}

    app = Bottle()

    @app.route(ach_path + '/<handle>')
    def ach(handle):
        return by_handle[handle]

    @app.route(icon_path + '/<filename>')
    def static(filename):
        return static_file(filename, root=icons_dir)

    app.run(host='localhost', port=port, debug=True)
