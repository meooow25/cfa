import tables
from tables import Int8Col, Int16Col, Int32Col, StringCol

# Have to be explicit about pos for the fields or it gets sorted by name 
class Submission(tables.IsDescription):
    id = Int32Col(pos=0)
    contest = Int16Col(pos=1)
    problem = Int16Col(pos=2)
    author = Int32Col(pos=3)
    type = Int8Col(pos=4)  # ParticipationType
    programming_language = StringCol(64, pos=5)
    verdict = Int8Col(pos=6)
    testset = Int8Col(pos=7)
    passed_test_count = Int16Col(pos=8)
    time_consumed_millis = Int32Col(pos=9)
    memory_consumed_bytes = Int32Col(pos=10)


class Table:
    def __init__(self, path, mode):
        self.h5 = tables.open_file(path, mode=mode)

    @staticmethod
    def open_read(path):
        return Table(path, 'r')

    @staticmethod
    def open_append(path):
        return Table(path, 'a')

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.h5.close()

    @property
    def root(self) -> tables.Group:
        return self.h5.root

    def get_or_create_group(self, node: tables.Group, name: str) -> tables.Group:
        try:
            return getattr(node, name)
        except AttributeError:
            return self.h5.create_group(node, name)

    def get_or_create_table(self, node: tables.Group, name: str, description) -> tables.Table:
        try:
            return getattr(node, name)
        except AttributeError:
            return self.h5.create_table(node, name, description)
