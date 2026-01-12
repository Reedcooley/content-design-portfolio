from flask_frozen import Freezer
from app import app

app.config["FREEZER_RELATIVE_URLS"] = True
app.config["FREEZER_DESTINATION"] = "frozen"

freezer = Freezer(app)

@freezer.register_generator
def url_generator():
    yield "/"
    yield "/writing/"
    yield "/design/"
    yield "/process_page/"

if __name__ == "__main__":
    freezer.freeze()
