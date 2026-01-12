from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/writing/")
def writing():
    return render_template("writing.html")

@app.route("/design/")
def design():
    return render_template("design.html")

@app.route("/process_page/")
def process_page():
    return render_template("process.html")

if __name__ == "__main__":
    app.run(debug=True)
