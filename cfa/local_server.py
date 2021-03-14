import json

from bottle import Bottle, run, static_file


def launch(port, json_path, icons_dir, ach_path='/ach', icon_path='/static'):
    with open(json_path) as f:
        achs = json.load(f)
    achs_by_handle = {ach['handle']: ach for ach in achs}

    app = Bottle()

    @app.route(ach_path + '/<handle>')
    def ach(handle):
        return achs_by_handle[handle]

    @app.route(icon_path + '/<filename>')
    def static(filename):
        return static_file(filename, root=icons_dir)

    run(app, host='localhost', port=port, debug=True)
