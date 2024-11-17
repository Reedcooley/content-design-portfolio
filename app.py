from flask import Flask, request, Response, render_template
import requests
import pandas as pd
import re
import io
from datetime import datetime

app = Flask(__name__)

# Function to trim URLs
def trim_url(url):
    match = re.search(r'/articles/(\d+)', url)
    if match:
        article_id = match.group(1)
        return f"https://support.dashlane.com/hc/articles/{article_id}"
    return url

# Function to fetch all data (articles, sections, or categories)
def fetch_all_data(base_url):
    items = []
    while base_url:
        response = requests.get(base_url)
        if response.status_code == 401:
            raise Exception("authentication_required")
        elif response.status_code == 404:
            raise Exception("not_found")
        elif response.status_code != 200:
            raise Exception("other_error")
        data = response.json()
        items.extend(data.get('articles', []) or data.get('sections', []) or data.get('categories', []))
        base_url = data.get('next_page')  # Move to the next page if available
    return items

# Function to convert a date string to a readable format
def convert_date(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
    readable_date = dt.strftime("%B %d, %Y")
    return readable_date

# Route for the process page
@app.route('/process', methods=['POST'])
def process():
    subdomain = request.form['subdomain']
    if not subdomain:
        return 'Please enter a valid subdomain.', 400

    # Validate subdomain format
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$', subdomain):
        return 'Invalid subdomain format.', 400

    try:
        # Base URLs for Zendesk API endpoints
        zendesk_domain = subdomain
        articles_url = f'https://{zendesk_domain}.zendesk.com/api/v2/help_center/en-us/articles.json'
        sections_url = f'https://{zendesk_domain}.zendesk.com/api/v2/help_center/sections.json'
        categories_url = f'https://{zendesk_domain}.zendesk.com/api/v2/help_center/categories.json'

        # Fetch articles, sections, and categories
        articles = fetch_all_data(articles_url)
        sections = fetch_all_data(sections_url)
        categories = fetch_all_data(categories_url)

        # Check if articles are empty
        if not articles:
            return 'No articles found.', 400

        # Create mappings for quick lookup
        article_map = {str(article['id']): article for article in articles}
        section_map = {str(section['id']): section for section in sections}
        category_map = {str(category['id']): category['name'] for category in categories}

        # Create a section to category ID map
        section_to_category_map = {str(section['id']): str(section['category_id']) for section in sections}

        # Prepare the data to be written into the DataFrame
        articles_data = []
        for article_id, article in article_map.items():
            section_id = str(article.get('section_id', ''))
            category_id = section_to_category_map.get(section_id, '')

            articles_data.append({
                'ID': article_id,
                'Article title': article['title'],
                'URL': trim_url(article['html_url']),
                'Created': convert_date(article['created_at']),
                'Section': section_map.get(section_id, {}).get('name', ''),
                'Category': category_map.get(category_id, ''),
                'Labels': ', '.join(article.get('label_names', [])),
            })

        # Create a DataFrame
        df = pd.DataFrame(articles_data)

        # Convert the DataFrame to CSV
        csv_io = io.StringIO()
        df.to_csv(csv_io, index=False)
        csv_io.seek(0)

        # Send the CSV as a downloadable response
        return Response(
            csv_io.getvalue(),
            mimetype='text/csv',
            headers={"Content-Disposition": "attachment;filename=zendesk_articles.csv"}
        )
    except Exception as e:
        if str(e) == "authentication_required":
            return "The API endpoint requires authentication.", 401
        elif str(e) == "not_found":
            return "Subdomain not found.", 404
        else:
            return "An error occurred while fetching data from the API.", 500

# Route for the home page
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

# Route for the Writing page
@app.route('/writing', methods=['GET'])
def writing():
    return render_template('writing.html')

# Route for the Design page
@app.route('/design', methods=['GET'])
def design():
    return render_template('design.html')

# Route for the Process page
@app.route('/process_page', methods=['GET'])
def process_page():
    return render_template('process.html')

if __name__ == '__main__':
    app.run(debug=True)